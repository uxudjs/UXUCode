"""Task-declared disk peaks and verified allocation receipts; never infer arbitrary code."""
import json
import os
from pathlib import Path
import stat
import subprocess
import time

import checkpoint

MIB = 1048576
FIELDS = {'paths', 'growth_mib', 'checkpoint_mib', 'safety_mib'}


def amount(value):
    if type(value) is not int or not 0 <= value <= 2 ** 40:
        raise ValueError('disk budgets must be nonnegative integer MiB')
    return value


def total(value):
    return sum(amount(value[key]) for key in ('growth_mib', 'checkpoint_mib', 'safety_mib'))


def filesystem(path):
    rows = json.loads(subprocess.check_output(
        ['findmnt', '--json', '--target', str(path), '--output', 'TARGET,FSTYPE,OPTIONS,ID'],
        text=True, timeout=5))['filesystems']
    if len(rows) != 1:
        raise ValueError('ambiguous disk filesystem')
    row = rows[0]
    # Quotas, network/overlay filesystems and reflink accounting need separate contracts.
    options = row['options'].split(',')
    if row['fstype'] not in ('ext2', 'ext3', 'ext4', 'tmpfs') or any('quota' in v for v in options):
        raise ValueError('unsupported disk filesystem or quota; use an isolated supported filesystem')
    if 'rw' not in options or type(row['id']) is not int:
        raise ValueError('disk filesystem must be writable with a known mount identity')
    info = os.stat(path)
    return dict(device=info.st_dev, mount_id=row['id'], target=row['target'], type=row['fstype'])


def path_at(value, root):
    path = Path(value)
    if not path.is_absolute() or path.absolute() != path.resolve(strict=True):
        raise ValueError('disk paths must be existing canonical paths without links')
    path.relative_to(root)
    if path.is_symlink():
        raise ValueError('linked disk path')
    return path


def member(path, device):
    if path.resolve(strict=True) != path:
        raise ValueError('linked disk evidence path')
    before = path.lstat()
    if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
            or before.st_dev != device or before.st_uid != os.getuid()):
        raise ValueError('disk evidence requires an owned, single-link regular file on the selected filesystem')
    fd = os.open(str(path), os.O_RDONLY | os.O_NOFOLLOW)
    try:
        after = os.fstat(fd)
        if (before.st_dev, before.st_ino, before.st_ctime_ns, before.st_blocks) != (
                after.st_dev, after.st_ino, after.st_ctime_ns, after.st_blocks) or after.st_nlink != 1:
            raise ValueError('disk evidence changed while opening')
        final = path.stat()
        if path.resolve(strict=True) != path or (final.st_dev, final.st_ino) != (after.st_dev, after.st_ino):
            raise ValueError('disk evidence path changed while opening')
        return dict(device=after.st_dev, inode=after.st_ino, allocated_bytes=after.st_blocks * 512)
    finally:
        os.close(fd)


def scan(paths, fs):
    result = {}
    def unavailable(error):
        raise error
    for value in paths:
        root = Path(value)
        if filesystem(root) != fs:
            raise ValueError('disk mount changed')
        for current, directories, files in os.walk(str(root), followlinks=False, onerror=unavailable):
            directory = Path(current)
            if directory.is_symlink() or directory.stat().st_dev != fs['device']:
                raise ValueError('linked or cross-filesystem disk directory')
            for name in directories:
                child = directory / name
                if child.is_symlink() or filesystem(child) != fs:
                    raise ValueError('nested disk mount or link')
            for name in files:
                file = directory / name
                result[str(file)] = member(file, fs['device'])
                if len(result) > 10000:
                    raise ValueError('disk inventory exceeds the bounded 10000-file contract')
    return result


def prepare(root, declaration):
    if not isinstance(declaration, dict) or set(declaration) != FIELDS:
        raise ValueError('disk needs paths, growth_mib, checkpoint_mib and safety_mib; no default estimate')
    if total(declaration) == 0:
        raise ValueError('disk estimate must cover task and coordination metadata; an all-zero budget is not valid')
    paths = declaration['paths']
    if not isinstance(paths, list) or not paths or any(not isinstance(p, str) for p in paths):
        raise ValueError('disk needs managed write directories')
    normalized = []
    coordination = root / '.gpubackfill'
    for value in paths:
        path = path_at(value, root)
        if (not path.is_dir() or path == root or path == coordination
                or coordination in path.parents):
            raise ValueError('disk paths must be task-owned directories outside coordination state')
        if any(path == p or path in p.parents or p in path.parents for p in normalized):
            raise ValueError('overlapping disk paths')
        normalized.append(path)
    fs = filesystem(root)
    names = sorted(str(p) for p in normalized)
    baseline = scan(names, fs)
    return dict(filesystem=fs, baseline=baseline)


def initial(declaration, basis):
    return dict(declaration, filesystem=basis['filesystem'], baseline=basis['baseline'],
                sequence=0, step=0, claimed_bytes=0, mode='declared_peak')


def validate_state(value):
    fields = FIELDS | {'filesystem', 'baseline', 'sequence', 'step', 'claimed_bytes', 'mode'}
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError('invalid disk ledger')
    total(value)
    for key in ('sequence', 'step', 'claimed_bytes'):
        if type(value[key]) is not int or value[key] < 0:
            raise ValueError('invalid disk ledger sequence or allocation')
    if value['mode'] not in ('declared_peak', 'dynamic') or not isinstance(value['baseline'], dict):
        raise ValueError('invalid disk ledger mode or basis')
    paths = value['paths']
    fs = value['filesystem']
    if (not isinstance(paths, list) or not paths or any(not isinstance(p, str) or not Path(p).is_absolute() for p in paths)
            or len(set(paths)) != len(paths) or not isinstance(fs, dict)
            or set(fs) != {'device', 'mount_id', 'target', 'type'}
            or type(fs['device']) is not int or type(fs['mount_id']) is not int
            or not isinstance(fs['target'], str) or fs['type'] not in ('ext2', 'ext3', 'ext4', 'tmpfs')):
        raise ValueError('invalid disk ledger filesystem or paths')
    for name, item in value['baseline'].items():
        if (not isinstance(name, str) or not any(Path(p) in Path(name).parents for p in paths)
                or not isinstance(item, dict) or set(item) != {'device', 'inode', 'allocated_bytes'}
                or any(type(item[k]) is not int or item[k] < 0 for k in item)
                or item['device'] != fs['device'] or item['allocated_bytes'] % 512):
            raise ValueError('invalid disk allocation basis')
    return value


def conflicts(left, right):
    return any(a == b or a in b.parents or b in a.parents
               for a in map(Path, left) for b in map(Path, right))


def revise(state, declaration, report):
    validate_state(state)
    if set(report) != {'growth_mib', 'checkpoint_mib', 'progress'}:
        raise ValueError('invalid disk update fields')
    growth, saving = amount(report['growth_mib']), amount(report['checkpoint_mib'])
    progress = report['progress']
    if (not isinstance(progress, dict) or set(progress) != {'sequence', 'step', 'files'}
            or type(progress['sequence']) is not int or progress['sequence'] != state['sequence'] + 1
            or type(progress['step']) is not int or progress['step'] < state['step']
            or not isinstance(progress['files'], list) or any(not isinstance(p, str) for p in progress['files'])
            or len(progress['files']) != len(set(progress['files']))):
        raise ValueError('stale or invalid disk progress')
    # An arbitrary lower future checkpoint estimate is not proof of a smaller full state.
    if saving < state['checkpoint_mib']:
        raise ValueError('checkpoint reserve cannot shrink without a verified smaller future-state bound')
    current = scan(state['paths'], state['filesystem'])
    credit = 0
    for value in progress['files']:
        if not isinstance(value, str) or value not in current:
            raise ValueError('disk allocation receipt is outside managed existing files')
        item = current[value]
        before = state['baseline'].get(value)
        if before is not None and (before['device'], before['inode']) != (item['device'], item['inode']):
            raise ValueError('disk receipt replaced an existing file identity')
        credit += max(0, item['allocated_bytes'] - (before['allocated_bytes'] if before else 0))
    release = max(0, state['growth_mib'] - growth) * MIB
    if release > max(0, credit - state['claimed_bytes']):
        raise ValueError('disk decrease lacks verified allocated blocks')
    return dict(state, growth_mib=growth, checkpoint_mib=saving, sequence=progress['sequence'],
                step=progress['step'], claimed_bytes=state['claimed_bytes'] + release, mode='dynamic')


class DiskBudget:
    def __init__(self, directory, job_id, request_id, attempt, timeout=60):
        checkpoint._identity(job_id, request_id, attempt)
        self.directory = checkpoint._directory(directory)
        self.identity = dict(job_id=job_id, request_id=request_id, attempt=attempt)
        self.timeout = timeout

    @classmethod
    def from_environment(cls):
        env = os.environ
        return cls(env['GPU_BACKFILL_DISK_DIR'], env['GPU_BACKFILL_JOB_ID'],
                   env['GPU_BACKFILL_REQUEST_ID'], env['GPU_BACKFILL_ATTEMPT'])

    def _response(self):
        value = json.loads(checkpoint._read_file(self.directory / 'disk-response.json'))
        if any(value.get(k) != v for k, v in self.identity.items()):
            raise ValueError('disk response belongs to another request or attempt')
        if type(value.get('sequence')) is not int or value['sequence'] < 0:
            raise ValueError('invalid disk response sequence')
        return value

    def reserve(self, growth_mib, checkpoint_mib, progress):
        import fcntl
        amount(growth_mib)
        amount(checkpoint_mib)
        if not isinstance(progress, dict) or set(progress) - {'step', 'files'} or 'step' not in progress:
            raise ValueError('disk progress needs step and optional exact file receipts')
        lock = self.directory / 'disk-client.lock'
        fd = os.open(str(lock), os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise ValueError('invalid disk client lock')
            fcntl.flock(fd, fcntl.LOCK_EX)
            previous = self._response()
            pending = self.directory / 'disk-request.json'
            if pending.exists():
                outstanding = json.loads(checkpoint._read_file(pending))
                if outstanding['progress']['sequence'] > previous['sequence']:
                    raise TimeoutError('previous disk update remains unconfirmed; do not overwrite it')
            sequence = previous['sequence'] + 1
            report = dict(self.identity, growth_mib=growth_mib, checkpoint_mib=checkpoint_mib,
                          progress=dict(progress, files=progress.get('files', []), sequence=sequence))
            checkpoint._publish(self.directory, 'disk-request.json', report)
            deadline = time.monotonic() + self.timeout
            while time.monotonic() < deadline:
                response = self._response()
                if response['sequence'] == sequence:
                    if response.get('report_id') != checkpoint.request_identity(report):
                        raise ValueError('disk acknowledgement does not bind the submitted update')
                    if not response.get('accepted'):
                        raise RuntimeError('disk reservation denied: ' + response.get('reason', 'unknown'))
                    return response
                if response['sequence'] > sequence:
                    raise ValueError('disk response sequence advanced unexpectedly')
                time.sleep(0.05)
            raise TimeoutError('disk update unconfirmed; do not perform the requested write')
        finally:
            os.close(fd)

    def check_checkpoint(self, size_bytes, progress, previous=None):
        response = self._response()
        state = response['disk']
        validate_state(state)
        # Old generations are already allocated. Count the new payload, both pending
        # manifest publications and directory growth; metadata may itself be large.
        fs = os.statvfs(self.directory)
        block = fs.f_frsize or fs.f_bsize
        manifest = dict(self.identity, version=1, file='state-' + '0' * 32 + '.bin',
                        size_bytes=size_bytes, sha256='0' * 64, progress=progress)
        sizes = [size_bytes, len(checkpoint._json(manifest)), len(checkpoint._json(previous)) if previous else 0]
        needed = sum((size + block - 1) // block * block for size in sizes) + block
        if needed > state['checkpoint_mib'] * MIB:
            self.reserve(state['growth_mib'], (needed + MIB - 1) // MIB,
                         {'step': progress['step']})


"""Linux NVIDIA backfill worker. Standard library; no test modes on the wire."""
import csv
import fcntl
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import sys
import time
import uuid

import checkpoint

MARGIN_MIB = 1024
STARTUP_TIMEOUT_SECONDS = 60
PRODUCT = {'product': 'GPUBackfill', 'state_version': 1}
TERMINAL = {'completed', 'failed', 'cancelled', 'needs_verification'}
JOB_FIELDS = {'job_id', 'command', 'cwd', 'memory_mib', 'max_runtime_seconds',
              'resume', 'multi_gpu', 'host_memory_mib', 'disk_free_mib'}


def _id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,79}', value):
        raise ValueError('invalid identifier')
    return value


def _number(value, minimum=0):
    if type(value) not in (int, float) or not math.isfinite(value) or value < minimum:
        raise ValueError('invalid finite numeric value')
    return value


def _path(value, root=None, directory=False):
    path = Path(value)
    if not path.is_absolute() or path.absolute() != path.resolve() or path.is_symlink():
        raise ValueError('absolute paths without links are required')
    if root is not None:
        try:
            path.relative_to(root)
        except ValueError:
            raise ValueError('path escapes project root')
    if directory and not path.is_dir():
        raise ValueError('directory does not exist')
    return path


def _base(root, create=False):
    root = _path(root, directory=True)
    base = _path(root / '.gpubackfill', root)
    if create:
        try:
            base.mkdir()
        except FileExistsError:
            pass
        else:
            _write(base / 'product.json', PRODUCT, exclusive=True)
    if not base.exists():
        return base
    if base.exists() and not base.is_dir():
        raise ValueError('invalid coordination directory')
    try:
        marker = _read(base / 'product.json')
    except (OSError, ValueError) as error:
        raise ValueError('unrecognized GPUBackfill ownership marker') from error
    if (marker != PRODUCT
            or type(marker['state_version']) is not int):
        raise ValueError('unrecognized GPUBackfill ownership marker')
    if create:
        for relative in ('locks', 'jobs', 'queues', 'state', 'state/reservations', 'state/queue-control'):
            path = _path(base / relative, root)
            path.mkdir(exist_ok=True)
    return base


def _boot_id():
    value = Path('/proc/sys/kernel/random/boot_id').read_text(encoding='ascii').strip()
    if not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', value):
        raise ValueError('invalid host boot identity')
    return value


def _read(path):
    path = _path(path)
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode):
        raise ValueError('expected a regular JSON file')
    descriptor = os.open(str(path), os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, 'r', encoding='utf-8') as stream:
        after = os.fstat(stream.fileno())
        if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino):
            raise ValueError('file changed while opening')
        return json.load(stream)


def _write(path, value, exclusive=False):
    path = _path(path)
    if path.exists() and not path.is_file():
        raise ValueError('invalid JSON destination')
    data = (json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True) + '\n').encode('utf-8')
    pending = path if exclusive else path.with_name(path.name + '.' + uuid.uuid4().hex + '.pending')
    descriptor = os.open(str(pending), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    if not exclusive:
        os.replace(str(pending), str(path))
    checkpoint._sync(path.parent)


def _lock(path, shared=False, existing=False):
    path = _path(path)
    flags = os.O_RDONLY if existing else os.O_RDWR | os.O_CREAT
    descriptor = os.open(str(path), flags | os.O_NOFOLLOW, 0o600)
    stream = os.fdopen(descriptor, 'rb' if existing else 'a+b')
    try:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ValueError('lease must be a regular file')
        fcntl.flock(stream, (fcntl.LOCK_SH if shared else fcntl.LOCK_EX) | fcntl.LOCK_NB)
        return stream
    except BlockingIOError:
        stream.close()
        return None
    except BaseException:
        stream.close()
        raise


def snapshot(root):
    """Bounded read-only telemetry; unsupported/unknown fields fail closed."""
    text = subprocess.check_output(['nvidia-smi', '--query-gpu=index,uuid,name,memory.total,memory.free,utilization.gpu',
                                    '--format=csv,noheader,nounits'], text=True, timeout=15)
    process_text = subprocess.check_output(['nvidia-smi', '--query-compute-apps=gpu_uuid,pid,used_gpu_memory',
                                            '--format=csv,noheader,nounits'], text=True, timeout=15)
    cards = []
    for row in csv.reader(io.StringIO(text)):
        if not row:
            continue
        if len(row) != 6:
            raise ValueError('invalid NVIDIA GPU telemetry')
        index, identifier, model, total, free, utilization = [v.strip() for v in row]
        if not re.fullmatch(r'[0-9]+', index) or not re.fullmatch(r'GPU-[A-Za-z0-9-]+', identifier) or not model:
            raise ValueError('invalid NVIDIA GPU identity')
        total, free, utilization = (_number(float(v)) for v in (total, free, utilization))
        if total <= 0 or free > total or utilization > 100:
            raise ValueError('invalid NVIDIA GPU resources')
        cards.append(dict(index=int(index), uuid=identifier, name=model, memory_total_mib=total,
                          memory_free_mib=free, utilization=utilization, processes=[]))
    by_uuid = {g['uuid']: g for g in cards}
    if len(by_uuid) != len(cards):
        raise ValueError('duplicate GPU UUID')
    seen = set()
    for row in csv.reader(io.StringIO(process_text)):
        if not row:
            continue
        if len(row) != 3:
            raise ValueError('invalid NVIDIA process telemetry')
        identifier, pid, used = [v.strip() for v in row]
        if identifier not in by_uuid or not re.fullmatch(r'[1-9][0-9]*', pid) or (identifier, pid) in seen:
            raise ValueError('invalid NVIDIA compute identity')
        seen.add((identifier, pid))
        by_uuid[identifier]['processes'].append(dict(pid=int(pid), used_mib=_number(float(used))))
    memory = subprocess.check_output(['free', '-b'], text=True, timeout=5, env=dict(os.environ, LC_ALL='C'))
    rows = [line.split() for line in memory.splitlines() if line.strip()]
    header = ['total', 'used', 'free', 'shared', 'buff/cache', 'available']
    if len(rows) < 2 or rows[0] != header or rows[1][0] != 'Mem:' or len(rows[1]) != 7:
        raise ValueError('invalid host memory telemetry')
    values = [int(v) for v in rows[1][1:]]
    if values[0] <= 0 or any(v < 0 or v > values[0] for v in values):
        raise ValueError('invalid host memory range')
    return dict(gpus=cards, host_memory_mib=values[-1] / 1048576,
                disk_free_mib=shutil.disk_usage(str(root)).free / 1048576)


def _inventory(cards):
    identity = sorted((g['uuid'], g['name'], g['memory_total_mib']) for g in cards)
    if len({g[0] for g in identity}) != len(identity):
        raise ValueError('duplicate GPU identity')
    return checkpoint.request_identity(identity)


def _queue(base, identifier):
    value = _read(base / 'queues' / (_id(identifier) + '.json'))
    required = {'version', 'queue_id', 'gpu_uuids', 'inventory_id', 'allow_external'}
    if (not isinstance(value, dict) or set(value) != required or value['version'] != 1
            or value['queue_id'] != identifier or type(value['allow_external']) is not bool
            or not isinstance(value['gpu_uuids'], list) or not value['gpu_uuids']
            or any(not isinstance(v, str) or not re.fullmatch(r'GPU-[A-Za-z0-9-]+', v) for v in value['gpu_uuids'])
            or len(set(value['gpu_uuids'])) != len(value['gpu_uuids'])
            or not isinstance(value['inventory_id'], str) or not re.fullmatch(r'[0-9a-f]{64}', value['inventory_id'])):
        raise ValueError('invalid queue ledger')
    return value


def _paused(base, queue_id):
    path = base / 'state/queue-control' / (queue_id + '.json')
    if not path.exists():
        return False
    value = _read(path)
    if not isinstance(value, dict) or set(value) != {'paused'} or type(value['paused']) is not bool:
        raise ValueError('invalid queue control ledger')
    return value['paused']


def validate_job(job, root, queue):
    if not isinstance(job, dict) or set(job) - JOB_FIELDS:
        raise ValueError('unknown task fields')
    required = {'job_id', 'command', 'cwd', 'memory_mib', 'max_runtime_seconds'}
    if not required.issubset(job):
        raise ValueError('missing task fields')
    result = dict(job)
    _id(job['job_id'])
    if (not isinstance(job['command'], list) or not job['command']
            or any(not isinstance(v, str) or not v or '\x00' in v for v in job['command'])):
        raise ValueError('command must be a nonempty argument array')
    executable = Path(job['command'][0])
    if not executable.is_absolute() or not executable.is_file() or not os.access(str(executable), os.X_OK):
        raise ValueError('command executable must be an existing absolute executable path')
    result['cwd'] = str(_path(job['cwd'], _path(root, directory=True), directory=True))
    _number(job['memory_mib'], 1)
    if job['max_runtime_seconds'] is not None:
        _number(job['max_runtime_seconds'], 0.001)
    for key in ('host_memory_mib', 'disk_free_mib'):
        result[key] = _number(job.get(key, 1), 1)
    resume = job.get('resume', {'enabled': False})
    if not isinstance(resume, dict) or set(resume) - {'enabled', 'grace_seconds', 'max_restarts'} or type(resume.get('enabled')) is not bool:
        raise ValueError('invalid resume declaration')
    grace = _number(resume.get('grace_seconds', 60), 1)
    retries = resume.get('max_restarts', 3 if resume['enabled'] else 0)
    if grace > 600 or type(retries) is not int or not 0 <= retries <= 10000:
        raise ValueError('invalid recovery budget')
    result['resume'] = dict(enabled=resume['enabled'], grace_seconds=grace, max_restarts=retries)
    result.update(queue_id=queue['queue_id'], gpu_uuids=queue['gpu_uuids'],
                  inventory_id=queue['inventory_id'], allow_external=queue['allow_external'])
    current = snapshot(root)
    if _inventory(current['gpus']) != queue['inventory_id']:
        raise ValueError('hardware inventory changed; probe and select again')
    cards = [g for g in current['gpus'] if g['uuid'] in queue['gpu_uuids']]
    multi = job.get('multi_gpu')
    if multi is not None:
        if (not isinstance(multi, dict) or set(multi) - {'sharding_supported', 'gpu_count', 'memory_mib_per_gpu', 'compatible_models'}
                or multi.get('sharding_supported') is not True or type(multi.get('gpu_count')) is not int
                or not 2 <= multi['gpu_count'] <= len(cards)
                or not isinstance(multi.get('memory_mib_per_gpu'), list)
                or len(multi['memory_mib_per_gpu']) != multi['gpu_count']):
            raise ValueError('multi-GPU requires existing sharding and explicit per-card budgets')
        for budget in multi['memory_mib_per_gpu']:
            _number(budget, 1)
        models = multi.get('compatible_models')
        if (not isinstance(models, list) or not models or any(not isinstance(v, str) or not v for v in models)
                or len(set(models)) != len(models)):
            raise ValueError('invalid compatible GPU models')
        cards = [g for g in cards if g['name'] in models]
        if not cards:
            raise ValueError('no selected GPU matches the declared compatible models')
    maximum = max(g['memory_total_mib'] - MARGIN_MIB for g in cards)
    if job['memory_mib'] > maximum:
        if multi is None:
            raise ValueError('task exceeds every single GPU; provide a verified sharding adapter')
        candidates = sorted((g['memory_total_mib'] - MARGIN_MIB for g in cards), reverse=True)
        budgets = sorted(multi['memory_mib_per_gpu'], reverse=True)
        if len(candidates) < len(budgets) or any(b > c for b, c in zip(budgets, candidates)):
            raise ValueError('per-card sharding budgets do not fit the selected GPU models')
        result['gpu_count'] = multi['gpu_count']
    else:
        result['gpu_count'] = 1
    return result


def _active(base):
    result = []
    for path in sorted((base / 'state/reservations').glob('*.json')):
        value = _read(path)
        required = {'version', 'reservation_id', 'job_id', 'attempt', 'gpus', 'exclusive',
                    'host_memory_mib', 'disk_free_mib', 'pgid'}
        if (not isinstance(value, dict) or set(value) != required or value['version'] != 1
                or value['reservation_id'] != path.stem or not re.fullmatch(r'[0-9a-f]{32}', path.stem)
                or type(value['exclusive']) is not bool or not isinstance(value['gpus'], list) or not value['gpus']):
            raise ValueError('invalid reservation ledger')
        _id(value['job_id'])
        if not re.fullmatch(r'attempt-[0-9]{4,}', str(value['attempt'])):
            raise ValueError('invalid reservation attempt')
        for gpu in value['gpus']:
            if not isinstance(gpu, dict) or set(gpu) != {'uuid', 'memory_mib'} or not re.fullmatch(r'GPU-[A-Za-z0-9-]+', str(gpu['uuid'])):
                raise ValueError('invalid reservation GPU')
            _number(gpu['memory_mib'], 1)
        if len(set(g['uuid'] for g in value['gpus'])) != len(value['gpus']):
            raise ValueError('duplicate reserved GPU')
        for key in ('host_memory_mib', 'disk_free_mib'):
            _number(value[key], 1)
        if value['pgid'] is not None and (type(value['pgid']) is not int or value['pgid'] <= 0):
            raise ValueError('invalid reservation process group')
        probe = _lock(path.with_suffix('.lock'), shared=True, existing=True)
        if probe is None:
            result.append(value)
        else:
            probe.close()
    groups = [r['pgid'] for r in result if r['pgid'] is not None]
    if len(groups) != len(set(groups)):
        raise ValueError('ambiguous reservation process group')
    return result


def _usage(card, reservations, allow_external):
    total, free, utilization = (_number(card[k]) for k in ('memory_total_mib', 'memory_free_mib', 'utilization'))
    if total <= 0 or free > total or utilization > 100 or not isinstance(card['processes'], list):
        raise ValueError('invalid GPU sample')
    observed = {r['reservation_id']: 0 for r in reservations}
    seen = set()
    used_total = 0
    for process in card['processes']:
        pid = process['pid']
        if type(pid) is not int or pid <= 0 or pid in seen:
            raise ValueError('invalid GPU process sample')
        seen.add(pid)
        used = _number(process['used_mib'])
        used_total += used
        if used_total > total - free:
            raise ValueError('GPU process memory exceeds sampled device usage')
        try:
            group = os.getpgid(pid)
        except OSError:
            raise ValueError('GPU process changed or cannot be attributed')
        matches = [r for r in reservations if r['pgid'] == group
                   and any(g['uuid'] == card['uuid'] for g in r['gpus'])]
        if not matches:
            if not allow_external:
                return None
        else:
            observed[matches[0]['reservation_id']] += used
    if not seen and utilization and not allow_external:
        return None
    return observed


class Reservation:
    def __init__(self, base, record, gpu_locks, slot_lock):
        self.base, self.record = base, record
        self.uuids = [g['uuid'] for g in record['gpus']]
        self.gpu_locks, self.slot_lock = gpu_locks, slot_lock
        self.path = base / 'state/reservations' / (record['reservation_id'] + '.json')

    @property
    def fds(self):
        return tuple(s.fileno() for s in self.gpu_locks + [self.slot_lock])

    def set_process(self, pid):
        if self.record['pgid'] is not None or os.getpgid(pid) != pid:
            raise ValueError('target must lead its newly created process group')
        self.record = dict(self.record, pgid=pid)
        _write(self.path, self.record)

    def close(self):
        # Close, never LOCK_UN: descendants inherit this open-file-description lease.
        for stream in self.gpu_locks + ([self.slot_lock] if self.slot_lock else []):
            stream.close()
        self.gpu_locks, self.slot_lock = [], None

    def released(self):
        stream = _lock(self.path.with_suffix('.lock'), shared=True, existing=True)
        if stream is None:
            return False
        stream.close()
        return True


def _capacities(request, sample, active):
    if _inventory(sample['gpus']) != request['inventory_id']:
        raise ValueError('hardware inventory changed; select again')
    for key in ('host_memory_mib', 'disk_free_mib'):
        if _number(sample[key]) - sum(r[key] for r in active) < request[key]:
            return []
    result = []
    for card in sample['gpus']:
        if card['uuid'] not in request['gpu_uuids']:
            continue
        same = [r for r in active if any(g['uuid'] == card['uuid'] for g in r['gpus'])]
        if any(r['exclusive'] for r in same):
            continue
        if not request['resume']['enabled'] and (same or card['processes'] or card['utilization'] != 0):
            continue
        observed = _usage(card, same, request['allow_external'])
        if observed is None:
            continue
        unallocated = peak_total = 0
        over = False
        for reservation in same:
            budget = next(g['memory_mib'] for g in reservation['gpus'] if g['uuid'] == card['uuid'])
            peak_total += budget
            usage = observed[reservation['reservation_id']]
            over = over or usage > budget
            unallocated += max(0, budget - usage)
        if not over:
            capacity = min(card['memory_free_mib'] - unallocated, card['memory_total_mib'] - peak_total) - MARGIN_MIB
            result.append((card, capacity))
    return sorted(result, key=lambda item: (-item[1], item[0]['uuid']))


def acquire(root, request, attempt):
    base = _base(root, create=True)
    gate = _lock(base / 'locks/admission.lock')
    if gate is None:
        return None
    handles, slot = [], None
    try:
        candidates = _capacities(request, snapshot(root), _active(base))
        budgets = ([request['memory_mib']] if request['gpu_count'] == 1
                   else request['multi_gpu']['memory_mib_per_gpu'])
        chosen = [None] * len(budgets)
        for rank, budget in sorted(enumerate(budgets), key=lambda item: -item[1]):
            matched = next(((card, free) for card, free in candidates
                            if card['uuid'] not in [c['uuid'] for c in chosen if c is not None] and free >= budget
                            and (request.get('multi_gpu') is None
                                 or card['name'] in request['multi_gpu']['compatible_models'])), None)
            if matched is None:
                return None
            chosen[rank] = dict(uuid=matched[0]['uuid'], memory_mib=budget)
        for card in sorted(chosen, key=lambda g: g['uuid']):
            stream = _lock(base / 'locks' / (card['uuid'] + '.lock'), shared=request['resume']['enabled'])
            if stream is None:
                return None
            handles.append(stream)
        fresh = {c['uuid']: free for c, free in _capacities(request, snapshot(root), _active(base))}
        if any(fresh.get(g['uuid'], -1) < g['memory_mib'] for g in chosen):
            return None
        identifier = uuid.uuid4().hex
        slot = _lock(base / 'state/reservations' / (identifier + '.lock'))
        record = dict(version=1, reservation_id=identifier, job_id=request['job_id'], attempt=attempt,
                      gpus=chosen, exclusive=not request['resume']['enabled'], pgid=None,
                      host_memory_mib=request['host_memory_mib'], disk_free_mib=request['disk_free_mib'])
        _write(base / 'state/reservations' / (identifier + '.json'), record, exclusive=True)
        reservation = Reservation(base, record, handles, slot)
        handles, slot = [], None
        return reservation
    finally:
        for stream in handles + ([slot] if slot else []):
            stream.close()
        gate.close()


def _pressure(root, request, reservation):
    sample = snapshot(root)
    if _inventory(sample['gpus']) != request['inventory_id']:
        return 'hardware_inventory_changed'
    active = _active(reservation.base)
    if not any(r['reservation_id'] == reservation.record['reservation_id'] for r in active):
        return 'reservation_missing'
    for key in ('host_memory_mib', 'disk_free_mib'):
        if _number(sample[key]) < sum(r[key] for r in active):
            return key + '_headroom'
    cards = {g['uuid']: g for g in sample['gpus']}
    for selected in reservation.record['gpus']:
        card = cards.get(selected['uuid'])
        if card is None:
            return 'GPU_missing'
        same = [r for r in active if any(g['uuid'] == card['uuid'] for g in r['gpus'])]
        usage = _usage(card, same, request['allow_external'])
        if usage is None:
            return 'external_GPU_process'
        remaining = 0
        for item in same:
            budget = next(g['memory_mib'] for g in item['gpus'] if g['uuid'] == card['uuid'])
            if usage[item['reservation_id']] > budget:
                return 'GPU_memory_budget_exceeded'
            remaining += max(0, budget - usage[item['reservation_id']])
        if card['memory_free_mib'] - remaining < MARGIN_MIB:
            return 'GPU_memory_headroom'
    return None


def _signal(child, signum):
    # child was created here with start_new_session; never signal telemetry PIDs.
    try:
        os.killpg(child.pid, signum)
    except ProcessLookupError:
        pass


def run_job(root, job_id, poll_interval=5):
    """Only Python tests may inject the interval; MCP/CLI never accept this field."""
    root, job_id = _path(root, directory=True), _id(job_id)
    base = _base(root)
    job = _path(base / 'jobs' / job_id, root, directory=True)
    task = _lock(job / 'task.lock', existing=True)
    if task is None:
        raise ValueError('task or surviving target already holds its lease')
    monitor = _lock(job / 'worker.lock', existing=True)
    if monitor is None:
        task.close()
        raise ValueError('worker already holds its monitoring lease')
    reservation = child = None
    previous_signals, stopped = {}, []
    runtime, attempts = 0.0, 0
    request = _read(job / 'request.json')
    request_id = checkpoint.request_identity(request)
    if _read(job / 'identity.json') != {'request_id': request_id} or request['job_id'] != job_id:
        task.close()
        monitor.close()
        raise ValueError('immutable request changed')
    cfg = request['resume']
    cp_dir = job / 'checkpoints'
    state = dict(job_id=job_id, queue_id=request['queue_id'], status='waiting', worker_pid=os.getpid(),
                 attempt=0, runtime_seconds=0, request_id=request_id)

    def update(status, reason=None, **details):
        state.update(status=status, reason=reason, runtime_seconds=runtime, **details)
        _write(job / 'status.json', state)

    def cancelled():
        return bool(stopped or (job / 'CANCEL').exists())

    try:
        _write(job / 'STARTED', dict(pid=os.getpid()), exclusive=True)
        for sig in (signal.SIGTERM, signal.SIGINT):
            previous_signals[sig] = signal.signal(sig, lambda signum, frame: stopped.append(signum))
        while True:
            if cancelled():
                update('cancelled', 'cancelled_waiting')
                return
            expected_queue = dict((key, request[key]) for key in ('queue_id', 'gpu_uuids', 'inventory_id', 'allow_external'))
            expected_queue['version'] = 1
            if _queue(base, request['queue_id']) != expected_queue:
                raise ValueError('immutable queue changed')
            if _paused(base, request['queue_id']):
                update('waiting', 'queue_paused')
                time.sleep(poll_interval)
                continue
            name = 'attempt-%04d' % (attempts + 1)
            try:
                reservation = acquire(root, request, name)
            except (OSError, ValueError, subprocess.SubprocessError) as error:
                update('waiting', 'resource_or_ledger_unavailable', detail=str(error))
            if reservation is None:
                update('waiting', 'no_admitted_GPU')
                time.sleep(poll_interval)
                continue
            if cancelled() or _paused(base, request['queue_id']):
                reservation.close()
                reservation = None
                continue
            manifest = checkpoint.validate_checkpoint(cp_dir, job_id, request_id) if cfg['enabled'] else None
            if attempts and not manifest:
                raise ValueError('resume requires a valid committed checkpoint')
            try:
                launch_pressure = _pressure(root, request, reservation)
            except (OSError, ValueError, subprocess.SubprocessError) as error:
                launch_pressure = 'resource_or_ledger_unavailable: ' + str(error)
            if launch_pressure:
                reservation.close()
                reservation = None
                update('waiting', launch_pressure)
                time.sleep(poll_interval)
                continue
            attempt = job / 'attempts' / name
            attempt.parent.mkdir(exist_ok=True)
            attempt.mkdir(exist_ok=False)
            stop_file = attempt / 'STOP'
            env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', CUDA_VISIBLE_DEVICES=','.join(reservation.uuids),
                       GPU_BACKFILL_JOB_ID=job_id, GPU_BACKFILL_REQUEST_ID=request_id,
                       GPU_BACKFILL_ATTEMPT=name, GPU_BACKFILL_CHECKPOINT_DIR=str(cp_dir),
                       GPU_BACKFILL_STOP_FILE=str(stop_file), GPU_BACKFILL_RESUME=str(int(attempts > 0)),
                       GPU_BACKFILL_RESUME_PATH=str(cp_dir / 'latest.json') if manifest else '',
                       GPU_BACKFILL_HELPER_DIR=str(Path(__file__).resolve().parent))
            _write(attempt / 'selected.json', dict(gpu_uuids=reservation.uuids, request_id=request_id), exclusive=True)
            start = time.monotonic()
            with (attempt / 'stdout.log').open('xb') as output, (attempt / 'stderr.log').open('xb') as errors:
                child = subprocess.Popen(request['command'], cwd=request['cwd'], env=env, stdin=subprocess.DEVNULL,
                                         stdout=output, stderr=errors, start_new_session=True,
                                         pass_fds=(task.fileno(), *reservation.fds))
            reservation.set_process(child.pid)
            attempts += 1
            update('running', attempt=attempts, target_pid=child.pid, gpu_uuids=reservation.uuids)
            stop_at = term_at = None
            reason = None
            next_sample = time.monotonic() + poll_interval
            while child.poll() is None:
                now = time.monotonic()
                elapsed = runtime + now - start
                limit = request['max_runtime_seconds']
                if cancelled():
                    reason = 'cancelled'
                elif limit is not None and elapsed >= max(0, limit - (cfg['grace_seconds'] + 5 if cfg['enabled'] else 0)):
                    reason = 'runtime_budget'
                elif now >= next_sample:
                    try:
                        pressure = _pressure(root, request, reservation)
                    except (OSError, ValueError, subprocess.SubprocessError) as error:
                        pressure = 'resource_or_ledger_unavailable: ' + str(error)
                    if pressure:
                        reason = pressure
                    next_sample = now + poll_interval
                if reason and stop_at is None:
                    _write(stop_file, dict(reason=reason), exclusive=not stop_file.exists())
                    stop_at = now
                    update('stopping', reason)
                if stop_at is not None and (now - stop_at >= cfg['grace_seconds'] or (limit is not None and elapsed >= limit)):
                    if term_at is None:
                        _signal(child, signal.SIGTERM)
                        term_at = now
                    elif now - term_at >= 5:
                        _signal(child, signal.SIGKILL)
                time.sleep(min(poll_interval, 0.2))
            code = child.wait()
            runtime += time.monotonic() - start
            reservation.close()
            if not reservation.released():
                # The reaped leader's PGID may be reused. Never signal it after wait().
                _write(attempt / 'receipt.json', dict(returncode=code, reason='descendants_hold_leases',
                                                      runtime_seconds=runtime), exclusive=True)
                update('needs_verification', 'unmanaged_descendants_hold_leases')
                return
            reservation = None
            _write(attempt / 'receipt.json', dict(returncode=code, reason=reason, runtime_seconds=runtime), exclusive=True)
            child = None
            if cancelled() or reason == 'cancelled':
                update('cancelled', 'cancelled')
                return
            if reason == 'runtime_budget':
                update('failed', 'runtime_budget')
                return
            if code == 0:
                update('completed')
                return
            manifest = checkpoint.validate_checkpoint(cp_dir, job_id, request_id) if cfg['enabled'] else None
            retry = (cfg['enabled'] and manifest and attempts <= cfg['max_restarts']
                     and (request['max_runtime_seconds'] is None or runtime < request['max_runtime_seconds'])
                     and (code == -signal.SIGKILL or (code == 75 and manifest['attempt'] == name)
                          or (reason and code in (-signal.SIGTERM, -signal.SIGINT))))
            if not retry:
                update('failed', 'target_exit_%s' % code, returncode=code)
                return
            update('waiting_resume', reason)
            time.sleep(poll_interval)
    except BaseException as error:
        if child is not None and child.poll() is None:
            _signal(child, signal.SIGKILL)
            child.wait()
        update('needs_verification', str(error))
        raise
    finally:
        if reservation is not None:
            reservation.close()
        for sig, handler in previous_signals.items():
            signal.signal(sig, handler)
        task.close()
        monitor.close()


def dispatch(request, release_dir=None):
    if not isinstance(request, dict) or 'action' not in request or 'root' not in request:
        raise ValueError('action and root are required')
    action, root = request['action'], _path(request['root'], directory=True)
    if action == 'probe':
        cards = snapshot(root)['gpus']
        return dict(gpus=cards, inventory_id=_inventory(cards))
    base = _base(root, create=action in ('create_queue', 'submit'))
    if action == 'create_queue':
        if request.get('selection_confirmed') is not True:
            raise ValueError('explicit user GPU selection confirmation is required')
        cards = snapshot(root)['gpus']
        inventory = _inventory(cards)
        selected = request.get('gpu_uuids')
        if (not isinstance(selected, list) or not selected or any(not isinstance(v, str) for v in selected)
                or len(set(selected)) != len(selected) or not set(selected).issubset({g['uuid'] for g in cards})
                or request.get('inventory_id') != inventory or type(request.get('allow_external', True)) is not bool):
            raise ValueError('invalid selection or changed hardware inventory')
        queue = dict(version=1, queue_id=_id(request['queue_id']), gpu_uuids=sorted(selected),
                     inventory_id=inventory, allow_external=request.get('allow_external', True))
        _write(base / 'queues' / (queue['queue_id'] + '.json'), queue, exclusive=True)
        return dict(queue=queue)
    if action == 'submit':
        queue = _queue(base, request['queue_id'])
        job = validate_job(request['job'], root, queue)
        release = _path(release_dir or Path(__file__).resolve().parent, directory=True)
        source = _path(release / 'worker.py')
        if not source.is_file():
            raise ValueError('missing pinned worker release')
        launch_boot_id = _boot_id()
        launch_monotonic_seconds = time.monotonic()
        directory = _path(base / 'jobs' / job['job_id'], root)
        directory.mkdir(exist_ok=False)
        _write(directory / 'request.json', job, exclusive=True)
        _write(directory / 'identity.json', dict(request_id=checkpoint.request_identity(job)), exclusive=True)
        with (directory / 'task.lock').open('xb'):
            pass
        with (directory / 'worker.lock').open('xb'):
            pass
        initial = dict(job_id=job['job_id'], queue_id=queue['queue_id'], status='launching',
                       launch_boot_id=launch_boot_id, launch_monotonic_seconds=launch_monotonic_seconds)
        _write(directory / 'status.json', initial, exclusive=True)
        try:
            with (directory / 'worker.log').open('xb') as log:
                child = subprocess.Popen([sys.executable, '-B', str(source), 'run', str(root), job['job_id']],
                                         cwd=str(release), stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                                         start_new_session=True, close_fds=True)
        except OSError as error:
            _write(directory / 'status.json', dict(initial, status='failed', reason='worker_spawn_failed', detail=str(error)))
            _write(directory / 'launch-receipt.json', dict(started=False, error=str(error)), exclusive=True)
            raise
        _write(directory / 'launch-receipt.json', dict(started=True, worker_pid=child.pid), exclusive=True)
        return dict(job_id=job['job_id'], status='queued', worker_pid=child.pid)
    if action == 'status':
        queues, jobs = [], []
        if not base.exists():
            return dict(queues=queues, jobs=jobs)
        queue_id = _id(request['queue_id']) if 'queue_id' in request else None
        job_id = _id(request['job_id']) if 'job_id' in request else None
        paths = [base / 'queues' / (queue_id + '.json')] if queue_id else sorted((base / 'queues').glob('*.json'))
        for path in paths:
            queue = _queue(base, path.stem)
            queues.append(dict(queue, paused=_paused(base, path.stem)))
        directories = ([base / 'jobs' / job_id] if job_id else
                       sorted((base / 'jobs').iterdir()) if (base / 'jobs').exists() else [])
        for directory in directories:
            value = _read(directory / 'status.json')
            if queue_id and value['queue_id'] != queue_id:
                continue
            if value['status'] not in TERMINAL:
                if not (directory / 'STARTED').exists():
                    try:
                        boot = value['launch_boot_id']
                        if (not isinstance(boot, str)
                                or not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', boot)):
                            raise ValueError('invalid launch boot identity')
                        launch_time = _number(value['launch_monotonic_seconds'])
                        if boot != _boot_id():
                            value = dict(value, status='needs_verification', reason='host_boot_changed_before_worker_start')
                        elif _number(time.monotonic() - launch_time) < STARTUP_TIMEOUT_SECONDS:
                            value = dict(value, status='launching', reason='worker_start_not_acknowledged')
                        else:
                            lease = _lock(directory / 'worker.lock', shared=True, existing=True)
                            if lease is not None:
                                try:
                                    value = _read(directory / 'status.json')
                                    if value['status'] not in TERMINAL:
                                        value = dict(value, status='needs_verification', reason='worker_start_timeout')
                                finally:
                                    lease.close()
                    except (KeyError, OSError, TypeError, ValueError):
                        value = dict(value, status='needs_verification', reason='invalid_launch_identity_or_time')
                else:
                    lease = _lock(directory / 'worker.lock', shared=True, existing=True)
                    if lease is not None:
                        try:
                            # Completion can publish between our first read and the probe.
                            value = _read(directory / 'status.json')
                            if value['status'] not in TERMINAL:
                                value = dict(value, status='needs_verification', reason='worker_or_host_stopped')
                        finally:
                            lease.close()
            jobs.append(value)
        return dict(queues=queues, jobs=jobs)
    if action == 'cancel':
        directory = _path(base / 'jobs' / _id(request['job_id']), root, directory=True)
        job = _read(directory / 'request.json')
        if (not isinstance(job, dict) or job.get('job_id') != request['job_id']
                or _read(directory / 'identity.json') != {'request_id': checkpoint.request_identity(job)}):
            raise ValueError('invalid cancellation request identity')
        queue = _queue(base, job.get('queue_id'))
        if any(job.get(key) != queue[key] for key in ('queue_id', 'gpu_uuids', 'inventory_id', 'allow_external')):
            raise ValueError('invalid cancellation queue ownership')
        if not (directory / 'CANCEL').exists():
            _write(directory / 'CANCEL', dict(cancelled=True), exclusive=True)
        return dict(job_id=request['job_id'], cancel_requested=True)
    if action == 'queue_control':
        queue = _queue(base, request['queue_id'])
        if type(request.get('paused')) is not bool:
            raise ValueError('paused must be a boolean')
        _write(base / 'state/queue-control' / (queue['queue_id'] + '.json'), dict(paused=request['paused']))
        return dict(queue_id=queue['queue_id'], paused=request['paused'])
    raise ValueError('unknown worker action')


if __name__ == '__main__':
    try:
        if len(sys.argv) != 4 or sys.argv[1] != 'run':
            raise ValueError('usage: worker.py run ROOT JOB_ID')
        run_job(sys.argv[2], sys.argv[3])
    except Exception as error:
        print(json.dumps(dict(error=str(error))), file=sys.stderr)
        sys.exit(1)

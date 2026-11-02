"""Opaque cooperative checkpoints. Serialization and training semantics belong to the task."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import uuid


def _json(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


def request_identity(request):
    return hashlib.sha256(_json(request)).hexdigest()


def _directory(value, create=False):
    path = Path(value)
    if not path.is_absolute() or path.absolute() != path.resolve() or path.is_symlink():
        raise ValueError('checkpoint directory must be an absolute path without links')
    if create:
        path.mkdir(parents=True, exist_ok=True)
    if path.exists() and not path.is_dir():
        raise ValueError('checkpoint directory is not a directory')
    return path


def _open_file(path):
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode):
        raise ValueError('checkpoint member must be a regular file')
    descriptor = os.open(str(path), os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    stream = os.fdopen(descriptor, 'rb')
    after = os.fstat(stream.fileno())
    if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino):
        stream.close()
        raise ValueError('checkpoint member changed while opening')
    return stream


def _read_file(path):
    with _open_file(path) as stream:
        return stream.read()


def _sync(path):
    descriptor = os.open(str(path), os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _new(path, data):
    descriptor = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


def _publish(root, name, value):
    target = root / name
    if target.exists() and (target.is_symlink() or not target.is_file()):
        raise ValueError('invalid checkpoint metadata destination')
    pending = root / (name + '.' + uuid.uuid4().hex + '.pending')
    _new(pending, _json(value))
    os.replace(str(pending), str(target))
    _sync(root)


def _identity(job_id, request_id, attempt=None):
    if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,79}', job_id):
        raise ValueError('invalid checkpoint job identity')
    if not isinstance(request_id, str) or not re.fullmatch(r'[0-9a-f]{64}', request_id):
        raise ValueError('invalid checkpoint request identity')
    if attempt is not None and (not isinstance(attempt, str) or not re.fullmatch(r'attempt-[0-9]{4,}', attempt)):
        raise ValueError('invalid checkpoint attempt identity')


def _validate_manifest(root, manifest, job_id, request_id):
    fields = {'version', 'job_id', 'request_id', 'attempt', 'file', 'size_bytes', 'sha256', 'progress'}
    if not isinstance(manifest, dict) or set(manifest) != fields or type(manifest['version']) is not int or manifest['version'] != 1:
        raise ValueError('invalid checkpoint manifest')
    _identity(manifest['job_id'], manifest['request_id'], manifest['attempt'])
    if manifest['job_id'] != job_id or manifest['request_id'] != request_id:
        raise ValueError('checkpoint belongs to another request')
    if not isinstance(manifest['file'], str) or not re.fullmatch(r'state-[0-9a-f]{32}\.bin', manifest['file']):
        raise ValueError('invalid checkpoint filename')
    if type(manifest['size_bytes']) is not int or manifest['size_bytes'] <= 0:
        raise ValueError('invalid checkpoint size')
    if not isinstance(manifest['sha256'], str) or not re.fullmatch(r'[0-9a-f]{64}', manifest['sha256']):
        raise ValueError('invalid checkpoint digest')
    progress = manifest['progress']
    if not isinstance(progress, dict) or type(progress.get('step')) is not int or progress['step'] < 0:
        raise ValueError('checkpoint progress needs a nonnegative integer step')
    _json(progress)
    digest, size = hashlib.sha256(), 0
    with _open_file(root / manifest['file']) as stream:
        for block in iter(lambda: stream.read(1048576), b''):
            digest.update(block)
            size += len(block)
    if size != manifest['size_bytes'] or digest.hexdigest() != manifest['sha256']:
        raise ValueError('checkpoint bytes do not match manifest')
    return manifest


def validate_checkpoint(directory, job_id, request_id):
    """Check committed bytes and identity, never deserialize or fall back to previous."""
    _identity(job_id, request_id)
    root = _directory(directory)
    manifest_path = root / 'latest.json'
    if not manifest_path.exists() and not manifest_path.is_symlink():
        return None
    return _validate_manifest(root, json.loads(_read_file(manifest_path).decode('utf-8')), job_id, request_id)


class Checkpoint:
    def __init__(self, directory, job_id, request_id, attempt='attempt-0001', stop_file=None, resume=False):
        _identity(job_id, request_id, attempt)
        self.directory = _directory(directory)
        self.job_id, self.request_id, self.attempt = job_id, request_id, attempt
        self.stop_file = Path(stop_file) if stop_file else None
        self.resume = resume

    @classmethod
    def from_environment(cls):
        env = os.environ
        if env['GPU_BACKFILL_RESUME'] not in ('0', '1'):
            raise ValueError('invalid resume environment')
        return cls(env['GPU_BACKFILL_CHECKPOINT_DIR'], env['GPU_BACKFILL_JOB_ID'],
                   env['GPU_BACKFILL_REQUEST_ID'], env['GPU_BACKFILL_ATTEMPT'],
                   env['GPU_BACKFILL_STOP_FILE'], env['GPU_BACKFILL_RESUME'] == '1')

    @property
    def stopping(self):
        return self.stop_file is not None and self.stop_file.exists()

    def save_bytes(self, data, progress):
        if not isinstance(data, bytes) or not data:
            raise ValueError('checkpoint state must be nonempty bytes')
        if not isinstance(progress, dict) or type(progress.get('step')) is not int or progress['step'] < 0:
            raise ValueError('checkpoint progress needs a nonnegative integer step')
        progress = json.loads(_json(progress))
        previous = validate_checkpoint(self.directory, self.job_id, self.request_id)
        old_path = self.directory / 'previous.json'
        obsolete = (_validate_manifest(self.directory, json.loads(_read_file(old_path)), self.job_id, self.request_id)
                    if old_path.exists() or old_path.is_symlink() else None)
        if previous and progress['step'] < previous['progress']['step']:
            raise ValueError('checkpoint progress cannot move backwards')
        root = _directory(self.directory, create=True)
        name = 'state-' + uuid.uuid4().hex + '.bin'
        _new(root / name, data)
        manifest = dict(version=1, job_id=self.job_id, request_id=self.request_id,
                        attempt=self.attempt, file=name, size_bytes=len(data),
                        sha256=hashlib.sha256(data).hexdigest(), progress=progress)
        if previous:
            _publish(root, 'previous.json', previous)
        _publish(root, 'latest.json', manifest)
        if obsolete and obsolete['file'] not in {name, previous['file'] if previous else None}:
            # Only the exact verified, superseded generation; unknown files remain untouched.
            _validate_manifest(root, obsolete, self.job_id, self.request_id)
            (root / obsolete['file']).unlink()
            _sync(root)
        return manifest

    def load_bytes(self):
        manifest = validate_checkpoint(self.directory, self.job_id, self.request_id)
        if manifest is None:
            if self.resume:
                raise ValueError('resume requires a committed checkpoint')
            return None
        data = _read_file(self.directory / manifest['file'])
        if len(data) != manifest['size_bytes'] or hashlib.sha256(data).hexdigest() != manifest['sha256']:
            raise ValueError('checkpoint changed during load')
        return data, manifest['progress']

    def exit_if_requested(self, save_callback):
        if self.stopping:
            before = validate_checkpoint(self.directory, self.job_id, self.request_id)
            save_callback()
            current = validate_checkpoint(self.directory, self.job_id, self.request_id)
            if (current is None or current['attempt'] != self.attempt
                    or (before is not None and current['file'] == before['file'])):
                raise ValueError('save callback did not commit this attempt checkpoint')
            raise SystemExit(75)

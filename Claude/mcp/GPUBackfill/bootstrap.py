"""Fixed stdin bootstrap for read-only RPC and versioned project-local releases."""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import types
import uuid

FILES = ("checkpoint.py", "worker.py")
ACTIONS = ("probe", "prepare", "create_queue", "submit", "status", "cancel", "queue_control")
PRODUCT = {"product": "GPUBackfill", "state_version": 1}


def identity(files):
    digest = hashlib.sha256()
    for name in FILES:
        digest.update((name + "\0").encode("utf-8"))
        digest.update(files[name].encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def safe_path(value, kind=None):
    path = Path(value)
    if not path.is_absolute() or str(path) != str(value):
        raise ValueError("Non-canonical deployment path")
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current = current / part
        if current.is_symlink():
            raise ValueError("Deployment path contains a symbolic link")
        if current.exists() and not (current.is_dir() or current.is_file()):
            raise ValueError("Unsupported deployment path type")
    if kind == "directory" and not path.is_dir():
        raise ValueError("Expected existing project directory")
    if kind == "file" and not path.is_file():
        raise ValueError("Expected regular deployment file")
    return path


def new_directory(path):
    safe_path(path)
    try:
        path.mkdir(mode=0o700)
    except FileExistsError:
        safe_path(path, "directory")
    return path


def write_new(path, content):
    safe_path(path)
    fd = os.open(str(path), os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())


def json_bytes(value):
    return (json.dumps(value, sort_keys=True) + "\n").encode("utf-8")


def read_json(path):
    safe_path(path, "file")
    return json.loads(path.read_text(encoding="utf-8"))


def release_files(directory):
    safe_path(directory, "directory")
    if sorted(entry.name for entry in directory.iterdir()) != list(FILES):
        raise ValueError("Existing release file set conflicts with GPUBackfill")
    result = {}
    for name in FILES:
        file = safe_path(directory / name, "file")
        result[name] = file.read_bytes().decode("utf-8")
    return result


def ensure_release(root, files, release_id):
    state = root / ".gpubackfill"
    safe_path(state)
    try:
        state.mkdir(mode=0o700)
    except FileExistsError:
        safe_path(state, "directory")
        marker = read_json(state / "product.json")
        if marker != PRODUCT or type(marker["state_version"]) is not int:
            raise ValueError("GPUBackfill state ownership conflict")
    else:
        write_new(state / "product.json", json_bytes(PRODUCT))
    lock_path = safe_path(state / "deploy.lock")
    fd = os.open(str(lock_path), os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise ValueError("Invalid deployment lock")
        fcntl.flock(fd, fcntl.LOCK_EX)
        releases = new_directory(state / "releases")
        current_path = safe_path(state / "current.json")
        previous = None
        if current_path.exists():
            current = read_json(current_path)
            previous = current.get("release_id")
            if not isinstance(previous, str) or not re.fullmatch(r"[0-9a-f]{64}", previous):
                raise ValueError("Invalid active release record")
            if identity(release_files(releases / previous)) != previous:
                raise ValueError("Active release content is damaged")
        release = safe_path(releases / release_id)
        if release.exists():
            if release_files(release) != files:
                raise ValueError("Existing release content conflicts with upload")
        else:
            staging = releases / (".incoming-" + uuid.uuid4().hex)
            staging.mkdir(mode=0o700)
            for name in FILES:
                compile(files[name], str(staging / name), "exec")
                write_new(staging / name, files[name].encode("utf-8"))
            if identity(release_files(staging)) != release_id:
                raise ValueError("Staged release failed integrity verification")
            if not callable(getattr(load_worker(files, staging), "dispatch", None)):
                raise ValueError("Runtime self-check failed: dispatch entry is missing")
            # Exclusive publication; only current.json makes a complete release active.
            release.mkdir(mode=0o700)
            for name in FILES:
                os.link(str(staging / name), str(release / name), follow_symlinks=False)
            if release_files(release) != files:
                raise ValueError("Published release failed verification")
            for name in FILES:
                (staging / name).unlink()
            staging.rmdir()
        if previous != release_id:
            temporary = state / (".current-" + uuid.uuid4().hex)
            write_new(temporary, json_bytes({"release_id": release_id}))
            safe_path(current_path)
            os.replace(str(temporary), str(current_path))
        return release, previous != release_id
    finally:
        os.close(fd)


def load_worker(files, release):
    # Execute bundled source in memory for read-only calls, without imports/pycache writes.
    modules = {}
    for name in FILES:
        module_name = name[:-3]
        module = types.ModuleType(module_name)
        module.__file__ = str(release / name) if release else "<GPUBackfill/" + name + ">"
        sys.modules[module_name] = module
        exec(compile(files[name], module.__file__, "exec"), module.__dict__)
        modules[module_name] = module
    return modules["worker"]


def main(envelope):
    if sys.platform != "linux" or sys.version_info < (3, 8):
        raise ValueError("GPUBackfill execution requires Linux and Python 3.8+")
    files = envelope.get("files")
    if not isinstance(files, dict) or sorted(files) != list(FILES) or any(not isinstance(files[name], str) for name in FILES):
        raise ValueError("Invalid runtime file set")
    release_id = envelope.get("release_id")
    if not isinstance(release_id, str) or not re.fullmatch(r"[0-9a-f]{64}", release_id) or identity(files) != release_id:
        raise ValueError("Runtime upload integrity mismatch")
    request = envelope.get("request")
    if not isinstance(request, dict) or request.get("action") not in ACTIONS:
        raise ValueError("Invalid GPUBackfill action")
    root_value = request.get("root")
    if not isinstance(root_value, str) or root_value == "/" or os.path.normpath(root_value) != root_value:
        raise ValueError("Invalid project root")
    root = safe_path(root_value, "directory")
    release = None
    if request["action"] in ("prepare", "create_queue", "submit"):
        release, updated = ensure_release(root, files, release_id)
        if request["action"] == "prepare":
            return {"product": "GPUBackfill", "release_id": release_id, "release_dir": str(release), "updated": updated}
    worker = load_worker(files, release)
    return worker.dispatch(request, release_dir=str(release) if release else None)


if __name__ == "__main__":
    try:
        raw = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
        if len(raw) > 4 * 1024 * 1024:
            raise ValueError("GPUBackfill request exceeds 4 MiB")
        result = main(json.loads(raw))
    except Exception as error:
        result = {"error": str(error)}
    print(json.dumps(result))

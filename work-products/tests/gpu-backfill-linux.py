"""Isolated Linux contracts; run with the repository .venv Python, no GPU required."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[2] / 'Codex' / 'mcp' / 'GPUBackfill'
sys.path.insert(0, str(SOURCE))
import worker
import checkpoint


def gpu(identifier='GPU-a', model='NVIDIA RTX 4090', total=24000, free=20000):
    return dict(index=0, uuid=identifier, name=model, memory_total_mib=total,
                memory_free_mib=free, utilization=0, processes=[])


def sample(cards=None):
    return dict(gpus=cards if cards is not None else [gpu()],
                host_memory_mib=64000, disk_free_mib=64000)


class Contracts(unittest.TestCase):
    def setUp(self):
        scratch = Path(__file__).resolve().parent / '.tmp'
        scratch.mkdir(exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=str(scratch))
        self.root = Path(self.tmp.name)
        self.telemetry = mock.patch.object(worker, 'snapshot', return_value=sample())
        self.telemetry.start()
        self.addCleanup(self.telemetry.stop)
        self.addCleanup(self.tmp.cleanup)

    def request(self, **extra):
        result = dict(job_id='job', command=[sys.executable, '-c', 'pass'],
                      cwd=str(self.root), memory_mib=2000, max_runtime_seconds=10)
        result.update(extra)
        return result

    def queue(self, cards=None, **extra):
        if cards is not None:
            worker.snapshot.return_value = sample(cards)
        inventory = worker.dispatch(dict(action='probe', root=str(self.root)))
        values = dict(action='create_queue', root=str(self.root), queue_id='queue',
                      gpu_uuids=[g['uuid'] for g in inventory['gpus']],
                      inventory_id=inventory['inventory_id'], selection_confirmed=True)
        values.update(extra)
        return worker.dispatch(values)

    def submit(self, job=None):
        with mock.patch.object(worker.subprocess, 'Popen') as launch:
            launch.return_value.pid = 99999999
            result = worker.dispatch(dict(action='submit', root=str(self.root),
                                          queue_id='queue', job=job or self.request()))
        return result

    def test_probe_zero_one_mixed_and_read_only(self):
        for cards in ([], [gpu()], [gpu(), gpu('GPU-b', 'NVIDIA A100', 80000, 60000)]):
            worker.snapshot.return_value = sample(cards)
            answer = worker.dispatch(dict(action='probe', root=str(self.root)))
            self.assertEqual(len(answer['gpus']), len(cards))
            self.assertFalse((self.root / '.gpubackfill').exists())
        worker.dispatch(dict(action='status', root=str(self.root)))
        self.assertFalse((self.root / '.gpubackfill').exists())

    def test_prepare_only_status_is_empty_and_read_only(self):
        base = self.root / '.gpubackfill'
        (base / 'releases').mkdir(parents=True)
        (base / 'product.json').write_text('{"product":"GPUBackfill","state_version":1}')
        before = sorted(str(p.relative_to(self.root)) for p in self.root.rglob('*'))
        self.assertEqual(worker.dispatch(dict(action='status', root=str(self.root))), dict(queues=[], jobs=[]))
        self.assertEqual(before, sorted(str(p.relative_to(self.root)) for p in self.root.rglob('*')))

    def test_inventory_ignores_index_usage_but_binds_hardware(self):
        before = worker.dispatch(dict(action='probe', root=str(self.root)))['inventory_id']
        worker.snapshot.return_value['gpus'][0].update(index=7, memory_free_mib=100)
        after = worker.dispatch(dict(action='probe', root=str(self.root)))['inventory_id']
        self.assertEqual(before, after)
        worker.snapshot.return_value['gpus'][0]['name'] = 'NVIDIA A100'
        self.assertNotEqual(after, worker.dispatch(dict(action='probe', root=str(self.root)))['inventory_id'])

    def test_selection_required_default_external_and_immutable(self):
        self.queue()
        queue = worker._read(self.root / '.gpubackfill' / 'queues' / 'queue.json')
        self.assertTrue(queue['allow_external'])
        with self.assertRaises((ValueError, FileExistsError)):
            self.queue()
        with self.assertRaises(ValueError):
            self.queue(selection_confirmed=False, queue_id='other')
        with self.assertRaises(ValueError):
            self.queue(inventory_id='invalid', queue_id='other')
        with self.assertRaises(ValueError):
            self.queue(gpu_uuids=['GPU-unknown'], queue_id='other')

    def test_request_validation_and_no_automatic_multicard(self):
        self.queue()
        self.submit()
        with self.assertRaises((ValueError, FileExistsError)):
            self.submit()
        for change in ({'job_id': '../bad'}, {'command': 'echo unsafe'},
                       {'command': ['python', '-c', 'pass']},
                       {'max_runtime_seconds': 0}, {'memory_mib': float('nan')},
                       {'cwd': '/'}, {'unknown': True}):
            with self.assertRaises(ValueError):
                self.submit(self.request(**dict({'job_id': 'invalid'}, **change)))
        with self.assertRaises(ValueError):
            self.submit(self.request(job_id='big', memory_mib=30000))

    def test_queue_pause_cancel_and_status(self):
        self.queue()
        self.submit()
        worker.dispatch(dict(action='queue_control', root=str(self.root), queue_id='queue', paused=True))
        status = worker.dispatch(dict(action='status', root=str(self.root), queue_id='queue'))
        self.assertTrue(status['queues'][0]['paused'])
        worker.dispatch(dict(action='cancel', root=str(self.root), job_id='job'))
        self.assertTrue((self.root / '.gpubackfill' / 'jobs' / 'job' / 'CANCEL').is_file())

    def test_opaque_checkpoint_identity_tamper_and_no_fallback(self):
        directory = self.root / 'state'
        cp = checkpoint.Checkpoint(directory, 'job', 'a' * 64, 'attempt-0001')
        cp.save_bytes(b'first', {'step': 1})
        cp.save_bytes(b'second', {'step': 2})
        self.assertEqual(cp.load_bytes()[0], b'second')
        with self.assertRaises(ValueError):
            checkpoint.validate_checkpoint(directory, 'job', 'b' * 64)
        manifest = json.loads((directory / 'latest.json').read_text())
        (directory / manifest['file']).write_bytes(b'broken')
        with self.assertRaises(ValueError):
            cp.load_bytes()

    def test_uncheckpointed_task_is_exclusive_and_does_not_share_external(self):
        self.queue()
        request = worker.validate_job(self.request(), self.root, worker._read(self.root / '.gpubackfill/queues/queue.json'))
        worker.snapshot.return_value['gpus'][0]['processes'] = [dict(pid=os.getpid(), used_mib=100)]
        worker.snapshot.return_value['gpus'][0]['utilization'] = 1
        self.assertIsNone(worker.acquire(self.root, request, 'attempt-0001'))
        worker.snapshot.return_value = sample()
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(reservation)
        try:
            self.assertIsNone(worker.acquire(self.root, dict(request, job_id='another'), 'attempt-0001'))
        finally:
            reservation.close()

    def test_reservation_headroom_and_external_default(self):
        self.queue()
        request = worker.validate_job(self.request(resume={'enabled': True, 'max_restarts': 2}), self.root,
                                      worker._read(self.root / '.gpubackfill/queues/queue.json'))
        worker.snapshot.return_value['gpus'][0]['processes'] = [dict(pid=os.getpid(), used_mib=100)]
        worker.snapshot.return_value['gpus'][0]['utilization'] = 50
        first = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(first)
        try:
            worker.snapshot.return_value['gpus'][0]['memory_free_mib'] = 4000
            self.assertIsNone(worker.acquire(self.root, dict(request, job_id='other'), 'attempt-0001'))
        finally:
            first.close()

    def test_multicard_requires_sharding_and_acquires_all_or_none(self):
        self.queue([gpu(), gpu('GPU-b')])
        mult = dict(sharding_supported=True, gpu_count=2, memory_mib_per_gpu=[16000, 16000],
                    compatible_models=['NVIDIA RTX 4090'])
        request = worker.validate_job(self.request(memory_mib=30000, multi_gpu=mult), self.root,
                                      worker._read(self.root / '.gpubackfill/queues/queue.json'))
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertEqual(set(reservation.uuids), {'GPU-a', 'GPU-b'})
        reservation.close()
        worker.snapshot.return_value['gpus'][1]['memory_free_mib'] = 100
        self.assertIsNone(worker.acquire(self.root, request, 'attempt-0002'))
        worker.snapshot.return_value['gpus'][1]['memory_free_mib'] = 20000
        smaller = worker.validate_job(self.request(job_id='small'), self.root,
                                      worker._read(self.root / '.gpubackfill/queues/queue.json'))
        single = worker.acquire(self.root, smaller, 'attempt-0001')
        self.assertIsNotNone(single)
        single.close()
        with self.assertRaises(ValueError):
            worker.validate_job(self.request(memory_mib=30000, multi_gpu=dict(mult, sharding_supported=False)), self.root,
                                worker._read(self.root / '.gpubackfill/queues/queue.json'))

    def test_heterogeneous_multicard_preserves_rank_budget_order(self):
        self.queue([gpu(total=8000, free=7000), gpu('GPU-b', 'NVIDIA A100', 14000, 13000)])
        multi = dict(sharding_supported=True, gpu_count=2, memory_mib_per_gpu=[4000, 10000],
                     compatible_models=['NVIDIA RTX 4090', 'NVIDIA A100'])
        request = worker.validate_job(self.request(memory_mib=20000, multi_gpu=multi), self.root,
                                      worker._read(self.root / '.gpubackfill/queues/queue.json'))
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        try:
            self.assertEqual(reservation.uuids, ['GPU-a', 'GPU-b'])
            self.assertEqual([g['memory_mib'] for g in reservation.record['gpus']], [4000, 10000])
        finally:
            reservation.close()

    def test_real_target_inherits_task_and_GPU_leases(self):
        self.queue()
        self.submit(self.request(resume={'enabled': True}))
        job = self.root / '.gpubackfill/jobs/job'
        request = worker._read(job / 'request.json')
        task = worker._lock(job / 'task.lock', existing=True)
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(10)'],
                                 start_new_session=True, pass_fds=(task.fileno(), *reservation.fds))
        try:
            task.close()
            reservation.close()
            self.assertIsNone(worker._lock(job / 'task.lock', existing=True))
            self.assertFalse(reservation.released())
            self.assertEqual(len(worker._active(worker._base(self.root))), 1)
        finally:
            os.killpg(child.pid, signal.SIGTERM)
            child.wait(timeout=3)
        self.assertTrue(reservation.released())

    def test_dead_worker_is_reported_even_when_target_keeps_task_lease(self):
        self.queue()
        self.submit()
        job = self.root / '.gpubackfill/jobs/job'
        task = worker._lock(job / 'task.lock', existing=True)
        try:
            worker._write(job / 'STARTED', {'pid': 99999999}, exclusive=True)
            status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))
            self.assertEqual(status['jobs'][0]['status'], 'needs_verification')
            self.assertIsNone(worker._lock(job / 'task.lock', existing=True))
        finally:
            task.close()

    def test_status_rereads_terminal_after_acquiring_monitor_probe(self):
        self.queue()
        self.submit()
        job = self.root / '.gpubackfill/jobs/job'
        running = dict(job_id='job', queue_id='queue', status='running')
        worker._write(job / 'status.json', running)
        worker._write(job / 'STARTED', {'pid': 99999999}, exclusive=True)
        real_lock = worker._lock

        def finish_before_probe(path, **options):
            if Path(path).name == 'worker.lock':
                worker._write(job / 'status.json', dict(running, status='completed'))
            return real_lock(path, **options)

        with mock.patch.object(worker, '_lock', side_effect=finish_before_probe):
            status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))
        self.assertEqual(status['jobs'][0]['status'], 'completed')

    def test_launching_status_does_not_contend_with_worker_start(self):
        self.queue()
        self.submit()
        with mock.patch.object(worker, '_lock', side_effect=AssertionError('must not probe before STARTED')):
            status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))
        self.assertEqual(status['jobs'][0]['status'], 'launching')

    def test_inactive_reservation_read_probes_coexist(self):
        self.queue()
        request = worker.validate_job(self.request(), self.root,
                                      worker._read(self.root / '.gpubackfill/queues/queue.json'))
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        reservation.close()
        reader = worker._lock(reservation.path.with_suffix('.lock'), shared=True, existing=True)
        try:
            self.assertTrue(reservation.released())
            self.assertEqual(worker._active(worker._base(self.root)), [])
        finally:
            reader.close()

    def test_spawn_failure_is_terminal(self):
        self.queue()
        with mock.patch.object(worker.subprocess, 'Popen', side_effect=OSError('spawn failed')):
            with self.assertRaises(OSError):
                worker.dispatch(dict(action='submit', root=str(self.root), queue_id='queue', job=self.request()))
        status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))
        self.assertEqual(status['jobs'][0]['status'], 'failed')
        self.assertEqual(status['jobs'][0]['reason'], 'worker_spawn_failed')

    def test_reaped_leader_with_detached_descendant_never_signals_old_group(self):
        self.queue()
        code = ("import subprocess,sys; from pathlib import Path; "
                "p=subprocess.Popen([sys.executable,'-c','import time; time.sleep(10)'],"
                "start_new_session=True,close_fds=False); Path('descendant.pid').write_text(str(p.pid))")
        self.submit(self.request(command=[sys.executable, '-c', code]))
        try:
            with mock.patch.object(worker, '_signal') as send:
                worker.run_job(self.root, 'job', poll_interval=0.01)
                send.assert_not_called()
            status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))['jobs'][0]
            self.assertEqual(status['status'], 'needs_verification')
            self.assertEqual(status['reason'], 'unmanaged_descendants_hold_leases')
        finally:
            child_pid = int((self.root / 'descendant.pid').read_text())
            os.kill(child_pid, signal.SIGTERM)

    def test_full_opaque_checkpoint_exit75_resumes_and_code_error_does_not(self):
        self.queue()
        code = ("import os,sys; sys.path.insert(0,os.environ['GPU_BACKFILL_HELPER_DIR']); "
                "from checkpoint import Checkpoint; cp=Checkpoint.from_environment(); "
                "restored=cp.load_bytes(); "
                "assert restored is None or restored==(b'complete',{'step':1}); "
                "cp.save_bytes(b'complete',{'step':2 if restored else 1}); "
                "sys.exit(0 if restored else 75)")
        self.submit(self.request(command=[sys.executable, '-c', code], max_runtime_seconds=None,
                                 resume={'enabled': True, 'max_restarts': 1, 'grace_seconds': 1}))
        worker.run_job(self.root, 'job', poll_interval=0.01)
        status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))['jobs'][0]
        self.assertEqual((status['status'], status['attempt']), ('completed', 2))
        self.submit(self.request(job_id='error', command=[sys.executable, '-c', code.replace('75)', '2)')],
                                 max_runtime_seconds=None, resume={'enabled': True, 'max_restarts': 2}))
        worker.run_job(self.root, 'error', poll_interval=0.01)
        status = worker.dispatch(dict(action='status', root=str(self.root), job_id='error'))['jobs'][0]
        self.assertEqual((status['status'], status['attempt']), ('failed', 1))

    def test_detached_submission_and_worker_complete(self):
        self.queue()
        with mock.patch.object(worker.subprocess, 'Popen') as launch:
            launch.return_value.pid = 99999999
            worker.dispatch(dict(action='submit', root=str(self.root), queue_id='queue', job=self.request()))
            self.assertTrue(launch.call_args.kwargs['start_new_session'])
        worker.run_job(self.root, 'job', poll_interval=0.01)
        status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))
        self.assertEqual(status['jobs'][0]['status'], 'completed')


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Review regressions using real coordination files/leases and mocked NVIDIA telemetry."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[2] / 'Codex' / 'mcp' / 'GPUBackfill'
sys.path.insert(0, str(SOURCE))
import checkpoint
import worker

PRODUCT = {'product': 'GPUBackfill', 'state_version': 1}
TMP = Path(__file__).resolve().parent / '.tmp'
BOOT_A = '11111111-1111-4111-8111-111111111111'
BOOT_B = '22222222-2222-4222-8222-222222222222'


def gpu(identifier='GPU-a', model='NVIDIA RTX 4090', total=24000, free=24000):
    return dict(index=0, uuid=identifier, name=model, memory_total_mib=float(total),
                memory_free_mib=float(free), utilization=0, processes=[])


def tree(root):
    return {str(p.relative_to(root)): (p.is_dir(), p.stat().st_mtime_ns,
                                     p.read_bytes() if p.is_file() else None)
            for p in root.rglob('*')}


class ReviewFixes(unittest.TestCase):
    def setUp(self):
        TMP.mkdir(exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(prefix='review-fixes-', dir=str(TMP))
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.cards = [gpu()]
        self.sample = dict(gpus=self.cards, host_memory_mib=64000, disk_free_mib=64000)
        self.telemetry = mock.patch.object(worker, 'snapshot', return_value=self.sample)
        self.snapshot = self.telemetry.start()
        self.addCleanup(self.telemetry.stop)

    def owned_base(self):
        base = self.root / '.gpubackfill'
        base.mkdir()
        worker._write(base / 'product.json', PRODUCT, exclusive=True)
        return worker._base(self.root, create=True)

    def queue(self, cards=None):
        if cards is not None:
            self.cards[:] = cards
        self.owned_base()
        return worker.dispatch(dict(action='create_queue', root=str(self.root), queue_id='queue',
                                    gpu_uuids=[g['uuid'] for g in self.cards],
                                    inventory_id=worker._inventory(self.cards),
                                    selection_confirmed=True))['queue']

    def job(self, **changes):
        result = dict(job_id='job', command=[sys.executable, '-c', 'pass'], cwd=str(self.root),
                      memory_mib=2000, max_runtime_seconds=None)
        result.update(changes)
        return result

    def submit(self):
        self.queue()
        with mock.patch.object(worker.subprocess, 'Popen') as launch, \
                mock.patch.object(worker, '_boot_id', return_value=BOOT_A, create=True), \
                mock.patch.object(worker.time, 'monotonic', return_value=1000):
            launch.return_value.pid = 99999999
            worker.dispatch(dict(action='submit', root=str(self.root), queue_id='queue', job=self.job()))
        return self.root / '.gpubackfill/jobs/job'

    def status(self, now=1001, boot=BOOT_A):
        with mock.patch.object(worker, '_boot_id', return_value=boot, create=True), \
                mock.patch.object(worker.time, 'monotonic', return_value=now):
            return worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))['jobs'][0]

    def launch_state(self, job):
        value = worker._read(job / 'status.json')
        value.update(launch_boot_id=BOOT_A, launch_monotonic_seconds=1000)
        worker._write(job / 'status.json', value)

    def cancel(self):
        with mock.patch.object(worker, 'snapshot', side_effect=AssertionError('cancel must not query GPUs')):
            return worker.dispatch(dict(action='cancel', root=str(self.root), job_id='job'))

    def test_new_coordination_root_publishes_product_identity(self):
        base = worker._base(self.root, create=True)
        self.assertEqual(worker._read(base / 'product.json'), PRODUCT)
        self.assertEqual(worker.PRODUCT, PRODUCT)

    def test_unknown_existing_root_is_rejected_without_writes(self):
        base = self.root / '.gpubackfill'
        (base / 'jobs/job').mkdir(parents=True)
        (base / 'jobs/job/foreign.txt').write_text('unmanaged')
        before = tree(self.root)
        with self.assertRaises((ValueError, OSError)):
            worker._base(self.root, create=True)
        self.assertEqual(tree(self.root), before)

    def test_wrong_product_identity_is_rejected_without_writes(self):
        base = self.root / '.gpubackfill'
        base.mkdir()
        worker._write(base / 'product.json', dict(PRODUCT, product='OtherScheduler'), exclusive=True)
        before = tree(self.root)
        with self.assertRaises((ValueError, OSError)):
            worker._base(self.root, create=True)
        self.assertEqual(tree(self.root), before)

    def assert_bootstrap_rejects_boolean_version(self, action):
        base = self.root / '.gpubackfill'
        base.mkdir()
        worker._write(base / 'product.json', dict(PRODUCT, state_version=True), exclusive=True)
        files = {name: (SOURCE / name).read_text(encoding='utf-8')
                 for name in ('checkpoint.py', 'worker.py')}
        import bootstrap
        request = dict(action=action, root=str(self.root), queue_id='queue',
                       gpu_uuids=['GPU-a'], inventory_id=worker._inventory(self.cards),
                       selection_confirmed=True)
        envelope = dict(request=request, files=files, release_id=bootstrap.identity(files))
        before = tree(self.root)
        result = subprocess.run([sys.executable, '-B', str(SOURCE / 'bootstrap.py')],
                                input=json.dumps(envelope), text=True, capture_output=True,
                                check=True, timeout=20)
        self.assertIn('error', json.loads(result.stdout))
        after = tree(self.root)
        self.assertEqual(set(after), set(before))
        self.assertEqual(after, before)

    def test_bootstrap_prepare_rejects_boolean_product_version_without_writes(self):
        self.assert_bootstrap_rejects_boolean_version('prepare')

    def test_bootstrap_create_queue_rejects_boolean_product_version_without_writes(self):
        self.assert_bootstrap_rejects_boolean_version('create_queue')

    def test_cancel_never_creates_control_file_in_foreign_directory(self):
        directory = self.root / '.gpubackfill/jobs/job'
        directory.mkdir(parents=True)
        before = tree(self.root)
        with self.assertRaises((ValueError, OSError)):
            self.cancel()
        self.assertEqual(tree(self.root), before)

    def test_cancel_valid_owned_job_needs_no_gpu(self):
        job = self.submit()
        self.assertTrue(self.cancel()['cancel_requested'])
        self.assertEqual(worker._read(job / 'CANCEL'), {'cancelled': True})
        self.assertTrue(self.cancel()['cancel_requested'])

    def test_cancel_rejects_changed_request_without_writes(self):
        job = self.submit()
        request = worker._read(job / 'request.json')
        worker._write(job / 'request.json', dict(request, memory_mib=3000))
        before = tree(self.root)
        with self.assertRaises((ValueError, OSError)):
            self.cancel()
        self.assertEqual(tree(self.root), before)

    def test_cancel_rejects_wrong_job_identity_even_with_matching_hash(self):
        job = self.submit()
        request = dict(worker._read(job / 'request.json'), job_id='other')
        worker._write(job / 'request.json', request)
        worker._write(job / 'identity.json', {'request_id': checkpoint.request_identity(request)})
        before = tree(self.root)
        with self.assertRaises((ValueError, OSError)):
            self.cancel()
        self.assertEqual(tree(self.root), before)

    def test_cancel_rejects_changed_queue_binding_without_writes(self):
        self.submit()
        path = self.root / '.gpubackfill/queues/queue.json'
        worker._write(path, dict(worker._read(path), allow_external=False))
        before = tree(self.root)
        with self.assertRaises((ValueError, OSError)):
            self.cancel()
        self.assertEqual(tree(self.root), before)

    def test_initial_status_records_bounded_startup_identity(self):
        job = self.submit()
        value = worker._read(job / 'status.json')
        self.assertEqual(value.get('launch_boot_id'), BOOT_A)
        self.assertEqual(value.get('launch_monotonic_seconds'), 1000)
        self.assertEqual(worker.STARTUP_TIMEOUT_SECONDS, 60)

    def test_normal_startup_window_does_not_probe_worker_lock(self):
        job = self.submit()
        self.launch_state(job)
        before = tree(self.root)
        with mock.patch.object(worker, '_lock', side_effect=AssertionError('startup window must not contend')):
            self.assertEqual(self.status(now=1059)['status'], 'launching')
        self.assertEqual(tree(self.root), before)

    def test_unacknowledged_startup_expires_when_monitor_is_free(self):
        job = self.submit()
        self.launch_state(job)
        before = tree(self.root)
        self.assertEqual(self.status(now=1060)['status'], 'needs_verification')
        self.assertEqual(tree(self.root), before)

    def test_reboot_invalidates_startup_window_immediately(self):
        job = self.submit()
        self.launch_state(job)
        self.assertEqual(self.status(now=1001, boot=BOOT_B)['status'], 'needs_verification')

    def test_missing_startup_identity_requires_verification(self):
        job = self.submit()
        value = worker._read(job / 'status.json')
        for fields in ({}, {'launch_boot_id': 'invalid', 'launch_monotonic_seconds': 1000},
                       {'launch_boot_id': BOOT_A, 'launch_monotonic_seconds': True},
                       {'launch_boot_id': BOOT_A, 'launch_monotonic_seconds': 1002}):
            with self.subTest(fields=fields):
                state = {k: v for k, v in value.items() if not k.startswith('launch_')}
                worker._write(job / 'status.json', dict(state, **fields))
                self.assertEqual(self.status()['status'], 'needs_verification')

    def test_expired_startup_never_displaces_held_monitor(self):
        job = self.submit()
        self.launch_state(job)
        lease = worker._lock(job / 'worker.lock', existing=True)
        try:
            self.assertEqual(self.status(now=1060)['status'], 'launching')
            self.assertIsNone(worker._lock(job / 'worker.lock', existing=True))
        finally:
            lease.close()

    def test_acknowledged_running_monitor_remains_running(self):
        job = self.submit()
        worker._write(job / 'STARTED', {'pid': 99999999}, exclusive=True)
        worker._write(job / 'status.json', dict(job_id='job', queue_id='queue', status='running'))
        lease = worker._lock(job / 'worker.lock', existing=True)
        try:
            self.assertEqual(self.status(now=2000, boot=BOOT_B)['status'], 'running')
        finally:
            lease.close()

    def test_terminal_status_is_never_replaced_or_probed(self):
        job = self.submit()
        for terminal in ('completed', 'failed', 'cancelled', 'needs_verification'):
            with self.subTest(status=terminal):
                value = dict(job_id='job', queue_id='queue', status=terminal)
                worker._write(job / 'status.json', value)
                with mock.patch.object(worker, '_lock', side_effect=AssertionError('terminal must not probe')):
                    self.assertEqual(self.status(now=2000, boot=BOOT_B), value)

    def test_startup_timeout_rereads_concurrently_completed_status(self):
        job = self.submit()
        self.launch_state(job)
        real_lock = worker._lock
        completed = dict(job_id='job', queue_id='queue', status='completed')

        def finish_before_probe(path, **options):
            if Path(path).name == 'worker.lock':
                worker._write(job / 'status.json', completed)
            return real_lock(path, **options)

        with mock.patch.object(worker, '_lock', side_effect=finish_before_probe):
            self.assertEqual(self.status(now=1060), completed)

    def multi(self, **changes):
        result = dict(sharding_supported=True, gpu_count=2, memory_mib_per_gpu=[16000, 16000],
                      compatible_models=['NVIDIA RTX 4090'])
        result.update(changes)
        return result

    def test_multicard_requires_explicit_nonempty_unique_models(self):
        queue = self.queue([gpu(), gpu('GPU-b')])
        missing = self.multi()
        missing.pop('compatible_models')
        for multi in (missing, self.multi(compatible_models=[]),
                      self.multi(compatible_models=['NVIDIA RTX 4090', 'NVIDIA RTX 4090'])):
            with self.subTest(models=multi.get('compatible_models')):
                with self.assertRaises(ValueError):
                    worker.validate_job(self.job(memory_mib=30000, multi_gpu=multi), self.root, queue)

    def test_multicard_cannot_use_unapproved_model_to_complete_set(self):
        queue = self.queue([gpu(), gpu('GPU-b', 'NVIDIA A100')])
        with self.assertRaises(ValueError):
            worker.validate_job(self.job(memory_mib=30000, multi_gpu=self.multi()), self.root, queue)

    def test_approved_heterogeneous_models_preserve_rank_budgets(self):
        queue = self.queue([gpu(total=8000, free=7000), gpu('GPU-b', 'NVIDIA A100', 14000, 13000)])
        multi = self.multi(memory_mib_per_gpu=[4000, 10000],
                           compatible_models=['NVIDIA RTX 4090', 'NVIDIA A100'])
        request = worker.validate_job(self.job(memory_mib=20000, multi_gpu=multi), self.root, queue)
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(reservation)
        try:
            self.assertEqual(reservation.uuids, ['GPU-a', 'GPU-b'])
            self.assertEqual([g['memory_mib'] for g in reservation.record['gpus']], [4000, 10000])
        finally:
            reservation.close()

    def test_multicard_does_not_select_unapproved_larger_card(self):
        queue = self.queue([gpu(), gpu('GPU-b'), gpu('GPU-c', 'NVIDIA A100', 32000, 32000)])
        request = worker.validate_job(self.job(memory_mib=40000,
                                               multi_gpu=self.multi(memory_mib_per_gpu=[20000, 20000])),
                                      self.root, queue)
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(reservation)
        try:
            self.assertEqual(set(reservation.uuids), {'GPU-a', 'GPU-b'})
        finally:
            reservation.close()

    def test_unapproved_single_card_capacity_does_not_disable_sharding(self):
        queue = self.queue([gpu(), gpu('GPU-b'), gpu('GPU-c', 'NVIDIA A100', 48000, 48000)])
        request = worker.validate_job(self.job(memory_mib=40000,
                                               multi_gpu=self.multi(memory_mib_per_gpu=[20000, 20000])),
                                      self.root, queue)
        self.assertEqual(request['gpu_count'], 2)
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(reservation)
        try:
            self.assertEqual(set(reservation.uuids), {'GPU-a', 'GPU-b'})
        finally:
            reservation.close()

    def test_single_card_fallback_keeps_declared_model_restrictions(self):
        queue = self.queue([gpu(), gpu('GPU-b'), gpu('GPU-c', 'NVIDIA A100', 48000, 48000)])
        request = worker.validate_job(self.job(memory_mib=2000, multi_gpu=self.multi()), self.root, queue)
        self.assertEqual(request['gpu_count'], 1)
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(reservation)
        try:
            self.assertEqual(len(reservation.uuids), 1)
            self.assertIn(reservation.uuids[0], ('GPU-a', 'GPU-b'))
        finally:
            reservation.close()

    def active_request(self, new_budget=9000):
        queue = self.queue()
        old = worker.validate_job(self.job(memory_mib=16000, resume={'enabled': True}), self.root, queue)
        new = worker.validate_job(self.job(job_id='new', memory_mib=new_budget, resume={'enabled': True}),
                                  self.root, queue)
        first = worker.acquire(self.root, old, 'attempt-0001')
        self.addCleanup(first.close)
        first.record = dict(first.record, pgid=os.getpgrp())
        worker._write(first.path, first.record)
        return first, new

    def acquire_or_reject(self, request):
        try:
            return worker.acquire(self.root, request, 'attempt-0001')
        except ValueError:
            return None

    def test_repeated_split_telemetry_never_oversells_existing_peak(self):
        first, request = self.active_request()

        def query(argv, **options):
            if argv[0] == 'free':
                return ('total used free shared buff/cache available\n'
                        'Mem: 67108864000 0 67108864000 0 0 67108864000\n')
            if '--query-compute-apps=gpu_uuid,pid,used_gpu_memory' in argv:
                return 'GPU-a, %s, 16000\n' % os.getpid()
            return '0, GPU-a, NVIDIA RTX 4090, 24000, 24000, 0\n'

        # Use the real parser, not the setUp telemetry fixture, for both query rounds.
        with mock.patch.object(worker, 'snapshot', side_effect=REAL_SNAPSHOT), \
                mock.patch.object(worker.subprocess, 'check_output', side_effect=query):
            for attempt in range(2):
                with self.subTest(attempt=attempt):
                    second = self.acquire_or_reject(request)
                    if second is not None:
                        second.close()
                    self.assertIsNone(second)
        self.assertEqual(len(worker._active(first.base)), 1)

    def test_physical_capacity_cap_survives_overstated_observed_credit(self):
        first, request = self.active_request()
        with mock.patch.object(worker, '_usage', return_value={first.record['reservation_id']: 16000}):
            second = worker.acquire(self.root, request, 'attempt-0001')
        if second is not None:
            second.close()
        self.assertIsNone(second)

    def test_coherent_same_card_sample_still_allows_sharing(self):
        first, request = self.active_request(new_budget=5000)
        self.cards[0].update(memory_free_mib=8000,
                             processes=[dict(pid=os.getpid(), used_mib=16000)])
        second = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(second)
        try:
            self.assertEqual(second.uuids, first.uuids)
            self.assertEqual(len(worker._active(first.base)), 2)
        finally:
            second.close()


REAL_SNAPSHOT = worker.snapshot

if __name__ == '__main__':
    unittest.main(verbosity=2)

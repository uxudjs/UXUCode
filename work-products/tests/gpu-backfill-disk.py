"""Isolated Linux CPU tests; no NVIDIA calls or existing coordination roots."""
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[2] / 'Codex/mcp/GPUBackfill'
sys.path.insert(0, str(SOURCE))
import checkpoint
import disk
import worker


class DiskTests(unittest.TestCase):
    def setUp(self):
        scratch = Path(__file__).resolve().parent / '.tmp'
        scratch.mkdir(exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=str(scratch))
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.card = dict(index=0, uuid='GPU-test', name='Synthetic GPU', memory_total_mib=24000,
                         memory_free_mib=24000, utilization=0, processes=[])
        self.sample = dict(gpus=[self.card], host_memory_mib=64000, disk_free_mib=64000)
        patch = mock.patch.object(worker, 'snapshot', return_value=self.sample)
        patch.start()
        self.addCleanup(patch.stop)
        self.queue = worker.dispatch(dict(action='create_queue', root=str(self.root), queue_id='q',
            gpu_uuids=['GPU-test'], inventory_id=worker._inventory([self.card]), selection_confirmed=True))['queue']

    def request(self, identifier='job', **changes):
        output = self.root / identifier
        output.mkdir(exist_ok=True)
        value = dict(job_id=identifier, command=[sys.executable, '-B', '-c', 'pass'], cwd=str(self.root),
                     memory_mib=1024, max_runtime_seconds=None, resume={'enabled': True},
                     disk=dict(paths=[str(output)], growth_mib=8, checkpoint_mib=2, safety_mib=1))
        value.update(changes)
        return worker.validate_job(value, self.root, self.queue)

    def reserve(self, request=None):
        request = request or self.request()
        reservation = worker.acquire(self.root, request, 'attempt-0001')
        self.assertIsNotNone(reservation)
        self.addCleanup(reservation.close)
        return request, reservation

    def attempt(self, request, reservation):
        path = self.root / '.gpubackfill/jobs' / request['job_id'] / 'attempts/attempt-0001'
        path.mkdir(parents=True)
        worker._write(path / 'disk-response.json', dict(job_id=request['job_id'],
            request_id=checkpoint.request_identity(request), attempt=path.name, sequence=0,
            disk=reservation.record['disk'], accepted=True, reason=None), exclusive=True)
        return path

    def report(self, request, reservation, path, growth=8, saving=2, files=None, sequence=None):
        value = dict(job_id=request['job_id'], request_id=checkpoint.request_identity(request), attempt=path.name,
                     growth_mib=growth, checkpoint_mib=saving,
                     progress=dict(sequence=sequence or reservation.record['disk']['sequence'] + 1,
                                   step=1, files=files or []))
        worker._write(path / 'disk-request.json', value)
        return worker._disk_update(self.root, request, reservation, path)

    def allocated(self, request, size=1):
        path = Path(request['disk']['paths'][0]) / 'result.bin'
        with path.open('wb') as stream:
            stream.write(b'x' * (size * disk.MIB))
            stream.flush()
            os.fsync(stream.fileno())
        return str(path)

    def test_small_and_over_twelve_gib_are_task_specific(self):
        for growth in (8, 32768):
            request = self.request('job' + str(growth))
            request['disk']['growth_mib'] = growth
            reservation = worker.acquire(self.root, request, 'attempt-0001')
            self.assertIsNotNone(reservation)
            self.assertEqual(disk.total(reservation.record['disk']), growth + 3)
            reservation.close()

    def test_missing_declaration_and_legacy_threshold_fail(self):
        request = self.request()
        for key in ('disk', 'disk_basis', 'gpu_count', 'queue_id', 'gpu_uuids', 'inventory_id', 'allow_external'):
            request.pop(key, None)
        with self.assertRaises(ValueError):
            worker.validate_job(request, self.root, self.queue)
        zero = dict(paths=[str(self.root / 'job')], growth_mib=0, checkpoint_mib=0, safety_mib=0)
        with self.assertRaisesRegex(ValueError, 'all-zero'):
            disk.prepare(self.root, zero)
        request['disk_free_mib'] = 12288
        with self.assertRaises(ValueError):
            worker.validate_job(request, self.root, self.queue)

    def test_real_allocated_blocks_release_only_materialized_growth(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        output = self.allocated(request)
        self.assertIsNone(self.report(request, reservation, path, growth=7, files=[output]))
        self.assertEqual(disk.total(worker._active(reservation.base)[0]['disk']), 10)
        self.assertEqual(reservation.record['disk']['mode'], 'dynamic')
        os.unlink(output)
        reason = self.report(request, reservation, path, growth=6)
        self.assertIn('verified allocated blocks', reason)
        self.assertEqual(disk.total(reservation.record['disk']), 10)
        self.assertEqual(reservation.record['disk']['checkpoint_mib'], 2)

    def test_unproved_decrease_and_checkpoint_decrease_rejected(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        self.assertIn('verified allocated blocks', self.report(request, reservation, path, growth=7))
        self.assertIn('checkpoint reserve', self.report(request, reservation, path, saving=1))
        self.assertEqual(disk.total(reservation.record['disk']), 11)

    def test_sparse_logical_length_does_not_release_budget(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        output = Path(request['disk']['paths'][0]) / 'sparse.bin'
        with output.open('wb') as stream:
            stream.truncate(32 * disk.MIB)
        self.assertIn('verified allocated blocks', self.report(request, reservation, path, growth=7, files=[str(output)]))

    def test_hard_links_and_symlinks_never_credit_space(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        output = self.allocated(request)
        extra = Path(output).with_name('alias.bin')
        os.link(output, extra)
        self.assertIn('single-link', self.report(request, reservation, path, growth=7, files=[output]))
        extra.unlink()
        extra.symlink_to(output)
        self.assertRegex(self.report(request, reservation, path, growth=7, files=[output]), 'single-link|linked')

    def test_external_files_and_replaced_identities_do_not_credit(self):
        outside = self.root / 'external.bin'
        outside.write_bytes(b'x')
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        self.assertIn('outside', self.report(request, reservation, path, growth=7, files=[str(outside)]))
        self.assertEqual(disk.total(reservation.record['disk']), 11)

    def test_replaced_baseline_inode_cannot_credit_growth(self):
        output = self.root / 'job'
        output.mkdir()
        original = output / 'old.bin'
        original.write_bytes(b'old')
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        replacement = output / 'replacement.bin'
        with replacement.open('wb') as stream:
            stream.write(b'x' * (2 * disk.MIB))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(replacement, original)
        self.assertIn('file identity', self.report(request, reservation, path, growth=7, files=[str(original)]))
        self.assertEqual(disk.total(reservation.record['disk']), 11)

    def test_deleted_but_open_file_never_earns_allocation_credit(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        output = self.allocated(request)
        with open(output, 'rb') as held:
            os.unlink(output)
            self.assertGreater(os.fstat(held.fileno()).st_blocks, 0)
            self.assertIn('outside', self.report(request, reservation, path, growth=7, files=[output]))
        self.assertEqual(disk.total(reservation.record['disk']), 11)

    def test_acknowledgement_must_bind_exact_report_bytes(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        helper = disk.DiskBudget(path, request['job_id'], checkpoint.request_identity(request), path.name)
        initial = worker._read(path / 'disk-response.json')
        forged = dict(initial, sequence=1, report_id='0' * 64)
        with mock.patch.object(helper, '_response', side_effect=[initial, forged]):
            with self.assertRaisesRegex(ValueError, 'acknowledgement'):
                helper.reserve(9, 2, {'step': 1})
        self.assertEqual(disk.total(reservation.record['disk']), 11)

    def test_replays_identity_and_sequence_are_bound(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        self.assertIsNone(self.report(request, reservation, path))
        self.assertIsNone(worker._disk_update(self.root, request, reservation, path))
        report = worker._read(path / 'disk-request.json')
        report['growth_mib'] = 1
        worker._write(path / 'disk-request.json', report)
        with self.assertRaisesRegex(ValueError, 'replay'):
            worker._disk_update(self.root, request, reservation, path)
        report['attempt'] = 'attempt-0002'
        worker._write(path / 'disk-request.json', report)
        with self.assertRaisesRegex(ValueError, 'identity'):
            worker._disk_update(self.root, request, reservation, path)

    def test_concurrent_admission_cannot_oversell(self):
        self.sample['disk_free_mib'] = 15
        requests = [self.request('one'), self.request('two')]
        barrier = threading.Barrier(2)
        results = []
        def acquire(request):
            barrier.wait()
            results.append(worker.acquire(self.root, request, 'attempt-0001'))
        threads = [threading.Thread(target=acquire, args=(r,)) for r in requests]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        for item in results:
            if item:
                self.addCleanup(item.close)
        self.assertEqual(sum(item is not None for item in results), 1)

    def test_increase_rechecks_all_active_reservations(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        other_request, other = self.reserve(self.request('other'))
        usage = type('Usage', (), dict(free=25 * disk.MIB))()
        write = worker._write
        def observe(destination, value, **options):
            if destination.name == 'disk-response.json' and not value['accepted']:
                self.assertTrue((path / 'STOP').exists(), 'STOP must precede the denial acknowledgement')
            return write(destination, value, **options)
        with mock.patch.object(worker.shutil, 'disk_usage', return_value=usage), mock.patch.object(worker, '_write', side_effect=observe):
            self.assertIn('disk_headroom', self.report(request, reservation, path, growth=15))
        self.assertTrue((path / 'STOP').exists(), 'STOP must be visible before the task receives a denied update')
        self.assertEqual(disk.total(reservation.record['disk']), 11)
        self.assertEqual(disk.total(reservation.pending_disk), 18)
        self.assertEqual(disk.total(other.record['disk']), 11)

    def test_concurrent_increases_cannot_acknowledge_an_oversale(self):
        pairs = [self.reserve(self.request(name)) for name in ('one', 'two')]
        paths = [self.attempt(*pair) for pair in pairs]
        usage = type('Usage', (), dict(free=27 * disk.MIB))()
        barrier = threading.Barrier(2)
        def grow(pair, path):
            barrier.wait()
            self.report(*pair, path, growth=12)
        with mock.patch.object(worker.shutil, 'disk_usage', return_value=usage):
            threads = [threading.Thread(target=grow, args=(pair, path)) for pair, path in zip(pairs, paths)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()
            for pair, path in zip(pairs, paths):
                worker._disk_update(self.root, *pair, path)
        responses = [worker._read(path / 'disk-response.json') for path in paths]
        self.assertEqual(sum(r['accepted'] for r in responses), 1)
        self.assertEqual(sum(disk.total(r['disk']) for r in worker._active(pairs[0][1].base)), 26)

    def test_timeout_does_not_overwrite_an_unconfirmed_update(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        helper = disk.DiskBudget(path, request['job_id'], checkpoint.request_identity(request), path.name, timeout=0.02)
        with self.assertRaises(TimeoutError):
            helper.reserve(9, 2, {'step': 1})
        before = (path / 'disk-request.json').read_bytes()
        with self.assertRaisesRegex(TimeoutError, 'previous'):
            helper.reserve(10, 2, {'step': 2})
        self.assertEqual((path / 'disk-request.json').read_bytes(), before)

    def test_corrupt_allocation_basis_fails_closed(self):
        request, reservation = self.reserve()
        state = reservation.record['disk']
        corrupt = dict(state, baseline={str(Path(state['paths'][0]) / 'file'): dict(
            device=state['filesystem']['device'], inode=1, allocated_bytes=-512)})
        with self.assertRaises(ValueError):
            disk.validate_state(corrupt)

    def test_overlapping_task_paths_are_rejected(self):
        request, reservation = self.reserve()
        second = self.request('other')
        second['disk']['paths'] = request['disk']['paths']
        self.assertIsNone(worker.acquire(self.root, second, 'attempt-0001'))

    def test_mount_change_and_quota_are_rejected(self):
        declaration = self.request()['disk']
        with mock.patch.object(disk.subprocess, 'check_output', return_value=json.dumps(dict(filesystems=[
                dict(target='/home', fstype='ext4', options='rw,usrquota', id=1)]))):
            with self.assertRaisesRegex(ValueError, 'quota'):
                disk.prepare(self.root, declaration)
        basis = disk.prepare(self.root, declaration)
        changed = dict(basis['filesystem'], mount_id=-1)
        with mock.patch.object(disk, 'filesystem', side_effect=[basis['filesystem'], changed]):
            with self.assertRaisesRegex(ValueError, 'mount'):
                disk.prepare(self.root, declaration)

    def test_unknown_telemetry_does_not_lower_reservation(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        with mock.patch.object(disk, 'filesystem', side_effect=ValueError('unknown mount')):
            self.assertIn('unknown mount', self.report(request, reservation, path))
        self.assertEqual(disk.total(reservation.record['disk']), 11)

    def test_old_coordination_root_is_read_only_rejected(self):
        marker = self.root / '.gpubackfill/product.json'
        worker._write(marker, dict(product='GPUBackfill', state_version=1))
        before = marker.read_bytes()
        with self.assertRaises(ValueError):
            worker.dispatch(dict(action='status', root=str(self.root)))
        self.assertEqual(marker.read_bytes(), before)

    def test_helper_checkpoint_growth_waits_for_ack_before_writing(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        checkpoint_dir = path.parent.parent / 'checkpoints'
        env = dict(GPU_BACKFILL_DISK_DIR=str(path), GPU_BACKFILL_JOB_ID=request['job_id'],
                   GPU_BACKFILL_REQUEST_ID=checkpoint.request_identity(request), GPU_BACKFILL_ATTEMPT=path.name,
                   GPU_BACKFILL_CHECKPOINT_DIR=str(checkpoint_dir))
        stop = threading.Event()
        errors = []
        def monitor():
            try:
                while not stop.wait(0.01):
                    worker._disk_update(self.root, request, reservation, path)
            except BaseException as error:
                errors.append(error)
        thread = threading.Thread(target=monitor)
        thread.start()
        try:
            cp = checkpoint.Checkpoint(checkpoint_dir, request['job_id'], checkpoint.request_identity(request))
            original_new = checkpoint._new
            def checked_write(destination, data):
                if destination.suffix == '.bin':
                    self.assertGreaterEqual(reservation.record['disk']['checkpoint_mib'], 4)
                original_new(destination, data)
            with mock.patch.dict(os.environ, env), mock.patch.object(checkpoint, '_new', side_effect=checked_write):
                cp.save_bytes(b'x' * (3 * disk.MIB), {'step': 1})
            self.assertEqual(len(cp.load_bytes()[0]), 3 * disk.MIB)
            self.assertFalse(errors)
        finally:
            stop.set()
            thread.join()

    def test_checkpoint_peak_includes_large_manifest_metadata(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        helper = disk.DiskBudget(path, request['job_id'], checkpoint.request_identity(request), path.name)
        with mock.patch.object(helper, 'reserve') as grow:
            helper.check_checkpoint(disk.MIB, {'step': 1, 'note': 'x' * (3 * disk.MIB)})
        grow.assert_called_once()
        self.assertGreaterEqual(grow.call_args[0][1], 5)

    def test_real_target_handshake_and_terminal_status_use_effective_budget(self):
        code = ("import os,sys; from pathlib import Path; "
                "sys.path.insert(0,os.environ['GPU_BACKFILL_HELPER_DIR']); "
                "from disk import DiskBudget; from checkpoint import Checkpoint; "
                "p=Path(sys.argv[1]); "
                "s=p.open('wb'); s.write(b'x'*1048576); s.flush(); os.fsync(s.fileno()); s.close(); "
                "DiskBudget.from_environment().reserve(7,2,{'step':1,'files':[str(p)]}); "
                "Checkpoint.from_environment().save_bytes(b'complete state',{'step':1})")
        output = self.root / 'job/result.bin'
        request = self.request(command=[sys.executable, '-B', '-c', code, str(output)])
        original_request = checkpoint.request_identity(request)
        with mock.patch.object(worker, 'validate_job', return_value=request), mock.patch.object(worker.subprocess, 'Popen') as launch:
            launch.return_value.pid = 99999999
            worker.dispatch(dict(action='submit', root=str(self.root), queue_id='q', job={}))
        worker.run_job(self.root, 'job', poll_interval=0.02)
        status = worker.dispatch(dict(action='status', root=str(self.root), job_id='job'))
        value = status['jobs'][0]
        self.assertEqual(value['status'], 'completed', value)
        self.assertEqual(value['disk']['effective']['growth_mib'], 7)
        self.assertEqual(value['disk']['effective']['mode'], 'dynamic')
        self.assertEqual(value['disk']['effective']['total_mib'], 10)
        self.assertEqual(status['disk']['reserved_mib'], 0)
        self.assertEqual(value['request_id'], original_request)
        self.assertEqual(value['attempt'], 1)

    def test_checkpoint_denial_preserves_the_previous_full_state(self):
        request, reservation = self.reserve()
        path = self.attempt(request, reservation)
        cp = checkpoint.Checkpoint(path.parent.parent / 'checkpoints', request['job_id'], checkpoint.request_identity(request))
        previous = cp.save_bytes(b'complete previous state', {'step': 0})
        env = dict(GPU_BACKFILL_DISK_DIR=str(path), GPU_BACKFILL_JOB_ID=request['job_id'],
                   GPU_BACKFILL_REQUEST_ID=checkpoint.request_identity(request), GPU_BACKFILL_ATTEMPT=path.name,
                   GPU_BACKFILL_CHECKPOINT_DIR=str(cp.directory))
        stop = threading.Event()
        errors = []
        def monitor():
            try:
                while not stop.wait(0.01):
                    worker._disk_update(self.root, request, reservation, path)
            except BaseException as error:
                errors.append(error)
        thread = threading.Thread(target=monitor)
        usage = type('Usage', (), dict(free=11 * disk.MIB))()
        with mock.patch.object(worker.shutil, 'disk_usage', return_value=usage):
            thread.start()
            try:
                with mock.patch.dict(os.environ, env), self.assertRaisesRegex(RuntimeError, 'disk reservation denied'):
                    cp.save_bytes(b'x' * (3 * disk.MIB), {'step': 1})
            finally:
                stop.set()
                thread.join()
        self.assertFalse(errors)
        self.assertEqual(cp.load_bytes()[0], b'complete previous state')
        self.assertEqual(checkpoint.validate_checkpoint(cp.directory, request['job_id'], checkpoint.request_identity(request)), previous)
        self.assertEqual(len(list(cp.directory.glob('state-*.bin'))), 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Regression checks for the two registered Level 05 environment derivatives."""
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
MODULE = Path(__file__).with_name('prepare-level05-remaining-environments.py')

class RemainingEnvironmentTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not MODULE.is_file():
            raise AssertionError('the reproducible relay/ink export pipeline must exist')
        spec = importlib.util.spec_from_file_location('remaining_environments', MODULE)
        cls.prepare = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.prepare)

    def test_registered_exports_reproduce_shipped_assets_without_changing_entry(self):
        p = self.prepare
        entry = p.SPRITES / 'entry-environment-base.png'
        before = entry.read_bytes()
        for room in ('relay', 'ink'):
            with self.subTest(room=room), tempfile.TemporaryDirectory() as temp:
                output = Path(temp) / 'base.png'
                report = p.normalize(room, p.ENV / f'{room}-sunburst-master.png', output)
                self.assertEqual(report['source_sha256'], p.PROFILES[room]['sha256'])
                self.assertEqual(output.read_bytes(), (p.SPRITES / f'{room}-environment-base.png').read_bytes())
                self.assertEqual(report['output_sha256'], hashlib.sha256(output.read_bytes()).hexdigest())
                with Image.open(output) as image:
                    self.assertEqual(image.size, (640, 360))
                    self.assertEqual(image.mode, 'P')
                    self.assertFalse(image.has_transparency_data)
                    self.assertLessEqual(len(image.getcolors()), 128)
                geometry = json.loads((p.ENV / f'{room}-geometry.json').read_text())
                cap = {'x': 0, 'y': 318, 'width': 640, 'height': 42}
                self.assertIn(cap, geometry['room']['walls'])
                self.assertEqual(report['south_cap']['y'], 318)
                self.assertEqual(report['south_cap']['passage_width'], 44)
        self.assertEqual(before, entry.read_bytes(), 'entry is not regenerated or touched')

    def test_ink_central_floor_band_keeps_exact_authored_edges(self):
        p = self.prepare
        profile = p.PROFILES['ink']
        self.assertEqual(profile['centre_x'], [184, 532])
        self.assertIn(218, profile['centre_y']['target'])
        self.assertIn(266, profile['centre_y']['target'])
        for room in ('relay', 'ink'):
            for axis in ('x', 'y'):
                spec = p.PROFILES[room][axis]
                cells = p.axis_map(spec['source'], spec['target'], 640 if axis == 'x' else 360)
                self.assertTrue(all(a <= b for a, b in zip(cells, cells[1:])))
                for s0, s1, t0, t1 in zip(spec['source'], spec['source'][1:], spec['target'], spec['target'][1:]):
                    self.assertTrue(all(s0 <= pixel < s1 for pixel in cells[t0:t1]), 'compressed bands never sample a neighbouring material')

    def test_compressed_east_wall_band_stays_in_its_own_source_interval(self):
        cells = self.prepare.axis_map([0, 504, 532, 640], [0, 532, 542, 640], 640)
        self.assertEqual(len(cells), 640)
        self.assertTrue(all(504 <= pixel < 532 for pixel in cells[532:542]))

    def test_unknown_master_is_rejected_before_any_output(self):
        p = self.prepare
        with tempfile.TemporaryDirectory() as temp:
            source, output = Path(temp) / 'other.png', Path(temp) / 'out.png'
            Image.new('RGB', (640, 360), '#123456').save(source)
            with self.assertRaisesRegex(ValueError, 'unregistered source'):
                p.normalize('relay', source, output)
            self.assertFalse(output.exists())

if __name__ == '__main__':
    unittest.main(verbosity=2)

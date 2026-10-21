"""Focused checks for the Level 05 entry environment registration.

Run with: python scripts/check-level05-entry-environment.py
No third-party test runner and no network access. The normalized asset is rebuilt into a
temporary directory so the checks exercise the real pipeline without touching the tracked file.
"""
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

# Loading the prepare module by path must not leave scripts/__pycache__ in the working tree.
sys.dont_write_bytecode = True
MODULE_PATH = Path(__file__).with_name('prepare-level05-entry-environment.py')
SPEC = importlib.util.spec_from_file_location('prepare_level05_entry_environment', MODULE_PATH)
prepare = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(prepare)

MASTER = prepare.ENV / 'entry-sunburst-master.png'
COMMITTED = prepare.OUT


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class EntryEnvironmentRegistrationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        directory = Path(cls.temp.name)
        cls.output = directory / 'entry-environment-base.png'
        cls.report_path = directory / 'normalization-report.json'
        cls.report = prepare.normalize(MASTER, cls.output, cls.report_path)
        cls.profile = prepare.SOURCE_PROFILES[prepare.EXPECTED_SOURCE_SHA256]
        cls.maps = prepare.registration_maps(cls.profile)
        cls.geometry = json.loads(prepare.GEOMETRY.read_text(encoding='utf-8'))
        cls.walls = {
            (wall['x'], wall['y'], wall['width'], wall['height'])
            for wall in cls.geometry['walls']
        }

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_source_hash_is_pinned_and_master_is_unchanged(self):
        self.assertEqual(sha256(MASTER), prepare.EXPECTED_SOURCE_SHA256)
        self.assertEqual(self.report['source_sha256'], prepare.EXPECTED_SOURCE_SHA256)
        self.assertEqual(self.report['expected_source_sha256'], prepare.EXPECTED_SOURCE_SHA256)

    def test_axis_maps_keep_corners_and_are_monotonic(self):
        for axis, length in (('x', 640), ('y', 360)):
            cells = self.maps[axis]
            self.assertEqual(len(cells), length)
            self.assertEqual(cells[0], 0, f'{axis} starts at source 0')
            self.assertEqual(cells[-1], length - 1, f'{axis} ends at the last source cell')
            self.assertTrue(all(0 <= value < length for value in cells))
            self.assertTrue(
                all(after >= before for before, after in zip(cells, cells[1:])),
                f'{axis} mapping must not run backwards',
            )

    def test_landmarks_stay_edge_adjacent_and_match_geometry(self):
        for axis in ('x', 'y'):
            source = self.profile[axis]['source']
            target = self.profile[axis]['target']
            cells = self.maps[axis]
            for index, boundary in enumerate(target[:-1]):
                self.assertEqual(
                    cells[boundary], source[index],
                    f'{axis} landmark at {boundary} must sample source {source[index]}',
                )
                if index:
                    self.assertEqual(
                        cells[boundary] - cells[boundary - 1], 1,
                        f'{axis} segment join at {boundary} must stay edge-adjacent',
                    )

        # Authoritative rectangles from PATH_ROOMS.entry (via entry-geometry.json).
        for rect in (
            (0, 0, 640, 80), (0, 310, 640, 50),
            (0, 80, 24, 230), (616, 80, 24, 230),
            (24, 180, 100, 30), (188, 180, 260, 30), (512, 180, 104, 30),
            (300, 80, 20, 100),
            (124, 122, 10, 58), (178, 122, 10, 58),
            (448, 122, 10, 58), (502, 122, 10, 58),
        ):
            self.assertIn(rect, self.walls, f'entry geometry keeps wall {rect}')

        self.assertEqual(self.profile['x']['target'][1], 24)   # left wall inner face
        self.assertEqual(self.profile['x']['target'][2:4], [124, 188])   # practice door slot
        self.assertEqual(self.profile['x']['target'][4:6], [300, 320])   # central divider
        self.assertEqual(self.profile['x']['target'][6:8], [448, 512])   # door a slot
        self.assertEqual(self.profile['x']['target'][8], 616)  # right wall inner face
        self.assertEqual(self.profile['y']['target'][1], 80)   # top wall / alcove floor
        self.assertEqual(self.profile['y']['target'][2:4], [180, 210])   # ledge band
        self.assertEqual(self.profile['y']['target'][4], 310)  # main floor / bottom wall

    def test_roundtrip_output_dimensions_palette_and_report(self):
        with Image.open(self.output) as image:
            self.assertEqual(image.size, (640, 360))
            self.assertEqual(image.mode, 'P')
            self.assertEqual(image.mode, self.report['mode'])
            self.assertIsNone(image.info.get('transparency'), 'palette asset stays opaque')
            self.assertFalse(image.has_transparency_data)
            self.assertLessEqual(len(image.getcolors(maxcolors=1 << 20)), 128)

        self.assertEqual(self.report['size'], [640, 360])
        self.assertEqual(self.report['palette_limit'], 128)
        self.assertFalse(self.report['dither'])
        self.assertEqual(self.report['source'], 'assets/levels/05-a-path-for-two/environment-v3/entry-sunburst-master.png')
        self.assertEqual(self.report['output_sha256'], sha256(self.output))
        self.assertEqual(self.report['bytes'], self.output.stat().st_size)
        self.assertEqual(
            self.report['registration']['axis_landmarks'],
            {axis: {'source': list(self.profile[axis]['source']), 'target': list(self.profile[axis]['target'])}
             for axis in ('x', 'y')},
        )
        note = self.report['landmarks_note']
        self.assertIn(prepare.EXPECTED_SOURCE_SHA256, note)
        self.assertIn('specific to that exact master', note)

        # The same pinned master must reproduce the tracked normalized asset byte-for-byte.
        self.assertTrue(COMMITTED.exists(), 'the normalized asset has been generated')
        self.assertEqual(sha256(self.output), sha256(COMMITTED))

    def test_unregistered_source_is_rejected_before_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            other = directory / 'future-master.png'
            Image.new('RGB', (64, 36), '#123456').save(other)
            output = directory / 'normalized.png'
            report = directory / 'report.json'
            with self.assertRaises(SystemExit) as raised:
                prepare.normalize(other, output, report)
            self.assertIn('no registered landmark profile', str(raised.exception))
            self.assertFalse(output.exists(), 'a rejected source writes no asset')
            self.assertFalse(report.exists(), 'a rejected source writes no report')


if __name__ == '__main__':
    unittest.main(verbosity=2)

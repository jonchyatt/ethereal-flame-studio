/**
 * Tests for file naming utilities.
 * Run with: npx tsx src/lib/utils/fileNaming.test.ts
 */

import {
  sanitizeName,
  generateFileName,
  parseFileName,
  getNextVersion,
} from './fileNaming.js';

// Test helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `FAIL: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`
    );
  }
  console.log(`PASS: ${message}`);
}

console.log('\n=== sanitizeName tests ===\n');

assertEquals(
  sanitizeName('Morning Meditation'),
  'morning_meditation',
  'sanitizeName: spaces to underscores'
);

assertEquals(
  sanitizeName('Deep Space!! Ambient'),
  'deep_space_ambient',
  'sanitizeName: special chars to underscores'
);

assertEquals(
  sanitizeName('test.mp3'),
  'test',
  'sanitizeName: removes extension'
);

assertEquals(
  sanitizeName('My File.Name.mp3'),
  'my_file_name',
  'sanitizeName: removes extension with dots in name'
);

assertEquals(
  sanitizeName('___test___'),
  'test',
  'sanitizeName: trims underscores'
);

assertEquals(
  sanitizeName('UPPERCASE'),
  'uppercase',
  'sanitizeName: lowercases'
);

assertEquals(
  sanitizeName('numbers123'),
  'numbers123',
  'sanitizeName: preserves numbers'
);

assertEquals(
  sanitizeName('a   b   c'),
  'a_b_c',
  'sanitizeName: collapses multiple spaces'
);

console.log('\n=== generateFileName tests ===\n');

// Use local date to match formatDate's local-time behavior
const testDate = new Date(2026, 0, 27); // January 27, 2026 (local time)

assertEquals(
  generateFileName('Morning Meditation', '1080p', testDate),
  '20260127_morning_meditation_1080p_v1.mp4',
  'generateFileName: basic generation'
);

assertEquals(
  generateFileName('test.mp3', '4k', testDate, 2),
  '20260127_test_4k_v2.mp4',
  'generateFileName: with version number'
);

assertEquals(
  generateFileName('Deep Space!! Ambient.wav', '360stereo', testDate),
  '20260127_deep_space_ambient_360stereo_v1.mp4',
  'generateFileName: complex name with extension'
);

console.log('\n=== parseFileName tests ===\n');

assertEquals(
  parseFileName('20260127_morning_meditation_1080p_v1.mp4'),
  { date: '20260127', audioName: 'morning_meditation', format: '1080p', version: 1 },
  'parseFileName: basic parsing'
);

assertEquals(
  parseFileName('20260127_test_4k_v2.mp4'),
  { date: '20260127', audioName: 'test', format: '4k', version: 2 },
  'parseFileName: with version number'
);

assertEquals(
  parseFileName('20260127_deep_space_ambient_360stereo_v1.mp4'),
  { date: '20260127', audioName: 'deep_space_ambient', format: '360stereo', version: 1 },
  'parseFileName: complex name'
);

assertEquals(
  parseFileName('invalid_file.mp4'),
  null,
  'parseFileName: invalid returns null'
);

assertEquals(
  parseFileName('20260127_test_unknown_v1.mp4'),
  null,
  'parseFileName: unknown format returns null'
);

// Roundtrip test
const original = 'Morning Meditation!!.mp3';
const generated = generateFileName(original, '1080p', testDate);
const parsed = parseFileName(generated);
assert(parsed !== null, 'parseFileName: roundtrip not null');
assertEquals(
  parsed?.audioName,
  'morning_meditation',
  'parseFileName: roundtrip preserves sanitized name'
);

console.log('\n=== getNextVersion tests ===\n');

assertEquals(
  getNextVersion([], 'test', '1080p', testDate),
  1,
  'getNextVersion: starts at 1 for empty list'
);

const existingFiles = [
  '20260127_test_1080p_v1.mp4',
  '20260127_test_1080p_v2.mp4',
  '20260127_test_4k_v1.mp4',
  '20260127_other_1080p_v1.mp4',
];

assertEquals(
  getNextVersion(existingFiles, 'test', '1080p', testDate),
  3,
  'getNextVersion: increments from highest'
);

assertEquals(
  getNextVersion(existingFiles, 'test', '4k', testDate),
  2,
  'getNextVersion: different format'
);

assertEquals(
  getNextVersion(existingFiles, 'new_file', '1080p', testDate),
  1,
  'getNextVersion: new audio name starts at 1'
);

console.log('\n=== All tests passed! ===\n');

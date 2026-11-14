import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { paint, SCENES, PALETTE_NAMES } from '../grove.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'grove.mjs');

test('the same seed paints the same picture', () => {
  assert.equal(paint({ seed: 42, scene: 'lake' }), paint({ seed: 42, scene: 'lake' }));
});

test('different seeds paint different pictures', () => {
  const a = paint({ seed: 1, scene: 'lake' });
  const b = paint({ seed: 2, scene: 'lake' });
  assert.notEqual(a, b);
});

test('each scene has its own composition', () => {
  const seen = new Set(SCENES.map((scene) => paint({ seed: 5, scene })));
  assert.equal(seen.size, SCENES.length);
});

test('a named palette changes the colours', () => {
  const a = paint({ seed: 5, scene: 'valley', palette: 'storm' });
  const b = paint({ seed: 5, scene: 'valley', palette: 'noon' });
  assert.notEqual(a, b);
});

test('an unknown scene or palette falls back rather than failing', () => {
  assert.match(paint({ seed: 1, scene: 'nope', palette: 'nope' }), /^<svg/);
});

test('the output is a complete svg document', () => {
  const svg = paint({ seed: 9, scene: 'cabin' });
  assert.match(svg, /^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.match(svg, /viewBox="0 0 1200 900"/);
});

test('no number in the document is NaN, infinite or undefined', () => {
  for (const scene of SCENES) {
    const svg = paint({ seed: 3, scene });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${scene} has a bad number`);
  }
});

test('every path and polygon has a well-formed data attribute', () => {
  const svg = paint({ seed: 11, scene: 'forest' });
  const shapes = svg.match(/<(path|polygon|rect|ellipse|circle)\b[^>]*>/g) ?? [];
  assert.ok(shapes.length > 500, `only ${shapes.length} shapes`);
  for (const shape of shapes) {
    assert.doesNotMatch(shape, /d=""/);
  }
});

test('a size can be set', () => {
  const svg = paint({ seed: 1, scene: 'lake', width: 600, height: 400 });
  assert.match(svg, /viewBox="0 0 600 400"/);
});

test('the cli writes a file with --out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grove-'));
  const out = join(dir, 'one.svg');
  execFileSync(process.execPath, [cli, '--seed', '8', '--scene', 'valley', '--out', out]);
  assert.ok(existsSync(out));
  assert.match(readFileSync(out, 'utf8'), /^<svg/);
});

test('the cli builds a gallery', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grove-gal-'));
  execFileSync(process.execPath, [cli, '--gallery', dir, '--count', '4', '--seed-base', '10']);
  const files = readdirSync(dir);
  assert.equal(files.filter((f) => f.endsWith('.svg')).length, 4);
  assert.ok(files.includes('index.html'));
  const page = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.equal((page.match(/<figure>/g) ?? []).length, 4);
});

test('the palette list matches the palettes the code knows', () => {
  assert.deepEqual(PALETTE_NAMES.slice().sort(), ['dusk', 'morning', 'noon', 'storm', 'winter']);
});

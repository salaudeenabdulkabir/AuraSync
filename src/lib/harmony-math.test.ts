import assert from 'node:assert/strict';
import test from 'node:test';
import { computeHarmonyAudit, deltaE76, hexToLab, labToHex } from './harmony-math';

test('sRGB black and white convert to reference CIELAB values', () => {
  assert.ok(Math.abs(hexToLab('#000000').l) < 0.001);
  assert.ok(Math.abs(hexToLab('#FFFFFF').l - 100) < 0.001);
  assert.ok(Math.abs(hexToLab('#FFFFFF').a) < 0.01);
  assert.ok(Math.abs(hexToLab('#FFFFFF').b) < 0.01);
});

test('deltaE76 is symmetric and zero for identical colors', () => {
  const a = hexToLab('#B9633D'); const b = hexToLab('#C51475');
  assert.equal(deltaE76(a, a), 0);
  assert.equal(deltaE76(a, b), deltaE76(b, a));
});

test('CIELAB converts back to the source color within rounding error', () => {
  for (const color of ['#B9633D', '#C51475', '#075343']) {
    const restored = hexToLab(labToHex(hexToLab(color)));
    assert.ok(deltaE76(hexToLab(color), restored) < 0.3);
  }
});

test('washout and redness flags follow documented thresholds', () => {
  const audit = computeHarmonyAudit('#B56370', '#B56370', 35);
  assert.equal(audit.washout, true);
  assert.equal(audit.rednessRisk, true);
  assert.ok(audit.score < 80);
  assert.equal(computeHarmonyAudit('#B56370', '#B56370').rednessRisk, null);
});

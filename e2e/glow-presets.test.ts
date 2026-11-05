import assert from 'node:assert/strict'
import test from 'node:test'
import { MIST_PRESETS } from '../src/components/mist/presets.ts'
import { GEMINI_TOP_LAYER } from '../src/components/mist/layeredPreset.ts'

test('layered overlays the unchanged site and Gemini presets', () => {
  assert.equal(MIST_PRESETS.layered.layered, true)
  assert.deepEqual(MIST_PRESETS.layered, { ...MIST_PRESETS.whatAmIAppreciatingNow, label: 'Layered', layered: true })
  assert.deepEqual({ ...GEMINI_TOP_LAYER, label: MIST_PRESETS.gemini.label }, MIST_PRESETS.gemini)
  assert.equal(MIST_PRESETS.layered.position, 'full')
  assert.equal(GEMINI_TOP_LAYER.position, 'top')
  assert.equal(GEMINI_TOP_LAYER.speed, 1)
  assert.deepEqual(MIST_PRESETS.geminiColours.palette, MIST_PRESETS.gemini.palette)
  assert.equal(MIST_PRESETS.geminiColours.position, 'full')
})

for (const [name, preset] of Object.entries(MIST_PRESETS)) {
  test(`${name} has valid colours and bounded settings`, () => {
    assert.ok(preset.palette.length >= 3 && preset.palette.length <= 6)
    assert.ok(preset.palette.every(colour => /^#[0-9a-f]{6}$/i.test(colour)))
    assert.ok(preset.speed >= 0.04 && preset.speed <= 1.2)
    assert.ok(preset.intensity >= 0 && preset.intensity <= 1.5)
    assert.ok(preset.height >= 0.2 && preset.height <= 0.96)
    assert.ok(preset.grain >= 0 && preset.grain <= 1)
  })
}

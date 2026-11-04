import assert from 'node:assert/strict'
import { Box3 } from 'three'
import { constructionOrder, partProgress, progressAtLine } from '../src/components/building/building-timeline.js'
import { createBuildingModel } from '../src/components/building/building-scene.js'
import { buildingSystems, constructionCopy, wholeProjectChapter } from '../src/components/building/building-content.js'

// Real layout anchors can be uneven because service lists expand and photos load.
const anchors = [100, 600, 1500, 1800, 2500, 3200, 4000, 4700, 5500]
assert.equal(progressAtLine(anchors, -50), 0)
assert.equal(progressAtLine(anchors, 6000), 8)
assert.equal(progressAtLine(anchors, 1050), 1.5)
assert.equal(progressAtLine(anchors.map((x) => x - 400), 650), 1.5)
for (let i = 0; i <= 8; i++) assert.equal(progressAtLine(anchors, anchors[i]), i)
assert.equal(progressAtLine([], 100), 0)
for (let stage = 1; stage <= 8; stage++) {
  assert.equal(partProgress(stage - 1, stage), 0)
  assert.equal(partProgress(stage, stage), 1)
}

const palette = Object.fromEntries(['soil', 'earth', 'concrete', 'stone', 'frame', 'metal', 'glass', 'glassLight', 'wood', 'supply', 'cable', 'light', 'leaf', 'leafLight', 'solar', 'line'].map(name => [name, '#667766']))
const model = createBuildingModel(palette)
const counts = []
for (let stage = 0; stage <= 8; stage++) {
  model.update(stage)
  counts.push(model.visibleParts)
  if (stage) assert.ok(counts[stage] > counts[stage - 1], `Stage ${stage} must add physical geometry`)
}
const bounds = new Box3().setFromObject(model.root)
assert.ok(bounds.max.y > 18 && bounds.max.y < 20, 'Full model includes rooftop equipment')
model.update(8, true)
assert.ok(model.visibleParts < counts[8], 'Inspection must reveal the internal structure')
model.update(8, false)
assert.equal(model.visibleParts, counts[8], 'Closing inspection must restore the entire facade')
for (let stage = 8; stage >= 0; stage--) {
  model.update(stage)
  assert.equal(model.visibleParts, counts[stage], 'Reverse scrolling must restore the same construction state')
}
for (const id of constructionOrder) {
  assert.ok([...buildingSystems, wholeProjectChapter].some(chapter => chapter.id === id))
  assert.ok(constructionCopy[id].elements.length > 0)
}
model.dispose()
console.log('Building checks passed: all eight stages, scroll interpolation, reverse construction, inspection and content coverage.')

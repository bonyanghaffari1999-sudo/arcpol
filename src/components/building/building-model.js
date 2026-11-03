// Isometric construction helpers are adapted from the Anatomy MIT-licensed kit.
// The scene below is an educational schematic, not an engineering drawing.
import {
  boxCorners,
  cylinder,
  depthOf,
  dotsSvg,
  fitProjection,
  iso,
  lineSvg,
  pathOf,
  pointsAt,
  slabOf,
  solidSvg,
} from './anatomy/iso-kit.mjs'

export const BUILDING_VIEWBOX = '0 0 700 700'
export const BUILDING_VIEW_SIZE = 700

const X_GRID = [0.45, 6, 11.55]
const Y_GRID = [0.45, 4.8, 9.15]
const FLOOR_HEIGHT = 3.4
const STORY_COUNT = 5
const LEVELS = Array.from({ length: STORY_COUNT + 1 }, (_, index) => index * FLOOR_HEIGHT)
const FOOTPRINT = { x: 0, y: 0, w: 12, d: 9.6, r: 0.08 }
const SITE_BOUNDS = { x: -2.3, y: -2.1, w: 16.9, d: 13.7, r: 0 }

const projection = fitProjection(
  boxCorners(SITE_BOUNDS, -3.35, LEVELS[STORY_COUNT] + 1.7),
  BUILDING_VIEW_SIZE,
  BUILDING_VIEW_SIZE,
  { pad: 116, azimuth: 45, elevation: 30 },
)

const contents = Object.create(null)
const order = Object.create(null)
const partIds = ['foundation', 'structure', 'slabs', 'architecture', 'mechanical', 'electrical', 'roof']
for (const id of partIds) {
  contents[id] = []
  order[id] = 0
}

function put(system, html, center, depthOffset = 0) {
  if (!html) return
  contents[system].push({
    order: order[system]++,
    depth: depthOf(center, projection) + depthOffset,
    html,
  })
}

function addBox(system, plan, z, height, material, tone = 'mid', { bevel = 0.08, crease = 'faint', halo = false, depthOffset = 0 } = {}) {
  if (height <= 0 || plan.w <= 0 || plan.d <= 0) return
  const center = [plan.x + plan.w / 2, plan.y + plan.d / 2, z + height / 2]
  const paths = slabOf(plan, z, height, projection, 2, bevel)
  put(system, solidSvg(paths, { tone, crease, halo, className: `material-${material}` }), center, depthOffset)
}

function addCylinder(system, x, y, radius, z, height, material, tone = 'mid') {
  put(system, solidSvg(cylinder(x, y, radius, z, height, projection, 12, 0.05), {
    tone,
    crease: 'faint',
    className: `material-${material}`,
  }), [x, y, z + height / 2])
}

function addLine(system, points, className, tone = 'mid', { dashed = false, dotted = false, depthOffset = 0 } = {}) {
  if (points.length < 2) return
  const projected = points.map((point) => iso(point, projection))
  const center = points.reduce((sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length, sum[2] + point[2] / points.length], [0, 0, 0])
  put(system, lineSvg(pathOf(projected), { tone, className, dashed, dotted }), center, depthOffset)
}

function addTopLine(system, from, to, z, className, tone = 'mid') {
  addLine(system, [[from[0], from[1], z], [to[0], to[1], z]], className, tone)
}

function addJointDots(system, points, tone = 'mid') {
  if (!points.length) return
  const dots = dotsSvg(pointsAt(points, projection), { size: 0.105, tone })
  const center = points.reduce((sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length, sum[2] + point[2] / points.length], [0, 0, 0])
  put(system, dots, center, 0.01)
}

function buildFoundation() {
  const soil = { x: -2.1, y: -1.85, w: 16.2, d: 13.2, r: 0.08 }
  addBox('foundation', soil, -3.2, 2.25, 'soil', 'lo', { bevel: 0.02, crease: 'faint' })

  // Exposed soil strata on the two visible cut faces.
  for (const z of [-2.75, -2.25, -1.75, -1.3]) {
    addLine('foundation', [[soil.x + soil.w, soil.y + 0.2, z], [soil.x + soil.w, soil.y + soil.d - 0.2, z]], 'soil-strata', 'faint')
    addLine('foundation', [[soil.x + 0.2, soil.y + soil.d, z], [soil.x + soil.w - 0.2, soil.y + soil.d, z]], 'soil-strata', 'faint')
  }

  // Excavation bed and a narrow retaining edge make the ground/foundation relationship legible.
  addBox('foundation', { x: 0.2, y: 0.2, w: 11.6, d: 9.2, r: 0.04 }, -0.88, 0.08, 'excavation', 'faint', { bevel: 0.02 })
  addBox('foundation', { x: 11.7, y: 0.15, w: 0.25, d: 9.3, r: 0.02 }, -1.6, 1.3, 'concrete', 'lo', { bevel: 0.06 })

  const footingCenters = []
  for (const x of X_GRID) {
    for (const y of Y_GRID) {
      addBox('foundation', { x: x - 0.72, y: y - 0.72, w: 1.44, d: 1.44, r: 0.1 }, -1.95, 1.36, 'concrete', 'mid', { bevel: 0.12, halo: true })
      addBox('foundation', { x: x - 0.37, y: y - 0.37, w: 0.74, d: 0.74, r: 0.05 }, -0.59, 0.38, 'concrete', 'hi', { bevel: 0.08 })
      footingCenters.push([x, y, -0.35])
    }
  }

  for (let index = 0; index < X_GRID.length - 1; index++) {
    const x0 = X_GRID[index]
    const x1 = X_GRID[index + 1]
    for (const y of Y_GRID) addBox('foundation', { x: x0, y: y - 0.2, w: x1 - x0, d: 0.4, r: 0.02 }, -0.42, 0.34, 'concrete', 'mid', { bevel: 0.05 })
  }
  for (let index = 0; index < Y_GRID.length - 1; index++) {
    const y0 = Y_GRID[index]
    const y1 = Y_GRID[index + 1]
    for (const x of X_GRID) addBox('foundation', { x: x - 0.2, y: y0, w: 0.4, d: y1 - y0, r: 0.02 }, -0.42, 0.34, 'concrete', 'mid', { bevel: 0.05 })
  }
  addJointDots('foundation', footingCenters, 'mid')
}

function buildStructure() {
  // Six support lines, split at each slab so the columns meet the beam bands cleanly.
  for (let story = 0; story < STORY_COUNT; story++) {
    const z0 = LEVELS[story] + 0.2
    const z1 = LEVELS[story + 1] - 0.38
    for (const x of X_GRID) {
      for (const y of Y_GRID) {
        addBox('structure', { x: x - 0.18, y: y - 0.18, w: 0.36, d: 0.36, r: 0.025 }, z0, z1 - z0, 'frame', 'mid', { bevel: 0.06 })
      }
    }
  }

  // Perimeter and cross beams sit immediately below every elevated floor plate.
  for (let level = 1; level <= STORY_COUNT; level++) {
    const z = LEVELS[level] - 0.38
    for (const y of Y_GRID) addBox('structure', { x: 0.45, y: y - 0.18, w: 11.1, d: 0.36, r: 0.025 }, z, 0.38, 'frame', 'hi', { bevel: 0.05 })
    for (const x of X_GRID) addBox('structure', { x: x - 0.18, y: 0.45, w: 0.36, d: 8.7, r: 0.025 }, z, 0.38, 'frame', 'mid', { bevel: 0.05 })
  }

  // A compact service core ties the five levels together.
  addBox('structure', { x: 5.25, y: 3.85, w: 0.18, d: 1.65, r: 0.01 }, 0.2, 16.8, 'frame', 'lo', { bevel: 0.02 })
  addBox('structure', { x: 6.85, y: 3.85, w: 0.18, d: 1.65, r: 0.01 }, 0.2, 16.8, 'frame', 'mid', { bevel: 0.02 })
  addBox('structure', { x: 5.43, y: 3.85, w: 1.42, d: 0.16, r: 0.01 }, 0.2, 16.8, 'frame', 'lo', { bevel: 0.02 })

  const jointPoints = []
  for (let level = 1; level <= STORY_COUNT; level++) {
    for (const x of X_GRID) {
      for (const y of Y_GRID) jointPoints.push([x, y, LEVELS[level] - 0.37])
    }
  }
  addJointDots('structure', jointPoints, 'faint')
}

function buildSlabs() {
  for (let level = 0; level <= STORY_COUNT; level++) {
    addBox('slabs', { ...FOOTPRINT }, LEVELS[level], 0.2, 'slab', 'mid', { bevel: 0.12, halo: level === 0 })
    addLine('slabs', [[0.8, 0.8, LEVELS[level] + 0.205], [11.2, 0.8, LEVELS[level] + 0.205]], 'slab-joint', 'faint')
    addLine('slabs', [[0.8, 8.8, LEVELS[level] + 0.205], [11.2, 8.8, LEVELS[level] + 0.205]], 'slab-joint', 'faint')
  }
}

function buildArchitecture() {
  for (let story = 0; story < STORY_COUNT; story++) {
    const floorZ = LEVELS[story]
    const wallZ = floorZ + 0.38
    const wallH = FLOOR_HEIGHT - 0.86
    const windowZ = floorZ + 0.64
    const windowH = 2.06

    // Visible front elevation: framed glazing with opaque piers and a sill band.
    for (const x of [0.34, 4.2, 8.05, 11.68]) {
      addBox('architecture', { x, y: 9.34, w: 0.26, d: 0.17, r: 0.02 }, wallZ, wallH, 'facade', 'mid', { bevel: 0.03 })
    }
    for (const bay of [
      { x: 0.72, w: 3.15 },
      { x: 4.55, w: 3.13 },
      { x: 8.4, w: 2.95 },
    ]) {
      addBox('architecture', { x: bay.x, y: 9.4, w: bay.w, d: 0.085, r: 0.015 }, windowZ, windowH, 'glass', 'lo', { bevel: 0.02 })
      for (const offset of [0, bay.w / 3, (bay.w * 2) / 3, bay.w]) {
        addBox('architecture', { x: bay.x + offset - 0.035, y: 9.31, w: 0.07, d: 0.13, r: 0.01 }, windowZ - 0.04, windowH + 0.08, 'frame', 'faint', { bevel: 0.015 })
      }
      addBox('architecture', { x: bay.x, y: 9.31, w: bay.w, d: 0.13, r: 0.01 }, windowZ - 0.08, 0.1, 'facade', 'mid', { bevel: 0.02 })
      addBox('architecture', { x: bay.x, y: 9.31, w: bay.w, d: 0.13, r: 0.01 }, windowZ + windowH, 0.1, 'facade', 'mid', { bevel: 0.02 })
    }

    // The exposed side elevation uses a similar window rhythm, shortened around the service core.
    for (const y of [0.35, 3.4, 6.45, 9.3]) {
      addBox('architecture', { x: 11.82, y, w: 0.16, d: 0.24, r: 0.02 }, wallZ, wallH, 'facade', 'mid', { bevel: 0.03 })
    }
    for (const bay of [
      { y: 0.72, d: 2.34 },
      { y: 3.78, d: 2.34 },
      { y: 6.84, d: 2.12 },
    ]) {
      addBox('architecture', { x: 11.88, y: bay.y, w: 0.075, d: bay.d, r: 0.01 }, windowZ, windowH, 'glass', 'lo', { bevel: 0.02 })
      for (const offset of [0, bay.d / 2, bay.d]) {
        addBox('architecture', { x: 11.8, y: bay.y + offset - 0.035, w: 0.14, d: 0.07, r: 0.01 }, windowZ - 0.04, windowH + 0.08, 'frame', 'faint', { bevel: 0.015 })
      }
    }

    // Short interior partitions hint at rooms while leaving the service runs visible.
    addBox('architecture', { x: 3.1, y: 2.0, w: 0.13, d: 3.0, r: 0.01 }, floorZ + 0.2, 2.45, 'partition', 'lo', { bevel: 0.02 })
    addBox('architecture', { x: 7.4, y: 1.0, w: 0.13, d: 2.4, r: 0.01 }, floorZ + 0.2, 2.45, 'partition', 'lo', { bevel: 0.02 })
    addBox('architecture', { x: 7.4, y: 6.9, w: 0.13, d: 1.75, r: 0.01 }, floorZ + 0.2, 2.45, 'partition', 'lo', { bevel: 0.02 })
  }
}

function buildMechanical() {
  const riserX = 8.85
  const riserY = 5.95
  const stackBottom = 0.24
  const stackTop = LEVELS[STORY_COUNT] + 0.24

  // Paired vertical service risers; each horizontal branch lands at a floor duct.
  addLine('mechanical', [[riserX, riserY, stackBottom], [riserX, riserY, stackTop]], 'mechanical-pipe mechanical-pipe--riser', 'blue')
  addLine('mechanical', [[riserX + 0.34, riserY + 0.28, stackBottom], [riserX + 0.34, riserY + 0.28, stackTop]], 'mechanical-pipe mechanical-pipe--return', 'green')

  for (let story = 0; story < STORY_COUNT; story++) {
    const z = LEVELS[story] + 2.55
    addBox('mechanical', { x: 3.15, y: 5.58, w: 5.55, d: 0.56, r: 0.04 }, z, 0.45, 'duct', 'mid', { bevel: 0.08 })
    addLine('mechanical', [[3.2, 5.86, z + 0.23], [riserX, riserY, z + 0.23]], 'mechanical-pipe', 'blue')
    addLine('mechanical', [[4.0, 5.82, z], [4.0, 5.82, z - 0.58]], 'mechanical-drop', 'faint')
    addLine('mechanical', [[6.8, 5.82, z], [6.8, 5.82, z - 0.58]], 'mechanical-drop', 'faint')
    addBox('mechanical', { x: 3.68, y: 5.55, w: 0.64, d: 0.62, r: 0.04 }, z - 0.72, 0.12, 'duct', 'hi', { bevel: 0.04 })
    addBox('mechanical', { x: 6.48, y: 5.55, w: 0.64, d: 0.62, r: 0.04 }, z - 0.72, 0.12, 'duct', 'hi', { bevel: 0.04 })
  }

  for (let story = 0; story < STORY_COUNT; story++) {
    const z = LEVELS[story] + 1.0
    addCylinder('mechanical', riserX, riserY, 0.12, z, 0.18, 'fitting', 'hi')
    addCylinder('mechanical', riserX + 0.34, riserY + 0.28, 0.1, z + 0.42, 0.14, 'fitting', 'mid')
  }
}

function buildElectrical() {
  const riserX = 2.05
  const riserY = 3.15
  addLine('electrical', [[riserX, riserY, 0.2], [riserX, riserY, LEVELS[STORY_COUNT] - 0.1]], 'electrical-conduit electrical-conduit--riser', 'green')

  for (let story = 0; story < STORY_COUNT; story++) {
    const ceilingZ = LEVELS[story] + 2.92
    addBox('electrical', { x: 1.65, y: 2.75, w: 0.8, d: 0.72, r: 0.06 }, LEVELS[story] + 1.05, 0.82, 'panel', 'mid', { bevel: 0.08 })
    addLine('electrical', [[riserX, riserY, ceilingZ], [10.25, riserY, ceilingZ]], 'electrical-conduit', 'green')
    for (const x of [3.35, 6.2, 9.1]) {
      addLine('electrical', [[x, riserY, ceilingZ], [x, riserY + 0.8, ceilingZ]], 'electrical-conduit electrical-conduit--branch', 'faint')
      addBox('electrical', { x: x - 0.34, y: riserY + 0.68, w: 0.68, d: 0.32, r: 0.04 }, ceilingZ - 0.17, 0.12, 'light', 'hi', { bevel: 0.04 })
    }
  }

  const junctionPoints = LEVELS.slice(0, STORY_COUNT).map((z) => [riserX, riserY, z + 1.47])
  addJointDots('electrical', junctionPoints, 'hi')
}

function buildRoof() {
  const top = LEVELS[STORY_COUNT] + 0.2
  const parapetHeight = 0.72
  addBox('roof', { x: 0.1, y: 0.1, w: 11.8, d: 0.2, r: 0.015 }, top, parapetHeight, 'facade', 'mid', { bevel: 0.03 })
  addBox('roof', { x: 0.1, y: 9.3, w: 11.8, d: 0.2, r: 0.015 }, top, parapetHeight, 'facade', 'hi', { bevel: 0.03 })
  addBox('roof', { x: 0.1, y: 0.3, w: 0.2, d: 8.9, r: 0.015 }, top, parapetHeight, 'facade', 'lo', { bevel: 0.03 })
  addBox('roof', { x: 11.7, y: 0.3, w: 0.2, d: 8.9, r: 0.015 }, top, parapetHeight, 'facade', 'mid', { bevel: 0.03 })

  // Solar array: six framed modules on support rails with a restrained cell grid.
  addBox('roof', { x: 6.9, y: 1.55, w: 4.0, d: 0.18, r: 0.02 }, top + 0.18, 0.12, 'frame', 'lo', { bevel: 0.03 })
  addBox('roof', { x: 6.9, y: 4.7, w: 4.0, d: 0.18, r: 0.02 }, top + 0.18, 0.12, 'frame', 'lo', { bevel: 0.03 })
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 3; column++) {
      const x = 7.0 + column * 1.28
      const y = 1.9 + row * 1.46
      addBox('roof', { x, y, w: 1.12, d: 1.32, r: 0.035 }, top + 0.32, 0.12, 'solar', 'hi', { bevel: 0.04 })
      for (const cellX of [x + 0.38, x + 0.76]) addTopLine('roof', [cellX, y + 0.06], [cellX, y + 1.26], top + 0.445, 'solar-grid', 'faint')
      addTopLine('roof', [x + 0.05, y + 0.66], [x + 1.07, y + 0.66], top + 0.445, 'solar-grid', 'faint')
    }
  }

  // Small rooftop equipment sits on service pads, away from the solar array.
  for (const [x, y] of [[1.1, 1.2], [3.25, 1.2], [1.1, 3.0]]) {
    addBox('roof', { x, y, w: 1.35, d: 1.05, r: 0.08 }, top + 0.2, 0.74, 'equipment', 'mid', { bevel: 0.1 })
    addLine('roof', [[x + 0.2, y + 0.2, top + 0.95], [x + 1.15, y + 0.2, top + 0.95]], 'equipment-seam', 'faint')
    addLine('roof', [[x + 0.2, y + 0.42, top + 0.95], [x + 1.15, y + 0.42, top + 0.95]], 'equipment-seam', 'faint')
  }
}

buildFoundation()
buildStructure()
buildSlabs()
buildArchitecture()
buildMechanical()
buildElectrical()
buildRoof()

export const buildingScene = Object.fromEntries(partIds.map((id) => [
  id,
  contents[id]
    .sort((left, right) => left.depth - right.depth || left.order - right.order)
    .map((entry) => entry.html)
    .join(''),
]))

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { clamp, partProgress } from './building-timeline.js'

// A locally built, conceptual five-storey model. Dimensions are visual units,
// not construction drawings. Materials and scene geometry never contain service copy.
export function createBuildingModel(palette) {
  const root = new THREE.Group()
  const parts = []
  const materials = {}
  const highlightedMaterials = new Map()
  const material = (name, color, options = {}) => {
    materials[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...options })
  }
  material('soil', palette.soil)
  material('earth', palette.earth)
  material('concrete', palette.concrete)
  material('stone', palette.stone)
  material('frame', palette.frame, { roughness: 0.65, metalness: 0.12 })
  material('metal', palette.metal, { roughness: 0.38, metalness: 0.65 })
  material('glass', palette.glass, { roughness: 0.2, metalness: 0.38 })
  material('glassLight', palette.glassLight, { roughness: 0.22, metalness: 0.28 })
  material('wood', palette.wood)
  material('supply', palette.supply, { metalness: 0.25 })
  material('return', palette.wood, { metalness: 0.25 })
  material('cable', palette.cable, { metalness: 0.3 })
  material('light', palette.light, { emissive: palette.light, emissiveIntensity: 0.55 })
  material('leaf', palette.leaf)
  material('leafLight', palette.leafLight)
  material('solar', palette.solar, { roughness: 0.3, metalness: 0.45 })
  material('line', palette.line)

  function batch({ stage = 0, start = 0, end = 1, y = 0, rise = 0, grow = false, cutaway = false } = {}, build) {
    const geometries = new Map()
    const add = (geometry, name, x, localY, z, rotation) => {
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(x, localY, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation || [0, 0, 0]))),
        new THREE.Vector3(1, 1, 1),
      )
      geometry.applyMatrix4(matrix)
      if (!geometries.has(name)) geometries.set(name, [])
      geometries.get(name).push(geometry)
    }
    const box = (name, x, y, z, w, h, d, rotation) => add(new THREE.BoxGeometry(w, h, d), name, x, y, z, rotation)
    const cylinder = (name, x, y, z, radius, height, rotation, radiusTop = radius) => add(new THREE.CylinderGeometry(radiusTop, radius, height, 10), name, x, y, z, rotation)
    const sphere = (name, x, y, z, radius) => add(new THREE.IcosahedronGeometry(radius, 1), name, x, y, z)
    build({ box, cylinder, sphere })
    const group = new THREE.Group()
    for (const [name, source] of geometries) {
      const merged = mergeGeometries(source)
      source.forEach((geometry) => geometry.dispose())
      const mesh = new THREE.Mesh(merged, materials[name])
      mesh.castShadow = !['line', 'light'].includes(name)
      mesh.receiveShadow = true
      mesh.userData.stage = stage || 1
      mesh.userData.baseMaterial = mesh.material
      group.add(mesh)
    }
    group.position.y = y
    root.add(group)
    parts.push({ group, stage, start, end, y, rise, grow, cutaway })
    return group
  }

  // A cut block of earth, a survey grid, and the continuous pavement edge.
  batch({}, ({ box }) => {
    box('earth', 0, -1.25, 0, 19, 0.8, 15)
    box('soil', 0, -0.75, 0, 19.2, 0.24, 15.2)
    for (let x = -8; x <= 8; x += 2) box('line', x, -0.615, 0, 0.018, 0.012, 14)
    for (let z = -6; z <= 6; z += 2) box('line', 0, -0.614, z, 18, 0.012, 0.018)
    for (const x of [-6.5, 6.5]) for (const z of [-4.5, 4.5]) {
      box('wood', x, -0.25, z, 0.065, 0.75, 0.065)
      box('stone', x, 0.09, z, 0.3, 0.045, 0.3)
    }
  })
  const xs = [-5.1, -1.7, 1.7, 5.1]
  const zs = [-3.5, 0, 3.5]
  for (let row = 0; row < zs.length; row += 1) {
    batch({ stage: 1, start: row * 0.15, end: 0.55 + row * 0.18, y: -0.6, grow: true }, ({ box }) => {
      for (const x of xs) {
        box('concrete', x, 0.25, zs[row], 1.75, 0.5, 1.6)
        box('frame', x, 0.69, zs[row], 0.62, 0.4, 0.62)
        for (const dx of [-0.19, 0.19]) for (const dz of [-0.19, 0.19]) box('metal', x + dx, 0.98, zs[row] + dz, 0.035, 0.62, 0.035)
      }
      box('concrete', 0, 0.32, zs[row], 11, 0.4, 0.48)
    })
  }
  batch({ stage: 1, start: 0.55, end: 1 }, ({ box }) => {
    for (const x of xs) box('concrete', x, -0.25, 0, 0.45, 0.4, 8.2)
    box('concrete', 0, 0.25, 0, 11.6, 0.28, 8.2)
  })

  const floorHeight = 3.05
  const floorBase = (floor) => 0.4 + floor * floorHeight
  for (let floor = 0; floor < 5; floor += 1) {
    const start = floor * 0.15
    const end = 0.4 + floor * 0.15
    const y = floorBase(floor)
    batch({ stage: 2, start, end, y, grow: true }, ({ box }) => {
      for (const x of xs) for (const z of zs) {
        box('frame', x, floorHeight / 2, z, 0.34, floorHeight, 0.34)
        box('metal', x, 0.06, z, 0.48, 0.08, 0.48)
      }
      for (const z of zs) box('frame', 0, floorHeight - 0.18, z, 10.6, 0.34, 0.23)
      for (const x of xs) box('frame', x, floorHeight - 0.18, 0, 0.23, 0.34, 7.3)
      // Rear service core, open on the front to make the stairs legible.
      box('concrete', 0, 1.5, -2.95, 2.2, 3, 0.16)
      box('concrete', -1, 1.5, -1.9, 0.16, 3, 2.2)
    })
    batch({ stage: 3, start, end, y: y + floorHeight, rise: 1.2 }, ({ box }) => {
      box('stone', 0, -0.12, -2.65, 11.5, 0.22, 2.9)
    })
    batch({ stage: 3, start, end, y: y + floorHeight, rise: 1.2, cutaway: true }, ({ box }) => {
      box('stone', 0, -0.12, 1.75, 11.5, 0.22, 5.9)
      box('concrete', 0, -0.25, 4.5, 11.7, 0.18, 0.35)
      for (const x of [-3.4, 3.4]) box('concrete', x, -0.26, 0.2, 0.11, 0.12, 8)
    })
    batch({ stage: 3, start, end, y }, ({ box }) => {
      for (let step = 0; step < 14; step += 1) box('stone', 0.1, 0.1 + step * 0.215, -2.65 + step * 0.19, 1.45, 0.16, 0.27)
      box('metal', 0.91, 2.1, -1.4, 0.045, 0.045, 3.8, [-0.84, 0, 0])
    })
    batch({ stage: 4, start, end, y, grow: true }, ({ box, cylinder }) => {
      for (const [x, name] of [[1.25, 'supply'], [1.55, 'return']]) {
        cylinder(name, x, 1.5, -2.5, 0.065, 3.05)
        cylinder(name, x + 1.5, 2.65, -2.5, 0.055, 3, [0, 0, Math.PI / 2])
        cylinder(name, x + 3, 2.65, -0.5, 0.055, 4, [Math.PI / 2, 0, 0])
      }
      box('metal', -2.7, 2.65, 0, 0.44, 0.28, 6.8)
      box('metal', 0, 2.65, 1.5, 8.5, 0.28, 0.44)
      for (const x of [-4, 3.8]) {
        box('stone', x, 2.61, 1.5, 0.8, 0.12, 0.65)
        for (let i = 0; i < 5; i += 1) box('metal', x - 0.28 + i * 0.14, 2.54, 1.5, 0.035, 0.025, 0.5)
      }
    })
    batch({ stage: 5, start, end, y, grow: true }, ({ box, cylinder }) => {
      box('cable', -1.35, 1.5, -2.5, 0.1, 3.05, 0.16)
      box('cable', -1.35, 2.7, 0.1, 0.09, 0.08, 5.4)
      box('cable', 0, 2.7, 2.65, 8.4, 0.08, 0.08)
      box('metal', -1.35, 1.45, -2.28, 0.55, 0.7, 0.22)
      for (const x of [-3.8, 0, 3.8]) {
        cylinder('cable', x, 2.58, 2.65, 0.025, 0.22)
        box('light', x, 2.45, 2.65, 0.72, 0.05, 0.3)
      }
    })
    // Enclosed rear and side walls; the front is a separate inspection layer.
    batch({ stage: 6, start, end, y, rise: 0.7 }, ({ box }) => {
      box('stone', 0, 1.5, -3.85, 11.2, 2.85, 0.24)
      for (const x of [-5.5, 5.5]) {
        box('stone', x, 0.45, 0, 0.23, 0.85, 7.6)
        box('stone', x, 2.8, 0, 0.23, 0.3, 7.6)
        for (const z of [-2.5, 0, 2.5]) {
          box('glass', x, 1.65, z, 0.08, 1.5, 1.9)
          for (const dz of [-1, 0, 1]) box('metal', x + (x > 0 ? 0.07 : -0.07), 1.65, z + dz, 0.09, 1.62, 0.045)
        }
        for (const z of [-3.6, -1.25, 1.25, 3.6]) box('stone', x, 1.55, z, 0.3, 2.7, 0.4)
      }
      // Window recesses on the back avoid an unfinished fourth facade.
      for (const x of [-3.5, 0, 3.5]) {
        box('metal', x, 1.6, -4, 2.35, 1.8, 0.08)
        box('glassLight', x, 1.6, -4.06, 2.15, 1.6, 0.06)
        box('metal', x, 1.6, -4.11, 0.045, 1.6, 0.03)
      }
      for (const x of [-2.7, 2.7]) box('stone', x, 1.1, -1.5, 0.1, 2.1, 3.8)
    })
    batch({ stage: 6, start, end, y, rise: 0.7, cutaway: true }, ({ box, cylinder }) => {
      for (const x of [-3.5, 0, 3.5]) {
        box('metal', x, 1.5, 3.6, 3.27, 2.7, 0.12)
        box(floor % 2 ? 'glassLight' : 'glass', x, 1.5, 3.68, 3.13, 2.54, 0.07)
        for (const dx of [-1.55, 0, 1.55]) box('metal', x + dx, 1.5, 3.75, 0.05, 2.6, 0.07)
        box('stone', x, 0.1, 4.15, 3.3, 0.2, 1.2)
        if (floor > 0) {
          box('glassLight', x, 0.73, 4.7, 3.2, 0.9, 0.045)
          box('metal', x, 1.21, 4.7, 3.3, 0.055, 0.07)
          for (const dx of [-1.57, 1.57]) cylinder('metal', x + dx, 0.65, 4.7, 0.025, 1.15)
        }
      }
      for (const x of [-5.25, -1.76, 1.76, 5.25]) {
        box('stone', x, 1.5, 3.88, 0.23, 2.9, 0.6)
        for (let i = 0; i < 3; i += 1) box('wood', x - 0.19 + i * 0.19, 1.5, 4.12, 0.065, 2.65, 0.13)
      }
      if (floor === 0) {
        box('metal', 0, 2.6, 4.4, 3.3, 0.14, 1.8)
        for (const x of [-0.7, 0.7]) box('metal', x, 1.1, 3.83, 0.035, 0.65, 0.08)
      }
    })
  }

  const roofY = floorBase(5)
  batch({ stage: 7, start: 0, end: 0.5, y: roofY, rise: 1.1, cutaway: true }, ({ box }) => {
    box('stone', 0, 0, 0.3, 11.8, 0.28, 9)
    for (const x of [-5.75, 5.75]) box('stone', x, 0.45, 0.3, 0.18, 0.9, 8.8)
    for (const z of [-4.05, 4.65]) box('stone', 0, 0.45, z, 11.5, 0.9, 0.18)
    box('stone', -0.2, 1.05, -2.3, 2.8, 2, 2.8)
    box('metal', -0.2, 2.1, -2.3, 3, 0.15, 3)
    box('wood', -0.2, 0.85, -0.86, 0.9, 1.7, 0.05)
  })
  batch({ stage: 7, start: 0.25, end: 0.85, y: roofY, rise: 1, cutaway: true }, ({ box, cylinder }) => {
    for (const x of [2.6, 4]) {
      box('metal', x, 0.54, -2.3, 1.05, 0.8, 1.9)
      for (const z of [-2.8, -1.9]) {
        cylinder('frame', x, 0.98, z, 0.35, 0.06)
        cylinder('metal', x, 1.02, z, 0.08, 0.04)
        for (let i = 0; i < 4; i += 1) box('metal', x, 1.03, z, 0.6, 0.02, 0.055, [0, i * Math.PI / 4, 0])
      }
    }
    for (const x of [-3.8, -1.7, 0.4, 2.5]) for (const z of [0.7, 2.8]) {
      box('metal', x, 0.3, z, 1.8, 0.45, 0.08)
      box('solar', x, 0.6, z, 1.85, 0.08, 1.65, [-0.2, 0, 0])
      for (let i = -2; i <= 2; i += 1) box('glassLight', x + i * 0.34, 0.65, z, 0.015, 0.015, 1.6, [-0.2, 0, 0])
    }
  })
  batch({ stage: 7, start: 0.7, end: 1, y: roofY, cutaway: true }, ({ cylinder }) => {
    cylinder('metal', -4.5, 1.4, -3.4, 0.035, 2.8)
    cylinder('metal', -4.5, 2.3, -3.4, 0.025, 1.2, [0, 0, Math.PI / 2])
  })
  batch({ stage: 8, start: 0, end: 0.65, y: -0.5, grow: true }, ({ box }) => {
    box('stone', 0, 0.12, 0.5, 18.6, 0.2, 14.6)
    for (const x of [-7.8, 7.8]) {
      box('leaf', x, 0.27, 0, 1.9, 0.08, 10.8)
      box('stone', x, 0.35, 0, 0.04, 0.08, 10.9)
    }
    for (let step = 0; step < 3; step += 1) box('stone', 0, 0.28 + step * 0.16, 6.1 - step * 0.4, 3.8, 0.2, 0.5)
    for (let x = -8; x < 9; x += 1) box('line', x, 0.226, 6.4, 0.014, 0.012, 1.9)
  })
  batch({ stage: 8, start: 0.25, end: 1, grow: true }, ({ box, cylinder, sphere }) => {
    for (const x of [-7.7, 7.7]) for (const z of [-4.5, 0.7, 4.8]) {
      box('concrete', x, 0.04, z, 1.35, 0.55, 1.35)
      cylinder('wood', x, 1.1, z, 0.1, 2.1)
      sphere('leaf', x, 2.55, z, 0.95)
      sphere('leafLight', x - 0.25, 3.1, z + 0.1, 0.7)
    }
    for (const x of [-4.3, 4.3]) {
      box('wood', x, 0.3, 6.1, 2.4, 0.12, 0.65)
      for (const dx of [-0.8, 0.8]) box('metal', x + dx, 0.04, 6.1, 0.1, 0.5, 0.55)
    }
    for (const x of [-6.3, 6.3]) for (const z of [-5.8, 5.7]) {
      cylinder('metal', x, 0.3, z, 0.07, 1.2)
      cylinder('light', x, 0.9, z, 0.1, 0.16)
    }
  })

  function update(progress, cutaway = false, highlightedStages = []) {
    for (const part of parts) {
      const amount = part.stage === 0 ? 1 : partProgress(progress, part.stage, part.start, part.end)
      part.group.visible = amount > 0.001 && !(cutaway && part.cutaway)
      if (!part.group.visible) continue
      for (const mesh of part.group.children) {
        const base = mesh.userData.baseMaterial
        if (highlightedStages.includes(part.stage)) {
          if (!highlightedMaterials.has(base)) {
            const highlighted = base.clone()
            highlighted.emissive.set(palette.frame)
            highlighted.emissiveIntensity = 0.48
            highlighted.color.lerp(new THREE.Color(palette.supply), 0.2)
            highlightedMaterials.set(base, highlighted)
          }
          mesh.material = highlightedMaterials.get(base)
        } else mesh.material = base
      }
      part.group.position.y = part.y + part.rise * (1 - amount)
      part.group.scale.y = part.grow ? Math.max(0.001, amount) : 1
      // Arriving slabs and facade panels have physical thickness from the first frame.
      if (!part.grow && part.stage > 0) part.group.scale.setScalar(Math.max(0.001, amount))
    }
  }
  update(0)
  return {
    root, update,
    get visibleParts() { return parts.filter((part) => part.group.visible).length },
    dispose() {
      root.traverse((object) => object.geometry?.dispose())
      Object.values(materials).forEach((entry) => entry.dispose())
      highlightedMaterials.forEach((entry) => entry.dispose())
    },
  }
}

export function createBuildingScene(host, { palette, onError, onReady, onSelectStage = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.setClearColor(palette.background)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 180)
  const model = createBuildingModel(palette)
  scene.add(model.root)
  scene.add(new THREE.HemisphereLight(0xffffff, palette.earth, 2.6))
  const sun = new THREE.DirectionalLight(0xfff8e9, 3.6)
  sun.position.set(-12, 28, 20)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -23
  sun.shadow.camera.right = 23
  sun.shadow.camera.top = 25
  sun.shadow.camera.bottom = -20
  sun.shadow.normalBias = 0.035
  sun.shadow.bias = -0.0002
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xe3efff, 1.8)
  fill.position.set(15, 12, -10)
  scene.add(fill)

  const floorGeometry = new THREE.PlaneGeometry(200, 200)
  const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.12 })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.67
  floor.receiveShadow = true
  scene.add(floor)

  let targetProgress = 0
  let progress = 0
  let cutaway = false
  let highlightedStages = []
  let reducedMotion = false
  let angle = 0.67
  let tilt = 0.41
  let zoom = 1
  let frame = 0
  let disposed = false
  let visible = true
  let dragging = null
  let lastTime = 0

  function render(time = 0) {
    frame = 0
    if (disposed || !visible || document.hidden) return
    const dt = Math.min(64, lastTime ? time - lastTime : 16)
    lastTime = time
    progress = reducedMotion ? targetProgress : THREE.MathUtils.lerp(progress, targetProgress, 1 - Math.exp(-dt / 75))
    if (Math.abs(progress - targetProgress) < 0.002) progress = targetProgress
    model.update(progress, cutaway, highlightedStages)
    const rise = reducedMotion ? 1 : clamp(progress / 3)
    const targetY = 1.2 + rise * 5.5
    const distance = Math.max(36 + rise * 18, 38 / camera.aspect) * zoom
    const orbit = angle + (reducedMotion ? 0 : progress * 0.018)
    camera.position.set(Math.sin(orbit) * distance * Math.cos(tilt), targetY + distance * Math.sin(tilt), Math.cos(orbit) * distance * Math.cos(tilt))
    camera.lookAt(0, targetY, 0)
    renderer.render(scene, camera)
    host.dataset.renderedProgress = progress.toFixed(3)
    host.dataset.visibleParts = String(model.visibleParts)
    if (Math.abs(progress - targetProgress) > 0.001) invalidate()
  }
  function invalidate() {
    if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(render)
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    // CSS owns the displayed size, so a viewport change cannot briefly overflow
    // while ResizeObserver updates the drawing buffer.
    renderer.setSize(width, height, false)
    invalidate()
  }
  function pointerDown(event) {
    if (event.button !== 0 || event.target !== renderer.domElement) return
    dragging = { x: event.clientX, y: event.clientY, angle, tilt, moved: false, touch: event.pointerType === 'touch' }
    renderer.domElement.setPointerCapture(event.pointerId)
  }
  function pointerMove(event) {
    if (!dragging) return
    if (Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) > 6) dragging.moved = true
    angle = dragging.angle - (event.clientX - dragging.x) * 0.008
    if (!dragging.touch) tilt = clamp(dragging.tilt + (event.clientY - dragging.y) * 0.004, 0.15, 1.1)
    invalidate()
  }
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  function pointerUp(event) {
    const select = dragging && !dragging.moved && event.type === 'pointerup'
    dragging = null
    if (!select) return
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const meshes = []
    model.root.traverseVisible((object) => { if (object.isMesh) meshes.push(object) })
    const hit = raycaster.intersectObjects(meshes, false)[0]
    if (hit) onSelectStage(hit.object.userData.stage)
  }
  function contextLost(event) { event.preventDefault(); onError() }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointermove', pointerMove)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', pointerUp)
  document.addEventListener('visibilitychange', invalidate)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    lastTime = 0
    if (visible) invalidate()
  })
  intersectionObserver.observe(host)
  resize()
  onReady()
  return {
    setState(state) {
      targetProgress = state.reducedMotion ? Math.ceil(state.progress - 0.015) : state.progress
      reducedMotion = state.reducedMotion
      cutaway = state.cutaway
      highlightedStages = state.highlightedStages || []
      invalidate()
    },
    rotate(amount) { angle += amount; invalidate() },
    elevate(amount) { tilt = clamp(tilt + amount, 0.15, 1.1); invalidate() },
    zoom(amount) { zoom = clamp(zoom + amount, 0.72, 1.4); invalidate() },
    reset() { angle = 0.67; tilt = 0.41; zoom = 1; invalidate() },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', invalidate)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', pointerUp)
      model.dispose()
      floorGeometry.dispose()
      floorMaterial.dispose()
      sun.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}

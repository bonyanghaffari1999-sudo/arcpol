export const constructionOrder = ['foundation', 'structure', 'slabs', 'mechanical', 'electrical', 'architecture', 'roof', 'delivery']
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

// Anchors are viewport coordinates, so the same interpolation works in both layouts.
export function progressAtLine(anchors, line) {
  if (anchors.length < 2 || line <= anchors[0]) return 0
  for (let i = 1; i < anchors.length; i += 1) {
    if (line <= anchors[i]) return i - 1 + clamp((line - anchors[i - 1]) / Math.max(1, anchors[i] - anchors[i - 1]))
  }
  return anchors.length - 1
}

export function partProgress(progress, stage, start = 0, end = 1) {
  const amount = clamp((progress - stage + 1 - start) / Math.max(0.001, end - start))
  return amount * amount * (3 - 2 * amount)
}

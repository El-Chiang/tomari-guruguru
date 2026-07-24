#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const outputPath = resolve(root, 'live2d-work/ichigo/alpha-bounds.json')
const thresholds = [1, 4, 16, 32, 64, 128, 254]
const recommendedThreshold = 32
const inputDirectories = [
  resolve(root, 'public/oc-layers'),
  resolve(root, 'public/oc-mesh-layers'),
].filter(existsSync)

function runMagick(args, options = {}) {
  try {
    return execFileSync('magick', args, {
      encoding: options.binary ? null : 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const detail = error.stderr?.toString().trim()
    throw new Error(`ImageMagick failed: magick ${args.join(' ')}${detail ? `\n${detail}` : ''}`)
  }
}

function imageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && ['.png', '.webp'].includes(extname(entry.name).toLowerCase()))
    .map((entry) => resolve(directory, entry.name))
    .sort()
}

function boundsForThreshold(alpha, width, height, threshold) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let pixelCount = 0

  for (let index = 0; index < alpha.length; index += 1) {
    if (alpha[index] < threshold) continue
    const x = index % width
    const y = Math.floor(index / width)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    pixelCount += 1
  }

  if (pixelCount === 0) return { bbox: null, pixelCount: 0 }
  return {
    bbox: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    pixelCount,
  }
}

function auditImage(path) {
  const [width, height] = runMagick(['identify', '-format', '%w %h', path])
    .trim()
    .split(/\s+/)
    .map(Number)
  const rgba = runMagick([path, '-depth', '8', 'rgba:-'], { binary: true })
  const expectedLength = width * height * 4
  if (rgba.length !== expectedLength) {
    throw new Error(`Unexpected RGBA byte count for ${path}: ${rgba.length}, expected ${expectedLength}`)
  }

  const alpha = new Uint8Array(width * height)
  let alphaMin = 255
  let alphaMax = 0
  for (let rgbaIndex = 3, alphaIndex = 0; rgbaIndex < rgba.length; rgbaIndex += 4, alphaIndex += 1) {
    const value = rgba[rgbaIndex]
    alpha[alphaIndex] = value
    alphaMin = Math.min(alphaMin, value)
    alphaMax = Math.max(alphaMax, value)
  }

  return {
    path: relative(root, path),
    width,
    height,
    alpha: { min: alphaMin, max: alphaMax },
    thresholds: Object.fromEntries(
      thresholds.map((threshold) => [threshold, boundsForThreshold(alpha, width, height, threshold)]),
    ),
    recommendedThreshold,
    recommendedBounds: boundsForThreshold(alpha, width, height, recommendedThreshold),
    rgbaSha256: createHash('sha256').update(rgba).digest('hex'),
  }
}

if (inputDirectories.length === 0) {
  throw new Error('No layer directories found')
}

const layers = inputDirectories.flatMap(imageFiles).map(auditImage)
const report = {
  schemaVersion: 1,
  coordinateSystem: 'Image pixels; origin at top-left; bbox width/height are inclusive extents.',
  alphaRule: 'A pixel is included when alpha >= threshold (8-bit alpha, 0-255).',
  thresholds,
  recommendedThreshold,
  recommendation: 'Use alpha >= 32 for the first mesh crop. Lower thresholds contain canvas-edge outliers in several source layers; review alpha >= 16 manually when preserving very soft hair edges.',
  directories: inputDirectories.map((directory) => relative(root, directory)),
  layers,
}

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Audited ${layers.length} layers -> ${relative(root, outputPath)}`)
for (const layer of layers) {
  const visible = layer.recommendedBounds
  const bbox = visible.bbox
    ? `${visible.bbox.width}x${visible.bbox.height}+${visible.bbox.x}+${visible.bbox.y}`
    : 'empty'
  console.log(`${layer.path}: ${layer.width}x${layer.height}, alpha>=${recommendedThreshold} bbox ${bbox}`)
}

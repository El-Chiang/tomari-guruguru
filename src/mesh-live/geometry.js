/**
 * DOM-free mesh geometry helpers used by the 2.5D character renderer.
 *
 * Coordinates are right-handed: +X points right, +Y points up and +Z points
 * toward the camera. Arrays are returned as typed arrays so they can be passed
 * directly to a WebGL/Three.js buffer without this module depending on Three.
 */

const EPSILON = 1e-8;

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be an integer greater than or equal to 1`);
  }
}

function assertXYZArray(value, name) {
  if (!value || typeof value.length !== 'number' || value.length % 3 !== 0) {
    throw new TypeError(`${name} must be an array-like value whose length is divisible by 3`);
  }
}

function resolveGridSize(options) {
  const columns = options.columns ?? options.cols;
  const rows = options.rows;
  assertPositiveInteger(columns, 'columns');
  assertPositiveInteger(rows, 'rows');
  return { columns, rows };
}

/**
 * Normalize an array or object crop to `{ x, y, width, height }`.
 *
 * @param {number[]|{x:number,y:number,width:number,height:number}|undefined} crop
 * @param {{textureWidth?:number,textureHeight?:number,width?:number,height?:number}} [fallback]
 * @returns {{x:number,y:number,width:number,height:number}}
 */
export function normalizeCrop(crop, fallback = {}) {
  let normalized;
  if (crop == null) {
    normalized = {
      x: 0,
      y: 0,
      width: fallback.width ?? fallback.textureWidth,
      height: fallback.height ?? fallback.textureHeight,
    };
  } else if (Array.isArray(crop) || ArrayBuffer.isView(crop)) {
    if (crop.length !== 4) throw new TypeError('crop array must contain [x, y, width, height]');
    normalized = { x: crop[0], y: crop[1], width: crop[2], height: crop[3] };
  } else {
    normalized = {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    };
  }

  for (const name of ['x', 'y', 'width', 'height']) {
    assertFiniteNumber(normalized[name], `crop.${name}`);
  }
  if (normalized.width <= 0 || normalized.height <= 0) {
    throw new RangeError('crop width and height must be greater than 0');
  }
  return normalized;
}

/**
 * Create normalized texture coordinates for a regular grid over a pixel crop.
 * `flipV=true` converts top-left image coordinates to WebGL's bottom-left V.
 *
 * @param {{columns?:number,cols?:number,rows:number,crop?:number[]|object,
 *   textureWidth?:number,textureHeight?:number,flipV?:boolean,width?:number,height?:number}} options
 * @returns {Float32Array}
 */
export function createGridUVs(options) {
  const { columns, rows } = resolveGridSize(options);
  const textureWidth = options.textureWidth ?? options.width;
  const textureHeight = options.textureHeight ?? options.height;
  assertFiniteNumber(textureWidth, 'textureWidth');
  assertFiniteNumber(textureHeight, 'textureHeight');
  if (textureWidth <= 0 || textureHeight <= 0) {
    throw new RangeError('textureWidth and textureHeight must be greater than 0');
  }
  const crop = normalizeCrop(options.crop, { textureWidth, textureHeight });
  const flipV = options.flipV !== false;
  const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);

  let offset = 0;
  for (let row = 0; row <= rows; row += 1) {
    const y = crop.y + crop.height * (row / rows);
    for (let column = 0; column <= columns; column += 1) {
      const x = crop.x + crop.width * (column / columns);
      uvs[offset] = x / textureWidth;
      const imageV = y / textureHeight;
      uvs[offset + 1] = flipV ? 1 - imageV : imageV;
      offset += 2;
    }
  }
  return uvs;
}

/**
 * Create two counter-clockwise triangles per grid cell.
 *
 * @param {{columns?:number,cols?:number,rows:number}} options
 * @returns {Uint16Array|Uint32Array}
 */
export function createGridIndices(options) {
  const { columns, rows } = resolveGridSize(options);
  const vertexCount = (columns + 1) * (rows + 1);
  const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(columns * rows * 6);
  let offset = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * (columns + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columns + 1;
      const bottomRight = bottomLeft + 1;
      indices.set([topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight], offset);
      offset += 6;
    }
  }
  return indices;
}

/**
 * Create a centered XY regular grid, its crop UVs and triangle indices.
 *
 * Image-space crop coordinates use a top-left origin. World Y is flipped so
 * it points upward. By default the world origin is the texture centre.
 *
 * @param {{columns?:number,cols?:number,rows:number,crop?:number[]|object,
 *   textureWidth?:number,textureHeight?:number,width?:number,height?:number,
 *   originX?:number,originY?:number,flipY?:boolean,flipV?:boolean}} options
 * @returns {{positions:Float32Array,uvs:Float32Array,indices:Uint16Array|Uint32Array,
 *   imagePoints:Float32Array,columns:number,rows:number,vertexCount:number}}
 */
export function createGridGeometry(options) {
  const { columns, rows } = resolveGridSize(options);
  const textureWidth = options.textureWidth ?? options.width;
  const textureHeight = options.textureHeight ?? options.height;
  assertFiniteNumber(textureWidth, 'textureWidth');
  assertFiniteNumber(textureHeight, 'textureHeight');
  if (textureWidth <= 0 || textureHeight <= 0) {
    throw new RangeError('textureWidth and textureHeight must be greater than 0');
  }
  const crop = normalizeCrop(options.crop, { textureWidth, textureHeight });
  const originX = options.originX ?? textureWidth / 2;
  const originY = options.originY ?? textureHeight / 2;
  const flipY = options.flipY !== false;
  assertFiniteNumber(originX, 'originX');
  assertFiniteNumber(originY, 'originY');

  const vertexCount = (columns + 1) * (rows + 1);
  const positions = new Float32Array(vertexCount * 3);
  const imagePoints = new Float32Array(vertexCount * 2);
  let positionOffset = 0;
  let imageOffset = 0;

  for (let row = 0; row <= rows; row += 1) {
    const imageY = crop.y + crop.height * (row / rows);
    for (let column = 0; column <= columns; column += 1) {
      const imageX = crop.x + crop.width * (column / columns);
      positions[positionOffset] = imageX - originX;
      positions[positionOffset + 1] = flipY ? originY - imageY : imageY - originY;
      positions[positionOffset + 2] = 0;
      imagePoints[imageOffset] = imageX;
      imagePoints[imageOffset + 1] = imageY;
      positionOffset += 3;
      imageOffset += 2;
    }
  }

  return {
    positions,
    uvs: createGridUVs({ ...options, columns, rows, textureWidth, textureHeight }),
    indices: createGridIndices({ columns, rows }),
    imagePoints,
    columns,
    rows,
    vertexCount,
  };
}

/**
 * Build the positive cap of a shallow ellipsoid as one Z value per vertex.
 * The default `edgePower=0.5` is `sqrt(1 - normalizedDistance)`. Vertices
 * outside the ellipse receive `outsideZ` instead of extrapolating.
 *
 * @param {ArrayLike<number>} positions XYZ vertex positions
 * @param {{radiusX:number,radiusY:number,depth:number,centerX?:number,centerY?:number,
 *   edgePower?:number,yScale?:number,outsideZ?:number}} options
 * @returns {Float32Array}
 */
export function createEllipsoidZProfile(positions, options) {
  assertXYZArray(positions, 'positions');
  const radiusX = options.radiusX;
  const radiusY = options.radiusY;
  const depth = options.depth;
  const centerX = options.centerX ?? 0;
  const centerY = options.centerY ?? 0;
  const edgePower = options.edgePower ?? 0.5;
  const yScale = options.yScale ?? 1;
  const outsideZ = options.outsideZ ?? 0;
  for (const [value, name] of [
    [radiusX, 'radiusX'], [radiusY, 'radiusY'], [depth, 'depth'],
    [centerX, 'centerX'], [centerY, 'centerY'], [edgePower, 'edgePower'],
    [yScale, 'yScale'], [outsideZ, 'outsideZ'],
  ]) assertFiniteNumber(value, name);
  if (radiusX <= 0 || radiusY <= 0) throw new RangeError('radii must be greater than 0');
  if (edgePower <= 0) throw new RangeError('edgePower must be greater than 0');

  const profile = new Float32Array(positions.length / 3);
  for (let vertex = 0; vertex < profile.length; vertex += 1) {
    const offset = vertex * 3;
    const nx = (positions[offset] - centerX) / radiusX;
    const ny = ((positions[offset + 1] - centerY) / radiusY) * yScale;
    const remaining = 1 - nx * nx - ny * ny;
    profile[vertex] = remaining > 0 ? depth * Math.pow(remaining, edgePower) : outsideZ;
  }
  return profile;
}

/**
 * Build a front or rear shallow shell. `side=-1` mirrors the cap behind the
 * XY plane; `baseZ` moves the complete shell along Z.
 *
 * @param {ArrayLike<number>} positions
 * @param {Parameters<typeof createEllipsoidZProfile>[1] & {baseZ?:number,side?:number}} options
 * @returns {Float32Array}
 */
export function createShellZProfile(positions, options) {
  const baseZ = options.baseZ ?? 0;
  const side = options.side ?? 1;
  assertFiniteNumber(baseZ, 'baseZ');
  assertFiniteNumber(side, 'side');
  const cap = createEllipsoidZProfile(positions, { ...options, depth: Math.abs(options.depth) });
  const profile = new Float32Array(cap.length);
  const direction = side < 0 ? -1 : 1;
  for (let index = 0; index < cap.length; index += 1) {
    profile[index] = baseZ + direction * cap[index];
  }
  return profile;
}

function resolveKeyShape(keyShapes, numericKey, namedKey) {
  return keyShapes[numericKey] ?? keyShapes[String(numericKey)] ?? keyShapes[namedKey];
}

/**
 * Interpolate `-1 → 0 → +1` key shapes in two linear segments.
 *
 * Shapes are XYZ arrays. In the default `offset` mode they are corrections
 * added to `basePositions`; in `positions` mode they are absolute vertices.
 * Missing endpoint shapes fall back to the neutral shape. A missing neutral
 * shape means zero correction in offset mode, or the base in positions mode.
 *
 * @param {ArrayLike<number>} basePositions
 * @param {{'-1'?:ArrayLike<number>,0?:ArrayLike<number>,1?:ArrayLike<number>,
 *   negative?:ArrayLike<number>,neutral?:ArrayLike<number>,positive?:ArrayLike<number>}} keyShapes
 * @param {number} value normalized yaw/key parameter
 * @param {{mode?:'offset'|'positions',clamp?:boolean}} [options]
 * @returns {Float32Array}
 */
export function interpolateKeyShapes(basePositions, keyShapes, value, options = {}) {
  assertXYZArray(basePositions, 'basePositions');
  assertFiniteNumber(value, 'value');
  const mode = options.mode ?? 'offset';
  if (mode !== 'offset' && mode !== 'positions') {
    throw new TypeError("mode must be either 'offset' or 'positions'");
  }
  const parameter = options.clamp === false ? value : Math.max(-1, Math.min(1, value));
  const neutralFallback = mode === 'offset' ? new Float32Array(basePositions.length) : basePositions;
  const neutral = resolveKeyShape(keyShapes, 0, 'neutral') ?? neutralFallback;
  const negative = resolveKeyShape(keyShapes, -1, 'negative') ?? neutral;
  const positive = resolveKeyShape(keyShapes, 1, 'positive') ?? neutral;
  for (const [shape, name] of [[negative, 'negative'], [neutral, 'neutral'], [positive, 'positive']]) {
    assertXYZArray(shape, `${name} key shape`);
    if (shape.length !== basePositions.length) {
      throw new RangeError(`${name} key shape length must match basePositions`);
    }
  }

  const from = parameter < 0 ? negative : neutral;
  const to = parameter < 0 ? neutral : positive;
  const t = parameter < 0 ? parameter + 1 : parameter;
  const result = new Float32Array(basePositions.length);
  for (let index = 0; index < result.length; index += 1) {
    const interpolated = from[index] + (to[index] - from[index]) * t;
    result[index] = mode === 'offset' ? basePositions[index] + interpolated : interpolated;
  }
  return result;
}

/**
 * Rotate XYZ vertices around an arbitrary origin on the world Y axis.
 *
 * @param {ArrayLike<number>} positions
 * @param {number} yawRadians
 * @param {{originX?:number,originY?:number,originZ?:number}} [options]
 * @returns {Float32Array}
 */
export function rotatePositionsYaw(positions, yawRadians, options = {}) {
  assertXYZArray(positions, 'positions');
  assertFiniteNumber(yawRadians, 'yawRadians');
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const originZ = options.originZ ?? 0;
  for (const [value, name] of [[originX, 'originX'], [originY, 'originY'], [originZ, 'originZ']]) {
    assertFiniteNumber(value, name);
  }
  const cosine = Math.cos(yawRadians);
  const sine = Math.sin(yawRadians);
  const result = new Float32Array(positions.length);

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset] - originX;
    const z = positions[offset + 2] - originZ;
    result[offset] = originX + cosine * x + sine * z;
    result[offset + 1] = positions[offset + 1] - originY + originY;
    result[offset + 2] = originZ - sine * x + cosine * z;
  }
  return result;
}

/**
 * Map a normalized pose parameter to asymmetric negative/positive angles.
 *
 * `negativeRadians` may be supplied as either a negative limit or a positive
 * magnitude; the result is always negative for a negative parameter. This is
 * convenient for art-directed ranges such as down=-8 degrees and up=12
 * degrees. Values are clamped to `[-1, 1]` unless `clamp=false`.
 *
 * @param {number} value
 * @param {{negativeRadians?:number,positiveRadians?:number,negative?:number,
 *   positive?:number,clamp?:boolean}} angles
 * @returns {number}
 */
export function mapAsymmetricAngle(value, angles) {
  assertFiniteNumber(value, 'value');
  const negativeRadians = angles.negativeRadians ?? angles.negative ?? 0;
  const positiveRadians = angles.positiveRadians ?? angles.positive ?? 0;
  assertFiniteNumber(negativeRadians, 'negativeRadians');
  assertFiniteNumber(positiveRadians, 'positiveRadians');
  const parameter = angles.clamp === false ? value : Math.max(-1, Math.min(1, value));
  return parameter < 0
    ? Math.abs(negativeRadians) * parameter
    : Math.abs(positiveRadians) * parameter;
}

/**
 * Rotate XYZ vertices around an arbitrary origin on the world X axis.
 * Positive pitch moves positive-Y vertices toward positive Z.
 *
 * @param {ArrayLike<number>} positions
 * @param {number} pitchRadians
 * @param {{originX?:number,originY?:number,originZ?:number}} [options]
 * @returns {Float32Array}
 */
export function rotatePositionsPitch(positions, pitchRadians, options = {}) {
  assertXYZArray(positions, 'positions');
  assertFiniteNumber(pitchRadians, 'pitchRadians');
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  const originZ = options.originZ ?? 0;
  for (const [value, name] of [[originX, 'originX'], [originY, 'originY'], [originZ, 'originZ']]) {
    assertFiniteNumber(value, name);
  }
  const cosine = Math.cos(pitchRadians);
  const sine = Math.sin(pitchRadians);
  const result = new Float32Array(positions.length);

  for (let offset = 0; offset < positions.length; offset += 3) {
    const y = positions[offset + 1] - originY;
    const z = positions[offset + 2] - originZ;
    result[offset] = positions[offset];
    result[offset + 1] = originY + cosine * y - sine * z;
    result[offset + 2] = originZ + sine * y + cosine * z;
  }
  return result;
}

function resolveCornerResidual(corners, yawSign, pitchSign) {
  if (!corners) return undefined;
  const yawName = yawSign < 0 ? 'Negative' : 'Positive';
  const pitchName = pitchSign < 0 ? 'Negative' : 'Positive';
  const compactName = `${yawSign < 0 ? 'negative' : 'positive'}${pitchName}`;
  return corners[`${yawSign},${pitchSign}`]
    ?? corners[`${yawSign}:${pitchSign}`]
    ?? corners[`yaw${yawName}Pitch${pitchName}`]
    ?? corners[compactName];
}

/**
 * Blend independent yaw and pitch key-shape offsets, then add an optional
 * residual for the active diagonal corner.
 *
 * Axis key shapes use the same `negative/neutral/positive` structure as
 * `interpolateKeyShapes`. Corner residuals are additive XYZ offsets at full
 * diagonal poses and are weighted by `abs(yaw * pitch)`. Supported corner keys
 * include `"-1,-1"`, `"1,-1"`, `"-1,1"`, `"1,1"` and names such as
 * `yawNegativePitchPositive`.
 *
 * @param {ArrayLike<number>} basePositions
 * @param {{yaw?:number,pitch?:number,yawKeyShapes?:object,pitchKeyShapes?:object,
 *   cornerResiduals?:object}} pose
 * @param {{clamp?:boolean}} [options]
 * @returns {Float32Array}
 */
export function blendPoseKeyShapes(basePositions, pose = {}, options = {}) {
  assertXYZArray(basePositions, 'basePositions');
  const shouldClamp = options.clamp !== false;
  const rawYaw = pose.yaw ?? 0;
  const rawPitch = pose.pitch ?? 0;
  assertFiniteNumber(rawYaw, 'yaw');
  assertFiniteNumber(rawPitch, 'pitch');
  const yaw = shouldClamp ? Math.max(-1, Math.min(1, rawYaw)) : rawYaw;
  const pitch = shouldClamp ? Math.max(-1, Math.min(1, rawPitch)) : rawPitch;
  const zero = new Float32Array(basePositions.length);
  const yawOffsets = pose.yawKeyShapes
    ? interpolateKeyShapes(zero, pose.yawKeyShapes, yaw, { clamp: false })
    : zero;
  const pitchOffsets = pose.pitchKeyShapes
    ? interpolateKeyShapes(zero, pose.pitchKeyShapes, pitch, { clamp: false })
    : zero;
  const result = new Float32Array(basePositions.length);

  let corner;
  let cornerWeight = 0;
  if (Math.abs(yaw) > EPSILON && Math.abs(pitch) > EPSILON) {
    const yawSign = yaw < 0 ? -1 : 1;
    const pitchSign = pitch < 0 ? -1 : 1;
    corner = resolveCornerResidual(pose.cornerResiduals, yawSign, pitchSign);
    cornerWeight = Math.abs(yaw * pitch);
    if (corner) {
      assertXYZArray(corner, 'corner residual');
      if (corner.length !== basePositions.length) {
        throw new RangeError('corner residual length must match basePositions');
      }
    }
  }

  for (let index = 0; index < result.length; index += 1) {
    result[index] = basePositions[index]
      + yawOffsets[index]
      + pitchOffsets[index]
      + (corner?.[index] ?? 0) * cornerWeight;
  }
  return result;
}

/**
 * Compose a base mesh, per-vertex Z profile, XYZ correction and final yaw.
 * Z values and deformation vectors are additive. Rotation is applied last.
 *
 * @param {ArrayLike<number>} basePositions
 * @param {{zProfile?:ArrayLike<number>,deformation?:ArrayLike<number>,yawRadians?:number,
 *   origin?:{x?:number,y?:number,z?:number},originX?:number,originY?:number,originZ?:number}} [options]
 * @returns {Float32Array}
 */
export function composePositions(basePositions, options = {}) {
  assertXYZArray(basePositions, 'basePositions');
  const zProfile = options.zProfile;
  const deformation = options.deformation;
  if (zProfile && zProfile.length !== basePositions.length / 3) {
    throw new RangeError('zProfile must contain one value per vertex');
  }
  if (deformation) {
    assertXYZArray(deformation, 'deformation');
    if (deformation.length !== basePositions.length) {
      throw new RangeError('deformation length must match basePositions');
    }
  }

  const composed = new Float32Array(basePositions.length);
  for (let offset = 0, vertex = 0; offset < composed.length; offset += 3, vertex += 1) {
    composed[offset] = basePositions[offset] + (deformation?.[offset] ?? 0);
    composed[offset + 1] = basePositions[offset + 1] + (deformation?.[offset + 1] ?? 0);
    composed[offset + 2] = basePositions[offset + 2]
      + (zProfile?.[vertex] ?? 0)
      + (deformation?.[offset + 2] ?? 0);
  }

  const yawRadians = options.yawRadians ?? 0;
  if (Math.abs(yawRadians) <= EPSILON) return composed;
  const origin = options.origin ?? {};
  return rotatePositionsYaw(composed, yawRadians, {
    originX: options.originX ?? origin.x ?? 0,
    originY: options.originY ?? origin.y ?? 0,
    originZ: options.originZ ?? origin.z ?? 0,
  });
}

/**
 * Compose a complete two-axis head pose without a rendering dependency.
 *
 * Processing order is base/surface/deformation → yaw and pitch key shapes →
 * optional corner residual → yaw rotation → pitch rotation. Explicit
 * `yawRadians`/`pitchRadians` take priority; otherwise normalized `yaw` and
 * `pitch` are mapped through optional asymmetric angle ranges.
 *
 * @param {ArrayLike<number>} basePositions
 * @param {{zProfile?:ArrayLike<number>,deformation?:ArrayLike<number>,yaw?:number,pitch?:number,
 *   yawRadians?:number,pitchRadians?:number,yawAngles?:object,pitchAngles?:object,
 *   yawKeyShapes?:object,pitchKeyShapes?:object,cornerResiduals?:object,
 *   origin?:{x?:number,y?:number,z?:number},originX?:number,originY?:number,originZ?:number,
 *   clamp?:boolean}} [options]
 * @returns {Float32Array}
 */
export function composeHeadPose(basePositions, options = {}) {
  const yaw = options.yaw ?? 0;
  const pitch = options.pitch ?? 0;
  const composed = composePositions(basePositions, {
    zProfile: options.zProfile,
    deformation: options.deformation,
  });
  const corrected = blendPoseKeyShapes(composed, {
    yaw,
    pitch,
    yawKeyShapes: options.yawKeyShapes,
    pitchKeyShapes: options.pitchKeyShapes,
    cornerResiduals: options.cornerResiduals,
  }, { clamp: options.clamp });
  const yawRadians = options.yawRadians
    ?? (options.yawAngles ? mapAsymmetricAngle(yaw, { ...options.yawAngles, clamp: options.clamp }) : 0);
  const pitchRadians = options.pitchRadians
    ?? (options.pitchAngles ? mapAsymmetricAngle(pitch, { ...options.pitchAngles, clamp: options.clamp }) : 0);
  assertFiniteNumber(yawRadians, 'yawRadians');
  assertFiniteNumber(pitchRadians, 'pitchRadians');
  const origin = options.origin ?? {};
  const rotationOptions = {
    originX: options.originX ?? origin.x ?? 0,
    originY: options.originY ?? origin.y ?? 0,
    originZ: options.originZ ?? origin.z ?? 0,
  };
  const yawed = Math.abs(yawRadians) <= EPSILON
    ? corrected
    : rotatePositionsYaw(corrected, yawRadians, rotationOptions);
  return Math.abs(pitchRadians) <= EPSILON
    ? yawed
    : rotatePositionsPitch(yawed, pitchRadians, rotationOptions);
}

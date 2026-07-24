import * as THREE from 'three';
import {
  DEFAULT_SURFACE_SETTINGS,
  EYE_TURN_SETTINGS,
  HEAD_PIVOT_IMAGE,
  HEAD_ROLL_PIVOT_IMAGE,
  ICHIGO_LAYERS,
  MODEL_SIZE,
  PITCH_DOWN_LIMIT_DEG,
  PITCH_UP_LIMIT_DEG,
  ROLL_LIMIT_DEG,
  YAW_LIMIT_DEG,
} from './ichigo-model';
import { createGridGeometry, interpolateKeyShapes } from './geometry';

const HALF_MODEL = MODEL_SIZE / 2;
const HEAD_YAW_RADIANS = THREE.MathUtils.degToRad(YAW_LIMIT_DEG);
const HEAD_PITCH_UP_RADIANS = THREE.MathUtils.degToRad(PITCH_UP_LIMIT_DEG);
const HEAD_PITCH_DOWN_RADIANS = THREE.MathUtils.degToRad(PITCH_DOWN_LIMIT_DEG);
const HEAD_ROLL_RADIANS = THREE.MathUtils.degToRad(ROLL_LIMIT_DEG);
const HEAD_PIVOT_X = HEAD_PIVOT_IMAGE.x - HALF_MODEL;
const HEAD_PIVOT_Y = HALF_MODEL - HEAD_PIVOT_IMAGE.y;
const HEAD_ROLL_PIVOT_X = HEAD_ROLL_PIVOT_IMAGE.x - HALF_MODEL;
const HEAD_ROLL_PIVOT_Y = HALF_MODEL - HEAD_ROLL_PIVOT_IMAGE.y;
const FACE_SURFACE = Object.freeze({ centerX: 489, centerY: 365, radiusX: 265, radiusY: 340 });
const HAIR_SURFACE = Object.freeze({ centerX: 489, centerY: 340, radiusX: 330, radiusY: 390 });

function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function sampleSurface(imageX, imageY, surface) {
  const nx = (imageX - surface.centerX) / surface.radiusX;
  const ny = (imageY - surface.centerY) / surface.radiusY;
  return Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
}

function buildEndpointShape(layer, data, direction) {
  const offsets = new Float32Array(data.positions.length);
  const correction = layer.correction ?? {};
  const centerX = layer.crop[0] + layer.crop[2] / 2;
  const centerY = layer.crop[1] + layer.crop[3] / 2;
  const radiusX = Math.max(1, layer.crop[2] / 2);

  for (let vertex = 0; vertex < data.positions.length / 3; vertex += 1) {
    const imageX = data.imagePoints[vertex * 2];
    const imageY = data.imagePoints[vertex * 2 + 1];
    const nx = (imageX - FACE_SURFACE.centerX) / FACE_SURFACE.radiusX;
    const ny = (imageY - FACE_SURFACE.centerY) / FACE_SURFACE.radiusY;
    const offset = vertex * 3;

    if (layer.surface === 'face') {
      const centerInfluence = Math.max(0, 1 - Math.abs(nx));
      const jawInfluence = THREE.MathUtils.smoothstep(ny, 0.18, 0.92);
      const cheekInfluence = Math.max(0, 1 - Math.abs(ny + 0.08));
      offsets[offset] += direction * (
        (correction.centerShift ?? 10) * centerInfluence
        + (correction.jawShift ?? 7) * jawInfluence
      );
      offsets[offset] -= direction * Math.max(0, direction * nx)
        * (correction.farCheek ?? 10) * cheekInfluence;
      offsets[offset + 1] += jawInfluence
        * ((correction.jawLift ?? 3) + (correction.jawCornerLift ?? 3) * Math.abs(nx));
      offsets[offset + 2] += (correction.cheekDepth ?? 8) * cheekInfluence * centerInfluence;
    } else if (layer.eye) {
      const far = direction > 0 ? layer.eye === 'left' : layer.eye === 'right';
      const scaleX = far
        ? (correction.farScaleX ?? EYE_TURN_SETTINGS.farScaleX)
        : (correction.nearScaleX ?? EYE_TURN_SETTINGS.nearScaleX);
      const scaleY = far
        ? (correction.farScaleY ?? EYE_TURN_SETTINGS.farScaleY)
        : (correction.nearScaleY ?? EYE_TURN_SETTINGS.nearScaleY);
      const baseX = data.positions[offset];
      const baseY = data.positions[offset + 1];
      offsets[offset] += (baseX - (centerX - HALF_MODEL)) * (scaleX - 1);
      offsets[offset + 1] += (baseY - (HALF_MODEL - centerY)) * (scaleY - 1);
    }

    const featureShift = layer.featureShift ?? correction.shift ?? 0;
    if (layer.group === 'features' || layer.eye || layer.group?.endsWith('Eye')) {
      offsets[offset] += direction * featureShift;
    }
    if (layer.surface === 'frontHair' || layer.surface === 'backHair' || layer.surface === 'earArc') {
      offsets[offset] += direction * (correction.shift ?? 0) * Math.max(0.25, 1 - Math.abs(nx));
    }
    if (layer.surface === 'accessory') offsets[offset] += direction * (correction.shift ?? 3);
  }
  return offsets;
}

function buildPitchEndpointShape(layer, data, direction) {
  const offsets = new Float32Array(data.positions.length);
  const correction = layer.correction ?? {};
  const centerX = layer.crop[0] + layer.crop[2] / 2;
  const centerY = layer.crop[1] + layer.crop[3] / 2;
  const centerWorldX = centerX - HALF_MODEL;
  const centerWorldY = HALF_MODEL - centerY;

  for (let vertex = 0; vertex < data.positions.length / 3; vertex += 1) {
    const imageX = data.imagePoints[vertex * 2];
    const imageY = data.imagePoints[vertex * 2 + 1];
    const offset = vertex * 3;
    const baseX = data.positions[offset];
    const baseY = data.positions[offset + 1];
    const nx = (imageX - FACE_SURFACE.centerX) / FACE_SURFACE.radiusX;
    const ny = (imageY - FACE_SURFACE.centerY) / FACE_SURFACE.radiusY;

    if (layer.surface === 'face') {
      const jawInfluence = THREE.MathUtils.smoothstep(ny, 0.08, 0.78);
      const cheekInfluence = Math.max(0, 1 - Math.abs(ny + 0.08));
      offsets[offset] -= direction * (baseX - (FACE_SURFACE.centerX - HALF_MODEL))
        * (correction.pitchJawScaleX ?? 0.03) * jawInfluence;
      offsets[offset + 1] += direction * (correction.pitchShift ?? 4)
        * (0.2 + jawInfluence * 0.8);
      offsets[offset + 2] -= direction * (correction.pitchJawDepth ?? 3)
        * jawInfluence * Math.max(0.2, 1 - Math.abs(nx)) * cheekInfluence;
      continue;
    }

    if (layer.id === 'neck') {
      const row = THREE.MathUtils.clamp((imageY - layer.crop[1]) / layer.crop[3], 0, 1);
      const topInfluence = 1 - THREE.MathUtils.smoothstep(row, 0.05, 0.85);
      offsets[offset] += direction * (baseX - centerWorldX)
        * (correction.pitchScaleX ?? 0) * topInfluence;
      offsets[offset + 1] += direction * (correction.pitchShift ?? 0) * topInfluence;
      continue;
    }

    const scaleY = correction.pitchScaleY ?? 1;
    offsets[offset + 1] += (baseY - centerWorldY) * (scaleY - 1);

    if (layer.surface === 'frontHair' || layer.surface === 'backHair') {
      const row = THREE.MathUtils.clamp((imageY - layer.crop[1]) / layer.crop[3], 0, 1);
      const tipInfluence = THREE.MathUtils.smoothstep(row, 0.28, 0.95);
      // Hair tips lag behind the face and therefore cover more of the eyes
      // while looking down, instead of moving as a rigid face sticker.
      offsets[offset + 1] -= direction * (
        (correction.pitchShift ?? 0) * (0.25 + tipInfluence * 0.75)
        + (correction.pitchBend ?? 0) * tipInfluence
      );
    } else {
      offsets[offset + 1] += direction * (correction.pitchShift ?? 0);
    }
  }

  return offsets;
}

export class MeshCharacterRenderer {
  constructor(container, { onStats } = {}) {
    this.container = container;
    this.onStats = onStats;
    this.mode = 'B';
    this.surfaceSettings = { ...DEFAULT_SURFACE_SETTINGS };
    this.parameters = {
      headYaw: 0,
      headPitch: 0,
      headRoll: 0,
      eyeX: 0,
      eyeY: 0,
      eyeOpenL: 1,
      eyeOpenR: 1,
      mouthOpen: 0,
      hairFront: 0,
      hairBack: 0,
      hairAccessory: 0,
    };
    this.layers = [];
    this.disposed = false;
    this.frameCount = 0;
    this.lastStatsAt = performance.now();

    this.scene = new THREE.Scene();
    this.headGroup = new THREE.Group();
    this.headGroup.name = 'head-pose';
    this.headGroup.rotation.order = 'YXZ';
    this.rollGroup = new THREE.Group();
    this.rollGroup.name = 'head-roll';
    this.rollGroup.position.set(
      HEAD_ROLL_PIVOT_X - HEAD_PIVOT_X,
      HEAD_ROLL_PIVOT_Y - HEAD_PIVOT_Y,
      0,
    );
    this.headGroup.add(this.rollGroup);
    this.scene.add(this.headGroup);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    // Orthographic projection keeps every layer pixel-aligned at HeadYaw=0.
    // The real per-vertex Z values still create parallax after Y-axis rotation.
    this.camera = new THREE.OrthographicCamera(-HALF_MODEL, HALF_MODEL, HALF_MODEL, -HALF_MODEL, 1, 4000);
    this.camera.position.set(0, 0, 1800);
    this.camera.lookAt(0, 0, 0);

    this.textureLoader = new THREE.TextureLoader();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.ready = this.buildModel().then(() => {
      if (!this.disposed) this.render();
    });
  }

  async loadTexture(layer) {
    const candidates = [layer.texture, layer.fallbackTexture].filter(Boolean);
    let lastError;
    for (const path of candidates) {
      try {
        const texture = await this.textureLoader.loadAsync(assetUrl(path));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.userData.sourcePath = path;
        return texture;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error(`Unable to load texture for ${layer.id}`);
  }

  async buildModel() {
    const records = await Promise.all(ICHIGO_LAYERS.map(async (layer) => {
      const texture = await this.loadTexture(layer);
      if (this.disposed) {
        texture.dispose();
        return null;
      }
      return this.createLayer(layer, texture);
    }));
    this.layers = records.filter(Boolean);
    this.update(this.parameters);
  }

  createLayer(layer, texture) {
    const [columns, rows] = layer.grid;
    const data = createGridGeometry({
      crop: layer.crop,
      columns,
      rows,
      textureWidth: MODEL_SIZE,
      textureHeight: MODEL_SIZE,
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.006,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = layer.id;
    mesh.renderOrder = layer.order;
    mesh.frustumCulled = false;

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x73e28c,
      transparent: true,
      opacity: layer.surface === 'flat' ? 0.13 : 0.34,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
    });
    const wireMesh = new THREE.Mesh(geometry, wireMaterial);
    wireMesh.name = `${layer.id}-wire`;
    wireMesh.renderOrder = layer.order + 1000;
    wireMesh.frustumCulled = false;
    wireMesh.visible = false;

    const parent = layer.group === 'body' ? this.scene : this.rollGroup;
    if (parent === this.rollGroup) {
      mesh.position.x = -HEAD_ROLL_PIVOT_X;
      mesh.position.y = -HEAD_ROLL_PIVOT_Y;
      wireMesh.position.x = -HEAD_ROLL_PIVOT_X;
      wireMesh.position.y = -HEAD_ROLL_PIVOT_Y;
    }
    parent.add(mesh, wireMesh);

    return {
      definition: layer,
      geometry,
      material,
      texture,
      mesh,
      wireMaterial,
      wireMesh,
      imagePoints: data.imagePoints,
      basePositions: new Float32Array(data.positions),
      keyShapes: {
        '-1': buildEndpointShape(layer, data, -1),
        0: new Float32Array(data.positions.length),
        1: buildEndpointShape(layer, data, 1),
      },
      pitchKeyShapes: {
        '-1': buildPitchEndpointShape(layer, data, -1),
        0: new Float32Array(data.positions.length),
        1: buildPitchEndpointShape(layer, data, 1),
      },
      columns,
      rows,
    };
  }

  setMode(mode) {
    this.mode = mode === 'A' ? 'A' : 'B';
    this.updateGeometry();
  }

  setWireframe(visible) {
    for (const layer of this.layers) layer.wireMesh.visible = Boolean(visible);
    this.render();
  }

  setSurfaceSettings(settings) {
    this.surfaceSettings = { ...DEFAULT_SURFACE_SETTINGS, ...settings };
    this.updateCamera();
    this.updateGeometry();
  }

  update(parameters = {}) {
    this.parameters = { ...this.parameters, ...parameters };
    this.updateGeometry();
  }

  updateCamera() {
    this.fitCamera();
  }

  fitCamera() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const visibleHalf = HALF_MODEL;
    if (aspect >= 1) {
      this.camera.left = -visibleHalf * aspect;
      this.camera.right = visibleHalf * aspect;
      this.camera.top = visibleHalf;
      this.camera.bottom = -visibleHalf;
    } else {
      this.camera.left = -visibleHalf;
      this.camera.right = visibleHalf;
      this.camera.top = visibleHalf / aspect;
      this.camera.bottom = -visibleHalf / aspect;
    }
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.fitCamera();
    this.render();
  }

  updateGeometry() {
    if (!this.layers.length || this.disposed) return;
    const yaw = THREE.MathUtils.clamp(this.parameters.headYaw ?? 0, -1, 1);
    const pitch = THREE.MathUtils.clamp(this.parameters.headPitch ?? 0, -1, 1);
    const roll = THREE.MathUtils.clamp(this.parameters.headRoll ?? 0, -1, 1);
    const useCorrective = this.mode === 'B';
    const corrective = useCorrective ? this.surfaceSettings.corrective : 0;
    const pitchCorrective = useCorrective ? this.surfaceSettings.pitchCorrective : 0;
    const faceDepth = this.surfaceSettings.faceDepth;
    const hairDepth = this.surfaceSettings.hairDepth;
    const projectionScale = THREE.MathUtils.lerp(
      0.65,
      1.6,
      THREE.MathUtils.clamp(this.surfaceSettings.perspective, 0, 0.5) / 0.5,
    );

    this.headGroup.position.x = HEAD_PIVOT_X;
    this.headGroup.position.y = HEAD_PIVOT_Y;
    this.headGroup.rotation.y = yaw * HEAD_YAW_RADIANS;
    this.headGroup.rotation.x = pitch < 0
      ? pitch * HEAD_PITCH_UP_RADIANS
      : pitch * HEAD_PITCH_DOWN_RADIANS;
    // Negate model-space rotation so positive HeadRoll matches the browser/CSS
    // convention used by the original guruguru prototype: clockwise on screen.
    this.rollGroup.rotation.z = -roll * HEAD_ROLL_RADIANS;

    for (const record of this.layers) {
      const layer = record.definition;
      const position = record.geometry.getAttribute('position');
      const centerY = layer.crop[1] + layer.crop[3] / 2;
      const eyeOpen = layer.eye === 'left'
        ? this.parameters.eyeOpenL
        : layer.eye === 'right' ? this.parameters.eyeOpenR : 1;
      const yawShaped = useCorrective
        ? interpolateKeyShapes(record.basePositions, record.keyShapes, yaw * corrective)
        : record.basePositions;
      const shaped = useCorrective
        ? interpolateKeyShapes(yawShaped, record.pitchKeyShapes, pitch * pitchCorrective)
        : yawShaped;
      const posedEyeCenterY = (HALF_MODEL - centerY)
        + pitch * pitchCorrective * (layer.correction?.pitchShift ?? 0);

      for (let vertex = 0; vertex < position.count; vertex += 1) {
        const imageX = record.imagePoints[vertex * 2];
        const imageY = record.imagePoints[vertex * 2 + 1];
        const offset = vertex * 3;
        let x = shaped[offset];
        let y = shaped[offset + 1];
        let z = (layer.z ?? 0) + shaped[offset + 2] - record.basePositions[offset + 2];
        const faceCap = sampleSurface(imageX, imageY, FACE_SURFACE);
        const hairCap = sampleSurface(imageX, imageY, HAIR_SURFACE);

        if (layer.surface === 'face') {
          z += faceDepth * faceCap;
        } else if (layer.surface === 'backHair') {
          z += hairDepth * hairCap * 0.72;
        } else if (layer.surface === 'frontHair') {
          z += faceDepth * faceCap * 0.5 + hairDepth * hairCap;
        } else if (layer.surface === 'earArc') {
          z += faceDepth * faceCap * 0.55;
        } else if (layer.surface === 'accessory') {
          z += faceDepth * faceCap * 0.45 + hairDepth * hairCap;
        } else if (layer.group !== 'body') {
          // Eyes, brows, nose and mouth all sample the same face shell. Their
          // local Z offsets only separate them slightly for parallax.
          z += faceDepth * faceCap;
        }

        if (layer.hairMotion) {
          const row = THREE.MathUtils.clamp((imageY - layer.crop[1]) / layer.crop[3], 0, 1);
          const tip = THREE.MathUtils.smoothstep(row, 0.16, 0.96);
          const influence = THREE.MathUtils.lerp(layer.hairMotion.root ?? 0, 1, tip);
          const motion = THREE.MathUtils.clamp(
            this.parameters[layer.hairMotion.parameter] ?? 0,
            -1,
            1,
          );
          x += motion * (layer.hairMotion.sway ?? 0) * influence;
          y += Math.abs(motion) * (layer.hairMotion.lift ?? 0) * influence;
        }

        if (layer.mouthMorph) {
          const openness = THREE.MathUtils.clamp(
            this.parameters[layer.mouthMorph.parameter] ?? 0,
            0,
            1,
          );
          // Collapse the open-mouth mesh toward the posed upper-lip line, the
          // vertex-level equivalent of the oc-live scaleY morph. The closed
          // mouth layer below stays fully opaque as the resting base.
          const posedOriginY = (HALF_MODEL - layer.mouthMorph.originImageY)
            + pitch * pitchCorrective * (layer.correction?.pitchShift ?? 0);
          y = (y - posedOriginY) * openness + posedOriginY;
        }

        if (layer.eye) {
          y = (y - posedEyeCenterY) * Math.max(0.04, eyeOpen) + posedEyeCenterY;
          if (layer.iris) {
            x += (this.parameters.eyeX ?? 0) * 6.5;
            y += (this.parameters.eyeY ?? 0) * 3;
          }
        }

        position.setXYZ(vertex, x, y, z * projectionScale);
      }

      position.needsUpdate = true;
      record.geometry.computeBoundingSphere();

      if (layer.iris) {
        // A closing lid occludes the iris before the eyelash reaches its
        // flattest key shape. Fading here avoids leaving a coloured iris line
        // in the fully closed pose while the eyelash mesh forms the lid line.
        record.material.opacity = THREE.MathUtils.smoothstep(eyeOpen, 0.08, 0.52);
      } else if (layer.opacityParameter) {
        record.material.opacity = THREE.MathUtils.clamp(this.parameters[layer.opacityParameter] ?? 0, 0, 1);
      } else {
        record.material.opacity = 1;
      }
    }

    this.render();
  }

  render() {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    this.frameCount += 1;
    const now = performance.now();
    const elapsed = now - this.lastStatsAt;
    if (elapsed >= 700) {
      this.onStats?.(Math.round((this.frameCount * 1000) / elapsed));
      this.frameCount = 0;
      this.lastStatsAt = now;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    for (const layer of this.layers) {
      layer.geometry.dispose();
      layer.material.dispose();
      layer.wireMaterial.dispose();
      layer.texture.dispose();
    }
    this.layers = [];
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

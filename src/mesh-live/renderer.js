import * as THREE from 'three';
import {
  DEFAULT_SURFACE_SETTINGS,
  EYE_TURN_SETTINGS,
  ICHIGO_LAYERS,
  MODEL_SIZE,
  YAW_LIMIT_DEG,
} from './ichigo-model';
import { createGridGeometry, interpolateKeyShapes } from './geometry';

const HALF_MODEL = MODEL_SIZE / 2;
const HEAD_YAW_RADIANS = THREE.MathUtils.degToRad(YAW_LIMIT_DEG);
const HEAD_PIVOT_X = 489 - HALF_MODEL;
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

export class MeshCharacterRenderer {
  constructor(container, { onStats } = {}) {
    this.container = container;
    this.onStats = onStats;
    this.mode = 'B';
    this.surfaceSettings = { ...DEFAULT_SURFACE_SETTINGS };
    this.parameters = {
      headYaw: 0,
      eyeX: 0,
      eyeY: 0,
      eyeOpenL: 1,
      eyeOpenR: 1,
      mouthOpen: 0,
    };
    this.layers = [];
    this.disposed = false;
    this.frameCount = 0;
    this.lastStatsAt = performance.now();

    this.scene = new THREE.Scene();
    this.headGroup = new THREE.Group();
    this.headGroup.name = 'head-yaw';
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

    const parent = layer.group === 'body' ? this.scene : this.headGroup;
    if (parent === this.headGroup) {
      mesh.position.x = -HEAD_PIVOT_X;
      wireMesh.position.x = -HEAD_PIVOT_X;
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
    const useCorrective = this.mode === 'B';
    const corrective = useCorrective ? this.surfaceSettings.corrective : 0;
    const faceDepth = this.surfaceSettings.faceDepth;
    const hairDepth = this.surfaceSettings.hairDepth;
    const projectionScale = THREE.MathUtils.lerp(
      0.65,
      1.6,
      THREE.MathUtils.clamp(this.surfaceSettings.perspective, 0, 0.5) / 0.5,
    );

    this.headGroup.position.x = HEAD_PIVOT_X;
    this.headGroup.rotation.y = yaw * HEAD_YAW_RADIANS;

    for (const record of this.layers) {
      const layer = record.definition;
      const position = record.geometry.getAttribute('position');
      const centerY = layer.crop[1] + layer.crop[3] / 2;
      const eyeOpen = layer.eye === 'left'
        ? this.parameters.eyeOpenL
        : layer.eye === 'right' ? this.parameters.eyeOpenR : 1;
      const shaped = useCorrective
        ? interpolateKeyShapes(record.basePositions, record.keyShapes, yaw * corrective)
        : record.basePositions;

      for (let vertex = 0; vertex < position.count; vertex += 1) {
        const imageX = record.imagePoints[vertex * 2];
        const imageY = record.imagePoints[vertex * 2 + 1];
        const offset = vertex * 3;
        let x = shaped[offset];
        let y = shaped[offset + 1];
        let z = layer.z ?? 0;
        const faceCap = sampleSurface(imageX, imageY, FACE_SURFACE);
        const hairCap = sampleSurface(imageX, imageY, HAIR_SURFACE);

        if (layer.surface === 'face') {
          z += faceDepth * faceCap + shaped[offset + 2];
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

        if (layer.eye) {
          y = (y - (HALF_MODEL - centerY)) * Math.max(0.04, eyeOpen) + (HALF_MODEL - centerY);
          if (layer.iris) {
            x += (this.parameters.eyeX ?? 0) * 4.5;
            y += (this.parameters.eyeY ?? 0) * 3;
          }
        }

        position.setXYZ(vertex, x, y, z * projectionScale);
      }

      position.needsUpdate = true;
      record.geometry.computeBoundingSphere();

      if (layer.id === 'mouth') {
        record.material.opacity = 1 - THREE.MathUtils.clamp(this.parameters.mouthOpen ?? 0, 0, 1);
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

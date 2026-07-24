import * as THREE from 'three';
import { createGridGeometry, interpolateKeyShapes } from './geometry';

/**
 * Generic 2.5D mesh character renderer.
 *
 * All character-specific data — layers, pivots, pose limits, surface
 * ellipses, depth weights and the art-directed key-shape builders — comes in
 * through the injected `model` contract (see ichigo-model.js for the shape).
 * The renderer itself only knows the generic mechanics: grid meshes, key-shape
 * interpolation, group rotations and the per-layer feature behaviours that are
 * declared in layer data (eye, iris, eyelash, mouthMorph, hairMotion).
 */

function sampleSurface(imageX, imageY, surface) {
  const nx = (imageX - surface.centerX) / surface.radiusX;
  const ny = (imageY - surface.centerY) / surface.radiusY;
  return Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
}

function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

const NO_DEPTH = Object.freeze({});
const FACE_DEPTH_ONLY = Object.freeze({ face: 1 });

export class MeshCharacterRenderer {
  constructor(container, { model, onStats } = {}) {
    if (!model) throw new TypeError('MeshCharacterRenderer requires a model');
    this.container = container;
    this.model = model;
    this.onStats = onStats;
    this.mode = 'B';
    this.half = model.size / 2;
    this.yawRadians = THREE.MathUtils.degToRad(model.limits.yawDeg);
    this.pitchUpRadians = THREE.MathUtils.degToRad(model.limits.pitchUpDeg);
    this.pitchDownRadians = THREE.MathUtils.degToRad(model.limits.pitchDownDeg);
    this.rollRadians = THREE.MathUtils.degToRad(model.limits.rollDeg);
    this.headPivot = {
      x: model.pivots.head.x - this.half,
      y: this.half - model.pivots.head.y,
    };
    this.rollPivot = {
      x: model.pivots.roll.x - this.half,
      y: this.half - model.pivots.roll.y,
    };
    this.surfaceSettings = { ...model.defaultSurfaceSettings };
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
      this.rollPivot.x - this.headPivot.x,
      this.rollPivot.y - this.headPivot.y,
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
    this.camera = new THREE.OrthographicCamera(-this.half, this.half, this.half, -this.half, 1, 4000);
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
    const records = await Promise.all(this.model.layers.map(async (layer) => {
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
      textureWidth: this.model.size,
      textureHeight: this.model.size,
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
      mesh.position.x = -this.rollPivot.x;
      mesh.position.y = -this.rollPivot.y;
      wireMesh.position.x = -this.rollPivot.x;
      wireMesh.position.y = -this.rollPivot.y;
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
        '-1': this.model.buildYawKeyShape(layer, data, -1),
        0: new Float32Array(data.positions.length),
        1: this.model.buildYawKeyShape(layer, data, 1),
      },
      pitchKeyShapes: {
        '-1': this.model.buildPitchKeyShape(layer, data, -1),
        0: new Float32Array(data.positions.length),
        1: this.model.buildPitchKeyShape(layer, data, 1),
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
    this.surfaceSettings = { ...this.model.defaultSurfaceSettings, ...settings };
    this.fitCamera();
    this.updateGeometry();
  }

  update(parameters = {}) {
    this.parameters = { ...this.parameters, ...parameters };
    this.updateGeometry();
  }

  fitCamera() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const visibleHalf = this.half;
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

  layerDepthWeights(layer) {
    return this.model.depthWeights[layer.surface]
      ?? (layer.group === 'body' ? NO_DEPTH : FACE_DEPTH_ONLY);
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
    const faceSurface = this.model.surfaces.face;
    const hairSurface = this.model.surfaces.hair;
    const eyeMotion = this.model.eyeMotion;
    const projectionScale = THREE.MathUtils.lerp(
      0.65,
      1.6,
      THREE.MathUtils.clamp(this.surfaceSettings.perspective, 0, 0.5) / 0.5,
    );

    this.headGroup.position.x = this.headPivot.x;
    this.headGroup.position.y = this.headPivot.y;
    this.headGroup.rotation.y = yaw * this.yawRadians;
    this.headGroup.rotation.x = pitch < 0
      ? pitch * this.pitchUpRadians
      : pitch * this.pitchDownRadians;
    // Negate model-space rotation so positive HeadRoll matches the browser/CSS
    // convention used by the original guruguru prototype: clockwise on screen.
    this.rollGroup.rotation.z = -roll * this.rollRadians;

    for (const record of this.layers) {
      const layer = record.definition;
      const position = record.geometry.getAttribute('position');
      const centerY = layer.crop[1] + layer.crop[3] / 2;
      const depthWeights = this.layerDepthWeights(layer);
      const eyeOpen = layer.eye === 'left'
        ? this.parameters.eyeOpenL
        : layer.eye === 'right' ? this.parameters.eyeOpenR : 1;
      const yawShaped = useCorrective
        ? interpolateKeyShapes(record.basePositions, record.keyShapes, yaw * corrective)
        : record.basePositions;
      const shaped = useCorrective
        ? interpolateKeyShapes(yawShaped, record.pitchKeyShapes, pitch * pitchCorrective)
        : yawShaped;
      const posedEyeCenterY = (this.half - centerY)
        + pitch * pitchCorrective * (layer.correction?.pitchShift ?? 0);

      for (let vertex = 0; vertex < position.count; vertex += 1) {
        const imageX = record.imagePoints[vertex * 2];
        const imageY = record.imagePoints[vertex * 2 + 1];
        const offset = vertex * 3;
        let x = shaped[offset];
        let y = shaped[offset + 1];
        let z = (layer.z ?? 0) + shaped[offset + 2] - record.basePositions[offset + 2];

        if (depthWeights.face) {
          z += faceDepth * sampleSurface(imageX, imageY, faceSurface) * depthWeights.face;
        }
        if (depthWeights.hair) {
          z += hairDepth * sampleSurface(imageX, imageY, hairSurface) * depthWeights.hair;
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
          const posedOriginY = (this.half - layer.mouthMorph.originImageY)
            + pitch * pitchCorrective * (layer.correction?.pitchShift ?? 0);
          y = (y - posedOriginY) * openness + posedOriginY;
        }

        if (layer.eye) {
          y = (y - posedEyeCenterY) * Math.max(eyeMotion.minOpenScale, eyeOpen) + posedEyeCenterY;
          if (layer.iris) {
            x += (this.parameters.eyeX ?? 0) * eyeMotion.irisTravelX;
            y += (this.parameters.eyeY ?? 0) * eyeMotion.irisTravelY;
          }
        }

        position.setXYZ(vertex, x, y, z * projectionScale);
      }

      position.needsUpdate = true;
      record.geometry.computeBoundingSphere();

      if (layer.iris) {
        record.material.opacity = THREE.MathUtils.smoothstep(
          eyeOpen,
          eyeMotion.irisFade[0],
          eyeMotion.irisFade[1],
        );
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

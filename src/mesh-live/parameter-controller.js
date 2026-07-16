export function clamp(value, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export class ParameterController {
  constructor(initial = {}) {
    this.current = {
      headYaw: 0,
      headPitch: 0,
      eyeX: 0,
      eyeY: 0,
      eyeOpenL: 1,
      eyeOpenR: 1,
      mouthOpen: 0,
      ...initial,
    };
    this.target = { ...this.current };
    this.smoothing = 0.14;
  }

  setTarget(name, value) {
    if (!(name in this.target) || !Number.isFinite(value)) return;
    const isUnit = name.startsWith('eyeOpen') || name === 'mouthOpen';
    this.target[name] = clamp(value, isUnit ? 0 : -1, 1);
  }

  setImmediate(values) {
    for (const [name, value] of Object.entries(values)) {
      if (!(name in this.current) || !Number.isFinite(value)) continue;
      const isUnit = name.startsWith('eyeOpen') || name === 'mouthOpen';
      const next = clamp(value, isUnit ? 0 : -1, 1);
      this.current[name] = next;
      this.target[name] = next;
    }
  }

  update(deltaSeconds = 1 / 60) {
    // Frame-rate independent equivalent of a 0.14 lerp at 60 fps.
    const alpha = 1 - Math.pow(1 - this.smoothing, Math.max(0, deltaSeconds) * 60);
    for (const name of Object.keys(this.current)) {
      this.current[name] += (this.target[name] - this.current[name]) * alpha;
    }
    return this.current;
  }
}

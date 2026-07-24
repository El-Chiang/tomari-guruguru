const SIGNED_PARAMETERS = new Set([
  'headYaw', 'headPitch', 'headRoll',
  'eyeX', 'eyeY',
  'bodySway', 'bodyBob', 'breath',
  'hairFront', 'hairBack', 'hairAccessory',
  'browL', 'browR',
]);

const UNIT_PARAMETERS = new Set(['eyeOpenL', 'eyeOpenR', 'mouthOpen']);

export const DEFAULT_MOTION_SETTINGS = Object.freeze({
  eyeFollow: true,
  autoSaccade: true,
  autoBlink: true,
  eyeAmplitude: 1,
  idleDelay: 1.6,
  gazeSmoothing: 14,
  autoRoll: true,
  rollAmplitude: 0.5,
  rollDuration: 4,
  autoHair: true,
  hairAmplitude: 1 / 3,
  hairDuration: 3.6,
});

function clamp(value, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parameterDefault(name) {
  return name.startsWith('eyeOpen') ? 1 : 0;
}

function clampParameter(name, value) {
  if (UNIT_PARAMETERS.has(name)) return clamp(value, 0, 1);
  if (SIGNED_PARAMETERS.has(name)) return clamp(value);
  return value;
}

/**
 * Compose independent motion sources without coupling them to React or Three.
 * Signed poses use additive sources, openness uses multiplication, and authored
 * overrides can opt into replacement. The same mixer can later accept roll,
 * hair, breathing, and mouth sources without changing the renderer contract.
 */
export function mixMotionParameters(base = {}, sources = []) {
  const result = { ...base };

  for (const source of sources) {
    if (!source?.values) continue;
    const mode = source.mode ?? 'add';
    const weight = clamp(Number.isFinite(source.weight) ? source.weight : 1, 0, 1);

    for (const [name, value] of Object.entries(source.values)) {
      if (!Number.isFinite(value)) continue;
      const current = Number.isFinite(result[name]) ? result[name] : parameterDefault(name);
      if (mode === 'replace') result[name] = current + (value - current) * weight;
      else if (mode === 'multiply') result[name] = current * (1 + (value - 1) * weight);
      else result[name] = current + value * weight;
    }
  }

  for (const [name, value] of Object.entries(result)) result[name] = clampParameter(name, value);
  return result;
}

function easeInOut(value) {
  return 0.5 - Math.cos(Math.PI * clamp(value, 0, 1)) / 2;
}

/** Return eye openness for a normalized blink timeline. */
export function blinkOpenness(progress) {
  const value = clamp(progress, 0, 1);
  if (value < 0.38) return 1 - easeInOut(value / 0.38);
  if (value < 0.55) return 0;
  return easeInOut((value - 0.55) / 0.45);
}

export class MotionDirector {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.time = 0;
    this.pointer = { x: 0, y: 0 };
    this.lastPointerAt = Number.NEGATIVE_INFINITY;
    this.gaze = { x: 0, y: 0 };
    this.saccade = { x: 0, y: 0 };
    this.saccadeReturnAt = Number.POSITIVE_INFINITY;
    this.nextSaccadeAt = this.range(0.9, 2.6);
    this.blinks = [];
    this.nextBlinkAt = this.range(1, 2.8);
  }

  range(min, max) {
    return min + (max - min) * clamp(this.random(), 0, 1);
  }

  setPointer(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.pointer.x = clamp(x);
    this.pointer.y = clamp(y);
    this.lastPointerAt = this.time;
  }

  triggerBlink({ duration = 0.19, delay = 0, double = false } = {}) {
    const safeDuration = clamp(duration, 0.08, 0.8);
    const safeDelay = Math.max(0, delay);
    const start = this.time + safeDelay;
    this.blinks.push({ start, duration: safeDuration });
    if (double) this.blinks.push({ start: start + safeDuration + 0.12, duration: safeDuration * 0.9 });
  }

  scheduleAutomaticBlink() {
    const roll = this.random();
    if (roll < 0.22) this.triggerBlink({ duration: this.range(0.15, 0.21), double: true });
    else if (roll < 0.28) this.triggerBlink({ duration: this.range(0.32, 0.44) });
    else this.triggerBlink({ duration: this.range(0.16, 0.24) });
    this.nextBlinkAt = this.time + this.range(1, 4.4);
  }

  updateSaccade(enabled, pointerActive) {
    if (!enabled || pointerActive) {
      this.saccade.x = 0;
      this.saccade.y = 0;
      this.saccadeReturnAt = Number.POSITIVE_INFINITY;
      this.nextSaccadeAt = Math.max(this.nextSaccadeAt, this.time + 0.45);
      return;
    }

    if (this.time >= this.saccadeReturnAt) {
      this.saccade.x = 0;
      this.saccade.y = 0;
      this.saccadeReturnAt = Number.POSITIVE_INFINITY;
      this.nextSaccadeAt = this.time + this.range(0.9, 2.6);
    } else if (this.time >= this.nextSaccadeAt) {
      this.saccade.x = this.range(-0.5, 0.5);
      this.saccade.y = this.range(-0.35, 0.35);
      this.saccadeReturnAt = this.time + this.range(0.5, 1.1);
      this.nextSaccadeAt = Number.POSITIVE_INFINITY;
    }
  }

  updateBlink(enabled) {
    if (enabled && this.time >= this.nextBlinkAt) this.scheduleAutomaticBlink();
    if (!enabled && this.nextBlinkAt <= this.time) this.nextBlinkAt = this.time + this.range(1, 2.8);

    let openness = 1;
    const active = [];
    for (const blink of this.blinks) {
      const progress = (this.time - blink.start) / blink.duration;
      if (progress < 0) {
        active.push(blink);
      } else if (progress <= 1) {
        openness *= blinkOpenness(progress);
        active.push(blink);
      }
    }
    this.blinks = active;
    return openness;
  }

  updateRoll(enabled, amplitude, duration) {
    if (!enabled) return 0;
    const safeAmplitude = clamp(amplitude, 0, 1);
    const safeDuration = Math.max(0.4, Number.isFinite(duration) ? duration : 4);
    return Math.sin((this.time / safeDuration) * Math.PI * 2) * safeAmplitude;
  }

  updateHair(enabled, amplitude, duration, headRoll) {
    if (!enabled) return { hairFront: 0, hairBack: 0, hairAccessory: 0 };
    const safeAmplitude = clamp(amplitude, 0, 1);
    const safeDuration = Math.max(0.5, Number.isFinite(duration) ? duration : 3.6);
    const angleAt = (phaseSeconds) => ((this.time - phaseSeconds) / safeDuration) * Math.PI * 2;
    const front = Math.sin(angleAt(0));
    const back = Math.sin(angleAt(0.5)) * 1.2;
    const accessory = Math.sin(angleAt(0.15)) * 0.5;

    return {
      hairFront: clamp(front * safeAmplitude - headRoll * 0.18),
      hairBack: clamp(back * safeAmplitude - headRoll * 0.3),
      hairAccessory: clamp(accessory * safeAmplitude - headRoll * 0.1),
    };
  }

  update(deltaSeconds = 1 / 60, settings = {}) {
    const delta = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 0.1);
    this.time += delta;
    const options = { ...DEFAULT_MOTION_SETTINGS, ...settings };
    const pointerActive = options.eyeFollow
      && this.time - this.lastPointerAt <= Math.max(0, options.idleDelay);

    this.updateSaccade(options.autoSaccade, pointerActive);
    const desiredX = pointerActive ? this.pointer.x : options.autoSaccade ? this.saccade.x : 0;
    const desiredY = pointerActive ? this.pointer.y : options.autoSaccade ? this.saccade.y : 0;
    const smoothing = 1 - Math.exp(-Math.max(0, options.gazeSmoothing) * delta);
    this.gaze.x += (desiredX - this.gaze.x) * smoothing;
    this.gaze.y += (desiredY - this.gaze.y) * smoothing;

    const amplitude = clamp(options.eyeAmplitude, 0, 1.5);
    const eyeOpen = this.updateBlink(options.autoBlink);
    const headRoll = this.updateRoll(options.autoRoll, options.rollAmplitude, options.rollDuration);
    const hair = this.updateHair(options.autoHair, options.hairAmplitude, options.hairDuration, headRoll);
    return mixMotionParameters(
      {
        headRoll: 0,
        eyeX: 0,
        eyeY: 0,
        eyeOpenL: 1,
        eyeOpenR: 1,
        hairFront: 0,
        hairBack: 0,
        hairAccessory: 0,
      },
      [
        { mode: 'add', values: { headRoll } },
        { mode: 'add', values: hair },
        { mode: 'add', values: { eyeX: this.gaze.x * amplitude, eyeY: this.gaze.y * amplitude } },
        { mode: 'multiply', values: { eyeOpenL: eyeOpen, eyeOpenR: eyeOpen } },
      ],
    );
  }
}

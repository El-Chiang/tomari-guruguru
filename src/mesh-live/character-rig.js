import { DEFAULT_MOTION_SETTINGS, MotionDirector } from './motion-controller.js';
import { ParameterController, clamp } from './parameter-controller.js';

/**
 * DOM-light frame driver that composes manual pose targets with automatic
 * motion (gaze, blink, roll, hair, lip flap) into one parameter stream.
 *
 * The rig has no renderer or model knowledge: poses are normalized [-1, 1]
 * (mouthOpen [0, 1]) and the caller converts degrees at its own boundary.
 * Typical wiring:
 *
 *   const rig = new CharacterRig();
 *   rig.start((parameters) => renderer.update(parameters));
 *   ...
 *   rig.stop();
 *
 * `update(delta)` can be called manually instead of `start()` when the host
 * already owns an animation loop.
 */
export class CharacterRig {
  constructor({ random } = {}) {
    this.controller = new ParameterController();
    this.director = new MotionDirector({ random });
    this.motionSettings = { ...DEFAULT_MOTION_SETTINGS };
    // Manual targets composed on top of automatic sources.
    this.pose = { yaw: 0, pitch: 0, roll: 0, mouthOpen: 0 };
    this.frame = null;
  }

  setMotionSettings(settings = {}) {
    this.motionSettings = { ...this.motionSettings, ...settings };
  }

  setPose(pose = {}) {
    for (const name of ['yaw', 'pitch', 'roll', 'mouthOpen']) {
      if (Number.isFinite(pose[name])) this.pose[name] = pose[name];
    }
  }

  /** Forward a normalized pointer position to the gaze source. */
  setPointer(x, y) {
    this.director.setPointer(x, y);
  }

  triggerBlink(options) {
    this.director.triggerBlink(options);
  }

  /**
   * Normalize a pointer event against an element to the [-1, 1] range the
   * gaze source expects. DOM Y grows downward while the eye mesh uses
   * model-space Y growing upward, so Y is inverted here at the DOM boundary.
   */
  static normalizePointer(event, element, { reach = 0.42 } = {}) {
    const bounds = element?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: clamp((event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width * reach)),
      y: -clamp((event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height * reach)),
    };
  }

  /** Advance one frame and return the smoothed parameter set. */
  update(deltaSeconds = 1 / 60) {
    this.controller.setTarget('headYaw', this.pose.yaw);
    this.controller.setTarget('headPitch', this.pose.pitch);
    const directed = this.director.update(deltaSeconds, this.motionSettings);
    this.controller.setImmediate({
      ...directed,
      headRoll: clamp((directed.headRoll ?? 0) + this.pose.roll),
      mouthOpen: clamp((directed.mouthOpen ?? 0) + this.pose.mouthOpen, 0, 1),
    });
    return this.controller.update(deltaSeconds);
  }

  /** Run a requestAnimationFrame loop, passing parameters to `sink` each frame. */
  start(sink) {
    this.stop();
    let previous = performance.now();
    const tick = (now) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      sink(this.update(delta));
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    if (this.frame != null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}

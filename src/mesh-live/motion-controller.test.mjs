import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blinkOpenness,
  mixMotionParameters,
  MotionDirector,
} from './motion-controller.js';

test('motion sources add signed poses, multiply openness, and clamp output', () => {
  const result = mixMotionParameters(
    { eyeX: 0.6, eyeOpenL: 1 },
    [
      { values: { eyeX: 0.7 } },
      { mode: 'multiply', values: { eyeOpenL: 0.4 } },
    ],
  );
  assert.equal(result.eyeX, 1);
  assert.equal(result.eyeOpenL, 0.4);
});

test('blink envelope closes fully and returns to open', () => {
  assert.equal(blinkOpenness(0), 1);
  assert.equal(blinkOpenness(0.45), 0);
  assert.equal(blinkOpenness(1), 1);
});

test('pointer gaze follows quickly then relaxes after its idle window', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  director.setPointer(1, -0.5);
  const following = director.update(0.1, { autoSaccade: false, idleDelay: 0.2 });
  assert.ok(following.eyeX > 0.7);
  assert.ok(following.eyeY < -0.35);

  let relaxed = following;
  for (let index = 0; index < 12; index += 1) {
    relaxed = director.update(0.1, { autoSaccade: false, idleDelay: 0.2 });
  }
  assert.ok(Math.abs(relaxed.eyeX) < 0.001);
  assert.ok(Math.abs(relaxed.eyeY) < 0.001);
});

test('manual blink remains continuous and completes without timers', () => {
  const director = new MotionDirector({ random: () => 0.5 });
  director.triggerBlink({ duration: 0.4 });
  director.update(0.08, { autoBlink: false });
  const closing = director.update(0.08, { autoBlink: false });
  assert.ok(closing.eyeOpenL < 0.05);
  assert.equal(closing.eyeOpenL, closing.eyeOpenR);

  director.update(0.1, { autoBlink: false });
  director.update(0.1, { autoBlink: false });
  const open = director.update(0.1, { autoBlink: false });
  assert.equal(open.eyeOpenL, 1);
  assert.equal(open.eyeOpenR, 1);
});

test('idle saccade is generated after the quiet interval', () => {
  const values = [0, 1, 0.75, 0.25, 0.5, 0.5];
  let index = 0;
  const director = new MotionDirector({ random: () => values[index++ % values.length] });
  let output;
  for (let frame = 0; frame < 11; frame += 1) {
    output = director.update(0.1, { eyeFollow: false, autoSaccade: true, autoBlink: false });
  }
  assert.ok(Math.abs(output.eyeX) > 0.01 || Math.abs(output.eyeY) > 0.01);
});

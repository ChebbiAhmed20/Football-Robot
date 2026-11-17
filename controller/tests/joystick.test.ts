import { describe, it, expect } from 'vitest';
import { computeJoystick } from '../src/input/joystick.js';

describe('Joystick Calculations & Snapping', () => {
  const radius = 100; // 100px pad radius -> 15px dead zone

  it('reports idle (d=-1, m=0) within the 15% dead zone', () => {
    // Exact center
    let res = computeJoystick(0, 0, radius);
    expect(res.d).toBe(-1);
    expect(res.m).toBe(0);

    // 10px out (10% of radius <= 15%)
    res = computeJoystick(0, 10, radius);
    expect(res.d).toBe(-1);
    expect(res.m).toBe(0);

    // 15px out (15% of radius)
    res = computeJoystick(15, 0, radius);
    expect(res.d).toBe(-1);
    expect(res.m).toBe(0);
  });

  it('scales m linearly from 0.0 at edge of dead zone to 1.0 at rim', () => {
    // Just outside dead zone (16px) -> m > 0
    let res = computeJoystick(0, 16, radius);
    expect(res.m).toBeGreaterThan(0);

    // Halfway between dead zone (15px) and rim (100px): (57.5 - 15) / 85 = 0.5
    res = computeJoystick(0, 57.5, radius);
    expect(res.m).toBeCloseTo(0.5, 2);

    // At rim (100px) -> m = 1.0
    res = computeJoystick(0, 100, radius);
    expect(res.m).toBeCloseTo(1.0, 2);

    // Past rim (150px) -> m clamped to 1.0
    res = computeJoystick(0, 150, radius);
    expect(res.m).toBe(1.0);
    expect(res.clampedY).toBe(100);
  });

  it('snaps angles clockwise to the nearest 22.5° step (16 directions)', () => {
    // 0° (Straight UP, dx=0, dy=100) -> d = 0 (forward)
    let res = computeJoystick(0, 100, radius);
    expect(res.d).toBe(0);

    // 22.5° (forward, slight right)
    const rad22_5 = (22.5 * Math.PI) / 180;
    res = computeJoystick(Math.sin(rad22_5) * 100, Math.cos(rad22_5) * 100, radius);
    expect(res.d).toBe(1);

    // 90° (Straight RIGHT, dx=100, dy=0) -> d = 4 (right)
    res = computeJoystick(100, 0, radius);
    expect(res.d).toBe(4);

    // 180° (Straight DOWN, dx=0, dy=-100) -> d = 8 (back)
    res = computeJoystick(0, -100, radius);
    expect(res.d).toBe(8);

    // 270° (Straight LEFT, dx=-100, dy=0) -> d = 12 (left)
    res = computeJoystick(-100, 0, radius);
    expect(res.d).toBe(12);

    // 337.5° (forward, slight left)
    const rad337_5 = (337.5 * Math.PI) / 180;
    res = computeJoystick(Math.sin(rad337_5) * 100, Math.cos(rad337_5) * 100, radius);
    expect(res.d).toBe(15);
  });
});

import { DEAD_ZONE_RATIO, DIRECTION_STEP_DEG } from '../protocol/constants.js';

export interface JoystickCalculation {
  d: number;
  m: number;
  clampedX: number;
  clampedY: number;
}

// Pure function to calculate direction index d and speed factor m from pad offsets.
// dx: horizontal distance from pad center (positive = right)
// dy: vertical distance from pad center (positive = up / screen-relative inverted)
// radius: pad radius in pixels
export function computeJoystick(
  dx: number,
  dy: number,
  radius: number
): JoystickCalculation {
  if (radius <= 0) {
    return { d: -1, m: 0, clampedX: 0, clampedY: 0 };
  }

  const dist = Math.hypot(dx, dy);
  const normDist = dist / radius;

  // Clamped knob position for visual rendering
  let clampedX = dx;
  let clampedY = dy;
  if (normDist > 1.0) {
    clampedX = (dx / dist) * radius;
    clampedY = (dy / dist) * radius;
  }

  // Dead zone check (PROTOCOL.md §6.1: <= 15% radius)
  if (normDist <= DEAD_ZONE_RATIO || dist === 0) {
    return { d: -1, m: 0, clampedX, clampedY };
  }

  // Scale m from 0.0 (edge of dead zone) to 1.0 (rim)
  const m = Math.min(1.0, (normDist - DEAD_ZONE_RATIO) / (1.0 - DEAD_ZONE_RATIO));

  // Clockwise angle from forward (straight up where dy > 0)
  // atan2(x, y) gives angle from +Y axis clockwise to +X axis
  let angleRad = Math.atan2(dx, dy);
  if (angleRad < 0) {
    angleRad += 2 * Math.PI;
  }

  const angleDeg = (angleRad * 180) / Math.PI;
  // Snap to nearest 22.5° step
  const d = Math.round(angleDeg / DIRECTION_STEP_DEG) % 16;

  return { d, m, clampedX, clampedY };
}

export type JoystickCallback = (d: number, m: number) => void;

export class JoystickController {
  private container: HTMLElement;
  private knob: HTMLElement;
  private onMove: JoystickCallback;
  private isPointerDown = false;
  private activePointerId: number | null = null;
  private radius = 80;

  constructor(container: HTMLElement, knob: HTMLElement, onMove: JoystickCallback) {
    this.container = container;
    this.knob = knob;
    this.onMove = onMove;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
  }

  private handlePointerDown(e: PointerEvent): void {
    this.isPointerDown = true;
    this.activePointerId = e.pointerId;
    this.container.setPointerCapture(e.pointerId);
    this.updatePosition(e);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isPointerDown || e.pointerId !== this.activePointerId) return;
    this.updatePosition(e);
  }

  private handlePointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.activePointerId) return;
    this.isPointerDown = false;
    this.activePointerId = null;

    // Reset knob to center
    this.knob.style.transform = `translate(0px, 0px)`;
    this.onMove(-1, 0);
  }

  private updatePosition(e: PointerEvent): void {
    const rect = this.container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    this.radius = rect.width / 2;

    const dx = e.clientX - centerX;
    // Invert screen Y so that moving up (negative clientY) corresponds to positive forward dy
    const dy = centerY - e.clientY;

    const calc = computeJoystick(dx, dy, this.radius);

    // Update knob visual position (screen Y inverted back)
    this.knob.style.transform = `translate(${calc.clampedX}px, ${-calc.clampedY}px)`;
    this.onMove(calc.d, calc.m);
  }
}


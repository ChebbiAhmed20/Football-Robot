export interface MotorOutput {
  left: number;
  right: number;
}

export const MIN_PWM = 70;
export const PWM_CAP = 255;

export function mixDrive(
  d: number,
  m: number,
  s: number,
  minPwm: number = MIN_PWM,
  pwmCap: number = PWM_CAP
): MotorOutput {
  if (d < 0 || d > 15 || m <= 0) {
    return { left: 0, right: 0 };
  }

  const clampedM = Math.max(0, Math.min(1, m));
  const clampedS = Math.max(80, Math.min(pwmCap, s));

  const angle = (d * 22.5 * Math.PI) / 180.0;
  const x = Math.sin(angle);
  const y = Math.cos(angle);

  let leftF = y + x;
  let rightF = y - x;

  leftF = Math.max(-1, Math.min(1, leftF));
  rightF = Math.max(-1, Math.min(1, rightF));

  let leftPwm = Math.round(leftF * clampedS * clampedM);
  let rightPwm = Math.round(rightF * clampedS * clampedM);

  // Prevent -0 in JavaScript
  if (Object.is(leftPwm, -0)) leftPwm = 0;
  if (Object.is(rightPwm, -0)) rightPwm = 0;

  // Minimum PWM stall threshold
  if (leftPwm !== 0 && Math.abs(leftPwm) < minPwm) {
    leftPwm = leftPwm > 0 ? minPwm : -minPwm;
  }
  if (rightPwm !== 0 && Math.abs(rightPwm) < minPwm) {
    rightPwm = rightPwm > 0 ? minPwm : -minPwm;
  }

  return { left: leftPwm, right: rightPwm };
}

export function mixSpin(r: number, s: number, pwmCap: number = PWM_CAP): MotorOutput {
  const clampedS = Math.max(80, Math.min(pwmCap, s));
  if (r === 1) {
    return { left: clampedS, right: -clampedS };
  } else if (r === -1) {
    return { left: -clampedS, right: clampedS };
  }
  return { left: 0, right: 0 };
}


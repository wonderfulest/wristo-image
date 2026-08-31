const WHEEL_STEP_THRESHOLD = 80

export const consumeWheelZoom = (remainder: number, deltaY: number): { remainder: number; steps: number } => {
  const accumulated = remainder + deltaY
  if (Math.abs(accumulated) < WHEEL_STEP_THRESHOLD) return { remainder: accumulated, steps: 0 }
  return { remainder: 0, steps: accumulated > 0 ? -1 : 1 }
}

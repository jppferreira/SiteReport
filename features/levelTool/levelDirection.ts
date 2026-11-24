import type { LevelReading } from './levelMath';
import { isPlumbOrientation, type LevelOrientation } from './levelOrientation';

export type LevelDirection =
  | 'level'
  | 'plumb'
  | 'raiseLeft'
  | 'raiseRight'
  | 'raiseTop'
  | 'raiseBottom'
  | 'raiseLeftEnd'
  | 'raiseRightEnd';

/**
 * What the user should do to centre the bubble, for the hint under the readout.
 * Flat: positive roll = right side down, positive pitch = top edge down (CoreMotion axes).
 * Tube: positive angle = right-hand end high.
 */
export function levelDirection(
  o: LevelOrientation,
  r: Pick<LevelReading, 'rollDeg' | 'pitchDeg' | 'isLevel'> & { angleDeg: number }
): LevelDirection {
  if (r.isLevel) return isPlumbOrientation(o) ? 'plumb' : 'level';
  if (o !== 'flat') return r.angleDeg > 0 ? 'raiseLeftEnd' : 'raiseRightEnd';
  if (Math.abs(r.rollDeg) >= Math.abs(r.pitchDeg)) return r.rollDeg > 0 ? 'raiseRight' : 'raiseLeft';
  return r.pitchDeg > 0 ? 'raiseTop' : 'raiseBottom';
}

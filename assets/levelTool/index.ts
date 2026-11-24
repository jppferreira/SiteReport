/** Local Level redesign assets — never reference Figma CDN URLs at runtime. */

export const levelIcons = {
  close: require('./icons/close.png'),
  volume: require('./icons/volume.png'),
  phone: require('./icons/phone.png'),
  lock: require('./icons/lock.png'),
  zero: require('./icons/zero.png'),
  haptics: require('./icons/haptics.png'),
  check: require('./icons/check.png'),
} as const;

export const bullseyeAssets = {
  machinedBezel: require('./bullseye/machined-bezel.png'),
  screw: require('./bullseye/screw.png'),
  shadowBase: require('./bullseye/shadow-base.png'),
  shadowBaseLevel: require('./bullseye/shadow-base-level.png'),
  turningMarks: require('./bullseye/turning-marks.png'),
  chamfer: require('./bullseye/chamfer.png'),
  recess: require('./bullseye/recess.png'),
  liquid: require('./bullseye/liquid-off.png'),
  etchedRings: require('./bullseye/etched-rings.png'),
  bubbleShadow: require('./bullseye/bubble-shadow.png'),
  bubble: require('./bullseye/bubble.png'),
  bubbleHighlight: require('./bullseye/bubble-highlight.png'),
  bubbleCaustic: require('./bullseye/bubble-caustic.png'),
  glassCrescent: require('./bullseye/glass-crescent.png'),
  domeReflection: require('./bullseye/dome-reflection.png'),
  glassRim: require('./bullseye/glass-rim.png'),
  targetGlow: require('./bullseye/target-glow.png'),
} as const;

export const boxAssets = {
  brushedGrain: require('./box/brushed-grain.png'),
  mmScale: require('./box/mm-scale.png'),
  bubbleHighlight: require('./box/bubble-highlight.png'),
} as const;

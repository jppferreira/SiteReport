import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

type BullseyeVialProps = {
  size: number;
  /** Bubble offset from centre in px (already clamped to the travel radius). */
  offsetX: number;
  offsetY: number;
  isLevel: boolean;
};

/** Travel radius for the bubble centre inside a vial of `size`. */
export function bullseyeTravel(size: number): number {
  const glassR = size * 0.4;
  const bubbleR = size * 0.075;
  return glassR - bubbleR - size * 0.02;
}

const SCREWS = [-90, 165, 15];

/**
 * Machined circular spirit level: brushed steel bezel with screws, a lime fluid
 * vial under domed glass, and a glossy air bubble. Pure SVG gradients.
 */
export function BullseyeVial({ size, offsetX, offsetY, isLevel }: BullseyeVialProps) {
  const c = size / 2;
  const outerR = size * 0.47;
  const bezelInnerR = size * 0.415;
  const glassR = size * 0.4;
  const bubbleR = size * 0.075;
  const targetR = bubbleR * 1.35;
  const bx = c + offsetX;
  const by = c + offsetY;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id="bv-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="78%" stopColor="#1FA84A" stopOpacity="0" />
          <Stop offset="90%" stopColor="#1FA84A" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#1FA84A" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bv-shadow" cx="50%" cy="54%" r="50%">
          <Stop offset="80%" stopColor="#000000" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="bv-steel" x1="15%" y1="0%" x2="85%" y2="100%">
          <Stop offset="0%" stopColor="#F4F6F5" />
          <Stop offset="22%" stopColor="#A9AEAB" />
          <Stop offset="48%" stopColor="#E6E9E7" />
          <Stop offset="70%" stopColor="#7E8481" />
          <Stop offset="100%" stopColor="#D5D9D7" />
        </LinearGradient>
        <LinearGradient id="bv-steelInner" x1="85%" y1="100%" x2="15%" y2="0%">
          <Stop offset="0%" stopColor="#EEF0EF" />
          <Stop offset="50%" stopColor="#6F7572" />
          <Stop offset="100%" stopColor="#2B2F2D" />
        </LinearGradient>
        <RadialGradient id="bv-fluid" cx="46%" cy="40%" r="62%">
          <Stop offset="0%" stopColor="#F1F98A" />
          <Stop offset="45%" stopColor="#D2E83A" />
          <Stop offset="85%" stopColor="#9DB81B" />
          <Stop offset="100%" stopColor="#5E7410" />
        </RadialGradient>
        <LinearGradient id="bv-dome" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.04" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="bv-bubble" cx="38%" cy="32%" r="72%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="45%" stopColor="#F4F8DC" />
          <Stop offset="85%" stopColor="#C9D49A" />
          <Stop offset="100%" stopColor="#8E9A5C" />
        </RadialGradient>
        <RadialGradient id="bv-screw" cx="40%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#F7F8F7" />
          <Stop offset="100%" stopColor="#5D6360" />
        </RadialGradient>
      </Defs>

      {isLevel ? <Circle cx={c} cy={c} r={size / 2} fill="url(#bv-glow)" /> : null}
      <Circle cx={c} cy={c + size * 0.012} r={outerR + size * 0.02} fill="url(#bv-shadow)" />

      {/* Machined bezel with turning marks */}
      <Circle cx={c} cy={c} r={outerR} fill="url(#bv-steel)" />
      {[0.94, 0.9, 0.86, 0.82].map((k) => (
        <Circle
          key={k}
          cx={c}
          cy={c}
          r={outerR * k + (bezelInnerR * (1 - k)) / 2}
          stroke="#FFFFFF"
          strokeOpacity={0.18}
          strokeWidth={0.6}
          fill="none"
        />
      ))}
      <Circle cx={c} cy={c} r={bezelInnerR + size * 0.008} fill="url(#bv-steelInner)" />
      <Circle cx={c} cy={c} r={bezelInnerR} fill="#141814" />
      {SCREWS.map((angle) => {
        const r = (outerR + bezelInnerR) / 2 + size * 0.01;
        const a = (angle * Math.PI) / 180;
        const sx = c + Math.cos(a) * r;
        const sy = c + Math.sin(a) * r;
        return (
          <G key={angle}>
            <Circle cx={sx} cy={sy} r={size * 0.014} fill="url(#bv-screw)" stroke="#4A4F4C" strokeWidth={0.6} />
            <Line x1={sx - size * 0.008} y1={sy} x2={sx + size * 0.008} y2={sy} stroke="#3A3F3C" strokeWidth={1} />
          </G>
        );
      })}

      {/* Fluid vial */}
      <Circle cx={c} cy={c} r={glassR} fill="url(#bv-fluid)" />
      {ticks.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const long = deg % 30 === 0;
        const r1 = glassR - (long ? size * 0.035 : size * 0.02);
        return (
          <Line
            key={deg}
            x1={c + Math.cos(a) * r1}
            y1={c + Math.sin(a) * r1}
            x2={c + Math.cos(a) * (glassR - 2)}
            y2={c + Math.sin(a) * (glassR - 2)}
            stroke="#2E3A08"
            strokeOpacity={0.55}
            strokeWidth={long ? 1.2 : 0.7}
          />
        );
      })}
      <Line x1={c - glassR} y1={c} x2={c + glassR} y2={c} stroke="#2E3A08" strokeOpacity={0.45} strokeWidth={0.9} />
      <Line x1={c} y1={c - glassR} x2={c} y2={c + glassR} stroke="#2E3A08" strokeOpacity={0.45} strokeWidth={0.9} />
      <Circle cx={c} cy={c} r={glassR * 0.66} stroke="#2E3A08" strokeOpacity={0.45} strokeWidth={0.9} fill="none" />
      <Circle cx={c} cy={c} r={glassR * 0.42} stroke="#2E3A08" strokeOpacity={0.45} strokeWidth={0.9} fill="none" />
      <Circle
        cx={c}
        cy={c}
        r={targetR}
        stroke={isLevel ? '#1FA84A' : '#1C240A'}
        strokeWidth={isLevel ? 3 : 2}
        fill="none"
      />

      {/* Air bubble: soft shadow, glossy body, specular highlight */}
      <Ellipse cx={bx + bubbleR * 0.12} cy={by + bubbleR * 0.2} rx={bubbleR} ry={bubbleR * 0.92} fill="#2E3A08" opacity={0.28} />
      <Circle cx={bx} cy={by} r={bubbleR} fill="url(#bv-bubble)" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1} />
      <Ellipse cx={bx - bubbleR * 0.3} cy={by - bubbleR * 0.34} rx={bubbleR * 0.38} ry={bubbleR * 0.24} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={bx + bubbleR * 0.38} cy={by + bubbleR * 0.4} r={bubbleR * 0.12} fill="#FFFFFF" opacity={0.5} />

      {/* Domed glass reflections and rim */}
      <Ellipse cx={c - glassR * 0.12} cy={c - glassR * 0.48} rx={glassR * 0.72} ry={glassR * 0.4} fill="url(#bv-dome)" />
      <Circle cx={c} cy={c} r={glassR} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} fill="none" />
      <Circle cx={c} cy={c} r={outerR} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={0.8} fill="none" />
    </Svg>
  );
}

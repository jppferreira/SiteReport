import React from 'react';
import Svg, { Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

/** Aluminium box level for either long edge and for the short-edge plumb modes. */
export function BoxLevelVial({ width, angleDeg, isLevel }: { width: number; angleDeg: number; isLevel: boolean }) {
  const height = width * 0.185;
  const h = height;
  const w = width;
  const cx = w * 0.49;
  const cy = h * 0.48;
  const vialW = w * 0.31;
  const vialH = h * 0.4;
  const bubbleW = vialW * 0.23;
  const bubbleX = cx + Math.max(-1, Math.min(1, angleDeg / 15)) * (vialW - bubbleW - 12) / 2;
  const marks = Array.from({ length: 100 }, (_, i) => i);

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id="box-metal" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F5F7F6" />
          <Stop offset="10%" stopColor="#8B9290" />
          <Stop offset="25%" stopColor="#D6DAD8" />
          <Stop offset="50%" stopColor="#B4BAB7" />
          <Stop offset="74%" stopColor="#ECEEED" />
          <Stop offset="90%" stopColor="#818885" />
          <Stop offset="100%" stopColor="#D7DBD9" />
        </LinearGradient>
        <LinearGradient id="box-cap" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#111512" />
          <Stop offset="45%" stopColor="#333934" />
          <Stop offset="100%" stopColor="#0B0E0B" />
        </LinearGradient>
        <LinearGradient id="box-recess" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#3F4741" />
          <Stop offset="18%" stopColor="#959D8D" />
          <Stop offset="100%" stopColor="#DCE0C6" />
        </LinearGradient>
        <LinearGradient id="box-fluid" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F0F7B2" />
          <Stop offset="30%" stopColor="#D5E83D" />
          <Stop offset="70%" stopColor="#BAD026" />
          <Stop offset="100%" stopColor="#839A20" />
        </LinearGradient>
        <RadialGradient id="box-bubble" cx="35%" cy="28%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="50%" stopColor="#F6F9DC" />
          <Stop offset="100%" stopColor="#A3B368" />
        </RadialGradient>
        <LinearGradient id="box-hole" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0B0F0C" />
          <Stop offset="100%" stopColor="#6A716B" />
        </LinearGradient>
      </Defs>
      <Rect x={4} y={3} width={w - 8} height={h - 6} rx={h * 0.08} fill="url(#box-metal)" stroke="#707972" strokeWidth={1.3} />
      {/* Fine horizontal brush strokes */}
      {Array.from({ length: 40 }, (_, i) => (
        <Line key={i} x1={8} x2={w - 8} y1={4 + i * (h - 8) / 40} y2={4 + i * (h - 8) / 40} stroke={i % 2 ? '#FFFFFF' : '#434B45'} strokeOpacity={i % 2 ? 0.18 : 0.1} strokeWidth={0.5} />
      ))}
      <Line x1={5} x2={w - 5} y1={h * 0.13} y2={h * 0.13} stroke="#FFFFFF" strokeOpacity={0.6} />
      <Line x1={5} x2={w - 5} y1={h * 0.85} y2={h * 0.85} stroke="#535D55" strokeOpacity={0.4} />
      <SvgText x={w * 0.12} y={h * 0.4} fontSize={h * 0.09} fontFamily="Lexend_600SemiBold" letterSpacing={2} fill="#5D6961">TRADE REPORT</SvgText>
      <SvgText x={w * 0.12} y={h * 0.55} fontSize={h * 0.065} fill="#738076">LEVEL</SvgText>

      {/* Recessed vial window */}
      <Rect x={cx - vialW * 0.65} y={cy - vialH * 0.9} width={vialW * 1.3} height={vialH * 1.8} rx={vialH * 0.34} fill="url(#box-recess)" stroke="#6A7368" strokeWidth={3} />
      <Rect x={cx - vialW / 2} y={cy - vialH / 2} width={vialW} height={vialH} rx={vialH / 2} fill="url(#box-fluid)" stroke="#A0AD54" strokeWidth={1.5} />
      <Ellipse cx={cx} cy={cy - vialH * 0.22} rx={vialW * 0.46} ry={vialH * 0.2} fill="#FFFFFF" opacity={0.18} />
      {[-0.14, 0.14].map((k) => (
        <Line key={k} x1={cx + vialW * k} y1={cy - vialH * 0.49} x2={cx + vialW * k} y2={cy + vialH * 0.49} stroke={isLevel ? '#178A3C' : '#30390F'} strokeWidth={2} />
      ))}
      {[-0.28, 0.28].map((k) => (
        <Line key={k} x1={cx + vialW * k} y1={cy - vialH * 0.43} x2={cx + vialW * k} y2={cy + vialH * 0.43} stroke="#30390F" strokeWidth={0.6} strokeOpacity={0.6} />
      ))}
      <Ellipse cx={bubbleX + 1.5} cy={cy + 2} rx={bubbleW / 2} ry={vialH * 0.32} fill="#45521C" opacity={0.3} />
      <Ellipse cx={bubbleX} cy={cy} rx={bubbleW / 2} ry={vialH * 0.32} fill="url(#box-bubble)" stroke="#61752E" strokeWidth={0.8} />
      <Ellipse cx={bubbleX - bubbleW * 0.13} cy={cy - vialH * 0.12} rx={bubbleW * 0.27} ry={vialH * 0.09} fill="#FFFFFF" opacity={0.95} />

      {/* Carry handle, milled into the aluminium */}
      <Rect x={w * 0.76} y={h * 0.27} width={w * 0.145} height={h * 0.4} rx={h * 0.2} fill="url(#box-hole)" />
      {/* Engraved mm scale */}
      {marks.map((n) => {
        const x = w * 0.1 + n * w * 0.008;
        const y = h * (n % 10 === 0 ? 0.79 : n % 5 === 0 ? 0.82 : 0.85);
        return <Line key={n} x1={x} y1={y} x2={x} y2={h * 0.91} stroke="#515C53" strokeWidth={0.55} />;
      })}
      {/* Rubber end caps */}
      {[0, w - w * 0.06].map((x) => (
        <G key={x}>
          <Rect x={x} y={0} width={w * 0.06} height={h} rx={h * 0.1} fill="url(#box-cap)" />
          {[0.018, 0.032, 0.046].map((dx) => <Line key={dx} x1={x + w * dx} x2={x + w * dx} y1={h * 0.2} y2={h * 0.84} stroke="#080B08" strokeWidth={2} opacity={0.7} />)}
        </G>
      ))}
      <Path d={`M ${w * 0.06} 3 H ${w * 0.94}`} stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
      {isLevel ? <Line x1={w * 0.09} x2={w * 0.91} y1={h - 1} y2={h - 1} stroke="#1FA84A" strokeWidth={3} /> : null}
    </Svg>
  );
}

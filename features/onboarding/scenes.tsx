import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type SceneVariant = 'finished' | 'rough';

export function BathroomScene({
  variant = 'finished',
  align = 'center',
}: {
  variant?: SceneVariant;
  align?: 'center' | 'right';
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 280"
        preserveAspectRatio={align === 'right' ? 'xMaxYMid slice' : 'xMidYMid slice'}
      >
        {variant === 'finished' ? <FinishedBathroom /> : <RoughBathroom />}
      </Svg>
    </View>
  );
}

function FinishedBathroom() {
  return (
    <>
      <Rect width="400" height="280" fill="#E8E0D5" />
      <Ellipse cx="78" cy="78" rx="110" ry="80" fill="#F6F1EA" />
      <Rect y="198" width="400" height="82" fill="#D5CCBF" />
      <Path
        d="M0 230H400M36 198V280M84 198V280M132 198V280M180 198V280M228 198V280M276 198V280M324 198V280M372 198V280"
        stroke="#CABBAC"
        strokeWidth="1.5"
      />
      <Rect x="28" y="32" width="92" height="76" rx="2" fill="#F7F4EF" />
      <Rect x="33" y="37" width="82" height="66" fill="#D3E3E8" />
      <Path d="M74 37V103M33 70H115" stroke="#F7F4EF" strokeWidth="3.5" />
      <Rect x="156" y="26" width="118" height="92" rx="2" fill="#F8F6F3" />
      <Rect x="163" y="33" width="104" height="78" fill="#C9D8DE" />
      <Rect x="163" y="33" width="28" height="78" fill="#D9E6EA" />
      <Rect x="22" y="162" width="118" height="46" rx="16" fill="#F7F8F7" />
      <Rect x="30" y="170" width="102" height="24" rx="12" fill="#E5EEEF" />
      <Rect x="148" y="146" width="150" height="58" rx="3" fill="#FBFBFA" />
      <Path d="M223 154V198" stroke="#E6E2DB" strokeWidth="2" />
      <Rect x="142" y="134" width="162" height="16" rx="3" fill="#F3F1EC" />
      <Ellipse cx="222" cy="142" rx="34" ry="9" fill="#E3E9EB" />
      <Rect x="214" y="118" width="16" height="5" rx="2" fill="#C5CAC7" />
      <Rect x="219" y="122" width="6" height="14" rx="2" fill="#C5CAC7" />
      <Rect x="156" y="118" width="8" height="18" rx="2" fill="#D5EBDD" />
      <Rect x="168" y="124" width="7" height="12" rx="1.5" fill="#E8D5C0" />
      <Rect x="312" y="20" width="76" height="182" fill="#E4F0F1" />
      <Rect x="312" y="20" width="5" height="182" fill="#F7F7F6" />
      <Circle cx="350" cy="46" r="7" fill="#D0D4D2" />
      <Rect x="347" y="52" width="3" height="18" rx="1" fill="#D0D4D2" />
      <Rect x="292" y="78" width="18" height="42" rx="3" fill="#E4CFC2" />
    </>
  );
}

function RoughBathroom() {
  return (
    <>
      <Rect width="400" height="280" fill="#D9D0C2" />
      <Rect x="16" y="18" width="150" height="100" fill="#CBBBA6" />
      <Rect x="190" y="36" width="100" height="78" fill="#E6D9C8" />
      <Rect x="48" y="24" width="9" height="168" fill="#C4A06E" />
      <Rect x="112" y="24" width="9" height="168" fill="#C4A06E" />
      <Rect x="48" y="70" width="73" height="7" fill="#C4A06E" />
      <Rect x="210" y="78" width="86" height="9" rx="4" fill="#B7BEBB" />
      <Rect x="210" y="78" width="9" height="58" rx="4" fill="#B7BEBB" />
      <Rect x="248" y="128" width="9" height="40" rx="4" fill="#C08A62" />
      <Rect y="188" width="400" height="92" fill="#C9BBA6" />
      <Rect x="150" y="132" width="130" height="64" fill="#B7A58C" />
      <Rect x="160" y="142" width="110" height="44" fill="#D2C4B0" />
      <Rect x="36" y="214" width="34" height="12" rx="1" fill="#B49A78" />
      <Rect x="280" y="220" width="26" height="10" fill="#A89074" />
    </>
  );
}

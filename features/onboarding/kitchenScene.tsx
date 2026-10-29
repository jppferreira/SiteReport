import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/** Illustrated kitchen used in onboarding before/after cards and the report preview. */
export function KitchenScene({ variant = 'after' }: { variant?: 'before' | 'after' }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice">
        {variant === 'after' ? <FinishedKitchen /> : <RoughKitchen />}
      </Svg>
    </View>
  );
}

function FinishedKitchen() {
  return (
    <>
      <Rect width="400" height="280" fill="#E7E0D4" />
      <Rect width="400" height="168" fill="#F4EFE6" />
      <Ellipse cx="70" cy="70" rx="90" ry="60" fill="#FBF8F3" />
      <Rect x="28" y="26" width="86" height="70" rx="2" fill="#F7F4EF" />
      <Rect x="34" y="32" width="74" height="58" fill="#C5D7E4" />
      <Path d="M71 32V90M34 61H108" stroke="#F7F4EF" strokeWidth="4" />
      <Rect x="132" y="16" width="248" height="78" rx="2" fill="#C4A36A" />
      <Rect x="140" y="24" width="72" height="62" fill="#D4B888" />
      <Rect x="220" y="24" width="72" height="62" fill="#D4B888" />
      <Rect x="300" y="24" width="72" height="62" fill="#D4B888" />
      <Rect x="168" y="52" width="18" height="3" rx="1.5" fill="#8C7352" />
      <Rect x="248" y="52" width="18" height="3" rx="1.5" fill="#8C7352" />
      <Rect x="328" y="52" width="18" height="3" rx="1.5" fill="#8C7352" />
      <Rect y="108" width="400" height="36" fill="#E6DDD0" />
      <Rect y="142" width="400" height="14" fill="#FBF9F6" />
      <Rect y="156" width="400" height="78" fill="#B8956A" />
      <Path d="M80 156V234M160 156V234M250 156V234M330 156V234" stroke="#C4A36A" strokeWidth="3" />
      <Rect x="28" y="186" width="22" height="3" rx="1.5" fill="#8C7352" />
      <Rect x="108" y="186" width="22" height="3" rx="1.5" fill="#8C7352" />
      <Rect x="196" y="186" width="22" height="3" rx="1.5" fill="#8C7352" />
      <Rect x="286" y="186" width="22" height="3" rx="1.5" fill="#8C7352" />
      <Rect x="168" y="164" width="54" height="28" rx="3" fill="#D5D8D6" />
      <Circle cx="195" cy="178" r="6" fill="#C5C8C6" />
      <Rect x="300" y="162" width="46" height="40" rx="2" fill="#2C2E2C" />
      <Rect x="306" y="168" width="34" height="16" fill="#3E4240" />
      <Rect y="234" width="400" height="46" fill="#D5C6B2" />
      <Path d="M0 250H400M40 234V280M120 234V280M200 234V280M280 234V280M360 234V280" stroke="#C4B39C" strokeWidth="2" />
      <Rect x="248" y="118" width="8" height="22" rx="2" fill="#8C7352" />
      <Circle cx="252" cy="116" r="5" fill="#7BAF8A" />
    </>
  );
}

function RoughKitchen() {
  return (
    <>
      <Rect width="400" height="280" fill="#D5CBBA" />
      <Rect width="400" height="196" fill="#DDD4C6" />
      <Rect x="18" y="0" width="12" height="196" fill="#C4A574" />
      <Rect x="78" y="0" width="12" height="196" fill="#C4A574" />
      <Rect x="148" y="0" width="12" height="196" fill="#C4A574" />
      <Rect x="230" y="0" width="12" height="196" fill="#C4A574" />
      <Rect x="310" y="0" width="12" height="196" fill="#C4A574" />
      <Rect x="18" y="78" width="142" height="10" fill="#C4A574" />
      <Rect x="230" y="96" width="92" height="10" fill="#C4A574" />
      <Rect x="100" y="16" width="120" height="70" fill="#E7DDD0" />
      <Rect x="250" y="28" width="78" height="58" fill="#B7C9D4" />
      <Rect x="250" y="28" width="6" height="58" fill="#C4A574" />
      <Rect x="322" y="28" width="6" height="58" fill="#C4A574" />
      <Rect x="250" y="54" width="78" height="6" fill="#C4A574" />
      <Rect x="36" y="140" width="70" height="8" rx="3" fill="#A8B0AC" />
      <Rect x="36" y="140" width="8" height="40" rx="3" fill="#A8B0AC" />
      <Rect x="200" y="150" width="90" height="36" fill="#C9B79A" />
      <Rect y="196" width="400" height="84" fill="#C9B89A" />
      <Path d="M0 214H400M50 196V280M130 196V280M210 196V280M290 196V280M370 196V280" stroke="#B7A588" strokeWidth="2" />
      <Rect x="300" y="214" width="36" height="14" rx="1" fill="#B49A78" />
      <Rect x="70" y="228" width="28" height="10" fill="#A89074" />
    </>
  );
}

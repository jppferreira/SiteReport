import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { LevelToolView } from '@/features/levelTool';

/** Standalone spirit level from the Toolbox tab — no job required. */
export default function ToolboxLevelScreen() {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/toolbox'));

  return (
    <>
      <StatusBar style="light" />
      <LevelToolView active onClose={close} />
    </>
  );
}

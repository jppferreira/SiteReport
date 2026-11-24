import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { PhotosToolsScreen } from '@/features/jobs/guidedChecklist';

export default function GuidedPhotosToolsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PhotosToolsScreen jobId={id} />;
}

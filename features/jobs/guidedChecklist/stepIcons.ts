import { Ionicons } from '@expo/vector-icons';

import { GuidedStepId } from './guidedSteps';

export function iconForStep(id: GuidedStepId): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'details':
      return 'document-text-outline';
    case 'photos':
      return 'camera-outline';
    case 'measure':
      return 'resize-outline';
    case 'level':
      return 'phone-landscape-outline';
    case 'notes':
      return 'mic-outline';
    case 'checklist':
      return 'checkbox-outline';
    case 'signature':
      return 'create-outline';
    default:
      return 'ellipse-outline';
  }
}

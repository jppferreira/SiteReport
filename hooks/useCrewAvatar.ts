import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  compositionFromLegacyAvatarId,
  DEFAULT_CREW_AVATAR_COMPOSITION,
  normalizeCrewAvatarComposition,
  type CrewAvatarComposition,
} from '@/models';
import { getPreferences, savePreferences } from '@/services/preferencesService';

/** DIY crew avatar composition + patch setter. Reloads on focus. */
export function useCrewAvatar(): [
  CrewAvatarComposition,
  (patch: Partial<CrewAvatarComposition>) => void,
] {
  const [composition, setComposition] = useState<CrewAvatarComposition>(
    DEFAULT_CREW_AVATAR_COMPOSITION
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPreferences().then((preferences) => {
        if (!active) return;
        if (preferences.crewAvatarComposition) {
          setComposition(normalizeCrewAvatarComposition(preferences.crewAvatarComposition));
          return;
        }
        const migrated = compositionFromLegacyAvatarId(preferences.crewAvatarId);
        setComposition(migrated);
        void savePreferences({ crewAvatarComposition: migrated });
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const update = useCallback((patch: Partial<CrewAvatarComposition>) => {
    setComposition((current) => {
      const next = normalizeCrewAvatarComposition({ ...current, ...patch });
      void savePreferences({ crewAvatarComposition: next });
      return next;
    });
  }, []);

  return [composition, update];
}

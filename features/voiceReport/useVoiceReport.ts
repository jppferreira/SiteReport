import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  VoiceReportController,
  type VoiceFieldFill,
  type VoiceFieldSnapshot,
  type VoiceReportSession,
} from '@/services/voiceReport';

export function useVoiceReport() {
  const controllerRef = useRef<VoiceReportController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new VoiceReportController();
  }
  const controller = controllerRef.current;

  const [session, setSession] = useState<VoiceReportSession | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return controller.subscribe(setSession);
  }, [controller]);

  useEffect(() => {
    return () => {
      void controller.close();
    };
  }, [controller]);

  const open = useCallback(
    async (previousFields: VoiceFieldSnapshot) => {
      setVisible(true);
      await controller.open(previousFields);
    },
    [controller]
  );

  const close = useCallback(async () => {
    await controller.cancel();
    await controller.close();
    setVisible(false);
    setSession(null);
  }, [controller]);

  const api = useMemo(
    () => ({
      visible,
      session,
      open,
      close,
      getSession: () => controller.getSession(),
      startRecording: () => controller.startRecording(),
      pauseRecording: () => controller.pauseRecording(),
      resumeRecording: () => controller.resumeRecording(),
      stopAndTranscribe: () => controller.stopAndTranscribe(),
      makeProfessional: () => controller.makeProfessional(),
      setTranscript: (value: string) => controller.setTranscript(value),
      recordAgain: () => controller.recordAgain(),
      approve: (which: 'transcript' | 'professional', mode?: 'replace' | 'append'): VoiceFieldFill | null =>
        controller.approve(which, mode),
      cancel: () => controller.cancel(),
    }),
    [visible, session, open, close, controller]
  );

  return api;
}

export type ReportPreviewEditAction = 'cover' | 'photo' | 'annotate';

export type ReportPreviewEditEvent = {
  action: ReportPreviewEditAction;
  photoId: string;
};

export function parsePreviewEditMessage(raw: unknown): ReportPreviewEditEvent | null {
  try {
    const payload = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
      type?: string;
      action?: string;
      photoId?: string;
    };
    if (payload.type !== 'preview-edit') return null;
    if (payload.action !== 'cover' && payload.action !== 'photo' && payload.action !== 'annotate') {
      return null;
    }
    return { action: payload.action, photoId: typeof payload.photoId === 'string' ? payload.photoId : '' };
  } catch {
    return null;
  }
}

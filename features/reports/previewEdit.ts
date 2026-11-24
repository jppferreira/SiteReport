export type ReportPreviewEditAction = 'cover' | 'photo' | 'annotate' | 'text';

export type ReportPreviewTextField =
  | 'title'
  | 'customer'
  | 'address'
  | 'work'
  | 'materials'
  | 'recommendations'
  | 'description';

export type ReportPreviewEditEvent = {
  action: ReportPreviewEditAction;
  photoId: string;
  /** Present when `action` is `text`. */
  field: ReportPreviewTextField | '';
};

const TEXT_FIELDS: ReportPreviewTextField[] = [
  'title',
  'customer',
  'address',
  'work',
  'materials',
  'recommendations',
  'description',
];

export function isPreviewTextField(value: unknown): value is ReportPreviewTextField {
  return typeof value === 'string' && (TEXT_FIELDS as string[]).includes(value);
}

export function parsePreviewEditMessage(raw: unknown): ReportPreviewEditEvent | null {
  try {
    const payload = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
      type?: string;
      action?: string;
      photoId?: string;
      field?: string;
    };
    if (payload.type !== 'preview-edit') return null;
    if (
      payload.action !== 'cover' &&
      payload.action !== 'photo' &&
      payload.action !== 'annotate' &&
      payload.action !== 'text'
    ) {
      return null;
    }
    const field =
      payload.action === 'text' && isPreviewTextField(payload.field) ? payload.field : '';
    return {
      action: payload.action,
      photoId: typeof payload.photoId === 'string' ? payload.photoId : '',
      field,
    };
  } catch {
    return null;
  }
}

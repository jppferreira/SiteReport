import { parsePreviewEditMessage } from './previewEdit';

describe('parsePreviewEditMessage', () => {
  it('reads cover, photo, annotate and text actions from the WebView payload', () => {
    expect(parsePreviewEditMessage('{"type":"preview-edit","action":"cover","photoId":""}')).toEqual({
      action: 'cover',
      photoId: '',
      field: '',
    });
    expect(parsePreviewEditMessage('{"type":"preview-edit","action":"photo","photoId":"abc"}')).toEqual({
      action: 'photo',
      photoId: 'abc',
      field: '',
    });
    expect(parsePreviewEditMessage({ type: 'preview-edit', action: 'annotate', photoId: 'n1' })).toEqual({
      action: 'annotate',
      photoId: 'n1',
      field: '',
    });
    expect(
      parsePreviewEditMessage({
        type: 'preview-edit',
        action: 'text',
        photoId: '',
        field: 'work',
      })
    ).toEqual({
      action: 'text',
      photoId: '',
      field: 'work',
    });
  });

  it('ignores unrelated or malformed messages', () => {
    expect(parsePreviewEditMessage('{"type":"other"}')).toBeNull();
    expect(parsePreviewEditMessage('{"type":"preview-edit","action":"nope"}')).toBeNull();
    expect(parsePreviewEditMessage('not-json')).toBeNull();
    expect(
      parsePreviewEditMessage({ type: 'preview-edit', action: 'text', field: 'not-a-field' })
    ).toEqual({
      action: 'text',
      photoId: '',
      field: '',
    });
  });
});

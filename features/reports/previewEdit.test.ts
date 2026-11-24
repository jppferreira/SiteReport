import { parsePreviewEditMessage } from './previewEdit';

describe('parsePreviewEditMessage', () => {
  it('reads cover, photo and annotate actions from the WebView payload', () => {
    expect(parsePreviewEditMessage('{"type":"preview-edit","action":"cover","photoId":""}')).toEqual({
      action: 'cover',
      photoId: '',
    });
    expect(parsePreviewEditMessage('{"type":"preview-edit","action":"photo","photoId":"abc"}')).toEqual({
      action: 'photo',
      photoId: 'abc',
    });
    expect(parsePreviewEditMessage({ type: 'preview-edit', action: 'annotate', photoId: 'n1' })).toEqual({
      action: 'annotate',
      photoId: 'n1',
    });
  });

  it('ignores unrelated or malformed messages', () => {
    expect(parsePreviewEditMessage('{"type":"other"}')).toBeNull();
    expect(parsePreviewEditMessage('{"type":"preview-edit","action":"nope"}')).toBeNull();
    expect(parsePreviewEditMessage('not-json')).toBeNull();
  });
});

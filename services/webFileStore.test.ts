import { createFileStore, MemoryFileBackend } from './webFileStore';

describe('web file store', () => {
  function store() {
    return createFileStore(new MemoryFileBackend());
  }

  it('writes and reads text without a network', async () => {
    const files = store();
    await files.writeString('sitereport/jobs/a/notes.txt', 'Boiler serviced', 'utf8');
    expect(await files.readString('sitereport/jobs/a/notes.txt', 'utf8')).toBe('Boiler serviced');
  });

  it('round-trips binary files as base64', async () => {
    const files = store();
    const encoded = btoa('photo-bytes');
    await files.writeString('sitereport/jobs/a/photos/one.jpg', encoded, 'base64');
    expect(await files.readString('sitereport/jobs/a/photos/one.jpg', 'base64')).toBe(encoded);
    expect(await files.readString('sitereport/jobs/a/photos/one.jpg', 'utf8')).toBe('photo-bytes');
  });

  it('lists a directory and deletes everything inside it', async () => {
    const files = store();
    await files.writeString('sitereport/jobs/a/photos/one.jpg', 'one', 'utf8');
    await files.writeString('sitereport/jobs/a/photos/two.jpg', 'two', 'utf8');

    const info = await files.getInfo('sitereport/jobs/a/photos');
    expect(info.exists).toBe(true);
    expect(info.isDirectory).toBe(true);

    expect((await files.readDirectory('sitereport/jobs/a/photos')).sort()).toEqual(['one.jpg', 'two.jpg']);

    await files.remove('sitereport/jobs/a');
    expect((await files.getInfo('sitereport/jobs/a/photos/one.jpg')).exists).toBe(false);
  });

  it('copies a data URI into local storage', async () => {
    const files = store();
    const dataUri = `data:image/png;base64,${btoa('logo')}`;
    await files.copy(dataUri, 'sitereport/business/logo.png');
    expect(await files.readString('sitereport/business/logo.png', 'utf8')).toBe('logo');
    const info = await files.getInfo('sitereport/business/logo.png');
    expect(info.exists).toBe(true);
    expect(info.isDirectory).toBe(false);
    expect(info.size).toBe(4);
  });
});

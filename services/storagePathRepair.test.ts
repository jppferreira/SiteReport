import { resolveSitereportUri } from '@/services/backup/paths';

/**
 * Launch remapping is exercised via resolveSitereportUri (see paths.test.ts).
 * This file locks the contract storagePathRepair depends on for RC smoke:
 * stale absolute file:// under …/Documents/sitereport/… remaps to current docs.
 */
describe('storagePathRepair URI remap contract', () => {
  const docs = 'file:///var/mobile/Containers/Data/Application/NEW-UUID/Documents/';

  it('remaps stale photo and pdf absolute URIs onto the new container', () => {
    const stalePhoto =
      'file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/sitereport/jobs/j1/photos/a.jpg';
    const stalePdf =
      'file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/sitereport/jobs/j1/reports/r.pdf';

    expect(resolveSitereportUri(stalePhoto, docs)).toBe(
      `${docs}sitereport/jobs/j1/photos/a.jpg`
    );
    expect(resolveSitereportUri(stalePdf, docs)).toBe(
      `${docs}sitereport/jobs/j1/reports/r.pdf`
    );
  });

  it('leaves non-sitereport absolute URIs unchanged', () => {
    expect(resolveSitereportUri('file:///cache/tmp.jpg', docs)).toBe('file:///cache/tmp.jpg');
  });
});

import { bytesToBase64, fileUriReadCandidates } from './fileUri';

describe('fileUriReadCandidates', () => {
  const scoped =
    'file:///data/user/0/host.exp.exponent/files/ExperienceData/%2540anonymous%252Fsitereport-id/sitereport/jobs/job/photos/a.jpg';

  it('tries the stored URI, peeled encodings, and one more encoding', () => {
    const peeled = scoped.replace(/%25/g, '%');
    expect(fileUriReadCandidates(scoped)).toEqual([
      scoped,
      peeled,
      scoped.replace(/%/g, '%25'),
    ]);
  });

  it('peels nested encodings shown in Android error messages', () => {
    const triple =
      'file:///data/user/0/host.exp.exponent/files/ExperienceData/%252540anonymous%25252Fsitereport-id/sitereport/jobs/job/reports/a.pdf';
    expect(fileUriReadCandidates(triple)).toEqual([
      triple,
      'file:///data/user/0/host.exp.exponent/files/ExperienceData/%2540anonymous%252Fsitereport-id/sitereport/jobs/job/reports/a.pdf',
      'file:///data/user/0/host.exp.exponent/files/ExperienceData/%40anonymous%2Fsitereport-id/sitereport/jobs/job/reports/a.pdf',
      triple.replace(/%/g, '%25'),
    ]);
  });

  it('leaves an ordinary file URI alone', () => {
    const uri = 'file:///data/user/0/com.tradesreport.app/files/sitereport/a.jpg';
    expect(fileUriReadCandidates(uri)).toEqual([uri]);
  });
});

describe('bytesToBase64', () => {
  it('encodes bytes the same way btoa does', () => {
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=');
  });
});

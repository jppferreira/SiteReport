import { jobMeasurementsFromPhotos } from './jobMeasurementsFromPhotos';

describe('jobMeasurementsFromPhotos', () => {
  it('parses named table lines from AR captions', () => {
    const options = jobMeasurementsFromPhotos([
      {
        id: 'p1',
        caption: 'Hall door\nWidth: 760 mm\nHeight: 2040 mm',
      },
    ]);
    expect(options).toEqual([
      { id: 'p1-0', name: 'Width', label: '760 mm' },
      { id: 'p1-1', name: 'Height', label: '2040 mm' },
    ]);
  });

  it('parses title — length captions', () => {
    const options = jobMeasurementsFromPhotos([
      { id: 'p2', caption: 'Worktop overhang — 40 mm' },
    ]);
    expect(options).toEqual([{ id: 'p2-0', name: 'Worktop overhang', label: '40 mm' }]);
  });

  it('dedupes identical rows', () => {
    const options = jobMeasurementsFromPhotos([
      { id: 'a', caption: 'Width: 900 mm' },
      { id: 'b', caption: 'Width: 900 mm' },
    ]);
    expect(options).toHaveLength(1);
  });
});

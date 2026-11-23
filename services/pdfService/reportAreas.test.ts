import { groupReportPhotos } from './reportAreas';
import { ReportPhotoData } from './types';

function photo(id: string, type: 'before' | 'after', areaId: string | null, sortOrder: number): ReportPhotoData & {
  type: 'before' | 'after';
  areaId: string | null;
  sortOrder: number;
} {
  return {
    id,
    dataUri: `data:image/jpeg;base64,${id}`,
    caption: null,
    width: 800,
    height: 600,
    type,
    areaId,
    sortOrder,
  };
}

const kitchen = { id: 'kitchen', name: 'Kitchen', sortOrder: 0 };
const bathroom = { id: 'bathroom', name: 'Bathroom', sortOrder: 1 };

describe('groupReportPhotos', () => {
  it('keeps a job with no sections on the original layout', () => {
    expect(groupReportPhotos([], [photo('a', 'before', null, 0)])).toBeUndefined();
  });

  it('keeps the original layout until a photo is placed in a section', () => {
    expect(groupReportPhotos([kitchen], [photo('a', 'before', null, 0)])).toBeUndefined();
  });

  it('orders sections and keeps before and after photos inside each one', () => {
    const groups = groupReportPhotos(
      [bathroom, kitchen],
      [
        photo('bath-after', 'after', 'bathroom', 0),
        photo('kitchen-before', 'before', 'kitchen', 1),
        photo('kitchen-after', 'after', 'kitchen', 0),
        photo('kitchen-before-2', 'before', 'kitchen', 0),
      ]
    );

    expect(groups?.map((group) => group.name)).toEqual(['Kitchen', 'Bathroom']);
    expect(groups?.[0]?.before.map((item) => item.id)).toEqual(['kitchen-before-2', 'kitchen-before']);
    expect(groups?.[0]?.after.map((item) => item.id)).toEqual(['kitchen-after']);
    expect(groups?.[1]?.after.map((item) => item.id)).toEqual(['bath-after']);
  });

  it('puts photos that cover the whole job after the named sections', () => {
    const groups = groupReportPhotos(
      [kitchen],
      [photo('loose', 'before', null, 0), photo('kitchen-before', 'before', 'kitchen', 0)]
    );

    expect(groups?.map((group) => group.name)).toEqual(['Kitchen', 'Other photos']);
    expect(groups?.[1]?.before.map((item) => item.id)).toEqual(['loose']);
  });

  it('skips a section that has no photos', () => {
    const groups = groupReportPhotos(
      [kitchen, bathroom],
      [photo('bath-before', 'before', 'bathroom', 0)]
    );
    expect(groups?.map((group) => group.name)).toEqual(['Bathroom']);
  });

  it('keeps annotation markup and notes when photos are grouped by section', () => {
    const annotated = {
      ...photo('kitchen-before', 'before', 'kitchen', 0),
      annotations: {
        version: 1 as const,
        shapes: [{ kind: 'callout' as const, color: '#FF5A36' as const, at: { x: 0.4, y: 0.3 }, note: 'Leak' }],
      },
    };
    const groups = groupReportPhotos([kitchen], [annotated]);
    expect(groups?.[0]?.before[0]?.annotations?.shapes).toEqual(annotated.annotations.shapes);
  });
});

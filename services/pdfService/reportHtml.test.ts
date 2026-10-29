import { COVER_DESIGN_IDS, imageMaskClipPath, normalizeReportTemplateId, ReportTemplateId } from '@/models';
import { formatTakenAt } from '@/services/photoTakenAt';

import { DEFAULT_COVER_SCENE, DEFAULT_THANKS_SCENE } from './defaultScenes';
import { buildReportHtml, buildReportPreviewHtml, prepareAndroidPrintHtml } from './reportHtml';
import { ReportHtmlInput } from './types';

function photo(id: string, caption: string): ReportHtmlInput['before'][number] {
  return {
    id,
    dataUri: `data:image/jpeg;base64,${id}`,
    caption,
    width: 800,
    height: 600,
  };
}

function sample(template: ReportHtmlInput['template'], extras?: Partial<ReportHtmlInput>): ReportHtmlInput {
  return {
    business: {
      name: 'Northside Plumbing',
      logoDataUri: null,
      email: 'hello@example.com',
      phone: '07700 900 000',
      website: 'https://northside.example',
      address: '1 Yard Lane',
      registrationNumber: null,
      vatNumber: null,
      accentColor: '#1FA84A',
      footerMessage: 'Thank you',
    },
    job: {
      title: 'Boiler service',
      referenceNumber: 'A-12',
      jobDate: '2026-10-04',
      customerName: 'James Wilson',
      address: '14 Oak Street',
      description: 'Annual service',
      status: 'complete',
    },
    before: [photo('before-1', 'Old boiler')],
    after: [photo('after-1', 'New boiler')],
    workCompleted: 'Replaced the valve',
    materials: '15mm valve',
    recommendations: null,
    pricing: null,
    signature: null,
    generatedAt: '2026-10-04T09:00:00.000Z',
    template,
    ...extras,
  };
}

function withManyPhotos(template: ReportTemplateId): ReportHtmlInput {
  return sample(template, {
    before: [photo('before-1', 'Old boiler'), photo('before-2', 'Pipework'), photo('before-3', 'Tank')],
    after: [photo('after-1', 'New boiler'), photo('after-2', 'Finished pipework')],
  });
}

describe('buildReportHtml', () => {
  it('sets the modern layout as a letterhead with the summary before the photos', () => {
    const html = buildReportHtml(sample('modern'));
    expect(html).toContain('data-template="modern"');
    expect(html).toContain('class="display"');
    expect(html).toContain('class="meta-card"');
    expect(html).toContain('Completed');
    expect(html.indexOf('section-work')).toBeLessThan(html.indexOf('section-before'));
    expect(html).toContain('data-photo-count="2"');
  });

  it('leads the image layout with a dark cover, then large photos', () => {
    const html = buildReportHtml(sample('image'));
    expect(html).toContain('class="template-image ');
    expect(html).toContain('class="hero"');
    expect(html).not.toContain('class="hero-photo"');
    expect(html).toContain('Professional proof of every job.');
    expect(html.indexOf('section-overview')).toBeLessThan(html.indexOf('section-before'));
    expect(html.indexOf('section-before')).toBeLessThan(html.indexOf('section-work'));
  });

  it('places a saved cover photo behind the image layout cover', () => {
    const html = buildReportHtml(sample('image', { coverDataUri: 'data:image/jpeg;base64,cover' }));
    expect(html).toContain('class="hero-photo"');
    expect(html).toContain('src="data:image/jpeg;base64,cover"');
    expect(html.indexOf('class="hero-photo"')).toBeLessThan(html.indexOf('class="hero-title"'));
  });

  it('numbers the side layout and keeps the customer in the rail', () => {
    const html = buildReportHtml(sample('side'));
    expect(html).toContain('class="template-side ');
    expect(html).toContain('class="rail"');
    expect(html).toContain('>1<');
    expect(html).toContain('Before &amp; after photos');
    expect(html.indexOf('section-work')).toBeLessThan(html.indexOf('section-before'));
  });

  it('uses cards for the customer, date and reference', () => {
    const html = buildReportHtml(sample('cards'));
    expect(html).toContain('data-template="cards"');
    expect(html).toContain('class="info-cards"');
    expect(html).toContain('Work completed');
    expect(html.indexOf('section-before')).toBeLessThan(html.indexOf('section-work'));
  });

  it('labels before and after columns on the minimal layout', () => {
    const html = buildReportHtml(sample('minimal'));
    expect(html).toContain('data-template="minimal"');
    expect(html).toContain('class="col-label"');
    expect(html).toContain('>Before<');
    expect(html).toContain('>After<');
    expect(html.indexOf('section-before')).toBeLessThan(html.indexOf('section-work'));
  });

  it('puts every photo in a strip under the dark header', () => {
    const html = buildReportHtml(sample('dark'));
    expect(html).toContain('class="dark-head"');
    expect(html).toContain('class="filmstrip few"');
    expect(html).toContain('class="trio"');
    expect(html.indexOf('section-work')).toBeLessThan(html.indexOf('section-before'));
  });

  it('includes every before and after photo on each layout', () => {
    const templates: ReportTemplateId[] = ['trade', 'modern', 'image', 'side', 'cards', 'minimal', 'dark'];
    for (const template of templates) {
      const html = buildReportHtml(withManyPhotos(template));
      expect(html).toContain(`data-template="${template}"`);
      expect(html).toContain('data-photo-count="5"');
      expect(html).toContain('before-1');
      expect(html).toContain('before-2');
      expect(html).toContain('before-3');
      expect(html).toContain('after-1');
      expect(html).toContain('after-2');
    }
  });

  it('prints each section above that section’s before and after photos', () => {
    const areas = [
      { name: 'Kitchen', before: [photo('kitchen-before', 'Old units')], after: [photo('kitchen-after', 'New units')] },
      { name: 'Bath & shower', before: [photo('bath-before', 'Old suite')], after: [photo('bath-after', 'New suite')] },
    ];
    for (const template of ['trade', 'modern', 'minimal', 'dark'] as const) {
      const html = buildReportHtml(sample(template, { areas }));
      expect(html.indexOf('area-title">Kitchen')).toBeLessThan(html.indexOf('kitchen-before'));
      expect(html.indexOf('kitchen-after')).toBeLessThan(html.indexOf('Bath &amp; shower'));
      expect(html.indexOf('Bath &amp; shower')).toBeLessThan(html.indexOf('bath-before'));
    }
  });

  it('leaves a job without sections as one before and after set', () => {
    const html = buildReportHtml(sample('modern'));
    expect(html).not.toContain('class="area-title"');
    expect(html).toContain('class="compare"');
  });

  it('turns a materials list into bullets', () => {
    const html = buildReportHtml(
      sample('modern', { materials: 'Vanity unit\nWalk-in shower\nWall tiles' })
    );
    expect(html).toContain('<ul class="bullets">');
    expect(html).toContain('<li>Walk-in shower</li>');
    expect(html).toContain('<li>Wall tiles</li>');
  });

  it('drops an invalid accent colour instead of injecting it into the stylesheet', () => {
    const html = buildReportHtml(
      sample('modern', {
        business: { ...sample('modern').business, accentColor: 'red; } body { background: url(https://evil.example) }' },
      })
    );
    expect(html).not.toContain('evil.example');
    expect(html).toContain('rgb(31, 168, 74)');
  });

  it('keeps photos and colours intact in the Android print document', () => {
    const html = buildReportHtml(
      sample('dark', {
        job: { ...sample('dark').job, title: 'Flat #4' },
        signature: {
          svgMarkup: '<svg xmlns="http://www.w3.org/2000/svg"><path stroke="#101310" d="M0 0"/></svg>',
          customerName: 'Ada',
          signedAt: '2026-10-04T09:00:00.000Z',
        },
      })
    );
    expect(html).toContain('rgb(18, 22, 20)');
    expect(html).toContain('stroke="rgb(16, 19, 16)"');
    expect(html).toContain('width="800"');
    const printable = prepareAndroidPrintHtml(html);
    expect(printable).not.toContain('#');
    expect(printable).not.toContain('%23');
    expect(printable).toContain('Flat &num;4');
    expect(printable).toContain('data:image/jpeg;base64,before-1');
    expect(printable).toContain('data:image/jpeg;base64,after-1');
    expect(printable).toContain('class="dark-head"');
    expect(printable).toContain('class="filmstrip');
  });

  it('prints a pricing reference when it is included, and leaves it off otherwise', () => {
    const pricing = {
      enabled: true,
      lines: [
        { id: 'tiles', description: 'Wall tiles', category: 'materials' as const, amount: '240' },
        { id: 'fit', description: 'Two days on site', category: 'labour' as const, amount: '360.50' },
      ],
    };
    const signature = {
      svgMarkup: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      customerName: 'Ada',
      signedAt: '2026-10-04T09:00:00.000Z',
    };
    const templates: ReportTemplateId[] = ['trade', 'modern', 'image', 'side', 'cards', 'minimal', 'dark'];
    for (const template of templates) {
      const html = buildReportHtml(sample(template, { pricing, signature }));
      const body = html.split('</style>').pop() ?? html;
      expect(body).toContain('class="block section-pricing"');
      expect(body).toContain('This is not an invoice.');
      expect(body).toContain('Wall tiles');
      expect(body).toContain('£360.50');
      expect(body).toContain('£600.50');
      expect(body.indexOf('section-pricing')).toBeLessThan(body.indexOf('section-signature'));
    }

    const hidden = buildReportHtml(sample('modern', { pricing: { ...pricing, enabled: false } }));
    expect(hidden).not.toContain('class="block section-pricing"');
    expect(hidden).not.toContain('Wall tiles');
    expect(hidden).not.toContain('£600.50');
  });

  it('maps older layout ids onto the current set', () => {
    expect(normalizeReportTemplateId('classic')).toBe('modern');
    expect(normalizeReportTemplateId('gallery')).toBe('image');
    expect(normalizeReportTemplateId('compact')).toBe('cards');
    expect(normalizeReportTemplateId('formal')).toBe('minimal');
    expect(normalizeReportTemplateId('nope')).toBe('modern');
  });

  it('keeps the plain layouts to a single page and gives the Pro layouts a cover and a thank-you page', () => {
    for (const template of ['modern', 'minimal', 'cards'] as const) {
      const html = buildReportHtml(sample(template));
      expect(html).toContain('data-tier="basic"');
      expect(html).toContain('sheet-basic');
      expect(html).not.toContain('class="sheet-cover"');
      expect(html).not.toContain('class="sheet-close"');
    }
    const templates: ReportTemplateId[] = ['trade', 'image', 'side', 'dark'];
    for (const template of templates) {
      const html = buildReportHtml(sample(template));
      expect(html).toContain(`data-template="${template}"`);
      expect(html).toContain('data-tier="pro"');
      expect(html).toContain('class="sheet-cover"');
      expect(html).toContain('class="sheet-close"');
      expect(html).toContain('Trade report');
      expect(html).toContain('For choosing Northside Plumbing');
      expect(html.indexOf('class="sheet-cover"')).toBeLessThan(html.indexOf('sheet-body">'));
      expect(html.indexOf('sheet-body">')).toBeLessThan(html.indexOf('class="sheet-close"'));
      const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
      const close = html.slice(html.indexOf('class="sheet-close"'));
      expect(cover).toContain('class="cover-photo"');
      expect(cover).toContain(DEFAULT_COVER_SCENE);
      expect(cover).not.toContain('after-1');
      expect(close).toContain('class="close-photo"');
      expect(close).toContain(DEFAULT_THANKS_SCENE);
    }
  });

  it('uses a saved cover photo, and the owner name as who prepared it', () => {
    const html = buildReportHtml(
      sample('trade', {
        coverDataUri: 'data:image/jpeg;base64,cover',
        business: { ...sample('trade').business, ownerName: 'Daniel Carter' },
      })
    );
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    const close = html.slice(html.indexOf('class="sheet-close"'));
    expect(cover).toContain('src="data:image/jpeg;base64,cover"');
    expect(cover).not.toContain(DEFAULT_COVER_SCENE);
    expect(close).toContain('src="data:image/jpeg;base64,cover"');
    expect(close).not.toContain(DEFAULT_THANKS_SCENE);
    expect(cover).toContain('Daniel Carter');
  });

  it('uses a branding cover when the job has no saved cover photo', () => {
    const html = buildReportHtml(sample('image', { brandCoverDataUri: 'data:image/jpeg;base64,brand' }));
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    const close = html.slice(html.indexOf('class="sheet-close"'));
    expect(cover).toContain('src="data:image/jpeg;base64,brand"');
    expect(cover).not.toContain(DEFAULT_COVER_SCENE);
    expect(close).toContain(DEFAULT_THANKS_SCENE);
  });

  it('keeps a job cover photo ahead of the branding cover', () => {
    const html = buildReportHtml(
      sample('image', {
        coverDataUri: 'data:image/jpeg;base64,job',
        brandCoverDataUri: 'data:image/jpeg;base64,brand',
      })
    );
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    expect(cover).toContain('src="data:image/jpeg;base64,job"');
    expect(cover).not.toContain('base64,brand');
    expect(html).toContain('class="hero-photo"');
    expect(html).toContain('src="data:image/jpeg;base64,job"');
  });

  it('lays the thank-you photo to the bottom with the contacts on a gradient', () => {
    const html = buildReportHtml(sample('trade'));
    const close = html.slice(html.indexOf('class="sheet-close"'));
    expect(close).toContain('class="close-shade"');
    expect(close).toContain('class="close-overlay"');
    expect(close.indexOf('class="close-photo"')).toBeLessThan(close.indexOf('class="close-shade"'));
    expect(close.indexOf('class="close-shade"')).toBeLessThan(close.indexOf('class="close-overlay"'));
    const overlay = close.slice(close.indexOf('class="close-overlay"'));
    expect(overlay).toContain('Call us');
    expect(overlay).toContain('class="close-end"');
    expect(html).toContain('data-cover="editorial"');
  });

  it('uses a branding thank-you image ahead of the job cover', () => {
    const html = buildReportHtml(
      sample('trade', {
        coverDataUri: 'data:image/jpeg;base64,cover',
        brandThanksDataUri: 'data:image/jpeg;base64,thanks',
      })
    );
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    const close = html.slice(html.indexOf('class="sheet-close"'));
    expect(cover).toContain('src="data:image/jpeg;base64,cover"');
    expect(cover).not.toContain('base64,thanks');
    expect(close).toContain('src="data:image/jpeg;base64,thanks"');
    expect(close).not.toContain('base64,cover');
  });

  it('cuts the cover and thank-you photos with the chosen mask', () => {
    const html = buildReportHtml(sample('trade', { imageMask: 'diagonal' }));
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    const close = html.slice(html.indexOf('class="sheet-close"'));
    expect(cover).toContain(`clip-path:${imageMaskClipPath('diagonal', 'band')}`);
    expect(close).toContain(`clip-path:${imageMaskClipPath('diagonal', 'bleed')}`);
    expect(buildReportHtml(sample('modern'))).not.toContain('clip-path');
  });

  it('renders each cover design around the same photo and still closes with a thank-you page', () => {
    for (const design of COVER_DESIGN_IDS) {
      const html = buildReportHtml(
        sample('trade', { coverDesign: design, coverDataUri: 'data:image/jpeg;base64,cover' })
      );
      const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
      expect(cover).toContain(`data-cover="${design}"`);
      expect(cover).toContain('class="cover-photo"');
      expect(cover).toContain('src="data:image/jpeg;base64,cover"');
      expect(cover.replace(/<br\s*\/?>/g, ' ')).toContain('Trade report');
      expect(cover).toContain('James Wilson');
      expect(html).toContain('class="close-shade"');
    }
    expect(buildReportHtml(sample('trade', { coverDesign: 'bleed' }))).toContain('class="bleed-shade"');
    expect(buildReportHtml(sample('trade', { coverDesign: 'split', imageMask: 'peak' }))).toContain(
      `clip-path:${imageMaskClipPath('peak', 'side')}`
    );
    expect(buildReportHtml(sample('trade', { coverDesign: 'poster', imageMask: 'arch' }))).toContain('class="poster-title"');
    expect(buildReportHtml(sample('trade', { coverDesign: 'poster', imageMask: 'arch' }))).toContain(
      `clip-path:${imageMaskClipPath('arch', 'panel')}`
    );
  });

  it('uses the built-in interior when the job has no photos and no cover', () => {
    const html = buildReportHtml(sample('trade', { before: [], after: [] }));
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    expect(cover).toContain(DEFAULT_COVER_SCENE);
    expect(html).not.toContain('class="cover-fallback"');
  });

  it('lays the trade pack out as numbered pages, stacked photos and sign-off', () => {
    const html = buildReportHtml(sample('trade'));
    expect(html).toContain('data-template="trade"');
    expect(html).toContain('Project overview');
    expect(html).toContain('Scope of work');
    expect(html).toContain('class="checks"');
    expect(html).toContain('Before images');
    expect(html).toContain('After images');
    expect(html).toContain('class="trade-bar"');
    expect(html).toContain('Details and materials');
    expect(html).toContain('Client sign-off');
    expect(html).toContain('Company sign-off');
    expect(html.indexOf('Before images')).toBeLessThan(html.indexOf('After images'));
    expect(html.indexOf('After images')).toBeLessThan(html.indexOf('Client sign-off'));
    expect(html.indexOf('Client sign-off')).toBeLessThan(html.indexOf('Company sign-off'));
    const company = html.slice(html.indexOf('Company sign-off'));
    expect(company).toContain('class="sign-pad company-sign"');
    expect(company).toContain('Supervisor');
    expect(company).toContain('<svg');
    expect(html).toContain('trade-page trade-next');
  });

  it('locks in-app preview pages to A4 frames without changing the print template', () => {
    const html = buildReportPreviewHtml(sample('image'));
    expect(html).toContain('id="preview-screen"');
    expect(html).toContain('data-template="image"');
    expect(html).toContain('width=device-width');
    expect(html).toContain('aspect-ratio: 210 / 297');
    expect(html).toContain('height: 297mm');
    expect(html).toContain('if (!w || !view) return');
    expect(html).toContain('paginateAll');
    expect(buildReportHtml(sample('image'))).not.toContain('id="preview-screen"');
  });

  it('treats trade pack articles as the A4 preview pages', () => {
    const html = buildReportPreviewHtml(sample('trade'));
    expect(html).toContain('body[data-template="trade"] .trade-page');
    expect(html).toContain('body[data-template="trade"] .sheet-body');
  });

  it('prints the job date as the local calendar day on Android', () => {
    const html = buildReportHtml(
      sample('modern', {
        job: { ...sample('modern').job, jobDate: '2026-01-15' },
        generatedAt: '2026-06-01T12:00:00.000Z',
      })
    );
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(2026, 0, 15));
    expect(html).toContain(formatted);
    expect(html).not.toContain('14 Jan 2026');
    expect(prepareAndroidPrintHtml(html)).toContain(formatted);
  });

  it('prints the capture time under the photo', () => {
    const takenAt = '2026-10-04T14:30:00';
    const html = buildReportHtml(
      sample('modern', {
        before: [{ ...photo('before-1', 'Old boiler'), takenAt }],
      })
    );
    expect(html).toContain(`Taken ${formatTakenAt(takenAt)}`);
    const trade = buildReportHtml(sample('trade', { before: [{ ...photo('before-1', 'Old boiler'), takenAt }] }));
    expect(trade).toContain(`Taken ${formatTakenAt(takenAt)}`);
  });
});

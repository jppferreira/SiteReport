import { buildLayoutExampleHtml } from './sampleReport';

describe('buildLayoutExampleHtml', () => {
  it('renders the chosen layout with the business branding and several photos', () => {
    const html = buildLayoutExampleHtml('image', {
      businessName: 'Northside Plumbing',
      accentColor: '#0EA5E9',
      footerMessage: 'Thanks for the work',
    });

    expect(html).toContain('data-template="image"');
    expect(html).toContain('Northside Plumbing');
    expect(html).toContain('rgb(14, 165, 233)');
    expect(html).toContain('Thanks for the work');
    expect(html).toContain('Kitchen refit');
    expect(html).toContain('data-photo-count="5"');
    expect(html.indexOf('section-overview')).toBeLessThan(html.indexOf('section-before'));
  });

  it('places a branding cover on the sample report', () => {
    const html = buildLayoutExampleHtml('image', { coverImageDataUri: 'data:image/jpeg;base64,brandcover' });
    expect(html).toContain('src="data:image/jpeg;base64,brandcover"');
    expect(html).toContain('data-cover="editorial"');
  });

  it('shows the chosen cover design, thank-you image, and photo edge', () => {
    const html = buildLayoutExampleHtml('trade', {
      coverImageDataUri: 'data:image/jpeg;base64,brandcover',
      thanksImageDataUri: 'data:image/jpeg;base64,thanks',
      coverDesign: 'split',
      imageMask: 'wave',
    });
    const cover = html.slice(html.indexOf('class="sheet-cover"'), html.indexOf('sheet-body">'));
    const close = html.slice(html.indexOf('class="sheet-close"'));
    expect(cover).toContain('data-cover="split"');
    expect(cover).toContain('src="data:image/jpeg;base64,brandcover"');
    expect(close).toContain('src="data:image/jpeg;base64,thanks"');
    expect(close).toContain('clip-path:');
  });

  it('falls back when branding is missing', () => {
    const html = buildLayoutExampleHtml('dark', { accentColor: 'not-a-colour' });
    expect(html).toContain('data-template="dark"');
    expect(html).toContain('Your business');
    expect(html).toContain('rgb(31, 168, 74)');
  });
});

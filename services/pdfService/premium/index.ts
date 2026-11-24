export { isPremiumTradeTemplate } from '@/models';

import { ReportTemplateId } from '@/models';

import { ReportHtmlInput } from '../types';

import { renderPremiumTemplate } from './render';
import { premiumFontLinks, premiumStylesheet } from './styles';
import { premiumTheme, PremiumTheme } from './shared';

export { premiumFontLinks, premiumStylesheet, renderPremiumTemplate };

export function renderPremiumTemplateHtml(
  template: ReportTemplateId,
  input: ReportHtmlInput
): { html: string; theme: PremiumTheme } {
  const theme = premiumTheme(input.business.accentColor);
  return { html: renderPremiumTemplate(template, input, theme), theme };
}
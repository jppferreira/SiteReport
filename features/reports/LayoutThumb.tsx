import React from 'react';
import { StyleSheet, View } from 'react-native';

import { isFreeReportTemplate, ReportTemplateId } from '@/models';

const INK = '#141816';
const MUTED = '#C5CBC6';
const LINE = '#E3E6E3';
const WASH = '#F4F6F4';
const PAPER = '#FFFFFF';
const HERO = '#121614';

type LayoutThumbProps = {
  template: ReportTemplateId;
  accent: string;
};

/** A small page sketch of each report layout, so the choice is visible before it is applied. */
export function LayoutThumb({ template, accent }: LayoutThumbProps) {
  const basic = isFreeReportTemplate(template);
  return (
    <View style={[styles.page, basic ? styles.plainPage : null]}>
      {basic ? null : <CoverCap accent={accent} />}
      <View style={[styles.interior, !basic && template === 'side' ? { backgroundColor: tint(accent) } : null]}>
        {template === 'trade' ? <TradePage accent={accent} /> : null}
        {template === 'modern' ? <ModernPage accent={accent} /> : null}
        {template === 'image' ? <ImagePage accent={accent} /> : null}
        {template === 'side' ? <SidePage accent={accent} /> : null}
        {template === 'cards' ? <CardsPage accent={accent} /> : null}
        {template === 'minimal' ? <MinimalPage /> : null}
        {template === 'dark' ? <DarkPage accent={accent} /> : null}
      </View>
    </View>
  );
}

function CoverCap({ accent }: { accent: string }) {
  return (
    <View style={styles.coverCap}>
      <Logo accent={accent} />
      <Bar width="42%" height={2} color={accent} />
      <Bar width="72%" height={4} color="#FFFFFF" />
      <View style={styles.coverPhoto} />
    </View>
  );
}

function TradePage({ accent }: { accent: string }) {
  return (
    <View style={styles.fill}>
      <Bar width="36%" height={3} color={accent} />
      <Bar width="70%" height={4} color={INK} />
      <View style={styles.pad}>
        <Bar width="100%" />
        <Bar width="88%" />
        <Bar width="76%" />
      </View>
      <View style={styles.photo} />
      <View style={styles.photo} />
    </View>
  );
}

function Bar({ width, height = 3, color = MUTED }: { width: number | `${number}%`; height?: number; color?: string }) {
  return <View style={{ width, height, borderRadius: 2, backgroundColor: color }} />;
}

function Logo({ accent }: { accent: string }) {
  return <View style={[styles.logo, { backgroundColor: accent }]} />;
}

function ModernPage({ accent }: { accent: string }) {
  return (
    <View style={styles.fill}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Logo accent={accent} />
          <Bar width={34} height={4} color={INK} />
        </View>
        <View style={styles.end}>
          <Bar width={22} />
          <Bar width={16} />
        </View>
      </View>
      <View style={styles.titleRow}>
        <View style={{ gap: 3, flex: 1 }}>
          <Bar width="70%" height={7} color={INK} />
          <Bar width="48%" height={3} />
        </View>
        <View style={styles.meta}>
          <Bar width={18} />
          <Bar width={22} height={3} color={INK} />
          <View style={[styles.pill, { backgroundColor: accent }]} />
        </View>
      </View>
      <View style={styles.split}>
        <View style={{ gap: 2, flex: 1 }}>
          <Bar width={20} height={3} color={INK} />
          <Bar width="80%" />
        </View>
        <View style={{ gap: 2, flex: 1 }}>
          <Bar width={20} height={3} color={INK} />
          <Bar width="70%" />
        </View>
      </View>
      <View style={styles.pad}>
        <Bar width={28} height={3} color={INK} />
        <Bar width="100%" />
        <Bar width="72%" />
      </View>
      <View style={styles.photoRow}>
        <View style={styles.photo} />
        <View style={styles.photo} />
      </View>
    </View>
  );
}

function ImagePage({ accent }: { accent: string }) {
  return (
    <View style={styles.fill}>
      <View style={styles.hero}>
        <View style={styles.brand}>
          <Logo accent={accent} />
          <Bar width={32} height={3} color="#FFFFFF" />
        </View>
        <Bar width="55%" height={3} color="rgba(255,255,255,0.55)" />
        <Bar width="88%" height={8} color="#FFFFFF" />
        <Bar width="46%" height={3} color="rgba(255,255,255,0.55)" />
      </View>
      <View style={styles.statRow}>
        <View style={styles.stat} />
        <View style={styles.stat} />
        <View style={styles.stat} />
      </View>
      <View style={styles.photoRow}>
        <View style={[styles.photo, styles.tallPhoto]} />
        <View style={[styles.photo, styles.tallPhoto]} />
      </View>
    </View>
  );
}

function SidePage({ accent }: { accent: string }) {
  return (
    <View style={styles.side}>
      <View style={styles.rail}>
        <Logo accent={accent} />
        <Bar width="90%" height={4} color={INK} />
        <Bar width="70%" />
        <Bar width="80%" height={3} color={INK} />
        <Bar width="60%" />
        <View style={[styles.pill, { backgroundColor: accent, marginTop: 4 }]} />
      </View>
      <View style={styles.main}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.numRow}>
            <Bar width={6} height={4} color={INK} />
            <View style={{ flex: 1, gap: 2 }}>
              <Bar width={row === 1 ? '40%' : '55%'} height={3} color={INK} />
              {row === 1 ? (
                <View style={styles.miniPhotos}>
                  <View style={styles.miniPhoto} />
                  <View style={styles.miniPhoto} />
                </View>
              ) : (
                <Bar width="100%" />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CardsPage({ accent }: { accent: string }) {
  return (
    <View style={styles.fill}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Logo accent={accent} />
          <Bar width={28} height={3} color={INK} />
        </View>
        <Bar width={24} />
      </View>
      <View style={styles.titleRow}>
        <Bar width="62%" height={6} color={INK} />
        <View style={[styles.pill, { backgroundColor: accent }]} />
      </View>
      <View style={styles.statRow}>
        <View style={styles.card} />
        <View style={styles.card} />
        <View style={styles.card} />
      </View>
      <View style={styles.photoRow}>
        <View style={styles.photo} />
        <View style={styles.photo} />
      </View>
      <View style={styles.statRow}>
        <View style={[styles.card, styles.softCard]} />
        <View style={[styles.card, styles.softCard]} />
      </View>
    </View>
  );
}

function MinimalPage() {
  return (
    <View style={styles.fill}>
      <View style={styles.row}>
        <Bar width={36} height={4} color={INK} />
        <Bar width={22} />
      </View>
      <Bar width="78%" height={7} color={INK} />
      <View style={styles.split}>
        <Bar width="40%" />
        <Bar width="36%" />
      </View>
      <View style={styles.photoRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Bar width={16} height={3} color={INK} />
          <View style={[styles.photo, styles.tallPhoto]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Bar width={16} height={3} color={INK} />
          <View style={[styles.photo, styles.tallPhoto]} />
        </View>
      </View>
      <View style={styles.pad}>
        <Bar width={24} height={3} color={INK} />
        <Bar width="100%" />
        <Bar width="64%" />
      </View>
    </View>
  );
}

function DarkPage({ accent }: { accent: string }) {
  return (
    <View style={styles.fill}>
      <View style={styles.dark}>
        <View style={styles.row}>
          <View style={styles.brand}>
            <Logo accent={accent} />
            <Bar width={28} height={3} color="#FFFFFF" />
          </View>
          <View style={styles.end}>
            <Bar width={20} height={2} color="rgba(255,255,255,0.55)" />
            <Bar width={16} height={2} color="rgba(255,255,255,0.55)" />
          </View>
        </View>
        <View style={styles.titleRow}>
          <Bar width="68%" height={7} color="#FFFFFF" />
          <View style={[styles.pill, { backgroundColor: accent }]} />
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Bar width={18} height={3} color={INK} />
          <Bar width="90%" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Bar width={18} height={3} color={INK} />
          <Bar width="90%" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Bar width={18} height={3} color={INK} />
          <Bar width="80%" />
        </View>
      </View>
      <View style={styles.strip}>
        <View style={styles.thumb} />
        <View style={styles.thumb} />
        <View style={styles.thumb} />
        <View style={styles.thumb} />
        <View style={styles.thumb} />
      </View>
    </View>
  );
}

function tint(hex: string): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match?.[1]) return '#E7F6EC';
  const n = parseInt(match[1], 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.88);
  const r = mix((n >> 16) & 255).toString(16).padStart(2, '0');
  const g = mix((n >> 8) & 255).toString(16).padStart(2, '0');
  const b = mix(n & 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    aspectRatio: 1 / 1.28,
    backgroundColor: PAPER,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LINE,
  },
  plainPage: {
    borderRadius: 0,
    backgroundColor: '#F7F8F7',
  },
  coverCap: {
    height: 46,
    backgroundColor: HERO,
    alignItems: 'center',
    paddingTop: 5,
    paddingHorizontal: 6,
    gap: 3,
  },
  coverPhoto: { alignSelf: 'stretch', flex: 1, backgroundColor: '#24302A', borderRadius: 2 },
  interior: { flex: 1 },
  fill: { flex: 1, padding: 6, gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  logo: { width: 8, height: 8, borderRadius: 2 },
  end: { alignItems: 'flex-end', gap: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  meta: {
    width: 34,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 3,
    padding: 3,
    gap: 2,
  },
  pill: { width: 16, height: 5, borderRadius: 999 },
  split: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 4,
  },
  pad: { gap: 2 },
  photoRow: { flexDirection: 'row', gap: 3 },
  photo: { flex: 1, height: 28, borderRadius: 3, backgroundColor: WASH },
  tallPhoto: { height: 36 },
  hero: {
    backgroundColor: HERO,
    borderRadius: 3,
    padding: 5,
    gap: 4,
  },
  statRow: { flexDirection: 'row', gap: 3 },
  stat: { flex: 1, height: 14, borderRadius: 2, backgroundColor: WASH },
  side: { flex: 1, flexDirection: 'row', padding: 5, gap: 4 },
  rail: { width: 36, gap: 3 },
  main: { flex: 1, gap: 4 },
  numRow: { flexDirection: 'row', gap: 3 },
  miniPhotos: { flexDirection: 'row', gap: 2 },
  miniPhoto: { flex: 1, height: 14, borderRadius: 2, backgroundColor: PAPER },
  card: { flex: 1, height: 18, borderRadius: 3, borderWidth: 1, borderColor: LINE },
  softCard: { backgroundColor: WASH, borderWidth: 0, height: 16 },
  dark: { backgroundColor: HERO, margin: -6, marginBottom: 0, padding: 6, gap: 6 },
  strip: { flexDirection: 'row', gap: 2 },
  thumb: { flex: 1, aspectRatio: 1, borderRadius: 2, backgroundColor: WASH },
});

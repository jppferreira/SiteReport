import type { ImageSourcePropType } from 'react-native';

export const CREW_SKIN_IDS = [
  'skin-fair',
  'skin-light',
  'skin-medium',
  'skin-olive',
  'skin-brown',
  'skin-deep',
] as const;
export type CrewSkinId = (typeof CREW_SKIN_IDS)[number];

export const CREW_HAIR_IDS = [
  'hair-none',
  'hair-wavy-brown',
  'hair-fade-black',
  'hair-afro',
  'hair-bob-black',
  'hair-short-grey',
] as const;
export type CrewHairId = (typeof CREW_HAIR_IDS)[number];

export const CREW_BEARD_IDS = ['beard-none', 'beard-stubble', 'beard-goatee', 'beard-full'] as const;
export type CrewBeardId = (typeof CREW_BEARD_IDS)[number];

export const CREW_TOP_IDS = ['top-olive', 'top-mustard', 'top-navy'] as const;
export type CrewTopId = (typeof CREW_TOP_IDS)[number];

export const CREW_GLASSES_IDS = ['glasses-none', 'glasses-round'] as const;
export type CrewGlassesId = (typeof CREW_GLASSES_IDS)[number];

export const CREW_HAT_IDS = ['hat-none', 'hat-beanie', 'hat-cap'] as const;
export type CrewHatId = (typeof CREW_HAT_IDS)[number];

export const CREW_BG_COLORS = [
  '#4A4A4A',
  '#5BA8A0',
  '#E8957A',
  '#B8A9D4',
  '#8BC9A8',
  '#7EB8E0',
  '#F0B896',
  '#E0B84A',
  '#A8B89A',
  '#9B7BB8',
] as const;

/** DIY clay (Airbnb-style 3D) avatar — rembg cutouts on one locked face plate. */
export type CrewAvatarComposition = {
  skinId: CrewSkinId;
  hairId: CrewHairId;
  beardId: CrewBeardId;
  topId: CrewTopId;
  glassesId: CrewGlassesId;
  hatId: CrewHatId;
  backgroundColor: string;
};

export const DEFAULT_CREW_AVATAR_COMPOSITION: CrewAvatarComposition = {
  skinId: 'skin-medium',
  hairId: 'hair-wavy-brown',
  beardId: 'beard-none',
  topId: 'top-olive',
  glassesId: 'glasses-none',
  hatId: 'hat-none',
  backgroundColor: CREW_BG_COLORS[0],
};

const HEAD_SOURCES: Record<CrewHairId, Record<CrewSkinId, ImageSourcePropType>> = {
  'hair-none': {
    'skin-fair': require('../assets/images/crew-diy/head-hair-none-skin-fair.webp'),
    'skin-light': require('../assets/images/crew-diy/head-hair-none-skin-light.webp'),
    'skin-medium': require('../assets/images/crew-diy/head-hair-none-skin-medium.webp'),
    'skin-olive': require('../assets/images/crew-diy/head-hair-none-skin-olive.webp'),
    'skin-brown': require('../assets/images/crew-diy/head-hair-none-skin-brown.webp'),
    'skin-deep': require('../assets/images/crew-diy/head-hair-none-skin-deep.webp'),
  },
  'hair-wavy-brown': {
    'skin-fair': require('../assets/images/crew-diy/head-hair-wavy-brown-skin-fair.webp'),
    'skin-light': require('../assets/images/crew-diy/head-hair-wavy-brown-skin-light.webp'),
    'skin-medium': require('../assets/images/crew-diy/head-hair-wavy-brown-skin-medium.webp'),
    'skin-olive': require('../assets/images/crew-diy/head-hair-wavy-brown-skin-olive.webp'),
    'skin-brown': require('../assets/images/crew-diy/head-hair-wavy-brown-skin-brown.webp'),
    'skin-deep': require('../assets/images/crew-diy/head-hair-wavy-brown-skin-deep.webp'),
  },
  'hair-fade-black': {
    'skin-fair': require('../assets/images/crew-diy/head-hair-fade-black-skin-fair.webp'),
    'skin-light': require('../assets/images/crew-diy/head-hair-fade-black-skin-light.webp'),
    'skin-medium': require('../assets/images/crew-diy/head-hair-fade-black-skin-medium.webp'),
    'skin-olive': require('../assets/images/crew-diy/head-hair-fade-black-skin-olive.webp'),
    'skin-brown': require('../assets/images/crew-diy/head-hair-fade-black-skin-brown.webp'),
    'skin-deep': require('../assets/images/crew-diy/head-hair-fade-black-skin-deep.webp'),
  },
  'hair-afro': {
    'skin-fair': require('../assets/images/crew-diy/head-hair-afro-skin-fair.webp'),
    'skin-light': require('../assets/images/crew-diy/head-hair-afro-skin-light.webp'),
    'skin-medium': require('../assets/images/crew-diy/head-hair-afro-skin-medium.webp'),
    'skin-olive': require('../assets/images/crew-diy/head-hair-afro-skin-olive.webp'),
    'skin-brown': require('../assets/images/crew-diy/head-hair-afro-skin-brown.webp'),
    'skin-deep': require('../assets/images/crew-diy/head-hair-afro-skin-deep.webp'),
  },
  'hair-bob-black': {
    'skin-fair': require('../assets/images/crew-diy/head-hair-bob-black-skin-fair.webp'),
    'skin-light': require('../assets/images/crew-diy/head-hair-bob-black-skin-light.webp'),
    'skin-medium': require('../assets/images/crew-diy/head-hair-bob-black-skin-medium.webp'),
    'skin-olive': require('../assets/images/crew-diy/head-hair-bob-black-skin-olive.webp'),
    'skin-brown': require('../assets/images/crew-diy/head-hair-bob-black-skin-brown.webp'),
    'skin-deep': require('../assets/images/crew-diy/head-hair-bob-black-skin-deep.webp'),
  },
  'hair-short-grey': {
    'skin-fair': require('../assets/images/crew-diy/head-hair-short-grey-skin-fair.webp'),
    'skin-light': require('../assets/images/crew-diy/head-hair-short-grey-skin-light.webp'),
    'skin-medium': require('../assets/images/crew-diy/head-hair-short-grey-skin-medium.webp'),
    'skin-olive': require('../assets/images/crew-diy/head-hair-short-grey-skin-olive.webp'),
    'skin-brown': require('../assets/images/crew-diy/head-hair-short-grey-skin-brown.webp'),
    'skin-deep': require('../assets/images/crew-diy/head-hair-short-grey-skin-deep.webp'),
  },
};

const TOP_SOURCES: Record<CrewTopId, ImageSourcePropType> = {
  'top-olive': require('../assets/images/crew-diy/top-olive.webp'),
  'top-mustard': require('../assets/images/crew-diy/top-mustard.webp'),
  'top-navy': require('../assets/images/crew-diy/top-navy.webp'),
};

const BEARD_SOURCES: Partial<Record<CrewBeardId, ImageSourcePropType>> = {
  'beard-stubble': require('../assets/images/crew-diy/beard-stubble.webp'),
  'beard-goatee': require('../assets/images/crew-diy/beard-goatee.webp'),
  'beard-full': require('../assets/images/crew-diy/beard-full.webp'),
};

const GLASSES_SOURCES: Partial<Record<CrewGlassesId, ImageSourcePropType>> = {
  'glasses-round': require('../assets/images/crew-diy/glasses-round.webp'),
};

const HAT_SOURCES: Partial<Record<CrewHatId, ImageSourcePropType>> = {
  'hat-beanie': require('../assets/images/crew-diy/hat-beanie.webp'),
  'hat-cap': require('../assets/images/crew-diy/hat-cap.webp'),
};

export const CREW_SKIN_OPTIONS = CREW_SKIN_IDS.map((id) => ({
  id,
  source: HEAD_SOURCES['hair-none'][id],
}));

export const CREW_HAIR_OPTIONS = CREW_HAIR_IDS.map((id) => ({
  id,
  source: HEAD_SOURCES[id]['skin-medium'],
}));

export const CREW_BEARD_OPTIONS = CREW_BEARD_IDS.map((id) => ({
  id,
  source: BEARD_SOURCES[id] ?? null,
}));

export const CREW_TOP_OPTIONS = CREW_TOP_IDS.map((id) => ({
  id,
  source: TOP_SOURCES[id],
}));

export const CREW_GLASSES_OPTIONS = CREW_GLASSES_IDS.map((id) => ({
  id,
  source: GLASSES_SOURCES[id] ?? null,
}));

export const CREW_HAT_OPTIONS = CREW_HAT_IDS.map((id) => ({
  id,
  source: HAT_SOURCES[id] ?? null,
}));

function pickId<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

export function normalizeCrewAvatarComposition(value: unknown): CrewAvatarComposition {
  const raw = value && typeof value === 'object' ? (value as Partial<CrewAvatarComposition>) : {};
  const backgroundColor =
    typeof raw.backgroundColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.backgroundColor)
      ? raw.backgroundColor
      : DEFAULT_CREW_AVATAR_COMPOSITION.backgroundColor;
  return {
    skinId: pickId(raw.skinId, CREW_SKIN_IDS, DEFAULT_CREW_AVATAR_COMPOSITION.skinId),
    hairId: pickId(raw.hairId, CREW_HAIR_IDS, DEFAULT_CREW_AVATAR_COMPOSITION.hairId),
    beardId: pickId(raw.beardId, CREW_BEARD_IDS, DEFAULT_CREW_AVATAR_COMPOSITION.beardId),
    topId: pickId(raw.topId, CREW_TOP_IDS, DEFAULT_CREW_AVATAR_COMPOSITION.topId),
    glassesId: pickId(raw.glassesId, CREW_GLASSES_IDS, DEFAULT_CREW_AVATAR_COMPOSITION.glassesId),
    hatId: pickId(raw.hatId, CREW_HAT_IDS, DEFAULT_CREW_AVATAR_COMPOSITION.hatId),
    backgroundColor,
  };
}

/**
 * Paint order (back → front): clay top → head → beard → glasses → hat.
 * All layers are rembg cutouts from the same Airbnb-style 3D plates.
 */
export function crewAvatarLayerSources(composition: CrewAvatarComposition): ImageSourcePropType[] {
  const layers: ImageSourcePropType[] = [
    TOP_SOURCES[composition.topId],
    HEAD_SOURCES[composition.hairId][composition.skinId],
  ];
  const beard = BEARD_SOURCES[composition.beardId];
  if (beard) layers.push(beard);
  const glasses = GLASSES_SOURCES[composition.glassesId];
  if (glasses) layers.push(glasses);
  const hat = HAT_SOURCES[composition.hatId];
  if (hat) layers.push(hat);
  return layers;
}

/** @deprecated Flat presets — kept so old preference values still resolve. */
export const CREW_AVATAR_IDS = [
  'crew-00',
  'crew-01',
  'crew-02',
  'crew-03',
  'crew-04',
  'crew-05',
  'crew-06',
  'crew-07',
  'crew-08',
  'crew-09',
] as const;
export type CrewAvatarId = (typeof CREW_AVATAR_IDS)[number];
export const DEFAULT_CREW_AVATAR_ID: CrewAvatarId = 'crew-00';

export function normalizeCrewAvatarId(value: unknown): CrewAvatarId {
  if (typeof value === 'string' && (CREW_AVATAR_IDS as readonly string[]).includes(value)) {
    return value as CrewAvatarId;
  }
  return DEFAULT_CREW_AVATAR_ID;
}

export function compositionFromLegacyAvatarId(
  id: CrewAvatarId | null | undefined
): CrewAvatarComposition {
  const normalized = normalizeCrewAvatarId(id);
  const presets: Record<CrewAvatarId, Partial<CrewAvatarComposition>> = {
    'crew-00': { hairId: 'hair-wavy-brown', topId: 'top-olive', backgroundColor: '#4A4A4A' },
    'crew-01': {
      skinId: 'skin-deep',
      hairId: 'hair-afro',
      topId: 'top-mustard',
      backgroundColor: '#5BA8A0',
    },
    'crew-02': {
      skinId: 'skin-fair',
      hairId: 'hair-short-grey',
      topId: 'top-navy',
      glassesId: 'glasses-round',
      backgroundColor: '#E8957A',
    },
    'crew-03': {
      skinId: 'skin-light',
      hairId: 'hair-bob-black',
      topId: 'top-olive',
      backgroundColor: '#B8A9D4',
    },
    'crew-04': {
      skinId: 'skin-brown',
      hairId: 'hair-fade-black',
      beardId: 'beard-stubble',
      topId: 'top-mustard',
      backgroundColor: '#8BC9A8',
    },
    'crew-05': {
      skinId: 'skin-olive',
      hairId: 'hair-bob-black',
      topId: 'top-olive',
      hatId: 'hat-beanie',
      backgroundColor: '#7EB8E0',
    },
    'crew-06': {
      skinId: 'skin-fair',
      hairId: 'hair-wavy-brown',
      topId: 'top-navy',
      backgroundColor: '#F0B896',
    },
    'crew-07': {
      skinId: 'skin-deep',
      hairId: 'hair-fade-black',
      beardId: 'beard-full',
      topId: 'top-olive',
      backgroundColor: '#E0B84A',
    },
    'crew-08': {
      skinId: 'skin-light',
      hairId: 'hair-short-grey',
      topId: 'top-navy',
      hatId: 'hat-cap',
      backgroundColor: '#A8B89A',
    },
    'crew-09': {
      skinId: 'skin-olive',
      hairId: 'hair-wavy-brown',
      beardId: 'beard-goatee',
      topId: 'top-mustard',
      backgroundColor: '#9B7BB8',
    },
  };
  return normalizeCrewAvatarComposition({
    ...DEFAULT_CREW_AVATAR_COMPOSITION,
    ...presets[normalized],
  });
}

/** Shared AR types (local copies so Expo Go never imports @stewmore/expo-ar). */

export type Transform = number[] | Float32Array;

export type Capabilities = {
  arSupported: boolean;
  depthOrLidarAvailable: boolean;
  geoTrackingSupported: boolean;
};

export type Anchor = {
  id: string;
  transform: Transform;
  type: string;
};

export type ProjectedPoint = {
  id: string;
  x: number;
  y: number;
  inFront: boolean;
};

export type TrackingState = 'initializing' | 'limited' | 'normal' | 'unavailable';

export type ArViewHandle = {
  raycast(x: number, y: number): Promise<{
    worldTransform: Transform | null;
    target: string | null;
  }>;
  addAnchor(x: number, y: number): Promise<{ id: string } | null>;
  removeAnchor(id: string): Promise<void>;
  listAnchors(): Promise<Anchor[]>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): Promise<void>;
  snapshot(): Promise<string>;
};

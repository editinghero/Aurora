export type Track = {
  id: string;
  file: File;
  name: string;
  title: string;
  artist?: string;
  album?: string;
  durationSec?: number;
  artworkUrl?: string; // object URL of cover image
};

export type PlayHistoryEntry = {
  trackId: string;
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  durationSec?: number;
  playedAt: number; // timestamp
};

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export type EqGains = number[]; // length 10, dB values -12..+12

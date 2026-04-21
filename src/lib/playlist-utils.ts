import type { Track } from "./types";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeMatch(value: string) {
  return safeDecode(value)
    .replace(/^file:\/+/i, "")
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

function getTrackKeys(track: Track) {
  const relativePath = (track.file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return new Set(
    [track.title, track.name, relativePath]
      .filter(Boolean)
      .map((value) => normalizeMatch(String(value)))
      .filter(Boolean),
  );
}

export function parseM3U(text: string) {
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = normalizeMatch(line);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    entries.push(normalized);
  }

  return entries;
}

export function applyPlaylistOrder(tracks: Track[], entries: string[]) {
  if (!entries.length || tracks.length < 2) return tracks;

  const remaining = tracks.map((track) => ({ track, keys: getTrackKeys(track) }));
  const ordered: Track[] = [];

  for (const entry of entries) {
    const matchIndex = remaining.findIndex(({ keys }) => keys.has(entry));
    if (matchIndex === -1) continue;
    ordered.push(remaining[matchIndex].track);
    remaining.splice(matchIndex, 1);
  }

  return ordered.length ? [...ordered, ...remaining.map(({ track }) => track)] : tracks;
}
import type { PlayHistoryEntry, Track } from "./types";

const HISTORY_KEY = "mp.play.history.v1";
const MAX_HISTORY_ITEMS = 100;

export function savePlayHistory(track: Track): void {
  const history = getPlayHistory();
  
  const entry: PlayHistoryEntry = {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artworkUrl: track.artworkUrl,
    durationSec: track.durationSec,
    playedAt: Date.now(),
  };

  // Add to beginning of array
  history.unshift(entry);

  // Keep only last MAX_HISTORY_ITEMS
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("Failed to save play history:", err);
  }
}

export function getPlayHistory(): PlayHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load play history:", err);
    return [];
  }
}

export function clearPlayHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.warn("Failed to clear play history:", err);
  }
}

import * as mm from "music-metadata-browser";
import type { Track } from "./types";

const AUDIO_EXT = /\.(mp3|m4a|aac|flac|ogg|opus|wav|webm)$/i;

function getPictureBytes(data: unknown) {
  if (!data) return null;
  if (data instanceof Uint8Array) {
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    return buffer;
  }
  if (data instanceof ArrayBuffer) return data.slice(0);
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const buffer = new ArrayBuffer(view.byteLength);
    new Uint8Array(buffer).set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return buffer;
  }
  if (Array.isArray(data)) return Uint8Array.from(data).buffer;
  return null;
}

function getPictureMime(format?: string) {
  if (!format) return "image/jpeg";
  return format.includes("/") ? format : `image/${format.replace(/^\./, "")}`;
}

export function isAudioFile(f: File) {
  return f.type.startsWith("audio/") || AUDIO_EXT.test(f.name);
}

export async function fileToTrack(file: File): Promise<Track> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const base: Track = {
    id,
    file,
    name: file.name,
    title: file.name.replace(/\.[^.]+$/, ""),
  };
  try {
    const meta = await mm.parseBlob(file, { duration: true, skipCovers: false });
    const common = meta.common;
    const picture = common.picture?.find((item) => item.data);
    let artworkUrl: string | undefined;
    const bytes = picture ? getPictureBytes(picture.data) : null;
    if (picture && bytes?.byteLength) {
      const blob = new Blob([bytes], { type: getPictureMime(picture.format) });
      artworkUrl = URL.createObjectURL(blob);
    }
    return {
      ...base,
      title: common.title || base.title,
      artist: common.artist,
      album: common.album,
      durationSec: meta.format.duration,
      artworkUrl,
    };
  } catch {
    return base;
  }
}

export function formatTime(s = 0) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

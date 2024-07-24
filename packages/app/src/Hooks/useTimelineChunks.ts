import { useState } from "react";

export interface WindowChunk {
  since: number;
  until: number;
}

export default function useTimelineChunks(opt: { window?: number; firstChunkSize?: number; now: number }) {
  const [windowSize] = useState(opt.window ?? 60 * 60 * 2);
  const [windows, setWindows] = useState(1);

  let offset = opt.now;
  const chunks: Array<WindowChunk> = [];
  for (let x = 0; x < windows; x++) {
    // offset from now going backwards in time
    const size = x === 0 && opt.firstChunkSize ? opt.firstChunkSize : windowSize;
    chunks.push({
      since: offset - size,
      until: offset,
    });
    offset -= size;
  }

  return {
    now: opt.now,
    chunks,
    showMore: () => {
      setWindows(s => s + 1);
    },
  };
}

// features/movies/hooks/useTrailerCache.ts
import { useCallback, useRef } from "react";
import { getMovieVideos } from "features/movies/api/movies";

type Video = { key: string; site: string };

export function useTrailerCache() {
  const cacheRef = useRef<Map<number, Video>>(new Map());
  const inflightRef = useRef<Map<number, Promise<Video | null>>>(new Map());

  const fetchTrailer = useCallback(async (movieId: number) => {
    const cached = cacheRef.current.get(movieId);
    if (cached) return cached;

    const inflight = inflightRef.current.get(movieId);
    if (inflight) return inflight;

    const p = (async () => {
      // 1) ko-KR 우선
      let results = await getMovieVideos(movieId, "ko-KR");
      let video = Array.isArray(results)
        ? results.find((v: any) => v.site === "YouTube")
        : null;

      // 2) 없으면 en-US 폴백
      if (!video) {
        results = await getMovieVideos(movieId, "en-US");
        video = Array.isArray(results)
          ? results.find((v: any) => v.site === "YouTube")
          : null;
      }

      const out = video
        ? ({ key: video.key, site: video.site } as Video)
        : null;
      if (out) cacheRef.current.set(movieId, out);
      return out;
    })()
      .catch((e) => {
        console.error("동영상을 가져오는 중 오류:", e);
        return null;
      })
      .finally(() => {
        inflightRef.current.delete(movieId);
      });

    inflightRef.current.set(movieId, p);
    return p;
  }, []);

  const prefetchNeighbors = useCallback(
    (movies: { id: number }[], index: number) => {
      const offsets = [-2, -1, 1, 2];
      offsets.forEach((off, i) => {
        const idx = index + off;
        const m = movies[idx];
        if (!m) return;
        setTimeout(() => {
          fetchTrailer(m.id);
        }, 60 * i);
      });
    },
    [fetchTrailer]
  );

  return { fetchTrailer, prefetchNeighbors };
}

// features/movies/hooks/useProgressiveMovies.ts
import { useEffect, useState } from "react";
import { getMovies } from "features/movies/api/movies";
import { fetchMovies as fetchMoviesByPage } from "features/movies/api";

type Movie = { id: number; poster_path: string; title: string };

export function useProgressiveMovies({
  targetCount = 20,
  maxPages = 10,
  initialCount = 8,
}: {
  targetCount?: number;
  maxPages?: number;
  initialCount?: number;
} = {}) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const progressiveFetch = async () => {
      try {
        const first = await getMovies();
        const firstList = Array.isArray(first?.results) ? first.results : [];
        const firstBatch = firstList.slice(0, initialCount);
        setMovies(firstBatch);

        const seen = new Set(firstBatch.map((m: Movie) => m.id));

        const appendUnique = (items: Movie[]) => {
          if (!Array.isArray(items)) return;
          setMovies((prev) => {
            const out = [...prev]; // 직접 참조하게 되면 리렌더링 블로그 작성하기
            for (const it of items) {
              if (it && !seen.has(it.id)) {
                seen.add(it.id);
                out.push(it);
                if (out.length >= targetCount) break;
              }
            }
            return out.slice(0, targetCount);
          });
        };

        setTimeout(() => appendUnique(firstList.slice(initialCount)), 0); //기존에 getMovies로 가져온 영화 정보를 먼저 화면에 페인트를 빠르게 만들고, 이후 무거운 작업인 이 함수를 다음 이벤트 루프로 미뤄서 개선하기위해 한 틱 지연을

        for (let page = 2; page <= maxPages; page += 1) {
          if (seen.size >= targetCount) break;
          const data = await fetchMoviesByPage(page, "");
          const list = Array.isArray(data?.results) ? data.results : [];
          if (list.length === 0) break;
          appendUnique(list);
        }
      } catch (e) {
        console.error(e);
        setError("영화 데이터를 가져오는 중 오류가 발생했습니다.");
      }
    };

    progressiveFetch();
  }, [targetCount, maxPages, initialCount]);

  return { movies, error };
}

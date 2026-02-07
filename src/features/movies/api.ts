import { apiJson } from '../../shared/api/fetcher';

export const fetchMovies = async (page: number, genre: string) => {
  const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
  return apiJson(`/movies?page=${page}${genreParam}`);
};

export const fetchMovieDetail = async (id: string | number) => {
  return apiJson(`/movies/${id}`, { cache: 'no-store' as any });
};

export const searchMovies = async (query: string, page = 1) => {
  return apiJson(`/movies/search?query=${encodeURIComponent(query)}&page=${page}`);
};

export const fetchMovieCredits = async (id: string | number) => {
  // 요청 시 한국어 로케일을 명시해 캐스트/크루의 표시 필드가 가능하면 한글로 오도록 요청
  // 서버가 language 파라미터를 프록시하지 않으면 무시될 수 있음
  return apiJson(`/movies/${id}/credits?language=ko-KR`); // { id, cast: [], crew: [] }
};

export const fetchSimilarMovies = async (id: string | number, page = 1) => {
  try {
    return await apiJson(`/movies/${id}/similar?page=${page}`);
  } catch (e: any) {
    if (e?.status === 404) return { page: 1, results: [], total_pages: 1, total_results: 0 } as any;
    throw e;
  }
};

// Person detail (Korean-preferred)
export const fetchPersonDetail = async (id: string | number) => {
  // Backend exposes GET /person/:id
  // Attempt to request Korean translation data when available
  return apiJson(`/person/${id}?language=ko-KR&append_to_response=translations`);
};

import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { AiFillStar } from "react-icons/ai";
import { IMAGE_BASE_URL } from "../../config";
import { getCurrentUser } from "../../shared/utils/userData";
import * as bookmarksApi from "../../shared/api/bookmarks";
import ReviewsSection from "../../features/reviews/ReviewsSection";
import { useQuery } from "@tanstack/react-query";
import { fetchMovieDetail, fetchMovieCredits, fetchSimilarMovies, fetchPersonDetail } from "./api";
import "./MoviesDetail.css";

function MovieDetail() {
  const { movieID } = useParams<{ movieID: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusReviewId = searchParams.get("review") || undefined;
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; nick: string } | null>(null);
  const [liked, setLiked] = useState(false);

  const { data: movieData, isLoading } = useQuery({
    queryKey: ["movie", movieID],
    queryFn: () => fetchMovieDetail(movieID as string),
    enabled: !!movieID,
  });
  const { data: credits } = useQuery({
    queryKey: ["movie", movieID, "credits"],
    queryFn: () => fetchMovieCredits(movieID as string),
    enabled: !!movieID,
  });
  const { data: similar } = useQuery({
    queryKey: ["movie", movieID, "similar"],
    queryFn: () => fetchSimilarMovies(movieID as string, 1),
    enabled: !!movieID,
  });

  useEffect(() => {
    setMovie(movieData);
    setLoading(isLoading);
  }, [movieData, isLoading]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      setUser(u);
      if (u && movieID) {
        try {
          const st = await bookmarksApi.getStatus(Number(movieID));
          if (mounted) setLiked(!!st.bookmarked);
        } catch {}
      }
    })();
    return () => {
      mounted = false;
    };
  }, [movieID]);

  // 상위 캐스트 한글 이름 보강 (백엔드 /person/:id 사용)
  const [koNameMap, setKoNameMap] = useState<Record<number, string>>({});
  useEffect(() => {
    let mounted = true;
    async function enrichKoNames() {
      try {
        const cast: any[] = Array.isArray((credits as any)?.cast) ? (credits as any).cast.slice(0, 10) : [];
        if (cast.length === 0) return;
        const tasks = cast.map(async (c) => {
          const id = Number(c?.id);
          const fallbackName = String(c?.name || '');
          if (!id || !fallbackName) return [id, fallbackName] as const;
          try {
            // 백엔드 프록시(/person/:id)를 사용해 한글명 시도
            const p: any = await fetchPersonDetail(id);
            const koTrans = p?.translations?.translations?.find((t: any) => t?.iso_639_1 === 'ko')?.data?.name;
            const koAKA = Array.isArray(p?.also_known_as) ? p.also_known_as.find((n: string) => /[가-힣]/.test(n)) : undefined;
            const name = koTrans || koAKA || fallbackName;
            return [id, name] as const;
          } catch {
            return [id, fallbackName] as const;
          }
        });
        const results = await Promise.all(tasks);
        if (!mounted) return;
        const next: Record<number, string> = { };
        for (const [id, name] of results) {
          if (id) next[id] = name;
        }
        setKoNameMap((prev) => ({ ...prev, ...next }));
      } catch {}
    }
    enrichKoNames();
    return () => { mounted = false; };
  }, [credits]);

  const onToggleLike = () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    (async () => {
      try {
        const next = await bookmarksApi.toggle({
          id: Number(movieID),
          title: movie.title || movie.name || "",
          poster_path: movie.poster_path,
        });
        setLiked(next);
      } catch (e) {
        console.error(e);
      }
    })();
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="movieDetailContainer">
        <div className="loadingContainer">
          <div className="loadingSpinner"></div>
          <p className="loadingText">영화 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (!movie) {
    return (
      <div className="movieDetailContainer">
        <div className="errorContainer">
          <p className="errorText">영화 정보를 불러오지 못했습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="movieDetailContainer">
      <div className="movieDetailContent">
        {/* 헤더 */}
        <div className="movieHeader">
          <h2>{movie.title || movie.name}</h2>
          {user && (
            <button
              className={`likeButton ${liked ? "liked" : ""}`}
              onClick={onToggleLike}
            >
              {liked ? <BsBookmarkFill size={20} /> : <BsBookmark size={20} />}
              <span>{liked ? "북마크됨" : "북마크"}</span>
            </button>
          )}
        </div>

        {/* 영화 정보 */}
        <div className="movieInfo">
          <img
            src={`${IMAGE_BASE_URL}w500${movie.poster_path}`}
            alt={movie.title || movie.name}
            className="moviePoster"
          />

          <div className="movieDetails">
            <p className="movieOverview">
              {movie.overview || "줄거리 정보가 없습니다."}
            </p>

            <div className="movieMeta">
              <p>
                <strong>개봉일:</strong>
                {movie.release_date || movie.first_air_date || "미정"}
              </p>
              <p>
                <strong>평점:</strong>
                <span className="movieRating">
                  <AiFillStar size={18} />
                  {movie.vote_average?.toFixed(1) || "N/A"}
                </span>
              </p>
              {movie.runtime && (
                <p>
                  <strong>러닝타임:</strong>
                  {movie.runtime}분
                </p>
              )}
              {movie.genres && movie.genres.length > 0 && (
                <p>
                  <strong>장르:</strong>
                  {movie.genres.map((g: any) => g.name).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* 출연 */}
        {credits?.cast?.length > 0 && (
          <div className="creditsSection">
            <h3>출연</h3>
            <div className="castGrid">
              {credits.cast.slice(0, 12).map((c: any) => (
                <div
                  key={c.cast_id || c.credit_id || c.id}
                  className="castItem"
                >
                  {c.profile_path ? (
                    <img
                      src={`${IMAGE_BASE_URL}w185${c.profile_path}`}
                      alt={c.name}
                      className="castPhoto"
                    />
                  ) : (
                    <div className="castPlaceholder">
                      {c.name?.charAt(0) || "?"}
                    </div>
                  )}
                    <div className="castMeta">
                    <div className="castName">{koNameMap[c.id] || c.name}</div>
                    {c.character && (
                      <div className="castRole">{c.character}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 유사한 영화 */}
        {similar?.results?.length > 0 && (
          <div className="similarSection">
            <h3>유사한 영화</h3>
            <div className="similarGrid">
              {similar.results.slice(0, 12).map((m: any) => (
                <a key={m.id} href={`/movie/${m.id}`} className="similarCard">
                  {m.poster_path ? (
                    <img
                      src={`${IMAGE_BASE_URL}w300${m.poster_path}`}
                      alt={m.title || m.name}
                    />
                  ) : (
                    <div className="similarPlaceholder">No Image</div>
                  )}
                  <div className="similarTitle">{m.title || m.name}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 리뷰 섹션 */}
        <div className="reviewsSection">
          <ReviewsSection
            movieId={Number(movieID)}
            user={user}
            focusReviewId={focusReviewId}
          />
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;

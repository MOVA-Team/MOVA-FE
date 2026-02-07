import React, { useEffect, useState, useRef } from "react";
import "./MoviesPage.css";
import Movie from "./components/MovieCard";
import { Row } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMovies, searchMovies } from "./api";
import { bulkStatus } from "shared/api/bookmarks";

const Moviespage = () => {
  const [view, setView] = useState<any>();
  const [Movies, setMovies] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [genre, setGenre] = useState<string>("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("accessToken")
      : null;
  const authed = !!token;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["movies", { genre }],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => fetchMovies(Number(pageParam), genre),
      placeholderData: (prev) => prev as any,
      getNextPageParam: (lastPage: any) => {
        if (!lastPage) return undefined;
        const { page, total_pages } = lastPage;
        if (
          typeof page === "number" &&
          typeof total_pages === "number" &&
          page < total_pages
        ) {
          return page + 1;
        }
        return undefined;
      },
    });

  // 검색 상태
  const [query, setQuery] = useState<string>("");
  const {
    data: searchData,
    fetchNextPage: fetchNextSearch,
    isFetchingNextPage: isFetchingNextSearch,
    hasNextPage: hasNextSearch,
    isLoading: isLoadingSearch,
  } = useInfiniteQuery({
    queryKey: ["search-movies", { q: query }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchMovies(query, Number(pageParam)),
    enabled: query.trim().length > 0,
    getNextPageParam: (lastPage: any) => {
      if (!lastPage) return undefined;
      const { page, total_pages } = lastPage;
      if (
        typeof page === "number" &&
        typeof total_pages === "number" &&
        page < total_pages
      ) {
        return page + 1;
      }
      return undefined;
    },
  });

  const list = query.trim()
    ? (searchData?.pages || []).flatMap((p: any) => p.results || [])
    : (data?.pages || []).flatMap((p: any) => p.results || []);

  // Bulk prefetch bookmark status for current list
  const [statusMap, setStatusMap] = useState<Map<number, boolean>>(new Map());
  useEffect(() => {
    (async () => {
      if (!authed) return;
      const ids = Array.from(
        new Set(
          list.map((m: any) => m.id).filter((n: any) => typeof n === "number")
        )
      );
      if (ids.length === 0) return;
      try {
        const items = await bulkStatus(ids);
        const next = new Map<number, boolean>();
        for (const it of items) next.set(it.movieId, !!it.bookmarked);
        setStatusMap(next);
      } catch {}
    })();
  }, [authed, list]);

  // 무한 스크롤 sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Gate: prevent rapid re-entry across the same intersection window
  const fetchingGateRef = useRef(false);

  // IMPORTANT: when query/genre changes, reset gate so new mode doesn't get blocked
  useEffect(() => {
    fetchingGateRef.current = false;
  }, [query, genre]);

  const runWithGate = (p: any) =>
    Promise.resolve(p).finally(() => {
      fetchingGateRef.current = false;
    });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;

        if (fetchingGateRef.current) return;
        fetchingGateRef.current = true;

        if (process.env.NODE_ENV !== "production") {
          console.count(
            `[OPT][IO] intersect → ${query.trim() ? "search" : "list"} fetch`
          );
        }

        if (query.trim()) {
          if (!isFetchingNextSearch && hasNextSearch) {
            runWithGate(fetchNextSearch());
          } else {
            fetchingGateRef.current = false;
          }
        } else {
          if (!isFetchingNextPage && hasNextPage) {
            runWithGate(fetchNextPage());
          } else {
            fetchingGateRef.current = false;
          }
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.01 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [
    query,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    hasNextSearch,
    isFetchingNextSearch,
    fetchNextSearch,
  ]);

  const handleGenreClick = (selectedGenre: string) => {
    if (genre === selectedGenre) return;
    setMovies([]);
    setPage(1);
    setGenre(selectedGenre);
  };

  return (
    <div className="mpgContainer">
      <div className="mpgTitle">
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="영화 제목 검색"
            style={{ padding: "8px 10px", flex: 1, maxWidth: 400 }}
          />
          {query && <button onClick={() => setQuery("")}>검색 지우기</button>}
        </div>

        <div className="genreContainer">
          <ul>
            <li
              className={genre === "" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("")}
            >
              전체
            </li>
            <li
              className={genre === "action" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("action")}
            >
              액션
            </li>
            <li
              className={genre === "animation" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("animation")}
            >
              애니메이션
            </li>
            <li
              className={genre === "comedy" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("comedy")}
            >
              코미디
            </li>
            <li
              className={genre === "crime" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("crime")}
            >
              범죄
            </li>
            <li
              className={genre === "family" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("family")}
            >
              가족
            </li>
            <li
              className={genre === "fantasy" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("fantasy")}
            >
              판타지
            </li>
            <li
              className={genre === "horror" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("horror")}
            >
              공포
            </li>
            <li
              className={genre === "thriller" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("thriller")}
            >
              스릴러
            </li>
            <li
              className={genre === "romance" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("romance")}
            >
              로맨스
            </li>
            <li
              className={genre === "sci-fi" ? "selectedGenre" : ""}
              onClick={() => handleGenreClick("sci-fi")}
            >
              SF
            </li>
          </ul>
        </div>

        <hr />

        {(query.trim() ? isLoadingSearch : isLoading) && list.length === 0 ? (
          <div className="skeletonGrid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeletonCard" />
            ))}
          </div>
        ) : (
          <Row gutter={[32, 32]}>
            {list.map((movie: any) => (
              <Movie
                key={movie.id}
                movieData={movie}
                likedInitial={statusMap.get(movie.id)}
              />
            ))}
          </Row>
        )}
      </div>

      {/* 무한 스크롤을 위한 센티넬 */}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
};

export default Moviespage;

// features/movies/components/Main/Main.tsx
import React, { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "./Main.css";

import { useProgressiveMovies } from "../Main/hooks/useProgressiveMovies";
import { useTrailerCache } from "../Main/hooks/useTrailerCache";
import { useYouTubeIframe } from "../Main/hooks/useYouTubeIframe";

const Main = () => {
  const { movies, error } = useProgressiveMovies({
    targetCount: 20,
    maxPages: 10,
    initialCount: 8,
  });

  const { fetchTrailer, prefetchNeighbors } = useTrailerCache();

  const swiperRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { sendCommand } = useYouTubeIframe(iframeRef);

  const [currentVideoKey, setCurrentVideoKey] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [muted, setMuted] = useState(true);

  // 레이스 컨디션 방지용 (스와이프 연타 대비)
  const reqIdRef = useRef(0);

  const updateBackgroundByIndex = async (index: number) => {
    const selected = movies[index];
    if (!selected) return;

    const myReqId = ++reqIdRef.current;
    setVideoLoading(true);

    const video = await fetchTrailer(selected.id);

    // 최신 요청만 반영
    if (myReqId !== reqIdRef.current) return;

    if (video) setCurrentVideoKey(video.key);
    setVideoLoading(false);

    prefetchNeighbors(movies, index);
  };

  // movies가 채워지면 중앙부터 시작
  useEffect(() => {
    if (movies.length === 0) return;
    const center = Math.floor(movies.length / 2);
    updateBackgroundByIndex(center);
  }, [movies]);

  const handleSlideChange = (swiper: any) => {
    updateBackgroundByIndex(swiper.activeIndex);
  };

  if (error) return <div>{error}</div>;

  return (
    <>
      <div className="backgroundVideo">
        {currentVideoKey && (
          <iframe
            ref={iframeRef}
            id="bg-youtube-player"
            src={`https://www.youtube.com/embed/${currentVideoKey}?autoplay=1&controls=0&loop=1&playlist=${currentVideoKey}&mute=${
              muted ? 1 : 0
            }&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(
              window.location.origin
            )}`}
            style={{ border: "none" }}
            loading="lazy"
            allow="autoplay; fullscreen"
            allowFullScreen
            title="Background Video"
            onLoad={() => {
              setVideoLoading(false);
              if (muted) sendCommand("mute");
              else {
                sendCommand("unMute");
                sendCommand("setVolume", [100]);
              }
            }}
            onError={() => setVideoLoading(false)}
          />
        )}
      </div>

      <button
        className="soundBtn"
        onClick={() => {
          setMuted((m) => {
            const next = !m;
            setTimeout(() => {
              if (next) sendCommand("mute");
              else {
                sendCommand("unMute");
                sendCommand("setVolume", [100]);
              }
            }, 0);
            return next;
          });
        }}
      >
        {muted ? "🔇 음소거" : "🔊 소리 켜짐"}
      </button>

      <div className="swiperContainer">
        <Swiper
          effect={"coverflow"}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={5}
          spaceBetween={0}
          coverflowEffect={{
            rotate: 10,
            stretch: 0,
            depth: 300,
            modifier: 2,
            slideShadows: true,
          }}
          pagination={{ clickable: true }}
          loop={false}
          autoplay={{ delay: 20000, disableOnInteraction: false }}
          modules={[EffectCoverflow, Pagination, Autoplay]}
          className="mySwiper"
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            updateBackgroundByIndex(swiper.activeIndex);
          }}
          onSlideChange={handleSlideChange}
        >
          {movies.map((movie, index) => (
            <SwiperSlide key={movie.id}>
              <img
                className="slideImg"
                src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                alt={movie.title}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onClick={() => swiperRef.current?.slideTo(index)}
                height="360px"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {videoLoading && <div className="videoLoading">로딩중...</div>}
    </>
  );
};

export default Main;

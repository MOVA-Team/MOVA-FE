// features/movies/hooks/useYouTubeIframe.ts
import { useCallback, useEffect, useState } from "react";

export function useYouTubeIframe(
  iframeRef: React.RefObject<HTMLIFrameElement>
) {
  const [playerReady, setPlayerReady] = useState(false);

  const sendCommand = useCallback(
    (func: string, args: any[] = []) => {
      try {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) return;
        const msg = JSON.stringify({ event: "command", func, args });
        // 가능하면 "*" 대신 youtube origin을 쓰는 게 안전함
        iframe.contentWindow.postMessage(msg, "*");
      } catch {}
    },
    [iframeRef]
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      let data: any;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!data) return;
      if (data.event === "onReady") setPlayerReady(true);
      if (data.info && typeof data.info === "object") setPlayerReady(true);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return { playerReady, sendCommand, setPlayerReady };
}

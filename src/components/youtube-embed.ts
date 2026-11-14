/** The YouTube embed address for a video, shared by the native and web players. */
export function embedUrl(youtubeId: string, autoplay = true) {
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    autoplay: autoplay ? '1' : '0',
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

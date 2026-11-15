/** The YouTube embed address for a video, shared by the native and web players. */
export function embedUrl(youtubeId: string, autoplay = true, start = 0) {
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    autoplay: autoplay ? '1' : '0',
  });
  // Start part-way in, e.g. where a clip was taken from.
  if (start > 0) params.set('start', String(Math.floor(start)));
  return `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

'use client';

import { useState } from 'react';

function youTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return /^[\w-]{11}$/.test(url) ? url : null;
}

/**
 * Privacy-friendly YouTube embed: renders a thumbnail and only loads the
 * iframe on click. Accepts a full URL or a bare video id.
 */
export function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const [playing, setPlaying] = useState(false);
  const id = youTubeId(url);

  if (!id) {
    return (
      <div className="rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground">
        Invalid YouTube URL: {url}
      </div>
    );
  }

  if (playing) {
    return (
      <div className="not-prose aspect-video w-full overflow-hidden rounded-lg border border-fd-border">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title ?? 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="not-prose group relative aspect-video w-full overflow-hidden rounded-lg border border-fd-border"
      aria-label={title ? `Play: ${title}` : 'Play video'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnail */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt={title ?? 'Video thumbnail'}
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/20">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
          ▶
        </span>
      </span>
      {title ? (
        <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 text-left text-sm text-white">
          {title}
        </span>
      ) : null}
    </button>
  );
}

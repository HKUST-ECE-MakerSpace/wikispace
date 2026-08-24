'use client';

import mermaid from 'mermaid';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Interactive Mermaid diagram: renders the chart client-side (mermaid is a
 * big dependency, so nothing ships for pages that don't use this component),
 * follows the site theme, and sits in a scroll/zoom shell — drag to pan,
 * ctrl+scroll or buttons to zoom, fullscreen for small screens. Nodes listed
 * in `links` navigate to their URL on click (a drag never triggers
 * navigation).
 *
 * Zoom is done by sizing the svg (width = natural × scale) inside a plain
 * overflow-auto container — no CSS transforms, which break pointer
 * hit-testing of svg content in Chromium.
 */
export function Mermaid({
  children: chart,
  links = {},
  maxHeight = 420,
}: {
  /** Mermaid source as the element's text child, e.g. `{`flowchart…`}`. */
  children: string;
  /** Mermaid node id → wiki URL. Unlisted nodes are not clickable. */
  links?: Record<string, string>;
  /** Container height in px before zooming (the diagram scrolls beyond it). */
  maxHeight?: number;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState('');
  const [natural, setNatural] = useState(0);
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDark = useCallback(
    () => shellRef.current?.closest('html')?.classList.contains('dark') ?? false,
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;

    const render = async () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark() ? 'dark' : 'default',
        // natural pixel size: zoom scales the svg explicitly instead of
        // letting it squeeze to max-width
        flowchart: { useMaxWidth: false },
      });
      const { svg } = await mermaid.render(`mmd-${reactId}`, chart);
      if (!cancelled) setSvg(svg);
    };

    render().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[mermaid] render failed:', error);
      if (!cancelled) setSvg(`<p class="text-sm text-red-500">Diagram failed to render: ${message}</p>`);
    });

    // Re-render when the fumadocs theme flips (class on <html>).
    observer = new MutationObserver(() => void render().catch(() => undefined));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [chart, reactId, isDark]);

  // After each render: remember the natural width, fit the diagram to the
  // container, and mark linked nodes with a pointer cursor. Mermaid node
  // groups are <g class="node" id="…-flowchart-<id>-<n>>".
  const nodeId = (g: Element) => g.id.match(/flowchart-(.+)-\d+$/)?.[1];
  useEffect(() => {
    const host = shellRef.current;
    if (!svg || !host) return;
    const svgEl = host.querySelector('svg');
    const width = svgEl?.width.baseVal.value ?? 0;
    if (width > 0) setNatural(width);
    const fit = width > 0 ? Math.min(1, (host.clientWidth - 2) / width) : 1;
    setScale(fit);
    for (const g of host.querySelectorAll<SVGGElement>('g.node')) {
      if (links[nodeId(g) ?? '']) g.style.cursor = 'pointer';
    }
  }, [svg, links]);

  const fit = useCallback(() => {
    const host = shellRef.current;
    if (!host || natural === 0) return;
    setScale(Math.min(1, (host.clientWidth - 2) / natural));
  }, [natural]);

  const zoom = useCallback((factor: number) => {
    setScale((s) => Math.min(4, Math.max(0.2, s * factor)));
  }, []);

  // ctrl/cmd + wheel zooms (trackpad pinch); plain wheel scrolls natively.
  const onWheel = useCallback((event: React.WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setScale((s) => Math.min(4, Math.max(0.2, s * (event.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  // Mouse drag pans by writing to the scroll container's scroll position.
  // Touch pans natively (overflow-auto) and is left alone. A gesture that
  // traveled more than 5px is a pan — the trailing click is suppressed so
  // panning never navigates.
  const downRef = useRef<{ x: number; y: number; sl: number; st: number } | undefined>(undefined);
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    downRef.current = {
      x: event.clientX,
      y: event.clientY,
      sl: scrollRef.current?.scrollLeft ?? 0,
      st: scrollRef.current?.scrollTop ?? 0,
    };
  }, []);
  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const down = downRef.current;
    const scroller = scrollRef.current;
    if (!down || !scroller) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      scroller.scrollLeft = down.sl - dx;
      scroller.scrollTop = down.st - dy;
    }
  }, []);
  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const down = downRef.current;
      downRef.current = undefined;
      if (!down) return;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return;
      const host = scrollRef.current;
      if (!host) return;
      for (const g of host.querySelectorAll<SVGGElement>('g.node')) {
        const r = g.getBoundingClientRect();
        if (event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom) {
          const href = links[nodeId(g) ?? ''];
          if (href) window.location.assign(href);
          return;
        }
      }
    },
    [links],
  );

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div ref={shellRef} className="my-4 overflow-hidden rounded-lg border border-fd-border">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        className="mermaid-scroll cursor-grab overscroll-contain overflow-auto active:cursor-grabbing"
        style={{ height: fullscreen ? 'calc(100vh - 52px)' : maxHeight }}
      >
        <div
          className="mermaid-host mx-auto p-4 [&_svg]:max-w-none"
          style={{ width: natural > 0 ? `${natural * scale}px` : undefined }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="flex items-center justify-between border-t border-fd-border bg-fd-card px-2 py-1.5">
        <span className="hidden text-xs text-fd-muted-foreground sm:block">
          drag to pan · scroll to move · ctrl+scroll or buttons to zoom · click a highlighted workshop to open it
        </span>
        <span className="text-xs text-fd-muted-foreground sm:hidden">tap + / − to zoom</span>
        <div className="flex items-center gap-1">
          <span className="me-1 text-xs text-fd-muted-foreground">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => zoom(1 / 1.25)}
            className="rounded border border-fd-border px-2 py-0.5 text-sm hover:bg-fd-accent"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoom(1.25)}
            className="rounded border border-fd-border px-2 py-0.5 text-sm hover:bg-fd-accent"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={fit}
            className="rounded border border-fd-border px-2 py-0.5 text-xs hover:bg-fd-accent"
          >
            fit
          </button>
          <button
            type="button"
            onClick={() => {
              const el = shellRef.current;
              if (!el) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void el.requestFullscreen();
            }}
            className="rounded border border-fd-border px-2 py-0.5 text-xs hover:bg-fd-accent"
          >
            fullscreen
          </button>
        </div>
      </div>
    </div>
  );
}

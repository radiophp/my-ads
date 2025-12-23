'use client';

import type { JSX } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { useTranslations } from 'next-intl';
import type { Map as MapLibreMap, Marker as MapLibreMarker, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type PostLocationMapProps = {
  lat: number;
  lon: number;
  t: ReturnType<typeof useTranslations>;
  isRTL?: boolean;
  onReady?: () => void;
};

export function PostLocationMap({
  lat,
  lon,
  t,
  isRTL,
  onReady,
}: PostLocationMapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  }, []);
  const tileBase = useMemo(() => {
    const envBase = process.env.NEXT_PUBLIC_MAP_TILE_BASE_URL?.replace(/\/+$/, '');
    if (envBase) return envBase;
    if (typeof window !== 'undefined' && window.location.hostname.includes('dev')) {
      return 'https://dev-map.mahanfile.com';
    }
    return 'https://map.mahanfile.com';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !mapContainerRef.current) return;

        const rewriteStyle = async (): Promise<StyleSpecification> => {
          const res = await fetch(`${tileBase}/styles/basic-preview/style.json`);
          const style = (await res.json()) as StyleSpecification & { sprite?: string };

          // Drop sprite (not present) and force glyph path to same-origin
          delete style.sprite;
          style.glyphs = `${tileBase}/fonts/{fontstack}/{range}.pbf`;

          // Rewrite vector source URLs/tiles to same-origin paths
          if (style.sources) {
            Object.entries(style.sources).forEach(([key, source]) => {
              if (!source || typeof source !== 'object') return;
              if ('url' in source && typeof source.url === 'string') {
                source.url = `${tileBase}/data/v3.json`;
              }
              if ('tiles' in source && Array.isArray(source.tiles)) {
                source.tiles = source.tiles.map((u) =>
                  typeof u === 'string'
                    ? `${tileBase}/data/v3/{z}/{x}/{y}.pbf`
                    : u,
                );
              }
              style.sources[key] = source;
            });
          }
          return style;
        };

        const clampToBounds = (lngLat: [number, number]): [number, number] => {
          const minLng = 43;
          const maxLng = 64;
          const minLat = 24;
          const maxLat = 40;
          return [
            Math.min(Math.max(lngLat[0], minLng), maxLng),
            Math.min(Math.max(lngLat[1], minLat), maxLat),
          ];
        };
        const clampedCenter = clampToBounds([lon, lat]);
        const style = await rewriteStyle();
        if (cancelled || !mapContainerRef.current) return;

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style,
          center: clampedCenter,
          zoom: 14,
          maxZoom: 14,
          minZoom: 5,
          renderWorldCopies: false,
          maxBounds: [
            [43, 24],
            [64, 40],
          ],
          attributionControl: false,
          locale: isRTL ? 'fa' : 'en',
          cooperativeGestures: isTouchDevice,
        });
        mapRef.current = map;

        map.addControl(new maplibre.NavigationControl({ visualizePitch: false }), 'top-right');

        const marker = new maplibre.Marker({
          color: '#f43f5e',
        })
          .setLngLat([lon, lat])
          .addTo(map);
        markerRef.current = marker;

        // Ensure proper sizing if the map is created in a modal/hidden container
        const resize = () => map.resize();
        map.once('load', () => {
          resize();
          onReady?.();
        });
        // Resize observer to react to layout changes
        const resizeObserver =
          typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => resize())
            : null;
        resizeObserver?.observe(mapContainerRef.current);
        window.addEventListener('resize', resize);

        // Extra delayed resize as a fallback
        setTimeout(resize, 200);
        setTimeout(resize, 600);

        return () => {
          resizeObserver?.disconnect();
          window.removeEventListener('resize', resize);
        };
      } catch (error) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('Map init failed', error);
          onReady?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      const currentMap = mapRef.current as (MapLibreMap & { handlers?: { destroy?: () => void } }) | null;
      if (currentMap?.handlers?.destroy) {
        try {
          currentMap.remove();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Map teardown failed', error);
        }
      }
      mapRef.current = null;
    };
  }, [lat, lon, tileBase, isRTL]);

  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
  const prettyCoords = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-muted/30 shadow-sm">
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3',
          isRTL ? 'text-right' : '',
        )}
      >
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">{t('map.title')}</p>
        </div>
        <a
          href={osmUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          {t('map.openExternal')}
        </a>
      </div>
      <div className="relative h-64 w-full bg-muted">
        <div ref={mapContainerRef} className="size-full" />
      </div>
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground',
          isRTL ? 'flex-row-reverse text-right' : '',
        )}
      >
        <span className="truncate">
          {t('map.coordinates', {
            lat: lat.toFixed(5),
            lon: lon.toFixed(5),
            coords: prettyCoords,
          })}
        </span>
        <span className="font-mono text-foreground">{prettyCoords}</span>
      </div>
    </div>
  );
}

function cn(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

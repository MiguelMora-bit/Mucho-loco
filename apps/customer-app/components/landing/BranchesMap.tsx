'use client';

import Image from 'next/image';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Branch, Translations } from '@mucho-loco/types';

const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

interface BranchesMapProps {
  t: Translations;
  branches: Branch[];
  active: Branch;
  setActive: (b: Branch) => void;
}

// Fondo del placeholder (mientras no hay NEXT_PUBLIC_GOOGLE_MAPS_API_KEY):
// export estático de OpenStreetMap, © OpenStreetMap contributors (ODbL) —
// public/assets/map-cdmx-osm.png. Estas 3 constantes son el zoom/centro/
// tamaño EXACTOS con los que se generó esa imagen (openstreetmap.org/export,
// #map=10/19.5578/-99.2958) — si se reexporta con otro encuadre, hay que
// actualizarlas o los pines quedan mal ubicados.
const MAP_IMAGE_SRC = '/assets/map-cdmx-osm.png';
const MAP_IMAGE = { width: 1021, height: 971 };
const MAP_IMAGE_ZOOM = 10;
const MAP_IMAGE_CENTER = { lat: 19.5578, lng: -99.2958 };
// .map-wrap fija aspect-ratio: 4/3 (globals.css), más ancho que la imagen
// (1021×971, casi cuadrada) — con object-fit: cover eso recorta un poco de
// arriba y abajo para llenar el marco. Esta es esa fracción vertical visible
// tras el recorte (calculada de los dos aspect ratios), para que el % del
// pin se ubique sobre lo que en verdad se ve, no sobre la imagen completa.
const MAP_VISIBLE_Y = { start: 0.1057, span: 0.7886 };

/** Proyección Web Mercator estándar (la misma que usan los tiles de
 * OSM/Google) lat/lng → posición en la imagen de arriba, en %. */
function projectPin(b: Branch) {
  const worldPx = 256 * 2 ** MAP_IMAGE_ZOOM;
  const toMercator = (lat: number, lng: number) => {
    const x = (worldPx * (lng + 180)) / 360;
    const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
    const y = worldPx * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI));
    return { x, y };
  };
  const center = toMercator(MAP_IMAGE_CENTER.lat, MAP_IMAGE_CENTER.lng);
  const point = toMercator(b.lat, b.lng);
  const left = center.x - MAP_IMAGE.width / 2;
  const top = center.y - MAP_IMAGE.height / 2;
  const xPct = ((point.x - left) / MAP_IMAGE.width) * 100;
  const yRawPct = ((point.y - top) / MAP_IMAGE.height) * 100;
  const yPct = ((yRawPct / 100 - MAP_VISIBLE_Y.start) / MAP_VISIBLE_Y.span) * 100;
  return { left: `${xPct}%`, top: `${yPct}%` };
}

function PlaceholderMap({ t, branches, active, setActive }: BranchesMapProps) {
  return (
    <div className="map-wrap map-wrap-placeholder">
      <Image src={MAP_IMAGE_SRC} alt="" fill sizes="(max-width: 900px) 100vw, 700px" className="map-placeholder-img" priority={false} />
      <span className="map-placeholder-note">{t.branches.mapKeyMissing}</span>
      <span className="map-placeholder-credit">© OpenStreetMap contributors</span>
      {branches.map((b) => (
        <button
          key={b.id}
          type="button"
          className={'pin pin-placeholder' + (active.id === b.id ? ' active' : '') + (b.promo ? ' promo' : '')}
          style={projectPin(b)}
          onClick={() => setActive(b)}
          aria-label={b.name}
        >
          <span className="pin-glow" />
          <span className="pin-body" />
        </button>
      ))}
      <div className="map-legend">
        <span><span className="dot bg-ml-red"></span>{t.branches.legendBranch}</span>
        <span><span className="dot bg-ml-yellow"></span>{t.branches.legendSelected}</span>
        <span><span className="dot dot-promo"></span>{t.branches.promoBadge}</span>
      </div>
    </div>
  );
}

export function BranchesMap({ t, branches, active, setActive }: BranchesMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return <PlaceholderMap t={t} branches={branches} active={active} setActive={setActive} />;
  }

  return (
    <div className="map-wrap">
      <APIProvider apiKey={apiKey}>
        <Map
          className="map-svg"
          mapId={MAP_ID}
          defaultCenter={CDMX_CENTER}
          defaultZoom={10}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
        >
          {branches.map((b) => (
            <AdvancedMarker
              key={b.id}
              position={{ lat: b.lat, lng: b.lng }}
              anchorLeft="50%"
              anchorTop="50%"
              onClick={() => setActive(b)}
            >
              <div className={'pin' + (active.id === b.id ? ' active' : '') + (b.promo ? ' promo' : '')}>
                <span className="pin-glow" />
                <span className="pin-body" />
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
      <div className="map-legend">
        <span><span className="dot bg-ml-red"></span>{t.branches.legendBranch}</span>
        <span><span className="dot bg-ml-yellow"></span>{t.branches.legendSelected}</span>
        <span><span className="dot dot-promo"></span>{t.branches.promoBadge}</span>
      </div>
    </div>
  );
}

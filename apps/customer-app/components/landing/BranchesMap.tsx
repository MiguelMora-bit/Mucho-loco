'use client';

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Branch } from '@mucho-loco/types';

const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

interface BranchesMapProps {
  branches: Branch[];
  active: Branch;
  setActive: (b: Branch) => void;
}

export function BranchesMap({ branches, active, setActive }: BranchesMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="map-wrap map-wrap-empty">
        <p>
          Falta <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en <code>.env.local</code>.
          <br />Ver <code>.env.example</code>.
        </p>
      </div>
    );
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
              <div className={'pin' + (active.id === b.id ? ' active' : '')}>
                <span className="pin-glow" />
                <span className="pin-body" />
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
      <div className="map-legend">
        <span><span className="dot bg-ml-red"></span>SUCURSAL</span>
        <span><span className="dot bg-ml-yellow"></span>SELECCIONADA</span>
      </div>
    </div>
  );
}

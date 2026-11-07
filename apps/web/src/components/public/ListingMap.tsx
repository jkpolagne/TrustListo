import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { pesoShort, type Marker } from '../../lib/marketplace';

/** Naga City centre. */
export const NAGA: [number, number] = [13.6218, 123.1948];

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const priceIcon = (price: string) =>
  L.divIcon({
    className: '',
    html: `<span class="tl-pin">${esc(pesoShort(price))}</span>`,
    // Zero-size anchor at the point; the pill centers itself on it with CSS.
    iconSize: L.point(0, 0),
  });

/** Clustered price pins (SPEC §7.1 "markers clustered"). */
function Pins({ markers, fit }: { markers: Marker[]; fit: boolean }) {
  const map = useMap();
  const navigate = useNavigate();
  const fitted = useRef(false);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      iconCreateFunction: (c) =>
        L.divIcon({
          className: '',
          html: `<span class="tl-cluster">${c.getChildCount()}</span>`,
          iconSize: L.point(40, 40),
        }),
    });
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], {
        icon: priceIcon(m.price),
        title: m.title,
        keyboard: true,
      });
      marker.bindTooltip(esc(m.title), { direction: 'top', offset: [0, -14] });
      marker.on('click', () => navigate(`/properties/${m.slug}`));
      group.addLayer(marker);
    }
    map.addLayer(group);
    if (fit && !fitted.current && markers.length > 0) {
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 });
      fitted.current = true;
    }
    return () => {
      map.removeLayer(group);
    };
  }, [map, markers, navigate, fit]);

  return null;
}

/**
 * Reports the visible area after the person pans or zooms. Ignores moves the map makes by
 * itself (like zooming to fit the pins), so "Search this area" only appears when it's useful.
 */
function MoveWatcher({ onMove }: { onMove?: (bbox: string) => void }) {
  const touched = useRef(false);
  const map = useMapEvents({
    moveend: (e) => {
      if (!onMove || !touched.current) return;
      const b = e.target.getBounds();
      onMove(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(','),
      );
    },
  });
  useEffect(() => {
    const el = map.getContainer();
    const mark = () => (touched.current = true);
    el.addEventListener('pointerdown', mark);
    el.addEventListener('wheel', mark, { passive: true });
    el.addEventListener('keydown', mark);
    return () => {
      el.removeEventListener('pointerdown', mark);
      el.removeEventListener('wheel', mark);
      el.removeEventListener('keydown', mark);
    };
  }, [map]);
  return null;
}

export function ListingMap({
  markers,
  onMove,
  fit = true,
  center = NAGA,
  zoom = 13,
  className = 'h-[70vh]',
}: {
  markers: Marker[];
  onMove?: (bbox: string) => void;
  fit?: boolean;
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className={`z-0 w-full overflow-hidden rounded-2xl border border-line ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Pins markers={markers} fit={fit} />
      <MoveWatcher onMove={onMove} />
    </MapContainer>
  );
}

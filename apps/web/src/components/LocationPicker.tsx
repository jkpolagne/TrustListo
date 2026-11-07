import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { NAGA } from './public/ListingMap';

const pin = L.divIcon({
  className: '',
  html: '<span class="tl-pin">Here</span>',
  iconSize: L.point(0, 0),
});

function ClickToPlace({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }),
  });
  return null;
}

/** Click the map to set a location. Used for projects and units. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number } | null) => void;
}) {
  return (
    <div>
      <MapContainer
        center={value ? [value.lat, value.lng] : NAGA}
        zoom={value ? 15 : 13}
        className="z-0 h-64 w-full overflow-hidden rounded-xl border border-line"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onPick={onChange} />
        {value && <Marker position={[value.lat, value.lng]} icon={pin} />}
      </MapContainer>
      <p className="mt-1.5 flex justify-between text-xs text-muted">
        <span>
          {value
            ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : 'Click the map to place the pin.'}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-semibold hover:text-ink"
          >
            Remove pin
          </button>
        )}
      </p>
    </div>
  );
}

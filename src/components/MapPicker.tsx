import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

const AnyMapContainer = MapContainer as any;
const AnyTileLayer = TileLayer as any;
const AnyMarker = Marker as any;
const AnyPopup = Popup as any;

export type PickedLocation = {
  lat: number;
  lng: number;
  address?: string;
};

export type MapPickerValue = {
  origin?: PickedLocation;
  destination?: PickedLocation;
};

type Props = {
  value: MapPickerValue;
  onChange: (v: MapPickerValue) => void;
};

const delhiCenter: LatLngExpression = [28.6139, 77.209];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const fetchReverseGeocode = async (lat: number, lng: number): Promise<string | undefined> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const json = await res.json();
    return json?.display_name as string | undefined;
  } catch {
    return undefined;
  }
};

const fetchSearch = async (q: string) => {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
  return (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
};

export const MapPicker = ({ value, onChange }: Props) => {
  const [picking, setPicking] = useState<"origin" | "destination">("origin");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const searchIdRef = useRef(0);

  const center = useMemo<LatLngExpression>(() => {
    if (value.origin) return [value.origin.lat, value.origin.lng] as LatLngExpression;
    return delhiCenter;
  }, [value.origin]);

  const onPick = useCallback(async (lat: number, lng: number) => {
    const address = await fetchReverseGeocode(lat, lng);
    const loc = { lat, lng, address };
    if (picking === "origin") onChange({ ...value, origin: loc });
    else onChange({ ...value, destination: loc });
  }, [onChange, picking, value]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const id = ++searchIdRef.current;
    const t = setTimeout(async () => {
      const raw = await fetchSearch(query.trim());
      if (searchIdRef.current !== id) return;
      setResults(raw.slice(0, 5).map(r => ({ name: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-sm">Picking: <span className="font-medium">{picking}</span></div>
        <button type="button" className="rounded border px-2 py-1 text-sm hover:bg-accent" onClick={() => setPicking(p => p === "origin" ? "destination" : "origin")}>Swap</button>
        <input
          className="flex-1 rounded border bg-background px-3 py-2 text-sm"
          placeholder="Search address or place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div className="rounded border bg-card p-2 text-sm">
          {results.map(r => (
            <button key={`${r.lat}-${r.lng}`} type="button" className="block w-full rounded px-2 py-1 text-left hover:bg-accent" onClick={() => {
              onPick(r.lat, r.lng);
              setQuery("");
              setResults([]);
            }}>{r.name}</button>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        <AnyMapContainer center={center} zoom={11} scrollWheelZoom={false} className="h-72 w-full">
          <AnyTileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={onPick} />
          {value.origin && (
            <AnyMarker position={[value.origin.lat, value.origin.lng]}>
              <AnyPopup>Origin{value.origin.address ? `: ${value.origin.address}` : ""}</AnyPopup>
            </AnyMarker>
          )}
          {value.destination && (
            <AnyMarker position={[value.destination.lat, value.destination.lng]}>
              <AnyPopup>Destination{value.destination.address ? `: ${value.destination.address}` : ""}</AnyPopup>
            </AnyMarker>
          )}
        </AnyMapContainer>
      </div>
      <div className="grid gap-2 text-sm">
        <div>
          <span className="font-medium">Origin:</span> {value.origin ? (value.origin.address ?? `${value.origin.lat.toFixed(5)}, ${value.origin.lng.toFixed(5)}`) : "Click map or search"}
        </div>
        <div>
          <span className="font-medium">Destination:</span> {value.destination ? (value.destination.address ?? `${value.destination.lat.toFixed(5)}, ${value.destination.lng.toFixed(5)}`) : "Click map or search"}
        </div>
      </div>
    </div>
  );
};

export default MapPicker;

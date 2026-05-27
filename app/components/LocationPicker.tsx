"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface NearbyPlace {
  lat: number;
  lng: number;
  name: string;
  type: string;
  distance: number;
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface LocationPickerProps {
  onSelect: (lat: number, lng: number, name?: string) => void;
  onClose: () => void;
}

function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LocationPicker({ onSelect, onClose }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const placeMarkers = useRef<L.Marker[]>([]);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        setLoading(false);
        setSelectedPlace({ lat: loc.lat, lng: loc.lng, name: "My Location" });
      },
      () => {
        const loc = { lat: -6.2088, lng: 106.8456 };
        setMyLocation(loc);
        setLoading(false);
        setSelectedPlace({ lat: loc.lat, lng: loc.lng, name: "My Location" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  async function fetchNearbyPlaces(lat: number, lng: number) {
    setPlacesLoading(true);
    const query = `[out:json];
      (
        node["amenity"](around:500,${lat},${lng});
        node["shop"](around:500,${lat},${lng});
        node["tourism"](around:500,${lat},${lng});
        node["leisure"](around:500,${lat},${lng});
      );
      out center 10;`;

    try {
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await res.json();
      const nearby: NearbyPlace[] = (data.elements || [])
        .filter((el: OverpassElement) => el.tags?.name && (el.lat || el.center?.lat) && (el.lon || el.center?.lon))
        .map((el: OverpassElement) => {
          const elLat = el.lat ?? el.center!.lat;
          const elLng = el.lon ?? el.center!.lon;
          const d = distance(lat, lng, elLat, elLng);
          return {
            lat: elLat,
            lng: elLng,
            name: el.tags!.name,
            type: el.tags?.amenity || el.tags?.shop || el.tags?.tourism || el.tags?.leisure || "place",
            distance: Math.round(d * 100) / 100,
          };
        })
        .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
        .slice(0, 10);
      setPlaces(nearby);
      addPlaceMarkers(nearby);
    } catch {
      // ignore
    } finally {
      setPlacesLoading(false);
    }
  }

  function addPlaceMarkers(nearby: NearbyPlace[]) {
    if (!mapInstance.current) return;
    placeMarkers.current.forEach((m) => m.remove());
    placeMarkers.current = [];

    nearby.forEach((place) => {
      const icon = L.divIcon({
        html: `<div style="background:#fff;border:2px solid #25D366;border-radius:8px;padding:2px 6px;font-size:11px;font-weight:600;white-space:nowrap;color:#075E54;box-shadow:0 1px 3px rgba(0,0,0,0.2)">${place.name}</div>`,
        className: "",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([place.lat, place.lng], { icon }).addTo(mapInstance.current!);
      marker.bindPopup(`<b>${place.name}</b><br/>${place.distance} km · ${place.type}`);
      marker.on("click", () => {
        setSelectedPlace({ lat: place.lat, lng: place.lng, name: place.name });
        userMarker.current?.setLatLng([place.lat, place.lng]);
        mapInstance.current?.setView([place.lat, place.lng], 16);
      });
      placeMarkers.current.push(marker);
    });
  }

  useEffect(() => {
    if (!myLocation || !mapRef.current || mapInstance.current) return;

    // Fix Leaflet default icon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current).setView([myLocation.lat, myLocation.lng], 15);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker([myLocation.lat, myLocation.lng], { draggable: true }).addTo(map);
    marker.bindPopup("<b>Your location</b><br/>Drag to adjust").openPopup();
    userMarker.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setSelectedPlace({ lat: pos.lat, lng: pos.lng, name: "Custom location" });
      fetchNearbyPlaces(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedPlace({ lat, lng, name: "Custom location" });
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 16);
      fetchNearbyPlaces(lat, lng);
    });

    fetchNearbyPlaces(myLocation.lat, myLocation.lng);
  }, [myLocation]);

  function handleSelectPlace(place: NearbyPlace) {
    setSelectedPlace({ lat: place.lat, lng: place.lng, name: place.name });
    userMarker.current?.setLatLng([place.lat, place.lng]);
    mapInstance.current?.setView([place.lat, place.lng], 16);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#075E54]">Pick Location</h2>
            <p className="text-xs text-zinc-400">Click on the map or select a nearby place</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Detecting your location...
              </div>
            </div>
          ) : (
            <>
              <div ref={mapRef} className="h-64 w-full rounded-lg border border-zinc-200" />

              {placesLoading ? (
                <div className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-zinc-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding nearby places...
                </div>
              ) : places.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-zinc-500">NEARBY PLACES</p>
                  <div className="flex flex-wrap gap-2">
                    {places.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPlace(p)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          selectedPlace?.lat === p.lat && selectedPlace?.lng === p.lng
                            ? "border-[#25D366] bg-[#DCF8C6] text-[#075E54]"
                            : "border-zinc-200 text-zinc-600 hover:border-[#25D366]"
                        }`}
                      >
                        <span className="block font-medium">{p.name}</span>
                        <span className="text-[10px] text-zinc-400">{p.distance} km</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedPlace && (
                <div className="mt-4 rounded-lg border border-[#DCF8C6] bg-[#f0fdf4] px-4 py-3">
                  <p className="text-sm text-[#075E54]">
                    {selectedPlace.name}
                    {selectedPlace.name !== "My Location" && (
                      <span className="ml-2 text-xs text-zinc-400">
                        ({selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)})
                      </span>
                    )}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (selectedPlace) onSelect(selectedPlace.lat, selectedPlace.lng, selectedPlace.name);
                }}
                disabled={!selectedPlace}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1DAF5A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Use This Location
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Leaflet map helpers — single place where the web app's maps are configured.
 *
 * Every map in the app is a Leaflet map over OpenStreetMap tiles, so no API key
 * or third-party script tag is needed. Import `L` from here (instead of directly
 * from 'leaflet') so the stylesheet is always loaded alongside it.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };
export type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

/** Default map center: Manila. */
export const MANILA: L.LatLngTuple = [14.5995, 120.9842];
/** Whole-country view, used when we have no better guess. */
export const PHILIPPINES_CENTER: L.LatLngTuple = [12.8797, 121.774];

export type TileStyle = 'street' | 'light';

const TILE_PRESETS: Record<TileStyle, { url: string; attribution: string; maxZoom: number }> = {
  // Standard OSM raster tiles — best label coverage for picking an exact spot.
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  // Muted basemap for small preview maps, where POI clutter gets in the way.
  light: {
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
};

export interface CreateMapOptions extends L.MapOptions {
  tileStyle?: TileStyle;
  /** Non-interactive preview: no dragging, zooming or keyboard control. */
  staticMap?: boolean;
}

/**
 * Create a map with a tile layer already attached.
 * Callers own the returned map and must call `map.remove()` on unmount.
 */
export function createMap(container: HTMLElement, options: CreateMapOptions = {}): L.Map {
  const { tileStyle = 'street', staticMap = false, ...mapOptions } = options;

  const map = L.map(container, {
    center: MANILA,
    zoom: 13,
    zoomControl: false,
    zoomSnap: 0.25,
    ...(staticMap
      ? {
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
        }
      : {}),
    ...mapOptions,
  });

  if (staticMap) container.classList.add('pp-map-static');

  const preset = TILE_PRESETS[tileStyle] || TILE_PRESETS.street;
  L.tileLayer(preset.url, {
    attribution: preset.attribution,
    maxZoom: preset.maxZoom,
    detectRetina: true,
  }).addTo(map);

  // Containers that animate in (modals, sliding panels, tabs) can still be
  // zero-sized on the first frame — recheck once the layout settles so the
  // tiles fill the view instead of leaving a grey box.
  const settle = () => {
    if (container.isConnected && container.clientWidth > 0) map.invalidateSize();
  };
  requestAnimationFrame(settle);
  setTimeout(settle, 300);

  return map;
}

/** The teardrop court pin used for location markers. */
export function createPinIcon(width = 42, height = 60): L.Icon {
  return L.icon({
    iconUrl: '/images/PinMarker.png',
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 4],
  });
}

export interface DotIconOptions {
  /** Diameter of the coloured dot in pixels. */
  size?: number;
  color?: string;
  ringColor?: string;
  ringWidth?: number;
  opacity?: number;
}

/** A filled circle marker with a white ring — replaces the old Google circle symbol. */
export function createDotIcon({
  size = 28,
  color = '#2563eb',
  ringColor = '#ffffff',
  ringWidth = 3,
  opacity = 1,
}: DotIconOptions = {}): L.DivIcon {
  const outer = size + ringWidth * 2;
  return L.divIcon({
    className: 'pp-map-dot',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${ringWidth}px solid ${ringColor};opacity:${opacity};box-sizing:content-box;box-shadow:0 1px 4px rgba(15,23,42,0.25);"></span>`,
    iconSize: [outer, outer],
    iconAnchor: [outer / 2, outer / 2],
    popupAnchor: [0, -outer / 2],
  });
}

/** Shared popup styling for map info bubbles (see `.pp-map-popup` in index.css). */
export const POPUP_OPTIONS: L.PopupOptions = {
  className: 'pp-map-popup',
  closeButton: false,
  autoPan: false,
  maxWidth: 240,
  minWidth: 220,
  offset: [0, -4],
};

/** Animated pan + zoom, the Leaflet equivalent of panTo() followed by a smooth zoom. */
export function flyTo(
  map: L.Map,
  lat: number,
  lng: number,
  zoom?: number,
  duration = 0.7
): void {
  map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration });
}

/**
 * Recalculate the map size after its container was resized or revealed.
 * Replaces `google.maps.event.trigger(map, 'resize')`.
 */
export function refreshMapSize(map: L.Map | null): void {
  if (map) map.invalidateSize();
}

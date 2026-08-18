/**
 * Geocoding for the web app — backed by OpenStreetMap / Nominatim (keyless).
 *
 * Results are shaped like the Google Geocoding API (`address_components` +
 * `formatted_address`) so the address parsers already used across the app
 * (see parseAddress in CourtOwnerVerificationForm) keep working unchanged.
 *
 * Nominatim's usage policy allows ~1 request/second, so every call goes through
 * a serialized queue and an in-memory cache.
 */

export interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GeocodeResult {
  formatted_address: string;
  address_components: GeocodeAddressComponent[];
  location: { lat: number; lng: number };
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_GAP_MS = 1100;
const CACHE_LIMIT = 200;

/** Nominatim address key -> Google address_component types. First match wins per key. */
const COMPONENT_TYPE_MAP: Array<[string, string[]]> = [
  ['house_number', ['street_number']],
  ['road', ['route']],
  ['pedestrian', ['route']],
  ['residential', ['route']],
  ['neighbourhood', ['neighborhood', 'sublocality', 'sublocality_level_1']],
  ['quarter', ['neighborhood', 'sublocality', 'sublocality_level_1']],
  ['suburb', ['sublocality', 'sublocality_level_1']],
  ['village', ['sublocality', 'sublocality_level_1']],
  ['hamlet', ['sublocality', 'sublocality_level_1']],
  ['city_district', ['sublocality', 'sublocality_level_1']],
  ['city', ['locality']],
  ['town', ['locality']],
  ['municipality', ['locality']],
  ['county', ['administrative_area_level_2']],
  ['province', ['administrative_area_level_2']],
  ['state', ['administrative_area_level_1']],
  ['region', ['administrative_area_level_1']],
  ['postcode', ['postal_code']],
  ['country', ['country']],
];

const cache = new Map<string, GeocodeResult | null>();

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Run `task` after the previous one finished, respecting the Nominatim rate limit. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const sinceLast = Date.now() - lastRequestAt;
    if (sinceLast < MIN_REQUEST_GAP_MS) await delay(MIN_REQUEST_GAP_MS - sinceLast);
    lastRequestAt = Date.now();
    return task();
  });
  // Keep the chain alive even when a task rejects.
  queue = run.catch(() => undefined);
  return run;
}

function remember(key: string, value: GeocodeResult | null): GeocodeResult | null {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

function toAddressComponents(address: Record<string, string> | undefined): GeocodeAddressComponent[] {
  if (!address) return [];
  const components: GeocodeAddressComponent[] = [];
  const usedTypes = new Set<string>();

  for (const [key, types] of COMPONENT_TYPE_MAP) {
    const value = address[key];
    if (!value) continue;
    // Don't let a broader key (e.g. `village`) override one already filled by a
    // more specific one (e.g. `suburb`).
    const freshTypes = types.filter(t => !usedTypes.has(t));
    if (freshTypes.length === 0) continue;
    freshTypes.forEach(t => usedTypes.add(t));
    components.push({
      long_name: value,
      short_name: key === 'country' ? (address.country_code || value).toUpperCase() : value,
      types: freshTypes,
    });
  }

  return components;
}

function toGeocodeResult(item: any): GeocodeResult | null {
  const lat = parseFloat(item?.lat);
  const lng = parseFloat(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    formatted_address: item.display_name || '',
    address_components: toAddressComponents(item.address),
    location: { lat, lng },
  };
}

async function fetchNominatim(path: string): Promise<any | null> {
  try {
    const response = await fetch(`${NOMINATIM_BASE}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('Geocoding request failed:', err);
    return null;
  }
}

/**
 * Forward geocode a free-text address. Biased to the Philippines by default.
 */
export async function geocodeAddress(
  query: string,
  options: { countryCodes?: string } = {}
): Promise<GeocodeResult | null> {
  const trimmed = (query || '').trim();
  if (!trimmed) return null;

  const countryCodes = options.countryCodes ?? 'ph';
  const cacheKey = `search:${countryCodes}:${trimmed.toLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
  });
  if (countryCodes) params.set('countrycodes', countryCodes);

  const data = await enqueue(() => fetchNominatim(`/search?${params.toString()}`));
  const result = Array.isArray(data) && data.length > 0 ? toGeocodeResult(data[0]) : null;
  return remember(cacheKey, result);
}

/**
 * Forward geocode and return just the coordinates — the common case when a form
 * only needs to drop a pin for the address the user typed.
 */
export async function geocodeToCoords(
  query: string,
  options: { countryCodes?: string } = {}
): Promise<{ lat: number; lng: number } | null> {
  const result = await geocodeAddress(query, options);
  return result ? result.location : null;
}

/**
 * Reverse geocode coordinates into a Google-shaped address result.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cacheKey = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  });

  const data = await enqueue(() => fetchNominatim(`/reverse?${params.toString()}`));
  const result = data && !data.error ? toGeocodeResult(data) : null;
  return remember(cacheKey, result);
}

/** Convenience helper: read one component value out of a geocode result. */
export function getComponent(result: GeocodeResult | null, types: string[]): string {
  if (!result) return '';
  const match = result.address_components.find(c => types.some(t => c.types.includes(t)));
  return match?.long_name || '';
}

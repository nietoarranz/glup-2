export type NearbyPlace = {
  id: string
  lat: number
  lon: number
  name?: string
}

export type AmenityKind = 'fountains' | 'toilets'

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements?: OverpassElement[]
  remark?: string
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

const SEARCH_RADIUS_METERS = 1000
const QUERY_TIMEOUT_SECONDS = 8
const FETCH_TIMEOUT_MS = 5_000
const CACHE_TTL_MS = 5 * 60 * 1_000
const CACHE_COORD_DECIMALS = 3

const OSM_AMENITY: Record<AmenityKind, string> = {
  fountains: 'drinking_water',
  toilets: 'toilets',
}

export const AMENITY_LABEL: Record<AmenityKind, string> = {
  fountains: 'Drinking fountain',
  toilets: 'Public toilet',
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504, 509])

type CacheEntry = {
  places: NearbyPlace[]
  expiresAt: number
}

const resultCache = new Map<string, CacheEntry>()
let preferredEndpoint: string | null = null

function cacheKey(kind: AmenityKind, lat: number, lon: number) {
  return `${kind}:${lat.toFixed(CACHE_COORD_DECIMALS)}:${lon.toFixed(CACHE_COORD_DECIMALS)}`
}

function readCache(key: string): NearbyPlace[] | null {
  const entry = resultCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    resultCache.delete(key)
    return null
  }
  return entry.places
}

function writeCache(key: string, places: NearbyPlace[]) {
  resultCache.set(key, { places, expiresAt: Date.now() + CACHE_TTL_MS })
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function endpointOrder(): string[] {
  const rest = shuffle(
    OVERPASS_ENDPOINTS.filter((url) => url !== preferredEndpoint),
  )
  return preferredEndpoint ? [preferredEndpoint, ...rest] : rest
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)

  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    })
  }
  return controller.signal
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)

  const controller = new AbortController()
  setTimeout(() => {
    controller.abort(new DOMException('Timeout', 'TimeoutError'))
  }, ms)
  return controller.signal
}

function parsePlaces(data: OverpassResponse): NearbyPlace[] {
  return (data.elements ?? [])
    .map((element): NearbyPlace | null => {
      const coordinates =
        element.type === 'node'
          ? { lat: element.lat, lon: element.lon }
          : element.center

      if (coordinates?.lat == null || coordinates.lon == null) return null

      return {
        id: `${element.type}/${element.id}`,
        lat: coordinates.lat,
        lon: coordinates.lon,
        name: element.tags?.name,
      }
    })
    .filter((place): place is NearbyPlace => place !== null)
}

async function fetchFromEndpoint(
  url: string,
  query: string,
  signal?: AbortSignal,
): Promise<NearbyPlace[]> {
  const signals = [timeoutSignal(FETCH_TIMEOUT_MS)]
  if (signal) signals.unshift(signal)

  const response = await fetch(url, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: combineSignals(signals),
  })

  if (!response.ok) {
    const error = new Error(`Overpass request failed (${response.status})`)
    if (RETRYABLE_STATUS.has(response.status)) throw error
    throw Object.assign(error, { fatal: true })
  }

  const data = (await response.json()) as OverpassResponse
  if (data.remark && /error|timeout|too busy/i.test(data.remark)) {
    throw new Error(data.remark)
  }

  return parsePlaces(data)
}

export async function fetchNearbyPlaces(
  kind: AmenityKind,
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<NearbyPlace[]> {
  const key = cacheKey(kind, lat, lon)
  const cached = readCache(key)
  if (cached) return cached

  const amenity = OSM_AMENITY[kind]
  const query = `
    [out:json][timeout:${QUERY_TIMEOUT_SECONDS}][maxsize:16777216];
    (
      node["amenity"="${amenity}"](around:${SEARCH_RADIUS_METERS},${lat},${lon});
      way["amenity"="${amenity}"](around:${SEARCH_RADIUS_METERS},${lat},${lon});
    );
    out center;
  `

  let lastError: unknown
  for (const url of endpointOrder()) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')

    try {
      const places = await fetchFromEndpoint(url, query, signal)
      preferredEndpoint = url
      writeCache(key, places)
      return places
    } catch (error) {
      if (signal?.aborted) throw error
      if (error && typeof error === 'object' && 'fatal' in error) throw error
      lastError = error
      if (preferredEndpoint === url) preferredEndpoint = null
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Overpass request failed')
}

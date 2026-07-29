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
  elements: OverpassElement[]
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const SEARCH_RADIUS_METERS = 1000

const OSM_AMENITY: Record<AmenityKind, string> = {
  fountains: 'drinking_water',
  toilets: 'toilets',
}

export const AMENITY_LABEL: Record<AmenityKind, string> = {
  fountains: 'Drinking fountain',
  toilets: 'Public toilet',
}

export async function fetchNearbyPlaces(
  kind: AmenityKind,
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<NearbyPlace[]> {
  const amenity = OSM_AMENITY[kind]
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="${amenity}"](around:${SEARCH_RADIUS_METERS},${lat},${lon});
      way["amenity"="${amenity}"](around:${SEARCH_RADIUS_METERS},${lat},${lon});
    );
    out center;
  `

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Overpass request failed (${response.status})`)
  }

  const data = (await response.json()) as OverpassResponse

  return data.elements
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

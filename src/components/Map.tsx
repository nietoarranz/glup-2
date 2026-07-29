import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPinnedIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
import fountainPinSvg from '../assets/fountain-pin.svg?raw'
import toiletPinSvg from '../assets/toilet-pin.svg?raw'
import {
  AMENITY_LABEL,
  fetchNearbyPlaces,
  type AmenityKind,
  type NearbyPlace,
} from '../lib/nearbyPlaces'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168] // Madrid
const PLACE_MARKER_HEIGHT = 55

const PIN_SVG: Record<AmenityKind, string> = {
  fountains: fountainPinSvg,
  toilets: toiletPinSvg,
}

type SelectedPlace = {
  id: string
  name: string
  lng: number
  lat: number
}

function mapsAppUrl(lat: number, lng: number, name: string) {
  const query = `${lat},${lng}`
  const label = encodeURIComponent(name)
  const ua = navigator.userAgent

  // iOS: Apple Maps (system default). Android: geo: opens the default maps app.
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return `https://maps.apple.com/?ll=${query}&q=${label}`
  }
  if (/Android/i.test(ua)) {
    return `geo:0,0?q=${query}(${label})`
  }
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function createPlaceMarkerElement(kind: AmenityKind) {
  const el = document.createElement('div')
  el.className = 'place-marker'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = PIN_SVG[kind]
  return el
}

type MapProps = {
  amenity: AmenityKind
  onBack: () => void
}

export default function Map({ amenity, onBack }: MapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const placeMarkersRef = useRef<mapboxgl.Marker[]>([])
  const searchAbortRef = useRef<AbortController | null>(null)
  const ignoreMoveEndRef = useRef(false)
  const mapSearchRef = useRef<
    ((lat: number, lon: number) => Promise<void>) | null
  >(null)
  const selectedPlaceRef = useRef<SelectedPlace | null>(null)

  const [showSearchHere, setShowSearchHere] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null)
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(
    null,
  )

  selectedPlaceRef.current = selectedPlace

  const updateAnchorPoint = useCallback(() => {
    const map = mapRef.current
    const place = selectedPlaceRef.current
    if (!map || !place) {
      setAnchorPoint(null)
      return
    }

    const point = map.project([place.lng, place.lat])
    const next = { x: point.x, y: point.y - PLACE_MARKER_HEIGHT }
    setAnchorPoint((prev) =>
      prev && prev.x === next.x && prev.y === next.y ? prev : next,
    )
  }, [])

  useEffect(() => {
    if (!selectedPlace) {
      setAnchorPoint(null)
      return
    }

    updateAnchorPoint()

    const map = mapRef.current
    if (!map) return

    map.on('move', updateAnchorPoint)
    map.on('moveend', updateAnchorPoint)
    map.on('zoom', updateAnchorPoint)
    map.on('zoomend', updateAnchorPoint)
    map.on('resize', updateAnchorPoint)
    map.on('render', updateAnchorPoint)

    return () => {
      map.off('move', updateAnchorPoint)
      map.off('moveend', updateAnchorPoint)
      map.off('zoom', updateAnchorPoint)
      map.off('zoomend', updateAnchorPoint)
      map.off('resize', updateAnchorPoint)
      map.off('render', updateAnchorPoint)
    }
  }, [selectedPlace, updateAnchorPoint])

  useEffect(() => {
    if (!mapContainerRef.current || !accessToken) return

    const map = new mapboxgl.Map({
      accessToken,
      container: mapContainerRef.current,
      style: 'mapbox://styles/quiquenieto/cmrteufl100be01qkf9bc9dw4',
      center: DEFAULT_CENTER,
      zoom: 11,
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 10_000,
      },
      fitBoundsOptions: {
        maxZoom: 15,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    })
    map.addControl(geolocate, 'top-right')

    const clearPlaceMarkers = () => {
      for (const marker of placeMarkersRef.current) marker.remove()
      placeMarkersRef.current = []
      setSelectedPlace(null)
    }

    const addPlaceMarkers = (places: NearbyPlace[]) => {
      clearPlaceMarkers()

      for (const place of places) {
        const element = createPlaceMarkerElement(amenity)
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          setSelectedPlace({
            id: place.id,
            name: place.name ?? AMENITY_LABEL[amenity],
            lng: place.lon,
            lat: place.lat,
          })
        })

        const marker = new mapboxgl.Marker({
          element,
          anchor: 'bottom',
        })
          .setLngLat([place.lon, place.lat])
          .addTo(map)

        placeMarkersRef.current.push(marker)
      }
    }

    const searchAt = async (
      lat: number,
      lon: number,
      { showLoading = true }: { showLoading?: boolean } = {},
    ) => {
      searchAbortRef.current?.abort()
      const abortController = new AbortController()
      searchAbortRef.current = abortController

      if (showLoading) setIsSearching(true)
      setShowSearchHere(false)

      try {
        const places = await fetchNearbyPlaces(
          amenity,
          lat,
          lon,
          abortController.signal,
        )
        if (abortController.signal.aborted) return
        addPlaceMarkers(places)
      } catch (error) {
        if (abortController.signal.aborted) return
        console.error(`Could not load nearby ${amenity}`, error)
      } finally {
        if (!abortController.signal.aborted && showLoading) {
          setIsSearching(false)
        }
      }
    }

    mapSearchRef.current = (lat, lon) => searchAt(lat, lon)

    const onMoveEnd = () => {
      if (ignoreMoveEndRef.current) {
        ignoreMoveEndRef.current = false
        return
      }
      setShowSearchHere(true)
    }

    const onMapClick = () => {
      setSelectedPlace(null)
    }

    map.on('moveend', onMoveEnd)
    map.on('click', onMapClick)

    let hasInitialSearch = false

    const onGeolocate = (position: GeolocationPosition) => {
      if (hasInitialSearch) return
      hasInitialSearch = true

      const { latitude, longitude } = position.coords
      void searchAt(latitude, longitude, { showLoading: false })
    }

    const onGeolocateError = (error: GeolocationPositionError) => {
      console.error('Could not get current location', error)
    }

    geolocate.on('geolocate', onGeolocate)
    geolocate.on('error', onGeolocateError)

    map.once('load', () => {
      ignoreMoveEndRef.current = true
      geolocate.trigger()
    })

    return () => {
      searchAbortRef.current?.abort()
      mapSearchRef.current = null
      map.off('moveend', onMoveEnd)
      map.off('click', onMapClick)
      geolocate.off('geolocate', onGeolocate)
      geolocate.off('error', onGeolocateError)
      clearPlaceMarkers()
      map.remove()
      mapRef.current = null
    }
  }, [amenity])

  const handleSearchHere = () => {
    const map = mapRef.current
    if (!map || !mapSearchRef.current) return

    const center = map.getCenter()
    void mapSearchRef.current(center.lat, center.lng)
  }

  if (!accessToken) {
    return (
      <div className="map-missing-token">
        <h1>Mapbox token missing</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env</code> and set{' '}
          <code>VITE_MAPBOX_ACCESS_TOKEN</code> to your public token from{' '}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
          >
            Mapbox
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="map-shell">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="absolute top-4 left-4 z-10"
        onClick={onBack}
      >
        ← Back
      </Button>
      <div className="map-container" ref={mapContainerRef} />
      {(showSearchHere || isSearching) && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
          onClick={handleSearchHere}
          disabled={isSearching}
        >
          {isSearching ? 'Searching…' : 'Search here'}
        </Button>
      )}

      {selectedPlace && anchorPoint && (
        <div
          role="dialog"
          aria-label={selectedPlace.name}
          className="pointer-events-auto absolute z-50 flex w-auto -translate-x-1/2 -translate-y-full flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
          style={{
            left: anchorPoint.x,
            top: anchorPoint.y - 8,
          }}
        >
          <PopoverHeader className="flex-row items-center justify-between gap-3">
            <PopoverTitle>{selectedPlace.name}</PopoverTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              onClick={() => setSelectedPlace(null)}
            >
              <XIcon />
            </Button>
          </PopoverHeader>
          <Button asChild size="sm" className="w-full">
            <a
              href={mapsAppUrl(
                selectedPlace.lat,
                selectedPlace.lng,
                selectedPlace.name,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPinnedIcon data-icon="inline-start" />
              Open in Maps App
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

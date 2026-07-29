import { useState } from 'react'
import Home from './components/Home'
import Map from './components/Map'
import type { AmenityKind } from './lib/nearbyPlaces'
import './App.css'

function App() {
  const [amenity, setAmenity] = useState<AmenityKind | null>(null)

  return (
    <main className="app">
      {amenity ? (
        <Map amenity={amenity} onBack={() => setAmenity(null)} />
      ) : (
        <Home onSelect={setAmenity} />
      )}
    </main>
  )
}

export default App

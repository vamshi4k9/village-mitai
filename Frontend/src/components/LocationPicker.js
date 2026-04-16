import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useState } from 'react'

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN

function LocationPicker({ onLocationSelect }) {
  const [viewState, setViewState] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    zoom: 12
  })

  const [selectedLocation, setSelectedLocation] = useState(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  // 🔍 SEARCH
  const handleSearch = async (value) => {
    setSearch(value)

    if (!value) {
      setResults([])
      return
    }

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${value}.json?access_token=${MAPBOX_TOKEN}`
    )
    const data = await res.json()
    setResults(data.features || [])
  }

  const selectPlace = (place) => {
    const [lng, lat] = place.center

    setViewState({
      latitude: lat,
      longitude: lng,
      zoom: 14
    })

    setSelectedLocation({ lat, lng })
    setSearch(place.place_name)
    setResults([])

    onLocationSelect && onLocationSelect({ lat, lng })
  }

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      setViewState({
        latitude: lat,
        longitude: lng,
        zoom: 14
      })

      setSelectedLocation({ lat, lng })
      onLocationSelect && onLocationSelect({ lat, lng })
    })
  }

  const handleClick = (e) => {
    const { lng, lat } = e.lngLat

    setSelectedLocation({ lat, lng })

    onLocationSelect && onLocationSelect({ lat, lng })
  }

  return (
    <div style={{ position: 'relative' }}>

      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        zIndex: 2
      }}>
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search location..."
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            outline: 'none'
          }}
        />

        {results.length > 0 && (
          <div style={{
            background: 'white',
            maxHeight: 200,
            overflowY: 'auto',
            borderRadius: '8px',
            marginTop: '5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            {results.map((r) => (
              <div
                key={r.id}
                onClick={() => selectPlace(r)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                {r.place_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={getCurrentLocation}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 6,
          zIndex: 2,
          padding: '5px',
          borderRadius: '50%',
          background: 'white',
          border: '1px solid #ddd',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            d="M12 2L19 21L12 17L5 21L12 2Z"
            fill="#4b2a0d"
          />
        </svg>

      </button>

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleClick}
        style={{
          width: '100%',
          height: 300,
          borderRadius: '10px'
        }}
        attributionControl={false}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >

        {selectedLocation && (
          <Marker
            longitude={selectedLocation.lng}
            latitude={selectedLocation.lat}
            anchor="bottom"
          >
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path
                d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"
                fill="#4b2a0d"
              />
              <circle cx="12" cy="9" r="3" fill="white" />
            </svg>
          </Marker>
        )}

      </Map>

    </div>
  )
}

export default LocationPicker
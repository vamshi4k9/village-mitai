import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Location marker that responds to clicks & updates map center
function LocationMarker({ position, setPosition, onLocationSelect, mapRef }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng);
      mapRef.current?.flyTo(e.latlng, 16);
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>
        Selected Location:
        <br />
        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  ) : null;
}

export default function LocationPicker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default Bangalore
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const mapRef = useRef();

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Function to get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(latlng);
        setMapCenter([latlng.lat, latlng.lng]);
        onLocationSelect(latlng);
        setIsLoadingLocation(false);
        mapRef.current?.flyTo(latlng, 16);
      },
      (err) => {
        console.warn("Unable to get location:", err);
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    );
  };

  // Search location
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const latlng = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setPosition(latlng);
        setMapCenter([latlng.lat, latlng.lng]);
        onLocationSelect(latlng);
        mapRef.current?.flyTo(latlng, 16);
      } else {
        alert("No results found");
      }
    } catch (err) {
      console.error("Search error:", err);
      alert("Search failed");
    }
  };

  // Handle Enter key
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div>
      {/* Search & Current Location controls */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          type="text"
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          style={{
            background: "#4b2a0d",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: searchQuery.trim() ? "pointer" : "not-allowed",
            opacity: searchQuery.trim() ? 1 : 0.6,
          }}
        >
          🔍 Search
        </button>
        <button
          onClick={getCurrentLocation}
          disabled={isLoadingLocation}
          style={{
            background: "#4b2a0d",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: isLoadingLocation ? "not-allowed" : "pointer",
            opacity: isLoadingLocation ? 0.6 : 1,
          }}
        >
          📍 {isLoadingLocation ? "Getting..." : "Current"}
        </button>
      </div>

      {/* Show selected coordinates */}
      {position && (
        <div
          style={{
            marginBottom: "8px",
            fontSize: "12px",
            color: "#666",
            padding: "4px 8px",
            background: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={position ? 16 : 13}
        style={{ height: "300px", width: "100%" }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
          if (position) {
            mapInstance.flyTo(position, 16);
          }
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <LocationMarker
          position={position}
          setPosition={setPosition}
          onLocationSelect={onLocationSelect}
          mapRef={mapRef}
        />
      </MapContainer>

      {/* Instructions */}
      <div
        style={{
          marginTop: "8px",
          fontSize: "12px",
          color: "#888",
          fontStyle: "italic",
        }}
      >
        Click on the map to select a location, search for an address, or use your current location.
      </div>
    </div>
  );
}

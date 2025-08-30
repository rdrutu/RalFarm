'use client'

import { useEffect, useState, useRef } from 'react'

interface PlotMapSelectorProps {
  onPlotSelected: (coordinates: number[][], area: number) => void
  initialPosition?: [number, number]
}

interface MapPoint {
  lat: number
  lng: number
}

interface SearchResult {
  display_name: string
  lat: string
  lon: string
  type: string
}

export default function PlotMapSelector({ onPlotSelected, initialPosition = [44.4268, 26.1025] }: PlotMapSelectorProps) {
  const [isClient, setIsClient] = useState(false)
  const [plotPoints, setPlotPoints] = useState<MapPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polygonRef = useRef<any>(null)
  const currentPointsRef = useRef<MapPoint[]>([])
  const isDrawingRef = useRef(false)

  // Sincronizează ref-ul cu state-ul
  useEffect(() => {
    isDrawingRef.current = isDrawing
  }, [isDrawing])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Funcție pentru căutarea pe hartă
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ro&limit=5&addressdetails=1`
      )
      const results = await response.json()
      setSearchResults(results)
      setShowResults(results.length > 0)
    } catch (error) {
      console.error('Eroare la căutare:', error)
      setSearchResults([])
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  // Navighează la locația selectată
  const goToLocation = (lat: number, lon: number, displayName: string) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 15)
      setSearchQuery(displayName)
      setSearchResults([])
      setShowResults(false)
    }
  }

  // Debounce pentru căutare
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocation(searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  useEffect(() => {
    if (!isClient || mapRef.current) return

    const initMap = async () => {
      try {
        console.log('Initializing map...')
        // Încarcă Leaflet dinamic
        const L = await import('leaflet')
        console.log('Leaflet loaded')
        
        // Fix pentru iconuri Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
        
        const mapElement = document.getElementById('plot-map')
        if (!mapElement) {
          console.error('Map element not found')
          return
        }

        const map = L.map('plot-map').setView(initialPosition, 15)
        console.log('Map created')
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)
        console.log('Tile layer added')

        // Handler pentru click-uri
        const handleMapClick = (e: any) => {
          console.log('Map clicked, isDrawing:', isDrawingRef.current)
          if (!isDrawingRef.current) {
            console.log('Not drawing, ignoring click')
            return
          }

          console.log('Click position:', e.latlng.lat, e.latlng.lng)
          
          const newPoint = {
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }

          currentPointsRef.current.push(newPoint)
          setPlotPoints([...currentPointsRef.current])
          
          console.log('Current points:', currentPointsRef.current.length)

          // Adaugă marker
          const marker = L.marker([e.latlng.lat, e.latlng.lng])
            .addTo(map)
            .bindPopup(`Punct ${currentPointsRef.current.length}`)
          
          markersRef.current.push(marker)
          console.log('Marker added, total markers:', markersRef.current.length)

          // Dacă avem cel puțin 3 puncte, desenează poligonul
          if (currentPointsRef.current.length >= 3) {
            // Șterge poligonul anterior dacă există
            if (polygonRef.current) {
              map.removeLayer(polygonRef.current)
            }

            const coordinates = currentPointsRef.current.map(point => [point.lat, point.lng] as [number, number])
            
            // Desenează poligonul nou
            polygonRef.current = L.polygon(coordinates, {
              color: '#10b981',
              weight: 2,
              opacity: 0.8,
              fillColor: '#10b981',
              fillOpacity: 0.2
            }).addTo(map)

            const area = calculatePolygonArea(currentPointsRef.current)
            console.log('Calculated area:', area)
            onPlotSelected(coordinates, area)
          }
        }

        map.on('click', handleMapClick)
        mapRef.current = map

      } catch (error) {
        console.error('Error initializing map:', error)
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [isClient])

  // Calculează aria unui poligon folosind formula Shoelace
  const calculatePolygonArea = (points: MapPoint[]): number => {
    if (points.length < 3) return 0

    let area = 0
    const n = points.length

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += points[i].lat * points[j].lng
      area -= points[j].lat * points[i].lng
    }

    area = Math.abs(area) / 2

    // Convertește din grade la hectare (aproximativ pentru România)
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length
    const latFactor = Math.cos(avgLat * Math.PI / 180)
    const hectares = area * 111000 * 111000 * latFactor / 10000
    
    return hectares
  }

  const startDrawing = () => {
    console.log('Start drawing clicked')
    setIsDrawing(true)
    isDrawingRef.current = true
    setPlotPoints([])
    
    // Curăță harta și resetează punctele
    if (mapRef.current) {
      console.log('Clearing existing markers and polygon')
      markersRef.current.forEach((marker: any) => {
        mapRef.current.removeLayer(marker)
      })
      if (polygonRef.current) {
        mapRef.current.removeLayer(polygonRef.current)
      }
      markersRef.current = []
      polygonRef.current = null
      currentPointsRef.current = []
    }
  }

  const finishDrawing = () => {
    console.log('Finish drawing clicked')
    setIsDrawing(false)
    isDrawingRef.current = false
  }

  const clearDrawing = () => {
    console.log('Clear drawing clicked')
    setPlotPoints([])
    setIsDrawing(false)
    isDrawingRef.current = false
    onPlotSelected([], 0)
    
    // Curăță harta și resetează punctele
    if (mapRef.current) {
      markersRef.current.forEach((marker: any) => {
        mapRef.current.removeLayer(marker)
      })
      if (polygonRef.current) {
        mapRef.current.removeLayer(polygonRef.current)
      }
      markersRef.current = []
      polygonRef.current = null
      currentPointsRef.current = []
    }
  }

  if (!isClient) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Se încarcă harta...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Caută oraș, sat sau zonă..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchResults([])
                setShowResults(false)
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => goToLocation(parseFloat(result.lat), parseFloat(result.lon), result.display_name)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900 truncate">
                  {result.display_name.split(',')[0]}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {result.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controale hartă */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startDrawing}
          disabled={isDrawing}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDrawing 
              ? 'bg-green-100 text-green-800 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isDrawing ? '📍 Desenează pe hartă...' : '🎯 Începe Desenarea'}
        </button>
        
        {plotPoints.length > 0 && (
          <>
            <button
              type="button"
              onClick={finishDrawing}
              disabled={!isDrawing || plotPoints.length < 3}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              ✅ Finalizează ({plotPoints.length} puncte)
            </button>
            
            <button
              type="button"
              onClick={clearDrawing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              🗑️ Șterge
            </button>
          </>
        )}
      </div>

      {/* Informații despre progres */}
      {isDrawing && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">📍 Mod desenare activ:</span> Fă click pe hartă pentru a marca colțurile parcelei.
            {plotPoints.length > 0 && (
              <span className="block mt-1">
                Puncte marcate: {plotPoints.length} 
                {plotPoints.length >= 3 && (
                  <span className="text-green-700 font-medium">
                    {' '}→ Suprafață estimată: {calculatePolygonArea(plotPoints).toFixed(4)} hectare
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Harta */}
      <div 
        id="plot-map" 
        className="w-full h-80 rounded-lg overflow-hidden border border-gray-300"
        style={{ minHeight: '320px' }}
      ></div>

      {/* CSS pentru leaflet */}
      <link 
        rel="stylesheet" 
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
        crossOrigin=""
      />
    </div>
  )
}

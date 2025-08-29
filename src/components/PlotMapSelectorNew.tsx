'use client'

import { useEffect, useState } from 'react'

interface PlotMapSelectorProps {
  onPlotSelected: (coordinates: number[][], area: number) => void
  initialPosition?: [number, number]
}

interface MapPoint {
  lat: number
  lng: number
}

export default function PlotMapSelector({ onPlotSelected, initialPosition = [44.4268, 26.1025] }: PlotMapSelectorProps) {
  const [isClient, setIsClient] = useState(false)
  const [plotPoints, setPlotPoints] = useState<MapPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || mapInstance) return

    const initMap = async () => {
      // Încarcă Leaflet dinamic
      const L = await import('leaflet')
      
      // Fix pentru iconuri Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      
      const map = L.map('plot-map').setView(initialPosition, 15)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      let markers: any[] = []
      let polygon: any = null

      map.on('click', (e: any) => {
        if (!isDrawing) return

        const newPoint = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }

        const updatedPoints = [...plotPoints, newPoint]
        setPlotPoints(updatedPoints)

        // Adaugă marker
        const marker = L.marker([e.latlng.lat, e.latlng.lng])
          .addTo(map)
          .bindPopup(`Punct ${updatedPoints.length}`)
        
        markers.push(marker)

        // Dacă avem cel puțin 3 puncte, desenează poligonul
        if (updatedPoints.length >= 3) {
          // Șterge poligonul anterior dacă există
          if (polygon) {
            map.removeLayer(polygon)
          }

          const coordinates = updatedPoints.map(point => [point.lat, point.lng])
          
          // Desenează poligonul nou
          polygon = L.polygon(coordinates, {
            color: '#10b981',
            weight: 2,
            opacity: 0.8,
            fillColor: '#10b981',
            fillOpacity: 0.2
          }).addTo(map)

          const area = calculatePolygonArea(updatedPoints)
          onPlotSelected(coordinates, area)
        }
      })

      setMapInstance({ map, markers, polygon })
    }

    initMap()

    return () => {
      if (mapInstance?.map) {
        mapInstance.map.remove()
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
    // Formula: latitudine * longitudine * 111000 * 111000 * cos(latitudine) / 10000
    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length
    const latFactor = Math.cos(avgLat * Math.PI / 180)
    const hectares = area * 111000 * 111000 * latFactor / 10000
    
    return hectares
  }

  const startDrawing = () => {
    setIsDrawing(true)
    setPlotPoints([])
    
    // Curăță harta
    if (mapInstance?.map) {
      mapInstance.markers?.forEach((marker: any) => {
        mapInstance.map.removeLayer(marker)
      })
      if (mapInstance.polygon) {
        mapInstance.map.removeLayer(mapInstance.polygon)
      }
      mapInstance.markers = []
      mapInstance.polygon = null
    }
  }

  const finishDrawing = () => {
    setIsDrawing(false)
  }

  const clearDrawing = () => {
    setPlotPoints([])
    setIsDrawing(false)
    onPlotSelected([], 0)
    
    // Curăță harta
    if (mapInstance?.map) {
      mapInstance.markers?.forEach((marker: any) => {
        mapInstance.map.removeLayer(marker)
      })
      if (mapInstance.polygon) {
        mapInstance.map.removeLayer(mapInstance.polygon)
      }
      mapInstance.markers = []
      mapInstance.polygon = null
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

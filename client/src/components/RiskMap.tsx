import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Marker, Polyline, GeoJSON } from 'react-leaflet';
import { FishFarm, Vessel, calculateRiskScore, getRiskLevel, getRiskColor } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { divIcon } from 'leaflet';
import { Ship, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface RiskMapProps {
  farms: FishFarm[];
  vessels: Vessel[];
  selectedPo: string | null;
  selectedFarm?: FishFarm | null;
}

export default function RiskMap({ farms, vessels, selectedPo, selectedFarm }: RiskMapProps) {
  const mapRef = useRef<L.Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const centerPosition: [number, number] = [63.5, 12.0]; // Center of Norway
  const zoom = 5;
  
  // State for cage visibility toggle and zoom level
  const [showAllCages, setShowAllCages] = useState(false);
  const [cagesData, setCagesData] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(zoom);

  // Fetch cage data from Fiskeridirektoratet
  useEffect(() => {
    const fetchCages = async () => {
      try {
        const response = await fetch(
          "https://kart.fiskeridir.no/geoserver/akv/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=akv:merd_posisjon&outputFormat=application/json"
        );
        if (response.ok) {
          const data = await response.json();
          setCagesData(data);
        }
      } catch (error) {
        console.error("Feil ved henting av merd-data:", error);
      }
    };
    
    if (showAllCages) {
      fetchCages();
    }
  }, [showAllCages]);

  // Track zoom level for smart filtering
  const handleZoom = () => {
    if (mapRef.current) {
      setZoomLevel(mapRef.current.getZoom());
    }
  };

  // Get current direction for marker offset (push arrow/wind indicator away from marker)
  const getCurrentDirection = (farm: FishFarm): number => {
    // Use farm's current direction if available, otherwise default to SE for visibility
    return farm.currentDirection || 135; // SE (135°) is most readable
  };

  // Smart filtering: 
  // - At zoom < 6: only show high-risk farms (score >= 8)
  // - At zoom >= 6: show all farms
  // - When PO is explicitly selected: show all farms in that PO
  const displayFarms = selectedPo && selectedPo !== "all"
    ? farms.filter(f => f.po.toString() === selectedPo) // Show all for selected PO
    : zoomLevel >= 6 || selectedPo === "all"
    ? farms // Show all when zoomed in
    : farms.filter(f => {
        const score = calculateRiskScore(f);
        return score >= 8; // Only high-risk at normal zoom
      });
    
  // Smart Filtering for Vessels: Only show those that have passed risk zones (risk relevant)
  // This keeps the map clean as requested
  const displayVessels = vessels.filter(v => v.passedRiskZone);

  // Auto-zoom to bounds when PO selected
  useEffect(() => {
    if (selectedPo && selectedPo !== "all" && displayFarms.length > 0 && mapRef.current) {
      const lats = displayFarms.map(f => f.lat);
      const lngs = displayFarms.map(f => f.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      mapRef.current.flyToBounds([
        [minLat - 0.3, minLng - 0.3],
        [maxLat + 0.3, maxLng + 0.3]
      ], { padding: [50, 50], duration: 1.5 });
    } else if (selectedPo === "all" && mapRef.current) {
      mapRef.current.flyTo(centerPosition, 5, { duration: 1.5 });
    }
  }, [selectedPo, displayFarms.length]);

  // Zoom to selected farm when clicked
  useEffect(() => {
    if (selectedFarm && mapRef.current) {
      mapRef.current.flyTo([selectedFarm.lat, selectedFarm.lng], 10, { duration: 1.5 });
    }
  }, [selectedFarm]);

  return (
    <Card className="h-[600px] w-full overflow-hidden border-0 shadow-lg relative z-0" ref={mapContainerRef}>
      <MapContainer 
        ref={mapRef}
        center={centerPosition} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="h-full w-full bg-slate-100"
        onZoom={handleZoom}
        onMove={handleZoom}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Cages Layer - Filtert til valgt PO */}
        {showAllCages && cagesData && selectedPo && (
          <GeoJSON
            data={cagesData}
            pointToLayer={(feature, latlng) => {
              const isHighRisk = farms
                .filter(f => f.po.toString() === selectedPo)
                .map(f => f.id)
                .includes(feature.properties?.lokalitet_nr);
              
              return window.L.circleMarker(latlng, {
                radius: isHighRisk ? 6 : 3,
                color: isHighRisk ? '#ef4444' : '#3b82f6',
                weight: isHighRisk ? 3 : 1,
                opacity: isHighRisk ? 1 : 0.6,
                fillOpacity: isHighRisk ? 0.7 : 0.4,
              });
            }}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(
                `<div class="text-sm"><strong>Merd ${feature.properties?.merd_nr || 'N/A'}</strong><br/>
                 Lokalitet: ${feature.properties?.lokalitet_navn || 'N/A'}</div>`
              );
            }}
          />
        )}
        
        {/* Vessels Layer - Only Risk Vessels */}
        {displayVessels.map(vessel => (
          <Marker
            key={vessel.id}
            position={[vessel.lat, vessel.lng]}
            icon={divIcon({
              className: 'bg-transparent border-none',
              html: `<div style="transform: rotate(${vessel.heading}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity: 1;">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
                         <path d="M12 2L2 22L12 18L22 22L12 2Z" />
                       </svg>
                     </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
             <Popup>
               <div className="p-2">
                 <h3 className="font-bold flex items-center gap-2 text-red-700">
                    <Ship className="h-4 w-4" /> {vessel.name}
                 </h3>
                 <div className="text-xs text-slate-600 mt-1">
                   Type: {vessel.type}<br/>
                   Fart: {vessel.speed.toFixed(1)} knop
                 </div>
                 <div className="mt-2 text-xs font-bold text-red-600 border border-red-200 bg-red-50 p-1 rounded">
                   ⚠ Har passert rød sone (7 dager)<br/>
                   Desinfeksjon anbefalt
                 </div>
               </div>
             </Popup>
          </Marker>
        ))}

        {/* Farms Layer */}
        {displayFarms.map(farm => {
          const score = calculateRiskScore(farm);
          const level = getRiskLevel(score);
          const color = getRiskColor(level);
          
          // Determine border style - highlight if selected
          let strokeColor = "#fff";
          let strokeWidth = 1;
          let dashArray = undefined;
          let isSelected = selectedFarm?.id === farm.id;

          if (isSelected) {
            strokeColor = "#fbbf24"; // Bright yellow for selected
            strokeWidth = 4;
          } else if (farm.forcedSlaughter) {
            strokeColor = "#000";
            strokeWidth = 3;
          } else if (farm.hasAlgaeRisk) {
            strokeColor = "#9333ea"; // Purple-600
            strokeWidth = 3;
          } else if (farm.inQuarantine) {
            strokeColor = "#9333ea";
            strokeWidth = 2;
            dashArray = "4, 4";
          }
          
          return (
            <div key={farm.id}>
              {/* Main Farm Marker */}
              <CircleMarker 
                center={[farm.lat, farm.lng]}
                radius={8}
                fillOpacity={0.8}
                stroke={true}
                weight={strokeWidth}
                color={strokeColor}
                dashArray={dashArray}
                pathOptions={{ fillColor: color }}
              >
                <Popup className="font-sans">
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-bold text-lg mb-1">{farm.name}</h3>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        Score: {score}/10
                      </span>
                      <span className="text-xs text-muted-foreground">PO {farm.po}</span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-700">
                      <div className="flex justify-between">
                         <span>Hunnlus:</span>
                         <span className="font-mono font-medium">{farm.liceCount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                         <span>Temperatur:</span>
                         <span className="font-mono font-medium">{farm.temp.toFixed(1)}°C</span>
                      </div>
                      
                      {/* New Metrics in Popup */}
                      {farm.currentSpeed !== undefined && (
                        <div className="flex justify-between text-xs text-slate-500">
                           <span>Strøm:</span>
                           <span className="font-mono">{farm.currentSpeed.toFixed(2)} m/s</span>
                        </div>
                      )}
                      
                      {farm.chlorophyll !== undefined && (
                        <div className="flex justify-between text-xs text-slate-500">
                           <span>Klorofyll-a:</span>
                           <span className="font-mono">{farm.chlorophyll.toFixed(1)} µg/L</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Alerts Section */}
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                      {farm.forcedSlaughter && (
                        <div className="text-xs font-bold text-black flex items-center gap-1">
                          ⚫ TVANGSSLAKTING PÅGÅR
                        </div>
                      )}
                      {farm.disease && (
                        <div className="text-xs font-bold text-red-600 flex items-center gap-1">
                          🦠 Sykdom påvist: {farm.disease}
                        </div>
                      )}
                       {farm.hasAlgaeRisk && (
                        <div className="text-xs font-bold text-purple-600 flex items-center gap-1">
                          🟣 Høy algerisiko (Varsel)
                        </div>
                      )}
                      {farm.liceIncrease && (
                        <div className="text-xs text-red-600 flex items-center gap-1">
                          ⚠ Økende lusetall
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                  {farm.name} (Score: {score})
                </Tooltip>
              </CircleMarker>

              {/* Smart Filtering: Animated Current Arrow ONLY for High Risk Farms (>7) AND High Current (>0.3) */}
              {score > 7 && farm.currentSpeed && farm.currentSpeed > 0.3 && farm.currentDirection && (
                <Marker
                  position={[farm.lat, farm.lng]}
                  icon={divIcon({
                    className: 'bg-transparent border-none',
                    html: `<div class="animate-pulse" style="transform: rotate(${farm.currentDirection}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <path d="M12 2L12 19M12 2L5 9M12 2L19 9" stroke="#dc2626" stroke-width="${farm.currentSpeed > 0.5 ? '3' : '2'}" stroke-linecap="round" stroke-linejoin="round"/>
                             </svg>
                           </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16] // Center the rotation
                  })}
                  zIndexOffset={100} 
                />
              )}
            </div>
          );
        })}
      </MapContainer>
      
      {/* Toggle for Cages - Show when data is available */}
      {cagesData && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] border border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input 
              type="checkbox" 
              checked={showAllCages} 
              onChange={(e) => setShowAllCages(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="font-medium">Vis alle merder</span>
          </label>
          <p className="text-xs text-slate-500 mt-1">Zoom inn for detaljer</p>
        </div>
      )}
      
      {/* Updated Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] text-sm border border-slate-200 max-w-xs">
        <h4 className="font-semibold mb-2 text-xs uppercase tracking-wider text-slate-500">Tegnforklaring</h4>
        
        {/* Smart filtering note */}
        {zoomLevel < 6 && selectedPo === "all" && (
          <div className="text-xs bg-blue-50 text-blue-700 p-1.5 rounded mb-2 border border-blue-200">
            ℹ Zoom inn for å se alle anlegg. Viser nå kun høyrisiko.
          </div>
        )}
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-low)]"></div>
            <span>Lav (1-3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>Moderat (4-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-med)]"></div>
            <span>Høy (6-7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-high)]"></div>
            <span>Kritisk (8-10)</span>
          </div>
          
          <div className="h-px bg-slate-200 my-2"></div>
          
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full border-2 border-black"></div>
             <span className="text-xs">Tvangsslakting</span>
          </div>
           <div className="flex items-center gap-2">
             <Ship className="h-3 w-3 text-red-500" />
             <span className="text-xs">Fartøy i Rød Sone</span>
          </div>
           <div className="flex items-center gap-2">
             <div className="w-4 h-4 flex items-center justify-center text-red-600 font-bold text-[10px]">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L12 19M12 2L5 9M12 2L19 9"/></svg>
             </div>
             <span className="text-xs">Strøm (Kun Høy Risiko)</span>
          </div>
          
          {showAllCages && selectedPo && selectedPo !== "all" && (
            <>
              <div className="h-px bg-slate-200 my-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs">Merd (Høy Risiko)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs">Merd (Lav Risiko)</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

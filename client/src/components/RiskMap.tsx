import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Marker, Polyline } from 'react-leaflet';
import { FishFarm, Vessel, calculateRiskScore, getRiskLevel, getRiskColor } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { divIcon } from 'leaflet';
import { Ship, AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface RiskMapProps {
  farms: FishFarm[];
  vessels: Vessel[];
  selectedPo: string | null;
}

export default function RiskMap({ farms, vessels, selectedPo }: RiskMapProps) {
  const mapRef = useRef<L.Map>(null);
  const centerPosition: [number, number] = [65.0, 13.0]; // Center of Norway-ish
  const zoom = 5;

  // Filter farms if a PO is selected
  const displayFarms = selectedPo 
    ? farms.filter(f => f.po.toString() === selectedPo)
    : farms;
    
  // Filter vessels based on view (simplified: showing all for now, could filter by bounds)
  const displayVessels = vessels;

  // Auto-zoom to bounds when PO selected
  useEffect(() => {
    if (selectedPo && displayFarms.length > 0 && mapRef.current) {
      const lats = displayFarms.map(f => f.lat);
      const lngs = displayFarms.map(f => f.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      mapRef.current.flyToBounds([
        [minLat - 0.5, minLng - 0.5],
        [maxLat + 0.5, maxLng + 0.5]
      ], { padding: [50, 50], duration: 1.5 });
    } else if (selectedPo === "all" && mapRef.current) {
      mapRef.current.flyTo(centerPosition, zoom, { duration: 1.5 });
    }
  }, [selectedPo, displayFarms]);

  return (
    <Card className="h-[600px] w-full overflow-hidden border-0 shadow-lg relative z-0">
      <MapContainer 
        ref={mapRef}
        center={centerPosition} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="h-full w-full bg-slate-100"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Vessels Layer */}
        {displayVessels.map(vessel => (
          <Marker
            key={vessel.id}
            position={[vessel.lat, vessel.lng]}
            icon={divIcon({
              className: 'bg-transparent border-none',
              html: `<div style="transform: rotate(${vessel.heading}deg); width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; opacity: 0.9;">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="${vessel.passedRiskZone ? '#ef4444' : '#3b82f6'}" stroke="white" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
                         <path d="M12 2L2 22L12 18L22 22L12 2Z" />
                       </svg>
                     </div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
             <Popup>
               <div className="p-2">
                 <h3 className="font-bold flex items-center gap-2">
                    <Ship className="h-4 w-4" /> {vessel.name}
                 </h3>
                 <div className="text-xs text-slate-600 mt-1">
                   Type: {vessel.type}<br/>
                   Fart: {vessel.speed.toFixed(1)} knop
                 </div>
                 {vessel.passedRiskZone && (
                   <div className="mt-2 text-xs font-bold text-red-600 border border-red-200 bg-red-50 p-1 rounded">
                     ⚠ Har passert rød sone<br/>
                     Desinfeksjon anbefalt
                   </div>
                 )}
               </div>
             </Popup>
          </Marker>
        ))}

        {/* Farms Layer */}
        {displayFarms.map(farm => {
          const score = calculateRiskScore(farm);
          const level = getRiskLevel(score);
          const color = getRiskColor(level);
          
          // Determine border style
          let strokeColor = "#fff";
          let strokeWidth = 1;
          let dashArray = undefined;

          if (farm.forcedSlaughter) {
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

              {/* Animated Current Arrow for High Risk Farms */}
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
      
      {/* Updated Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] text-sm border border-slate-200">
        <h4 className="font-semibold mb-2 text-xs uppercase tracking-wider text-slate-500">Risikonivå & Fartøy</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-low)]"></div>
            <span>Lav (1-3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>Moderat-Lav (4-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-med)]"></div>
            <span>Moderat-Høy (6-7)</span>
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
             <div className="w-3 h-3 rounded-full border-2 border-purple-600"></div>
             <span className="text-xs">Algerisiko</span>
          </div>
           <div className="flex items-center gap-2">
             <Ship className="h-3 w-3 text-blue-500" />
             <span className="text-xs">Fartøy (Normal)</span>
          </div>
           <div className="flex items-center gap-2">
             <Ship className="h-3 w-3 text-red-500" />
             <span className="text-xs">Fartøy (Risiko)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

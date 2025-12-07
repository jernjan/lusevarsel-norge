import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Marker } from 'react-leaflet';
import { FishFarm, calculateRiskScore, getRiskLevel, getRiskColor } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { divIcon } from 'leaflet';

interface RiskMapProps {
  farms: FishFarm[];
  selectedPo: string | null;
}

export default function RiskMap({ farms, selectedPo }: RiskMapProps) {
  const centerPosition: [number, number] = [65.0, 13.0]; // Center of Norway-ish
  const zoom = 5;

  // Filter farms if a PO is selected
  const displayFarms = selectedPo 
    ? farms.filter(f => f.po.toString() === selectedPo)
    : farms;

  return (
    <Card className="h-[600px] w-full overflow-hidden border-0 shadow-lg relative z-0">
      <MapContainer 
        center={centerPosition} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="h-full w-full bg-slate-100"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
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

              {/* Current Arrow for High Risk Farms with significant current */}
              {score > 7 && farm.currentSpeed && farm.currentSpeed > 0.3 && farm.currentDirection && (
                <Marker
                  position={[farm.lat, farm.lng]}
                  icon={divIcon({
                    className: 'bg-transparent border-none',
                    html: `<div style="transform: rotate(${farm.currentDirection}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                               <path d="M12 2L12 19M12 2L5 9M12 2L19 9" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                             </svg>
                           </div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12] // Center the rotation
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
        <h4 className="font-semibold mb-2 text-xs uppercase tracking-wider text-slate-500">Risikonivå</h4>
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
             <div className="w-4 h-4 flex items-center justify-center text-red-600 font-bold text-[10px]">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L12 19M12 2L5 9M12 2L19 9"/></svg>
             </div>
             <span className="text-xs">Strømretning (Høy risiko)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

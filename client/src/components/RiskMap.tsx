import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { FishFarm, calculateRiskScore, getRiskLevel, getRiskColor } from '@/lib/data';
import { Card } from '@/components/ui/card';

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
          
          return (
            <CircleMarker 
              key={farm.id}
              center={[farm.lat, farm.lng]}
              radius={8}
              fillOpacity={0.8}
              stroke={true}
              weight={1}
              color="#fff"
              pathOptions={{ fillColor: color }}
            >
              <Popup className="font-sans">
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-1">{farm.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      Risikoscore: {score}/10
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
                    <div className="flex justify-between">
                      <span>Saltholdighet:</span>
                      <span className="font-mono font-medium">{farm.salinity.toFixed(1)}‰</span>
                    </div>
                  </div>
                  
                  {(farm.liceIncrease || farm.highLiceNeighbor) && (
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                      {farm.liceIncrease && (
                        <div className="text-xs text-red-600 flex items-center gap-1 font-medium">
                          ⚠ Økende lusetall (&gt;30%)
                        </div>
                      )}
                      {farm.highLiceNeighbor && (
                        <div className="text-xs text-orange-600 flex items-center gap-1 font-medium">
                          ⚠ Nabo med høy lus
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                {farm.name} (Score: {score})
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] text-sm border border-slate-200">
        <h4 className="font-semibold mb-2 text-xs uppercase tracking-wider text-slate-500">Risikonivå</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-low)]"></div>
            <span>Lav (1-3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-med)]"></div>
            <span>Moderat (4-7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--risk-high)]"></div>
            <span>Høy (8-10)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

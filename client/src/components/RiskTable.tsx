import { FishFarm, calculateRiskScore, getRiskLevel, getRiskColor } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Thermometer, AlertTriangle, Droplets, Skull, Biohazard, ShieldAlert, Ship } from 'lucide-react';

interface RiskTableProps {
  farms: FishFarm[];
  onFarmClick?: (farm: FishFarm) => void;
}

export default function RiskTable({ farms, onFarmClick }: RiskTableProps) {
  // Sort by risk score descending and take top 20
  const topRiskyFarms = [...farms]
    .sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a))
    .slice(0, 20);

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100 border-b-2 border-slate-300">
            <TableHead className="w-[40px] text-slate-900 font-bold">#</TableHead>
            <TableHead className="text-slate-900 font-bold">Anlegg</TableHead>
            <TableHead className="text-slate-900 font-bold">PO</TableHead>
            <TableHead className="text-right text-slate-900 font-bold">Score</TableHead>
            <TableHead className="text-right text-slate-900 font-bold">Lusnivå</TableHead>
            <TableHead className="text-center text-slate-900 font-bold">Sykdommer</TableHead>
            <TableHead className="text-center text-slate-900 font-bold">Alge</TableHead>
            <TableHead className="text-slate-900 font-bold">Status / Spredningsrisiko</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topRiskyFarms.map((farm, index) => {
            const score = calculateRiskScore(farm);
            const level = getRiskLevel(score);
            const color = getRiskColor(level);
            
            // Calculate pseudo-risk for vessels passing by (simulated logic)
            const vesselRisk = score > 7; 
            
            return (
              <TableRow 
                key={farm.id} 
                className="group cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onFarmClick?.(farm)}
              >
                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-foreground">
                  {farm.name}
                  {farm.disease && (
                    <span className="ml-2 text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-1 rounded">
                      {farm.disease}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">PO {farm.po}</TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant="outline" 
                    className="font-mono font-bold border-0 text-white min-w-[2rem] justify-center"
                    style={{ backgroundColor: color }}
                  >
                    {score}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-slate-600">
                  {farm.liceCount.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {farm.disease ? (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px] px-2 py-1 font-bold">
                      {farm.disease} 🦠
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {farm.hasAlgaeRisk ? (
                     <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 text-[10px] px-1">
                        Ja
                     </Badge>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {farm.forcedSlaughter && (
                        <Badge variant="destructive" className="text-xs h-5 px-1 bg-black text-white hover:bg-slate-800" title="Tvangsslakting">
                          <Skull className="h-3 w-3 mr-1" /> Slakt
                        </Badge>
                      )}
                      {farm.inQuarantine && (
                        <Badge variant="secondary" className="text-xs h-5 px-1 bg-purple-100 text-purple-700 border-purple-200" title="Karantene">
                          <ShieldAlert className="h-3 w-3" />
                        </Badge>
                      )}
                      {farm.disease && (
                        <Badge variant="secondary" className="text-xs h-5 px-1 bg-red-100 text-red-700 border-red-200" title={`Sykdom: ${farm.disease}`}>
                          <Biohazard className="h-3 w-3" />
                        </Badge>
                      )}
                      
                      {/* Standard Alerts */}
                      {farm.liceIncrease && (
                        <Badge variant="secondary" className="text-xs h-5 px-1 bg-red-50 text-red-600 border-red-100" title="Økning > 30%">
                          <ArrowUpRight className="h-3 w-3" />
                        </Badge>
                      )}
                      {farm.temp > 8 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1 bg-orange-50 text-orange-600 border-orange-100" title="Høy temperatur">
                          <Thermometer className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    
                    {vesselRisk && (
                      <div className="text-[10px] text-red-600 flex items-center gap-1 font-medium bg-red-50 p-1 rounded border border-red-100 w-fit">
                        <Ship className="h-3 w-3" />
                        Risiko: Desinfeksjon anbefalt
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

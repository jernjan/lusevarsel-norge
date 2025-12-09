import { FishFarm, calculateRiskScore, calculateFutureRiskScore, getRiskLevel, getRiskColor } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Thermometer, AlertTriangle, Droplets, Skull, Biohazard, ShieldAlert, Ship, TrendingUp } from 'lucide-react';

interface RiskTableProps {
  farms: FishFarm[];
  vessels?: any[];
  onFarmClick?: (farm: FishFarm) => void;
}

export default function RiskTable({ farms, vessels = [], onFarmClick }: RiskTableProps) {
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
            <TableHead className="text-right text-slate-900 font-bold">Risiko Nå</TableHead>
            <TableHead className="text-right text-slate-900 font-bold">Lusnivå</TableHead>
            <TableHead className="text-center text-slate-900 font-bold">Risiko 1-2 Uke</TableHead>
            <TableHead className="text-center text-slate-900 font-bold">Sykdommer</TableHead>
            <TableHead className="text-center text-slate-900 font-bold">Alge</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topRiskyFarms.map((farm, index) => {
            const score = calculateRiskScore(farm);
            const futureScore = calculateFutureRiskScore(farm, topRiskyFarms, vessels);
            const level = getRiskLevel(score);
            const futureLevel = getRiskLevel(futureScore);
            const color = getRiskColor(level);
            const futureColor = getRiskColor(futureLevel);
            
            // Calculate pseudo-risk for vessels passing by (simulated logic)
            const vesselRisk = score > 7; 
            
            return (
              <TableRow 
                key={farm.id} 
                className="group cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onFarmClick?.(farm)}
              >
                <TableCell className="font-medium text-slate-600">{index + 1}</TableCell>
                <TableCell className="font-medium text-slate-900">
                  {farm.name}
                  {farm.disease && (
                    <span className="ml-2 text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-1 rounded">
                      {farm.disease}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">PO {farm.po}</TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant="outline" 
                    className="font-mono font-bold border-0 text-white min-w-[2rem] justify-center"
                    style={{ backgroundColor: color }}
                  >
                    {score}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-slate-700">
                  {farm.liceCount.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Badge 
                      variant="outline" 
                      className="font-mono font-bold border-0 text-white min-w-[2rem] justify-center"
                      style={{ backgroundColor: futureColor }}
                      title="Prediktert risiko om 1-2 uker basert på temperatur, sykdom i nærheten og båttrafikk"
                    >
                      {futureScore}
                    </Badge>
                    {futureScore > score && (
                      <TrendingUp className="h-4 w-4 text-orange-500" title="Risiko stiger" />
                    )}
                    {futureScore < score && (
                      <ArrowUpRight className="h-4 w-4 text-green-500 rotate-180" title="Risiko synker" />
                    )}
                  </div>
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

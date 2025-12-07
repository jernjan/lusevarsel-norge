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
import { ArrowUpRight, Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface RiskTableProps {
  farms: FishFarm[];
}

export default function RiskTable({ farms }: RiskTableProps) {
  // Sort by risk score descending and take top 20
  const topRiskyFarms = [...farms]
    .sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a))
    .slice(0, 20);

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <TableHead>Anlegg</TableHead>
            <TableHead>PO</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Lus</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Temp</TableHead>
            <TableHead className="hidden md:table-cell">Varsler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topRiskyFarms.map((farm, index) => {
            const score = calculateRiskScore(farm);
            const level = getRiskLevel(score);
            const color = getRiskColor(level);
            
            return (
              <TableRow key={farm.id} className="group">
                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium text-foreground">{farm.name}</TableCell>
                <TableCell className="text-muted-foreground">PO {farm.po}</TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant="outline" 
                    className="font-mono font-bold border-0 text-white"
                    style={{ backgroundColor: color }}
                  >
                    {score}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-slate-600">
                  {farm.liceCount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell font-mono text-slate-600">
                  {farm.temp.toFixed(1)}°
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex gap-1">
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
                    {farm.highLiceNeighbor && (
                      <Badge variant="secondary" className="text-xs h-5 px-1 bg-yellow-50 text-yellow-600 border-yellow-100" title="Nabo med høy lus">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
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

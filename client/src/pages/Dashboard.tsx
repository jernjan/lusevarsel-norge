import { useState } from 'react';
import { mockFarms, calculateRiskScore, getRiskLevel, PRODUCTION_AREAS } from '@/lib/data';
import RiskMap from '@/components/RiskMap';
import RiskTable from '@/components/RiskTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Waves, AlertCircle, TrendingUp, MapPin } from 'lucide-react';

export default function Dashboard() {
  const [selectedPo, setSelectedPo] = useState<string>("all");

  const filteredFarms = selectedPo && selectedPo !== "all"
    ? mockFarms.filter(f => f.po.toString() === selectedPo)
    : mockFarms;

  // Calculate high-level stats based on filtered view
  const highRiskCount = filteredFarms.filter(f => getRiskLevel(calculateRiskScore(f)) === 'high').length;
  const avgTemp = filteredFarms.reduce((acc, curr) => acc + curr.temp, 0) / filteredFarms.length;
  const totalAvgLice = filteredFarms.reduce((acc, curr) => acc + curr.liceCount, 0) / filteredFarms.length;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center text-white">
              <Waves className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-display font-bold text-primary">LuseVarsel Norge</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">Oppdatert: 07.12.2025 04:00</span>
            <div className="w-[180px]">
              <Select value={selectedPo} onValueChange={setSelectedPo}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg område" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hele Norge</SelectItem>
                  {PRODUCTION_AREAS.map(po => (
                    <SelectItem key={po.id} value={po.id.toString()}>
                      {po.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[var(--risk-high)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[var(--risk-high)]" />
                Anlegg i Rød Sone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{highRiskCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Av {filteredFarms.length} overvåkede anlegg</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Snitt Lakselus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{totalAvgLice.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Voksne hunnlus per fisk</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Waves className="h-4 w-4 text-blue-400" />
                Snitt Temperatur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{avgTemp.toFixed(1)}°C</div>
              <p className="text-xs text-muted-foreground mt-1">Sjøtemperatur (3m dyp)</p>
            </CardContent>
          </Card>
        </div>

        {/* Map & Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Map Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Risikokart
              </h2>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--risk-high)]"></div>
                  <span>Høy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--risk-med)]"></div>
                  <span>Moderat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--risk-low)]"></div>
                  <span>Lav</span>
                </div>
              </div>
            </div>
            <RiskMap farms={filteredFarms} selectedPo={selectedPo === "all" ? null : selectedPo} />
          </div>

          {/* Sidebar Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Topp 20 Risiko</h2>
            </div>
            <CardDescription className="mb-4">
              Anlegg rangert etter beregnet risikoscore (1-10) basert på lusetall, temperatur og naboeffekter.
            </CardDescription>
            <RiskTable farms={filteredFarms} />
          </div>

        </div>
      </main>
    </div>
  );
}

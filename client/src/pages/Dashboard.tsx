import { useState, useEffect } from 'react';
import { getLiceData, getVesselData, FishFarm, Vessel, calculateRiskScore, getRiskLevel, PRODUCTION_AREAS } from '@/lib/data';
import RiskMap from '@/components/RiskMap';
import RiskTable from '@/components/RiskTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Waves, AlertCircle, TrendingUp, MapPin, Mail, RefreshCw, FileText, Ship, Fish } from 'lucide-react';

export default function Dashboard() {
  const [selectedPo, setSelectedPo] = useState<string>("all");
  const [farms, setFarms] = useState<FishFarm[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [farmsData, vesselsData] = await Promise.all([
      getLiceData(),
      getVesselData()
    ]);
    setFarms(farmsData);
    setVessels(vesselsData);
    setLoading(false);
  }

  const filteredFarms = selectedPo && selectedPo !== "all"
    ? farms.filter(f => f.po.toString() === selectedPo)
    : farms;

  // Calculate high-level stats based on filtered view
  const highRiskCount = filteredFarms.filter(f => getRiskLevel(calculateRiskScore(f)) === 'critical').length;
  const avgTemp = filteredFarms.reduce((acc, curr) => acc + curr.temp, 0) / (filteredFarms.length || 1);
  const totalAvgLice = filteredFarms.reduce((acc, curr) => acc + curr.liceCount, 0) / (filteredFarms.length || 1);
  const riskVesselsCount = vessels.filter(v => v.passedRiskZone).length;

  const handleSendEmail = () => {
    const currentWeek = 49; // Mock week
    
    toast({
      title: "E-post sendt! (Simulering)",
      description: `LuseVarsel uke ${currentWeek}: ${highRiskCount} anlegg i rød sone sendt til abonnenter.`,
      duration: 5000,
      className: "bg-green-50 border-green-200 text-green-900",
    });
  };

  const handleGenerateReport = () => {
     toast({
      title: "Rapport generert",
      description: "PDF-rapport for uke 49 (Komplett status) lastes ned...",
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Fish className="h-5 w-5 fill-current" />
            </div>
            <div>
               <h1 className="text-xl font-display font-bold text-slate-900 leading-none">LuseVarsel Norge</h1>
               <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Profesjonell Overvåkning</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">Oppdatert: Nå nettopp</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              disabled={loading}
              className="hidden sm:flex"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Oppdater
            </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[var(--risk-high)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[var(--risk-high)]" />
                Kritisk (Rød Sone)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-900">
                {loading ? "..." : highRiskCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Av {filteredFarms.length} overvåkede anlegg</p>
            </CardContent>
          </Card>
          
           <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Ship className="h-4 w-4 text-red-500" />
                Fartøy i Rød Sone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-900">
                {loading ? "..." : riskVesselsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Passert siste 7 dager</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Snitt Lakselus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-900">
                {loading ? "..." : totalAvgLice.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Voksne hunnlus per fisk</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Waves className="h-4 w-4 text-blue-400" />
                Snitt Temperatur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-slate-900">
                {loading ? "..." : avgTemp.toFixed(1)}°C
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sjøtemperatur (3m dyp)</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end gap-3">
           <Button onClick={handleGenerateReport} variant="outline" className="gap-2 bg-white hover:bg-slate-50 border-slate-300 text-slate-700">
             <FileText className="h-4 w-4" />
             Generer PDF-rapport (Uke 49)
           </Button>
           <Button onClick={handleSendEmail} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
             <Mail className="h-4 w-4" />
             Send Risikovarsel
           </Button>
        </div>

        {/* Map & Table Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Map Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <MapPin className="h-5 w-5 text-primary" />
                Risikokart og Fartøysporing
              </h2>
              <div className="flex gap-4 text-sm hidden sm:flex">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--risk-high)]"></div>
                  <span>Kritisk (8-10)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--risk-med)]"></div>
                  <span>Høy (6-7)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <span>Moderat (4-5)</span>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="h-[600px] w-full flex items-center justify-center bg-slate-50 border rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <RiskMap farms={filteredFarms} vessels={vessels} selectedPo={selectedPo === "all" ? null : selectedPo} />
            )}
          </div>

          {/* Sidebar Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Risikoliste</h2>
            </div>
            <CardDescription className="mb-4">
              Topp 20 anlegg rangert etter risiko. Inkluderer fartøysvarsel og sykdomsstatus.
            </CardDescription>
            {loading ? (
               <div className="space-y-2">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                 ))}
               </div>
            ) : (
              <RiskTable farms={filteredFarms} />
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

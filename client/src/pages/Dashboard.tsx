import { useState, useEffect, useRef } from 'react';
import { getLiceData, getVesselData, FishFarm, Vessel, calculateRiskScore, getRiskLevel, PRODUCTION_AREAS } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { generatePDFReport, generateVesselReport } from '@/lib/pdf-report';
import RiskMap from '@/components/RiskMap';
import RiskTable from '@/components/RiskTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Waves, AlertCircle, TrendingUp, MapPin, Mail, RefreshCw, FileText, Ship, Fish, LogOut, Settings, Download } from 'lucide-react';

export default function Dashboard() {
  const [selectedPo, setSelectedPo] = useState<string>("all");
  const [farms, setFarms] = useState<FishFarm[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FishFarm | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Get user's facilities and vessels
  const userFacilities = user?.facilities || [];
  const userVessels = user?.vessels || [];

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

  // Apply user's facility filter if they have set up facilities
  const userFilteredFarms = userFacilities.length > 0
    ? filteredFarms.filter(f => userFacilities.includes(parseInt(f.id)))
    : filteredFarms;

  // Apply user's vessel filter if they have set up vessels
  const userFilteredVessels = userVessels.length > 0
    ? vessels.filter(v => userVessels.includes(v.id) || userVessels.includes(v.name))
    : vessels;

  // Calculate high-level stats based on filtered view
  const highRiskCount = userFilteredFarms.filter(f => getRiskLevel(calculateRiskScore(f)) === 'critical').length;
  const avgTemp = userFilteredFarms.reduce((acc, curr) => acc + curr.temp, 0) / (userFilteredFarms.length || 1);
  const totalAvgLice = userFilteredFarms.reduce((acc, curr) => acc + curr.liceCount, 0) / (userFilteredFarms.length || 1);
  const riskVesselsCount = userFilteredVessels.filter(v => v.passedRiskZone).length;

  const handleSendEmail = () => {
    const currentWeek = 49; // Mock week
    
    toast({
      title: "E-post sendt! (Simulering)",
      description: `AquaShield uke ${currentWeek}: ${highRiskCount} anlegg i rød sone sendt til abonnenter.`,
      duration: 5000,
      className: "bg-green-50 border-green-200 text-green-900",
    });
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingPDF(true);
      const mapElement = mapContainerRef.current;
      await generatePDFReport(userFilteredFarms, user?.company || 'Din Bedrift', mapElement);
      toast({
        title: "✓ Rapport generert",
        description: `PDF-rapport lastet ned for ${user?.company}`,
        duration: 3000,
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      toast({
        title: "Feil ved generering",
        description: "Kunne ikke generere PDF-rapport",
        duration: 3000,
        className: "bg-red-50 border-red-200 text-red-900",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleGenerateVesselReport = async () => {
    try {
      setGeneratingPDF(true);
      const { generateVesselReport } = await import('@/lib/pdf-report');
      await generateVesselReport(userFilteredFarms, userFilteredVessels, user?.company || 'Din Bedrift');
      toast({
        title: "✓ Båt-rapport generert",
        description: `Båt-rapport lastet ned for ${user?.company}`,
        duration: 3000,
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      toast({
        title: "Feil ved generering",
        description: "Kunne ikke generere båt-rapport",
        duration: 3000,
        className: "bg-red-50 border-red-200 text-red-900",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 border-b border-blue-700 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white h-10 w-10 rounded-lg flex items-center justify-center text-2xl shadow-md">
              🐟
            </div>
            <div>
               <h1 className="text-2xl font-display font-black text-white leading-none tracking-tight">AquaShield</h1>
               <span className="text-[9px] text-blue-100 font-bold uppercase tracking-widest">Profesjonell overvåking og spredningsreduksjon</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
            <span className="text-xs md:text-sm text-blue-100 hidden sm:inline">
              {user && `${user.company}`}
            </span>
            <span className="text-xs md:text-sm text-blue-100 hidden md:inline">Nå</span>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={loadData} 
              disabled={loading}
              className="hidden md:flex text-xs md:text-sm"
            >
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${loading ? 'animate-spin' : ''}`} />
              Oppdater
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setLocation('/setup')}
              className="hidden md:flex text-xs md:text-sm"
            >
              <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Innstillinger
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                logout();
                setLocation('/login');
              }}
              className="text-xs md:text-sm"
            >
              <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Logg ut</span>
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
              <p className="text-xs text-muted-foreground mt-1">Av {userFilteredFarms.length} overvåkede anlegg</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
           <Button 
             onClick={handleGenerateReport} 
             disabled={generatingPDF || loading}
             className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold py-3 md:py-2 text-base md:text-sm"
           >
             <Download className={`h-4 w-4 ${generatingPDF ? 'animate-spin' : ''}`} />
             {generatingPDF ? 'Genererer...' : 'Anlegg-Rapport'}
           </Button>
           <Button 
             onClick={handleGenerateVesselReport} 
             disabled={generatingPDF || loading}
             className="gap-2 bg-slate-600 hover:bg-slate-700 text-white shadow-md font-semibold py-3 md:py-2 text-base md:text-sm"
           >
             <Ship className={`h-4 w-4 ${generatingPDF ? 'animate-spin' : ''}`} />
             {generatingPDF ? 'Genererer...' : 'Båt-Rapport'}
           </Button>
           <Button 
             onClick={handleSendEmail} 
             variant="outline" 
             className="gap-2 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold py-3 md:py-2 text-base md:text-sm"
           >
             <Mail className="h-4 w-4" />
             Send Varsler
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
              <div className="h-[600px] w-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-slate-50 border-2 border-blue-200 rounded-lg shadow-inner">
                <div className="relative h-16 w-16 mb-4">
                  <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-2 flex items-center justify-center text-2xl">🐟</div>
                </div>
                <p className="text-slate-600 font-semibold text-lg">Henter data...</p>
                <p className="text-slate-500 text-sm mt-1">Laster lokaliteter og fartøysdata</p>
              </div>
            ) : (
              <div ref={mapContainerRef}>
                <RiskMap 
                  farms={userFilteredFarms} 
                  vessels={userFilteredVessels} 
                  selectedPo={selectedPo === "all" ? null : selectedPo}
                  selectedFarm={selectedFarm}
                />
              </div>
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
               <div className="space-y-3">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="h-14 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg animate-pulse" />
                 ))}
               </div>
            ) : (
              <RiskTable 
                farms={userFilteredFarms} 
                onFarmClick={(farm) => {
                  setSelectedFarm(farm);
                  // Scroll to map
                  mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

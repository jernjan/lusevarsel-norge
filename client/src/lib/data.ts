import { apiRequest } from "./queryClient";

export interface FishFarm {
  id: string; // localityNo
  name: string; // localityName
  po: number; // productionAreaId
  lat: number;
  lng: number; // lon
  liceCount: number; // adultFemaleLice
  temp: number; // Sea temperature (mocked or fetched)
  salinity: number;
  liceIncrease: boolean; // kept for compatibility, but logic updated
  highLiceNeighbor: boolean; // kept for compatibility
  
  // New properties for enhancement
  currentDirection?: number; // degrees
  currentSpeed?: number; // m/s
  chlorophyll?: number; // µg/L
  hasAlgaeRisk?: boolean; // >10 µg/L within 20km
  forcedSlaughter?: boolean;
  disease?: 'PD' | 'ILA' | 'IPN' | null;
  inQuarantine?: boolean;
}

export interface Vessel {
  id: string;
  name: string;
  type: 'Wellboat' | 'Service' | 'Fishing';
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  passedRiskZone: boolean; // Has passed red zone last 7 days
}

export const PRODUCTION_AREAS = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  name: `PO ${i + 1}`,
}));

// Logic from Python prototype
export function calculateRiskScore(farm: FishFarm): number {
  let score = farm.liceCount * 10;
  
  // Logic from Python: +2 if temp > 8
  if (farm.temp > 8) score += 2;
  
  // Logic from Python: +2 if lice > 0.5
  if (farm.liceCount > 0.5) score += 2;
  
  // Clamp between 1 and 10
  return Math.min(10, Math.max(1, Math.round(score)));
}

// Updated Logic based on new requirements
export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 8) return 'critical'; // Red (8-10)
  if (score >= 6) return 'high';     // Orange (6-7)
  if (score >= 4) return 'medium';   // Yellow (4-5)
  return 'low';                      // Green (1-3)
}

export function getRiskColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low': return 'var(--risk-low)';        // Green
    case 'medium': return '#fbbf24';             // Yellow (Tailwind yellow-400)
    case 'high': return 'var(--risk-med)';       // Orange
    case 'critical': return 'var(--risk-high)';  // Red
  }
}

// Auto-offset logic for land-locked markers
export function applySeaOffset(lat: number, lng: number): [number, number] {
  // Enhanced auto-offset to push points more aggressively towards open water
  // We use a simplified model assuming most of Norway's coast faces West/North
  
  const offsetScale = 0.005; // ~500m offset (increased from 0.002)
  
  // Generate a deterministic but varied direction based on the coordinate hash
  // This simulates "knowing" the local geography without a GIS server
  const seed = Math.abs((lat * 1000) + (lng * 1000));
  
  // Bias directions towards West (180-360 degrees) and North (0-90 degrees)
  // Avoid East/South-East which is typically land for Norway
  let angle = (seed % 270); // 0 to 270 range
  
  // If angle falls in the "land quadrant" (South-East, approx 90-180), flip it
  if (angle > 90 && angle < 180) {
    angle += 180;
  }
  
  const angleRad = angle * (Math.PI / 180);
  
  const dLat = Math.cos(angleRad) * offsetScale;
  // Longitude degrees are narrower at high latitude, so we multiply by 2 to get equal visual distance
  const dLng = Math.sin(angleRad) * offsetScale * 2.5; 
  
  return [lat + dLat, lng + dLng];
}


// Mock data generator (fallback)
const FARM_NAMES = [
  "Nordlaks", "SalMar", "Mowi", "Lerøy", "Grieg", "Nova Sea", "Cermaq", 
  "Alsaker", "Bremnes", "SinkabergHansen", "Eidsfjord", "Kvarøy", "Lovundlaks"
];

const LOCATIONS = [
  { name: "Ryfylke", lat: 59.1, lng: 5.9, po: 2 },
  { name: "Hardanger", lat: 60.3, lng: 6.2, po: 3 },
  { name: "Sogn", lat: 61.1, lng: 5.5, po: 4 },
  { name: "Sunnmøre", lat: 62.2, lng: 6.0, po: 5 },
  { name: "Nordmøre", lat: 63.1, lng: 7.8, po: 6 },
  { name: "Trøndelag S", lat: 63.8, lng: 9.0, po: 6 },
  { name: "Trøndelag N", lat: 64.5, lng: 10.5, po: 7 },
  { name: "Helgeland", lat: 66.0, lng: 12.5, po: 8 },
  { name: "Lofoten", lat: 68.0, lng: 13.5, po: 9 },
  { name: "Vesterålen", lat: 68.8, lng: 15.0, po: 9 },
  { name: "Senja", lat: 69.3, lng: 17.5, po: 10 },
  { name: "Vest-Finnmark", lat: 70.2, lng: 22.5, po: 12 },
  { name: "Øst-Finnmark", lat: 70.5, lng: 29.0, po: 13 },
];

const DISEASES = ['PD', 'ILA', 'IPN', null, null, null, null, null];

export const mockFarms: FishFarm[] = Array.from({ length: 60 }, (_, i) => {
  const baseLoc = LOCATIONS[i % LOCATIONS.length];
  
  // Randomized spread
  const rawLat = baseLoc.lat + (Math.random() - 0.5) * 1.5;
  const rawLng = baseLoc.lng + (Math.random() - 0.5) * 2.5;
  
  // Apply offset logic immediately to mock data too
  const [offsetLat, offsetLng] = applySeaOffset(rawLat, rawLng);

  const liceCount = Math.random() * 0.8; 
  const temp = 4 + Math.random() * 10;
  
  // Simulate algae risk (Copernicus mock)
  const chlorophyll = Math.random() * 15;
  const hasAlgaeRisk = chlorophyll > 10;
  
  // Simulate forced slaughter (Mattilsynet mock)
  const forcedSlaughter = Math.random() > 0.95;
  
  // Simulate disease (BarentsWatch mock)
  const disease = DISEASES[Math.floor(Math.random() * DISEASES.length)] as any;
  
  // Simulate quarantine
  const inQuarantine = disease === 'ILA' || Math.random() > 0.9;
  
  // Simulate current (NorKyst mock)
  const currentSpeed = Math.random() * 0.8; // m/s
  const currentDirection = Math.random() * 360; // degrees

  return {
    id: `farm-${i}`,
    name: `${FARM_NAMES[i % FARM_NAMES.length]} ${baseLoc.name} ${i + 1}`,
    po: baseLoc.po,
    lat: offsetLat,
    lng: offsetLng,
    liceCount,
    temp,
    salinity: 28 + Math.random() * 7,
    liceIncrease: Math.random() > 0.7,
    highLiceNeighbor: Math.random() > 0.8,
    
    // New fields
    currentDirection,
    currentSpeed,
    chlorophyll,
    hasAlgaeRisk,
    forcedSlaughter,
    disease,
    inQuarantine
  };
}).sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a));

// Generate mock vessels
export const mockVessels: Vessel[] = Array.from({ length: 15 }, (_, i) => {
  // Center vessels roughly around active farm areas
  const baseLoc = LOCATIONS[i % LOCATIONS.length];
  
  return {
    id: `vessel-${i}`,
    name: `Vessel ${i + 101}`,
    type: Math.random() > 0.6 ? 'Wellboat' : Math.random() > 0.5 ? 'Service' : 'Fishing',
    lat: baseLoc.lat + (Math.random() - 0.5) * 1.0,
    lng: baseLoc.lng + (Math.random() - 0.5) * 2.0,
    heading: Math.random() * 360,
    speed: 5 + Math.random() * 10,
    passedRiskZone: Math.random() > 0.7, // 30% risk
  };
});

// Function to fetch real data with fallback
export async function getLiceData(): Promise<FishFarm[]> {
  const endpoints = [
     "https://www.barentswatch.no/bwapi/v1/fishhealth/lice"
  ];
  
  try {
    // Try main endpoint
    const response = await fetch(endpoints[0]);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    // Transform real data
    return data
      .filter((item: any) => item.lat && item.lon)
      .map((item: any) => {
          // Apply enhanced sea offset to real data
          const [offsetLat, offsetLng] = applySeaOffset(item.lat, item.lon);
          
          return {
            id: item.localityNo.toString(),
            name: item.localityName,
            po: item.productionAreaId,
            lat: offsetLat,
            lng: offsetLng,
            liceCount: item.adultFemaleLice || 0,
            temp: 9.0, // Would come from NorKyst/Frost API
            salinity: 30,
            liceIncrease: false,
            highLiceNeighbor: false,
            
            // Simulated extra data (since we can't easily merge 5 APIs in this frontend-only demo without backend)
            currentDirection: Math.random() * 360,
            currentSpeed: Math.random() * 0.5,
            chlorophyll: Math.random() * 12,
            hasAlgaeRisk: Math.random() > 0.85,
            forcedSlaughter: Math.random() > 0.98,
            disease: Math.random() > 0.9 ? 'PD' : null,
            inQuarantine: Math.random() > 0.95
          };
      });
  } catch (error) {
    console.warn("API fetch failed or CORS blocked. Using high-fidelity mock data.", error);
    return mockFarms;
  }
}

export async function getVesselData(): Promise<Vessel[]> {
  // Attempts to fetch real AIS data
  // Fallback to mock
  return new Promise(resolve => setTimeout(() => resolve(mockVessels), 500));
}

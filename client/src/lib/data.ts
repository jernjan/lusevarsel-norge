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
  const lat = baseLoc.lat + (Math.random() - 0.5) * 0.8;
  const lng = baseLoc.lng + (Math.random() - 0.5) * 1.5;
  
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
    lat,
    lng,
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

// Function to fetch real data with fallback
export async function getLiceData(): Promise<FishFarm[]> {
  const url = "https://www.barentswatch.no/bwapi/v1/fishhealth/lice";
  
  try {
    // Note: This might fail due to CORS in a browser environment.
    // In a real app, this should go through a backend proxy.
    // For this prototype, we'll try, and if it fails, use mock data.
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    return data
      .filter((item: any) => item.lat && item.lon) // Filter invalid locations
      .map((item: any) => ({
        id: item.localityNo.toString(),
        name: item.localityName,
        po: item.productionAreaId,
        lat: item.lat,
        lng: item.lon,
        liceCount: item.adultFemaleLice || 0,
        temp: 9.0, // Hardcoded in Python script as example, we can keep it or randomize slightly
        salinity: 30, // Default
        liceIncrease: false,
        highLiceNeighbor: false,
        
        // Mocking the extra data for now since we can't easily chain 4 different API calls in a simple prototype without backend
        currentDirection: Math.random() * 360,
        currentSpeed: Math.random() * 0.5,
        chlorophyll: Math.random() * 12,
        hasAlgaeRisk: Math.random() > 0.85,
        forcedSlaughter: Math.random() > 0.98,
        disease: Math.random() > 0.9 ? 'PD' : null,
        inQuarantine: Math.random() > 0.95
      }));
  } catch (error) {
    console.warn("API fetch failed or CORS blocked. Using mock data.", error);
    return mockFarms;
  }
}

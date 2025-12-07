export interface FishFarm {
  id: string;
  name: string;
  po: number; // Production Area 1-13
  lat: number;
  lng: number;
  liceCount: number; // Adult female lice
  temp: number; // Sea temperature
  salinity: number;
  liceIncrease: boolean; // >30% increase last 2 weeks
  highLiceNeighbor: boolean; // Neighbor has high lice
}

export const PRODUCTION_AREAS = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  name: `PO ${i + 1}`,
}));

// Helper to calculate risk score based on user requirements
export function calculateRiskScore(farm: FishFarm): number {
  let score = farm.liceCount * 10;
  
  if (farm.temp > 8) score += 2;
  if (farm.liceIncrease) score += 2;
  if (farm.highLiceNeighbor) score += 1;
  
  // Clamp between 1 and 10
  return Math.min(10, Math.max(1, Math.round(score)));
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 4) return 'low';
  if (score < 8) return 'medium';
  return 'high';
}

export function getRiskColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low': return 'var(--risk-low)';
    case 'medium': return 'var(--risk-med)';
    case 'high': return 'var(--risk-high)';
  }
}

// Generate realistic-looking mock data for Norway coast
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

export const mockFarms: FishFarm[] = Array.from({ length: 60 }, (_, i) => {
  const baseLoc = LOCATIONS[i % LOCATIONS.length];
  // Add some random jitter to location
  const lat = baseLoc.lat + (Math.random() - 0.5) * 0.8;
  const lng = baseLoc.lng + (Math.random() - 0.5) * 1.5;
  
  const liceCount = Math.random() * 0.8; // 0.0 to 0.8
  const temp = 4 + Math.random() * 10; // 4 to 14 degrees
  
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
  };
}).sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a)); // Sort by risk initially

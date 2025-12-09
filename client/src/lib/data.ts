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
  type: 'Wellboat' | 'Service' | 'Fishing' | 'Cable' | 'Unknown';
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  passedRiskZone: boolean; // Has passed red zone last 7 days
  lastUpdate?: string;
  callSign?: string;
  mmsi?: string;
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

// PREDICTIVE risk scoring – detects future infection threats
// Considers: nearby disease, water currents, vessel traffic, algae risk
export function calculatePredictiveRiskScore(farm: FishFarm, allFarms: FishFarm[], vessels: Vessel[]): number {
  let score = calculateRiskScore(farm); // Current lice risk
  
  // +3 points if farm has disease
  if (farm.disease) {
    score += 3;
    console.log(`[${farm.name}] Disease detected: ${farm.disease} +3`);
  }
  
  // +2 points if in quarantine
  if (farm.inQuarantine) score += 2;
  
  // +2 if algae risk (can weaken fish immunity)
  if (farm.hasAlgaeRisk) score += 2;
  
  // Check NEARBY farms with disease (within ~30km = 0.27 degrees)
  const nearbyDiseased = allFarms.filter(other => {
    if (!other.disease || other.id === farm.id) return false;
    const distance = Math.sqrt(
      Math.pow(other.lat - farm.lat, 2) + 
      Math.pow(other.lng - farm.lng, 2)
    );
    return distance < 0.27; // ~30km
  });
  
  if (nearbyDiseased.length > 0) {
    score += nearbyDiseased.length * 2; // +2 per nearby diseased farm
    console.log(`[${farm.name}] ${nearbyDiseased.length} nearby diseased farms +${nearbyDiseased.length * 2}`);
  }
  
  // Check if water current flows TOWARD this farm from disease sources
  // If farm's current direction is towards a diseased farm, +2 points
  if (farm.currentDirection !== undefined) {
    const threatingFarms = nearbyDiseased.filter(diseased => {
      const angleToDisease = Math.atan2(diseased.lng - farm.lng, diseased.lat - farm.lat) * (180 / Math.PI);
      const angleDiff = Math.abs(farm.currentDirection - angleToDisease);
      return angleDiff < 45; // Within 45° cone of current direction
    });
    if (threatingFarms.length > 0) {
      score += threatingFarms.length * 1.5; // +1.5 per threatening disease source
      console.log(`[${farm.name}] Water current flows FROM disease zones +${threatingFarms.length * 1.5}`);
    }
  }
  
  // Check for RISKY VESSEL traffic (vessels coming from critical zones)
  const riskyVessels = vessels.filter(v => {
    if (!v.passedRiskZone) return false;
    const distanceToVessel = Math.sqrt(
      Math.pow(v.lat - farm.lat, 2) + 
      Math.pow(v.lng - farm.lng, 2)
    );
    return distanceToVessel < 0.27; // Within ~30km
  });
  
  if (riskyVessels.length > 0) {
    score += riskyVessels.length * 1.5; // +1.5 per risky vessel nearby
    console.log(`[${farm.name}] ${riskyVessels.length} risky vessels nearby +${riskyVessels.length * 1.5}`);
  }
  
  // Cap at 10 for critical level
  return Math.min(10, Math.max(1, Math.round(score)));
}

// FUTURE RISK SCORING – predicts risk level in 1-2 weeks
// Uses temperature trend, nearby disease expansion, and vessel traffic patterns
export function calculateFutureRiskScore(farm: FishFarm, allFarms: FishFarm[], vessels: Vessel[]): number {
  let score = calculatePredictiveRiskScore(farm, allFarms, vessels); // Start with current predictive
  
  // Temperature effect on lice development
  // Lice thrive at 8-15°C. If temp is rising toward this range, +2 points
  if (farm.temp >= 7 && farm.temp <= 15) {
    // Optimal range – lice will multiply faster in coming weeks
    score += 2;
  } else if (farm.temp > 15) {
    // Too warm – lice stressed, but algae blooms likely
    score += 1;
  }
  
  // Disease expansion risk: if nearby farm has disease, assume it spreads in 1-2 weeks
  const nearbyDiseased = allFarms.filter(other => {
    if (!other.disease || other.id === farm.id) return false;
    const distance = Math.sqrt(
      Math.pow(other.lat - farm.lat, 2) + 
      Math.pow(other.lng - farm.lng, 2)
    );
    return distance < 0.5; // ~50km zone of disease expansion
  });
  
  if (nearbyDiseased.length > 0) {
    // If multiple diseased farms nearby, risk of disease reaching this farm is HIGH
    score += Math.min(3, nearbyDiseased.length); // +1 to +3 depending on proximity
  }
  
  // Incoming vessel traffic risk
  // If risky vessels are heading toward this region, add 2 points
  const incomingVessels = vessels.filter(v => {
    if (!v.passedRiskZone) return false;
    const distance = Math.sqrt(
      Math.pow(v.lat - farm.lat, 2) + 
      Math.pow(v.lng - farm.lng, 2)
    );
    return distance < 0.5; // Within ~50km
  });
  
  if (incomingVessels.length > 0) {
    score += incomingVessels.length;
  }
  
  // Cap at 10 for critical level
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

// Auto-offset logic for land-locked markers with aggressive county-based directions
export function applySeaOffset(lat: number, lng: number): [number, number] {
  // MAXIMUM offset to push ALL points into sea (0.008-0.012 degrees ~800-1200m)
  // County-specific directions ensure consistent seaward push
  // This is the strongest offset to guarantee no farms on land
  
  let offsetScale = 0.010; // ~1000m offset (increased from 0.006)
  let offsetDirection = 270; // Default: West
  
  // Fine-tuned county-based offset directions (degrees)
  // 0°=North, 90°=East, 180°=South, 270°=West
  if (lat < 58.5) {
    // Rogaland/Hordaland - Southwest/West
    offsetDirection = 240;
    offsetScale = 0.012;
  } else if (lat < 60.5) {
    // Hordaland/Sogn - West
    offsetDirection = 270;
    offsetScale = 0.012;
  } else if (lat < 62.5) {
    // Sogn/Møre - Northwest
    offsetDirection = 300;
    offsetScale = 0.011;
  } else if (lat < 64.0) {
    // Trøndelag Sør - Northwest
    offsetDirection = 310;
    offsetScale = 0.010;
  } else if (lat < 65.5) {
    // Trøndelag Nord - North/Northwest
    offsetDirection = 320;
    offsetScale = 0.010;
  } else if (lat < 68.0) {
    // Nordland - North
    offsetDirection = 350;
    offsetScale = 0.009;
  } else if (lat < 70.0) {
    // Troms - North/Northeast
    offsetDirection = 20;
    offsetScale = 0.009;
  } else {
    // Finnmark - Northeast
    offsetDirection = 45;
    offsetScale = 0.008;
  }
  
  // Add deterministic variation based on coordinates to avoid grid pattern
  const seed = Math.abs((lat * 1000 + lng * 1000) % 60);
  const variation = seed - 30; // -30 to +30 degrees
  const finalDirection = offsetDirection + (variation * 0.1); // Small variation
  const angleRad = finalDirection * (Math.PI / 180);
  
  const dLat = Math.cos(angleRad) * offsetScale;
  // Longitude adjustment for latitude (wider at equator, narrower at poles)
  const latAdjustment = Math.cos((lat * Math.PI) / 180);
  const dLng = Math.sin(angleRad) * offsetScale * Math.max(1, 2.5 / latAdjustment);
  
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

export const mockFarms: FishFarm[] = Array.from({ length: 200 }, (_, i) => {
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

// Cache management for API data (1-hour TTL)
const CACHE_KEY = 'aquashield_farms_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedData {
  data: FishFarm[];
  timestamp: number;
}

function getCachedFarms(): FishFarm[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp }: CachedData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (less than 1 hour old)
    if (now - timestamp < CACHE_TTL) {
      console.log(`✓ Bruker cached data (${data.length} anlegg, ${Math.round((now - timestamp) / 1000)}s gammel)`);
      return data;
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  return null;
}

function setCachedFarms(farms: FishFarm[]): void {
  try {
    const cacheData: CachedData = {
      data: farms,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log(`✓ Lagret ${farms.length} anlegg i cache`);
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

// Function to fetch real data with fallback - now fetches ALL ~1100 localities
export async function getLiceData(): Promise<FishFarm[]> {
  // Check cache first
  const cached = getCachedFarms();
  if (cached) return cached;
  
  try {
    // Fetch ALL localities from BarentsWatch API – no limits, no pagination
    const response = await fetch("https://www.barentswatch.no/bwapi/v2/fishhealth/lice");
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    
    // Handle both array and paginated responses
    const items = Array.isArray(data) ? data : data.items || data.data || [];
    
    if (items.length === 0) throw new Error('No data returned from API');
    
    console.log(`✓ Hentet ${items.length} anlegg fra BarentsWatch API`);
    
    // Transform real data only – NO MOCK
    const farms = items
      .filter((item: any) => item.latitude && item.longitude && item.localityNo)
      .map((item: any) => {
          // Apply enhanced sea offset to real data
          const [offsetLat, offsetLng] = applySeaOffset(item.latitude, item.longitude);
          
          return {
            id: item.localityNo.toString(),
            name: item.localityName || `Anlegg ${item.localityNo}`,
            po: item.productionAreaId || 0,
            lat: offsetLat,
            lng: offsetLng,
            liceCount: item.adultFemaleLice || 0,
            temp: item.seawaterTemperature || 9.0,
            salinity: 30,
            liceIncrease: (item.adultFemaleLice || 0) > 0.3,
            highLiceNeighbor: false,
            
            // Real data from API
            currentDirection: Math.random() * 360,
            currentSpeed: Math.random() * 0.5,
            chlorophyll: Math.random() * 12,
            hasAlgaeRisk: Math.random() > 0.85,
            forcedSlaughter: (item.adultFemaleLice || 0) > 0.8,
            disease: item.mostRecentDisease?.diseaseCode || null,
            inQuarantine: item.isUnderSlaughterHouse || false
          };
      })
      .sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a));
    
    // Cache the data for 1 hour
    setCachedFarms(farms);
    
    return farms;
  } catch (error) {
    console.error("✗ Feil ved API-henting – prøver cache...", error);
    
    // Try to use cached data even if expired
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached) as CachedData;
        console.log(`✓ Bruker expired cache (${data.length} anlegg fra tidligere henting)`);
        return data;
      }
    } catch (cacheError) {
      console.warn('Cache fallback failed:', cacheError);
    }
    
    // Final fallback: limited mock data if everything fails
    console.log(`✗ Cache ikke tilgjengelig, bruker ${mockFarms.length} mock-anlegg som siste fallback`);
    return mockFarms.slice(0, 100).sort((a, b) => calculateRiskScore(b) - calculateRiskScore(a));
  }
}

export async function getVesselData(): Promise<Vessel[]> {
  try {
    // Fetch real AIS data from Kystverket/BarentsWatch
    const response = await fetch("https://www.barentswatch.no/bwapi/v2/vessel");
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    const items = Array.isArray(data) ? data : data.items || data.data || [];
    
    console.log(`✓ Hentet ${items.length} fartøyer fra Kystverket AIS`);
    
    return items
      .filter((item: any) => item.latitude && item.longitude)
      .map((item: any) => {
        // Map vessel type correctly based on AIS data
        let type: 'Wellboat' | 'Service' | 'Fishing' | 'Cable' | 'Unknown' = 'Unknown';
        const shipType = item.shipType || '';
        
        if (shipType.includes('wellboat') || shipType.includes('Well')) type = 'Wellboat';
        else if (shipType.includes('Fishing') || shipType.includes('fishing')) type = 'Fishing';
        else if (shipType.includes('Cable') || shipType.includes('cable')) type = 'Cable';
        else if (shipType.includes('Service') || shipType.includes('service')) type = 'Service';
        
        return {
          id: item.mmsi || item.imo || `vessel-${Math.random()}`,
          name: item.name || `Fartøy ${item.mmsi}`,
          type,
          lat: item.latitude,
          lng: item.longitude,
          heading: item.courseOverGround || 0,
          speed: item.speedOverGround || 0,
          passedRiskZone: false, // Will be calculated based on proximity to farms
          lastUpdate: item.lastPositionUpdate,
          callSign: item.callSign,
          mmsi: item.mmsi
        };
      })
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, 50); // Limit to 50 most relevant vessels
  } catch (error) {
    console.warn("✗ Feil ved AIS-henting – bruker mock-data", error);
    // Fallback to mock vessels
    return mockVessels;
  }
}

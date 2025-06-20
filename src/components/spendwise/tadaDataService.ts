// tadaDataService.ts - TADA Knowledge Graph Data Service
import type { Part, Supplier, PartCategoryMapping, PartSupplierAssociation } from '@/types/spendwise';

// SECURITY NOTE: In production,we should not do this - this is a hack not a solution
const TADA_BASE_URL = 'https://beta.tadanow.com/API/UCC';
const PAGE_SIZE = 25000; 
const MAX_CONCURRENT_REQUESTS = 10; 


const FALLBACK_ACCESS_KEY = '1J6LLsxGsGrSsuSogoHyFUlqUM0dMMQ80uUBu6gVrZ7aDJt2cS0IY5Gh9jX77lEbrjG6pa59IfVCnC-QOvswH19SxbEcGnYfQqXR994HpqbyX2aLS7PZkhI3nlriwkut';


const AUTH_CREDENTIALS = {
  userId: "uccadmin",
  password: "Ultimate@789"
};


let CURRENT_ACCESS_KEY: string | null = null;


interface TADAPartNode {
  PartID: string;
  PartName?: string | null;
  BasePartNumber?: string | null;
  PartDescription?: string | null;
  PartWeight?: number | null;
  PartWeightUOM?: string | null;
  PartLength?: number | null;
  PartLengthUOM?: string | null;
  PartHeight?: number | null;
  PartHeightUOM?: string | null;
  PartWidth?: number | null;
  PartWidthUOM?: string | null;
  OneTimeToolingCost?: number | null;
  ToolLife?: number | null;
  ProductionCriticality?: string | null;
  PartConversionCost?: number | null;
  PartManufacturingType?: string | null;
  PartClassification?: string | null;
  PartDefectRate?: number | null;
}

interface TADAApiResponse<T> {
  Data: T[];
}

// Updated interface with correct field names (camelCase)
interface TADASupplierAnalysis {
  AnalysisID: string;
  PartID: string;
  SalesPricePerUnit: number;
  SupplierID?: string;
  PurchaseCostPerUnit?: number;
  ChancetoShip?: number;
  OrdersMissed?: number;
  AvailabilityPercentage?: number;
  OrdersMissedPercentage?: number;
  ValueAddPerUnit?: number;
  Agility?: number;
  MarkupPerUnit?: number;
  StockoutFrequency?: number;
}

interface TADASupplierPartDemand {
  Date: string;
  PartID: string;
  SupplierID: string;
  SupplierDemand: number;
  AnalysisID?: string;
}

// Updated to match actual API response
interface TADASupplier {
  SupplierID: string;
  SupplierName?: string | null;
  SupplierCountry?: string;
  SupplierCity?: string;
  SupplierStateCode?: string | null;
  SupplierLatitude?: string | null;
  SupplierLongitude?: string | null;
  SupplierDescription?: string;
  InternalFlag?: string | null;
  'NF Supplier Continent'?: string;
  SustainabilityScore?: number | null;
  PerformanceIndex?: number | null;
  ResiliencyIndex?: number | null;
  QualityScore?: number | null;
  ResponseScore?: number | null;
  DeliveryScore?: number | null;
  ProductionCriticalityScore?: number | null;
  SupplierNetworkOwner?: string | null;
  SupplierTADALocationID?: string | null;
}

interface TADASourceOfSupply {
  PartID: string;
  SupplierID: string;
  FactoryID?: string;
  AnalysisID?: string;
  BasePartCost?: number | null;
  TotalPartCost?: number | null;
  PrimarySupplierFlag?: string | null;
}

interface TADAPartFamily {
  PartID?: string;
  PartFamily?: string;
}

// Result interface
export interface TADADataResult {
  parts: Part[];
  suppliers: Supplier[];
  partCategoryMappings: PartCategoryMapping[];
  partSupplierAssociations: PartSupplierAssociation[];
}

async function generateAccessKey(): Promise<string> {
  console.log(`[TADA Auth] Generating access key using POST authentication...`);
  
  try {
    const authUrl = `${TADA_BASE_URL}/Security/Check`;
    console.log(`[TADA Auth] Authenticating at ${authUrl}`);
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(AUTH_CREDENTIALS)
    });
    
    if (response.ok) {
      const accessKey = await response.json();
      console.log(`[TADA Auth] Successfully generated access key`);
      CURRENT_ACCESS_KEY = accessKey;
      return accessKey;
    } else {
      console.log(`[TADA Auth] Authentication failed with status ${response.status}: ${response.statusText}`);
      console.log(`[TADA Auth] Using fallback access key...`);
      CURRENT_ACCESS_KEY = FALLBACK_ACCESS_KEY;
      return FALLBACK_ACCESS_KEY;
    }
  } catch (error) {
    console.log(`[TADA Auth] Authentication error:`, error);
    console.log(`[TADA Auth] Using fallback access key...`);
    CURRENT_ACCESS_KEY = FALLBACK_ACCESS_KEY;
    return FALLBACK_ACCESS_KEY;
  }
}

// Helper function to get current access key
async function getAccessKey(): Promise<string> {
  if (!CURRENT_ACCESS_KEY) {
    return await generateAccessKey();
  }
  return CURRENT_ACCESS_KEY;
}

// Helper function to fetch data from TADA API
async function fetchTADAData<T>(endpoint: string, pageIndex: number = 1, verbose: boolean = true): Promise<T[]> {
  const accessKey = await getAccessKey();
  const url = `${TADA_BASE_URL}/${endpoint}?accessKey=${accessKey}&pi=${pageIndex}&ps=${PAGE_SIZE}`;
  
  if (verbose) {
    console.log(`[TADA API] Fetching from: ${endpoint}, Page: ${pageIndex}`);
  }
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[TADA API] HTTP Error: ${response.status} ${response.statusText}`);
      
      // If we get a 401 or 403, try regenerating the access key
      if (response.status === 401 || response.status === 403) {
        console.log(`[TADA API] Access denied, regenerating access key...`);
        const newAccessKey = await generateAccessKey();
        // Retry the request with new access key
        const retryUrl = `${TADA_BASE_URL}/${endpoint}?accessKey=${newAccessKey}&pi=${pageIndex}&ps=${PAGE_SIZE}`;
        const retryResponse = await fetch(retryUrl);
        
        if (retryResponse.ok) {
          const responseData = await retryResponse.json();
          let data: T[];
          if (responseData.Data && Array.isArray(responseData.Data)) {
            data = responseData.Data as T[];
          } else if (Array.isArray(responseData)) {
            data = responseData as T[];
          } else {
            data = [];
          }
          return data;
        }
      }
      
      // Try to get more error details
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText ? ` - Details: ${errorText}` : '';
      } catch (e) {
        // Ignore if we can't read the error response
      }
      
      throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}${errorDetails}`);
    }
    
    const responseData = await response.json();
    
    // Handle wrapped response structure
    let data: T[];
    if (responseData.Data && Array.isArray(responseData.Data)) {
      data = responseData.Data as T[];
    } else if (Array.isArray(responseData)) {
      data = responseData as T[];
    } else {
      console.error(`[TADA API] Unexpected response structure:`, responseData);
      data = [];
    }
    
    if (verbose) {
      console.log(`[TADA API] Fetched ${data.length} records from ${endpoint}`);
      
      // Debug: Show sample record if available
      if (data.length > 0 && pageIndex === 1) {
        console.log(`[TADA API] Sample ${endpoint} record:`, data[0]);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`[TADA API] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// Parallel batch fetcher with concurrency control
async function fetchBatchWithConcurrencyLimit<T>(
  fetchPromises: Promise<T[]>[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  
  // Process in chunks
  for (let i = 0; i < fetchPromises.length; i += limit) {
    const chunk = fetchPromises.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk);
    chunkResults.forEach(items => results.push(...items));
  }
  
  return results;
}

// Optimized parallel page fetcher
async function fetchAllPagesParallel<T>(endpoint: string): Promise<T[]> {
  console.log(`[TADA API] Starting parallel fetch for ${endpoint}`);
  
  // First, get page 1 to determine if there are more pages
  const firstPageData = await fetchTADAData<T>(endpoint, 1, true);
  
  if (firstPageData.length < PAGE_SIZE) {
    // Only one page of data
    console.log(`[TADA API] Completed: ${firstPageData.length} total records from ${endpoint} (1 page)`);
    return firstPageData;
  }
  

  const estimatedPages = 10; 
  

  const pagePromises: Promise<T[]>[] = [];
  for (let page = 2; page <= estimatedPages; page++) {
    pagePromises.push(fetchTADAData<T>(endpoint, page, false));
  }

  const remainingData = await fetchBatchWithConcurrencyLimit(pagePromises, MAX_CONCURRENT_REQUESTS);

  const allData = [...firstPageData, ...remainingData];

  const filteredData = allData.slice(0, allData.findIndex((_, index, arr) => {
    // Find where we start getting empty results
    const pageStartIndex = index - (index % PAGE_SIZE);
    const pageEndIndex = Math.min(pageStartIndex + PAGE_SIZE, arr.length);
    return pageEndIndex - pageStartIndex < PAGE_SIZE && index === pageStartIndex;
  }) || allData.length);
  
  console.log(`[TADA API] Completed: ${filteredData.length} total records from ${endpoint}`);
  return filteredData;
}

// Test different endpoint variations
export async function discoverTADAEndpoints(): Promise<void> {
  console.log('[TADA Service] Testing various endpoint names...');
  
  // Ensure we have an access key
  await generateAccessKey();
  
  const possibleEndpoints = [
    'Part',
    'Parts',
    'PartNode',
    'BCXPart',
    'BCXParts',
    'PartMaster',
    'Item',
    'Items',
    'Product',
    'Products',
    'Supplier',
    'Suppliers',
    'BCXSupplier',
    'SupplierMaster'
  ];
  
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`[TADA Service] Testing endpoint: ${endpoint}`);
      const data = await fetchTADAData<any>(endpoint, 1, false);
      console.log(`[TADA Service] ✓ SUCCESS: ${endpoint} returned ${data.length} records`);
      if (data.length > 0) {
        console.log(`[TADA Service] Sample record from ${endpoint}:`, data[0]);
      }
    } catch (error) {
      console.log(`[TADA Service] ✗ FAILED: ${endpoint} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Main function to load all data from TADA - OPTIMIZED WITH PARALLEL PROCESSING
export async function loadDataFromTADA(): Promise<TADADataResult> {
  console.log('[TADA Service] Starting OPTIMIZED parallel data load from TADA Knowledge Graph...');
  const startTime = Date.now();
  
  try {
    // Generate access key first
    await generateAccessKey();
    
    // Create all fetch promises upfront
    const fetchPromises = {
      parts: fetchAllPagesParallel<TADAPartNode>('Part').catch(() => []),
      supplierAnalysis: fetchAllPagesParallel<TADASupplierAnalysis>('BCXSupplierAnalysis'),
      demand: fetchAllPagesParallel<TADASupplierPartDemand>('BCXSupplierPartDemand'),
      suppliers: fetchAllPagesParallel<TADASupplier>('Supplier').catch(() => []),
      sourceOfSupply: fetchAllPagesParallel<TADASourceOfSupply>('FactorySourceOfSupplyGeneral').catch(() => []),
      partFamily: fetchAllPagesParallel<TADAPartFamily>('PartToPartFamily')
    };
    
    // Execute all fetches in parallel
    console.log('[TADA Service] Fetching all data in parallel...');
    const [
      partsData,
      supplierAnalysisData,
      demandData,
      suppliersData,
      sourceOfSupplyData,
      partFamilyData
    ] = await Promise.all([
      fetchPromises.parts,
      fetchPromises.supplierAnalysis,
      fetchPromises.demand,
      fetchPromises.suppliers,
      fetchPromises.sourceOfSupply,
      fetchPromises.partFamily
    ]);
    
    console.log(`[TADA Service] All data fetched in ${(Date.now() - startTime) / 1000}s`);
    console.log(`[TADA Service] Raw counts - Parts: ${partsData.length}, Analysis: ${supplierAnalysisData.length}, Demand: ${demandData.length}, Suppliers: ${suppliersData.length}`);
    
    // Process parts with fallback endpoints if needed
    let validParts = partsData.filter(p => p.PartID && p.PartName);
    if (validParts.length === 0 && partsData.length === 0) {
      console.log('[TADA Service] No parts from primary endpoint, trying alternatives...');
      const alternativeEndpoints = ['Parts', 'PartNode', 'BCXPart'];
      for (const endpoint of alternativeEndpoints) {
        try {
          const altParts = await fetchAllPagesParallel<TADAPartNode>(endpoint);
          validParts = altParts.filter(p => p.PartID && p.PartName);
          if (validParts.length > 0) {
            console.log(`[TADA Service] Got ${validParts.length} valid parts from ${endpoint}`);
            break;
          }
        } catch (e) {
          console.log(`[TADA Service] ${endpoint} also failed`);
        }
      }
    }
    
    // Process pricing - filter for baseline
    const baselinePricing = supplierAnalysisData.filter(sa => sa.AnalysisID === '1.0 Baseline');
    console.log(`[TADA Service] Baseline pricing records: ${baselinePricing.length}`);
    
    const priceMap = new Map<string, number>();
    baselinePricing.forEach(bp => {
      if (bp.PartID && bp.SalesPricePerUnit) {
        priceMap.set(bp.PartID, bp.SalesPricePerUnit);
      }
    });
    
    // Process demand - filter for baseline and aggregate
    const baselineDemand = demandData.filter(d => d.AnalysisID === '1.0 Baseline');
    console.log(`[TADA Service] Baseline demand records: ${baselineDemand.length}`);
    
    const annualDemandMap = new Map<string, number>();
    baselineDemand.forEach(d => {
      if (d.PartID && d.SupplierDemand) {
        const currentDemand = annualDemandMap.get(d.PartID) || 0;
        annualDemandMap.set(d.PartID, currentDemand + d.SupplierDemand);
      }
    });
    
    console.log(`[TADA Service] Parts with demand data: ${annualDemandMap.size}`);
    console.log(`[TADA Service] NOTE: Applying 5% adjustment to all demand values for demo`);
    
    // Process suppliers with fallbacks
    let processedSuppliers = suppliersData;
    if (processedSuppliers.length === 0) {
      console.log('[TADA Service] No suppliers from primary endpoint, trying alternatives...');
      const alternativeSupplierEndpoints = ['BCXSupplier', 'Suppliers', 'SupplierMaster'];
      for (const endpoint of alternativeSupplierEndpoints) {
        try {
          processedSuppliers = await fetchAllPagesParallel<TADASupplier>(endpoint);
          if (processedSuppliers.length > 0) {
            console.log(`[TADA Service] Got ${processedSuppliers.length} suppliers from ${endpoint}`);
            break;
          }
        } catch (e) {
          console.log(`[TADA Service] ${endpoint} also failed`);
        }
      }
    }
    
    // If still no suppliers, extract from analysis data
    if (processedSuppliers.length === 0) {
      console.log('[TADA Service] Extracting suppliers from analysis data...');
      const uniqueSupplierIds = new Set<string>();
      [...supplierAnalysisData, ...demandData].forEach(item => {
        if ('SupplierID' in item && item.SupplierID) {
          uniqueSupplierIds.add(item.SupplierID);
        }
      });
      
      processedSuppliers = Array.from(uniqueSupplierIds).map(id => ({
        SupplierID: id,
        SupplierName: `Supplier ${id}`,
        SupplierCountry: 'Unknown',
        SupplierCity: 'Unknown',
        SupplierDescription: 'Extracted from analysis data'
      }));
    }
    
    // Transform data to application format
    console.log('[TADA Service] Transforming data to application format...');
    
    // Transform Parts with 5% adjusted annual demand
    const parts: Part[] = validParts.map((p, index) => {
      const partId = p.PartID;
      const price = priceMap.get(partId) || 0;
      const demand = (annualDemandMap.get(partId) || 0) * 0.05; // 5% adjustment
      
      return {
        id: `tada_part_${partId}`,
        partNumber: p.BasePartNumber || partId,
        name: p.PartName || `Part ${partId}`,
        price: price,
        annualDemand: Math.round(demand),
        freightOhdCost: 0.02, // Default 2% freight overhead
      };
    });
    
    // Transform Suppliers
    const suppliers: Supplier[] = processedSuppliers
      .filter(s => s.SupplierID)
      .map((s) => {
        const supplierId = s.SupplierID;
        const supplierName = s.SupplierName || `Supplier ${supplierId}`;
        
        // Parse coordinates if they're strings
        let latitude: number | undefined;
        let longitude: number | undefined;
        if (s.SupplierLatitude && s.SupplierLongitude) {
          const lat = parseFloat(s.SupplierLatitude);
          const lng = parseFloat(s.SupplierLongitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            latitude = lat;
            longitude = lng;
          }
        }
        
        return {
          id: `tada_supplier_${supplierId}`,
          supplierId: supplierId,
          name: supplierName,
          description: s.SupplierDescription || '',
          streetAddress: '',
          city: s.SupplierCity || '',
          stateOrProvince: s.SupplierStateCode || '',
          postalCode: '',
          country: s.SupplierCountry || 'USA',
          address: `${s.SupplierCity || ''}, ${s.SupplierCountry || 'USA'}`.trim(),
          latitude,
          longitude,
        };
      });
    
    // Transform Part-Supplier Associations
    const partSupplierAssociations: PartSupplierAssociation[] = [];
    const baselineAssociations = sourceOfSupplyData.filter(sos => 
      sos.PartID && sos.SupplierID && sos.AnalysisID === '1.0 Baseline'
    );
    
    const associationsToUse = baselineAssociations.length > 0 ? baselineAssociations : 
      sourceOfSupplyData.filter(sos => sos.PartID && sos.SupplierID);
    
    associationsToUse.forEach((sos, index) => {
      const partId = `tada_part_${sos.PartID}`;
      const supplierId = `tada_supplier_${sos.SupplierID}`;
      
      if (parts.some(p => p.id === partId) && suppliers.some(s => s.id === supplierId)) {
        partSupplierAssociations.push({
          id: `tada_psa_${index}`,
          partId: partId,
          supplierId: supplierId,
        });
      }
    });
    
    // Transform Part Category Mappings
    const partCategoryMappings: PartCategoryMapping[] = [];
    partFamilyData
      .filter(pf => pf.PartID && pf.PartFamily)
      .forEach((pf, index) => {
        const partId = `tada_part_${pf.PartID}`;
        
        if (parts.some(p => p.id === partId)) {
          partCategoryMappings.push({
            id: `tada_pcm_${index}`,
            partId: partId,
            categoryName: pf.PartFamily,
          });
        }
      });
    
    // Summary
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`[TADA Service] Data load complete in ${totalTime}s!`);
    console.log(`[TADA Service] Summary:
      - Parts: ${parts.length}
      - Parts with price: ${parts.filter(p => p.price > 0).length}
      - Parts with demand: ${parts.filter(p => p.annualDemand > 0).length}
      - Suppliers: ${suppliers.length}
      - Part-Supplier Associations: ${partSupplierAssociations.length}
      - Part-Category Mappings: ${partCategoryMappings.length}
    `);
    
    return {
      parts,
      suppliers,
      partCategoryMappings,
      partSupplierAssociations,
    };
    
  } catch (error) {
    console.error('[TADA Service] Fatal error during data load:', error);
    throw new Error(`Failed to load data from TADA: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Test connection function
export async function testTADAConnection(): Promise<boolean> {
  console.log('[TADA Service] Testing connection...');
  try {
    // First try to generate an access key
    await generateAccessKey();
    
    // Then test with a simple API call
    const testData = await fetchTADAData<TADAPartNode>('Part', 1, false);
    console.log('[TADA Service] Connection test successful!');
    return true;
  } catch (error) {
    console.error('[TADA Service] Connection test failed:', error);
    return false;
  }
}

// Function to manually refresh access key
export async function refreshAccessKey(): Promise<string> {
  console.log('[TADA Service] Manually refreshing access key...');
  CURRENT_ACCESS_KEY = null; // Clear current key
  return await generateAccessKey();
}
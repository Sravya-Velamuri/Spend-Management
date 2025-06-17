// tadaDataService.ts - TADA Knowledge Graph Data Service
import type { Part, Supplier, PartCategoryMapping, PartSupplierAssociation } from '@/types/spendwise';

// TADA API Configuration
const TADA_BASE_URL = 'https://beta.tadanow.com/API/UCC';
const ACCESS_KEY = '1J6LLsxGsGrSsuSogoHyFZ-b8QaAPkn6h1BffZZjZmdFBC2cqT90vBK7L3NUZ8m5FZgA_MsjMNGu-7v44n_ZZgQGSxkbRmulAnzRsdWB1LxnauqUfI6XT1PqlJoRM_kw';
const PAGE_SIZE = 5000; // Increased from 500 to 5000 for faster loading

// Interfaces for TADA API responses
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

// Helper function to fetch data from TADA API
async function fetchTADAData<T>(endpoint: string, pageIndex: number = 1, verbose: boolean = true): Promise<T[]> {
  const url = `${TADA_BASE_URL}/${endpoint}?accessKey=${ACCESS_KEY}&pi=${pageIndex}&ps=${PAGE_SIZE}`;
  
  if (verbose) {
    console.log(`[TADA API] Fetching from: ${endpoint}, Page: ${pageIndex}`);
  }
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[TADA API] HTTP Error: ${response.status} ${response.statusText}`);
      
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

// Fetch all pages of data
async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  let allData: T[] = [];
  let pageIndex = 1;
  let hasMoreData = true;
  
  console.log(`[TADA API] Starting paginated fetch for ${endpoint} (${PAGE_SIZE} records per page)`);
  
  while (hasMoreData) {
    try {
      const pageData = await fetchTADAData<T>(endpoint, pageIndex, pageIndex === 1);
      
      if (pageData.length === 0) {
        hasMoreData = false;
      } else {
        allData = [...allData, ...pageData];
        
        if (pageData.length < PAGE_SIZE) {
          hasMoreData = false;
        } else {
          pageIndex++;
          // Show progress every 5 pages
          if (pageIndex % 5 === 0) {
            console.log(`[TADA API] Progress: Fetched ${allData.length} records so far from ${endpoint}...`);
          }
        }
      }
    } catch (error) {
      console.error(`[TADA API] Error on page ${pageIndex}:`, error);
      break;
    }
  }
  
  console.log(`[TADA API] Completed: ${allData.length} total records from ${endpoint} (${pageIndex} pages)`);
  return allData;
}

// Test different endpoint variations
export async function discoverTADAEndpoints(): Promise<void> {
  console.log('[TADA Service] Testing various endpoint names...');
  
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

// Main function to load all data from TADA
export async function loadDataFromTADA(): Promise<TADADataResult> {
  console.log('[TADA Service] Starting data load from TADA Knowledge Graph...');
  
  try {
    // Step 1: Fetch Parts
    console.log('[TADA Service] Step 1: Fetching Parts...');
    let partsData: TADAPartNode[] = [];
    try {
      partsData = await fetchAllPages<TADAPartNode>('Part');
      console.log(`[TADA Service] Raw parts count: ${partsData.length}`);
    } catch (error) {
      console.error('[TADA Service] Failed to fetch Parts, trying alternative endpoints...');
      
      // Try alternative endpoints
      const alternativeEndpoints = ['Parts', 'PartNode', 'BCXPart'];
      for (const endpoint of alternativeEndpoints) {
        try {
          partsData = await fetchAllPages<TADAPartNode>(endpoint);
          console.log(`[TADA Service] Successfully fetched from ${endpoint}: ${partsData.length} parts`);
          break;
        } catch (e) {
          console.log(`[TADA Service] ${endpoint} also failed`);
        }
      }
      
      if (partsData.length === 0) {
        console.warn('[TADA Service] Could not fetch parts from any endpoint, continuing with empty parts array');
      }
    }
    
    // Filter parts with both ID and Name
    const validParts = partsData.filter(p => p.PartID && p.PartName);
    console.log(`[TADA Service] Valid parts (with ID and Name): ${validParts.length}`);
    
    // Step 2: Fetch Part Pricing
    console.log('[TADA Service] Step 2: Fetching Part Pricing...');
    const supplierAnalysisData = await fetchAllPages<TADASupplierAnalysis>('BCXSupplierAnalysis');
    console.log(`[TADA Service] Raw supplier analysis records: ${supplierAnalysisData.length}`);
    
    // Debug: Show available Analysis IDs
    const analysisIds = new Set(supplierAnalysisData.map(sa => sa.AnalysisID));
    console.log('[TADA Service] Available Analysis IDs:', Array.from(analysisIds));
    
    // Filter ONLY for 1.0 Baseline pricing
    const baselinePricing = supplierAnalysisData.filter(sa => sa.AnalysisID === '1.0 Baseline');
    console.log(`[TADA Service] Baseline (1.0 Baseline) pricing records: ${baselinePricing.length}`);
    
    // Create price map with correct field name
    const priceMap = new Map<string, number>();
    baselinePricing.forEach(bp => {
      if (bp.PartID && bp.SalesPricePerUnit) {
        priceMap.set(bp.PartID, bp.SalesPricePerUnit);
      }
    });
    console.log(`[TADA Service] Unique parts with baseline pricing: ${priceMap.size}`);
    
    // Declare annualDemandMap at function level so it's accessible later
    let annualDemandMap = new Map<string, number>();
    
    // Step 3: Fetch and Aggregate Demand
    console.log('[TADA Service] Step 3: Fetching Demand Data...');
    const demandData = await fetchAllPages<TADASupplierPartDemand>('BCXSupplierPartDemand');
    console.log(`[TADA Service] Raw demand records: ${demandData.length}`);
    
    // Filter ONLY for 1.0 Baseline demand - be very explicit
    const baselineDemand = demandData.filter(d => 
      d.AnalysisID === '1.0 Baseline'
    );
    console.log(`[TADA Service] Baseline (1.0 Baseline) demand records: ${baselineDemand.length}`);
    
    // Aggregate demand by part - simply sum all daily demand values
    baselineDemand.forEach(d => {
      if (d.PartID && d.SupplierDemand) {
        const currentDemand = annualDemandMap.get(d.PartID) || 0;
        annualDemandMap.set(d.PartID, currentDemand + d.SupplierDemand);
      }
    });
    
    console.log(`[TADA Service] Parts with baseline demand data: ${annualDemandMap.size}`);
    console.log(`[TADA Service] NOTE: Applying 5% adjustment to all demand values for demo`);
    
    // Show sample aggregated demands for debugging - SHOW 5% ADJUSTED VALUES
    let sampleCount = 0;
    annualDemandMap.forEach((demand, partId) => {
      if (sampleCount < 5) {
        const adjustedDemand = Math.round(demand * 0.05);
        console.log(`[TADA Service] Part ${partId} total annual demand: ${adjustedDemand}`);
        sampleCount++;
      }
    });
    
    // Step 4: Fetch Suppliers
    console.log('[TADA Service] Step 4: Fetching Suppliers...');
    let suppliersData: TADASupplier[] = [];
    try {
      suppliersData = await fetchAllPages<TADASupplier>('Supplier');
      console.log(`[TADA Service] Raw suppliers from Supplier endpoint: ${suppliersData.length}`);
    } catch (error) {
      console.warn('[TADA Service] Failed to fetch from Supplier endpoint, trying alternatives...');
      
      // Try alternative endpoints
      const alternativeSupplierEndpoints = ['BCXSupplier', 'Suppliers', 'SupplierMaster'];
      for (const endpoint of alternativeSupplierEndpoints) {
        try {
          suppliersData = await fetchAllPages<TADASupplier>(endpoint);
          console.log(`[TADA Service] Successfully fetched from ${endpoint}: ${suppliersData.length} suppliers`);
          break;
        } catch (e) {
          console.log(`[TADA Service] ${endpoint} also failed`);
        }
      }
    }
    
    // If still no suppliers, try to extract from BCXSupplierAnalysis
    if (suppliersData.length === 0) {
      console.log('[TADA Service] Attempting to extract suppliers from BCXSupplierAnalysis...');
      const uniqueSupplierIds = new Set<string>();
      supplierAnalysisData.forEach(sa => {
        if (sa.SupplierID) {
          uniqueSupplierIds.add(sa.SupplierID);
        }
      });
      
      // Also check demand data for supplier IDs
      demandData.forEach(d => {
        if (d.SupplierID) {
          uniqueSupplierIds.add(d.SupplierID);
        }
      });
      
      suppliersData = Array.from(uniqueSupplierIds).map(id => ({
        SupplierID: id,
        SupplierName: `Supplier ${id}`,
        SupplierCountry: 'Unknown',
        SupplierCity: 'Unknown',
        SupplierDescription: 'Extracted from analysis data'
      }));
      console.log(`[TADA Service] Created ${suppliersData.length} suppliers from analysis data`);
    }
    
    // Step 5: Fetch Part-Supplier Relationships
    console.log('[TADA Service] Step 5: Fetching Part-Supplier Relationships...');
    let sourceOfSupplyData: TADASourceOfSupply[] = [];
    try {
      sourceOfSupplyData = await fetchAllPages<TADASourceOfSupply>('FactorySourceOfSupplyGeneral');
      console.log(`[TADA Service] Part-Supplier relationships from FactorySourceOfSupplyGeneral: ${sourceOfSupplyData.length}`);
    } catch (error) {
      console.warn('[TADA Service] Failed to fetch from FactorySourceOfSupplyGeneral, trying alternatives...');
      
      // Try alternative endpoints
      const alternativeEndpoints = ['BCXFactoryPartSource', 'PartToSupplier', 'PartSupplier', 'BCXPartSupplier'];
      for (const endpoint of alternativeEndpoints) {
        try {
          sourceOfSupplyData = await fetchAllPages<TADASourceOfSupply>(endpoint);
          console.log(`[TADA Service] Successfully fetched from ${endpoint}: ${sourceOfSupplyData.length} relationships`);
          break;
        } catch (e) {
          console.log(`[TADA Service] ${endpoint} also failed`);
        }
      }
    }
    
    // Step 6: Fetch Part Categories
    console.log('[TADA Service] Step 6: Fetching Part Categories...');
    const partFamilyData = await fetchAllPages<TADAPartFamily>('PartToPartFamily');
    console.log(`[TADA Service] Part-Family mappings: ${partFamilyData.length}`);
    
    // Transform data to application format
    console.log('[TADA Service] Transforming data to application format...');
    
    // Transform Parts with 5% adjusted annual demand
    const parts: Part[] = validParts.map((p, index) => {
      const partId = p.PartID;
      const price = priceMap.get(partId) || 0;
      
      // Get the 5% adjusted demand
      const demand = annualDemandMap.get(partId) || 0;
      
      if (price === 0 && index < 5) { // Only log first 5 to avoid spam
        console.warn(`[TADA Service] No price found for part ${partId}`);
      }
      
      return {
        id: `tada_part_${partId}`,
        partNumber: p.BasePartNumber || partId,
        name: p.PartName || `Part ${partId}`,
        price: price,
        annualDemand: demand, // This is the 5% adjusted value from annualDemandMap
        freightOhdCost: 0.02, // Default 2% freight overhead
      };
    });
    console.log(`[TADA Service] Transformed parts: ${parts.length}`);
    console.log(`[TADA Service] Parts with price > 0: ${parts.filter(p => p.price > 0).length}`);
    console.log(`[TADA Service] Parts with demand > 0: ${parts.filter(p => p.annualDemand > 0).length}`);
    
    // DEBUG: Show first 5 parts with their demand values
    console.log('[TADA Service] First 5 parts with adjusted demand:');
    parts.slice(0, 5).forEach(p => {
      console.log(`  - ${p.partNumber}: demand = ${p.annualDemand}`);
    });
    
    // Transform Suppliers with actual field names from API
    const suppliers: Supplier[] = suppliersData
      .filter(s => s.SupplierID)
      .map((s, index) => {
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
    console.log(`[TADA Service] Transformed suppliers: ${suppliers.length}`);
    
    // Transform Part-Supplier Associations
    const partSupplierAssociations: PartSupplierAssociation[] = [];
    const validAssociations = sourceOfSupplyData.filter(sos => 
      sos.PartID && sos.SupplierID
    );
    
    // Filter for baseline associations only if AnalysisID field exists
    const baselineAssociations = validAssociations.filter(va => 
      va.AnalysisID === '1.0 Baseline'
    );
    
    // Use baseline if available, otherwise use all associations
    const associationsToUse = baselineAssociations.length > 0 ? baselineAssociations : validAssociations;
    
    console.log(`[TADA Service] Using ${baselineAssociations.length > 0 ? 'baseline' : 'all'} associations: ${associationsToUse.length} records`);
    
    associationsToUse.forEach((sos, index) => {
      const partId = `tada_part_${sos.PartID}`;
      const supplierId = `tada_supplier_${sos.SupplierID}`;
      
      // Check if part and supplier exist
      const partExists = parts.some(p => p.id === partId);
      const supplierExists = suppliers.some(s => s.id === supplierId);
      
      if (partExists && supplierExists) {
        partSupplierAssociations.push({
          id: `tada_psa_${index}`,
          partId: partId,
          supplierId: supplierId,
        });
      }
    });
    console.log(`[TADA Service] Valid part-supplier associations: ${partSupplierAssociations.length}`);
    
    // Transform Part Category Mappings
    const partCategoryMappings: PartCategoryMapping[] = [];
    const validFamilies = partFamilyData.filter(pf => 
      pf.PartID && pf.PartFamily
    );
    
    validFamilies.forEach((pf, index) => {
      const partId = `tada_part_${pf.PartID}`;
      
      // Check if part exists
      const partExists = parts.some(p => p.id === partId);
      
      if (partExists) {
        partCategoryMappings.push({
          id: `tada_pcm_${index}`,
          partId: partId,
          categoryName: pf.PartFamily,
        });
      }
    });
    console.log(`[TADA Service] Valid part-category mappings: ${partCategoryMappings.length}`);
    
    // Summary
    console.log('[TADA Service] Data load complete!');
    const totalAdjustedDemand = parts.reduce((sum, p) => sum + p.annualDemand, 0);
    console.log(`[TADA Service] Summary:
      - Parts: ${parts.length}
      - Parts with price: ${parts.filter(p => p.price > 0).length}
      - Parts with demand: ${parts.filter(p => p.annualDemand > 0).length}
      - Total adjusted annual demand: ${totalAdjustedDemand.toLocaleString()} units
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
    const testData = await fetchTADAData<TADAPartNode>('Part', 1, false);
    console.log('[TADA Service] Connection test successful!');
    return true;
  } catch (error) {
    console.error('[TADA Service] Connection test failed:', error);
    return false;
  }
}
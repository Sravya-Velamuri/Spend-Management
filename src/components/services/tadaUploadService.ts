// tadaUploadService.ts - Service for uploading data back to TADA
import type { Part, Supplier, PartSupplierAssociation } from '@/types/spendwise';

// Single endpoint for all uploads
const TADA_UPLOAD_URL = 'https://beta.tadanow.com/DataIntegrations/UCC';
const BATCH_SIZE = 500;

// Specific tokens for each data type
const TOKENS = {
  PART_NODE: 'W+JXHy9mPw46fXur1Pw3neYbv3mYuMXvTHWHkUZ8h83Ck4brBGGyiUoep4nTOdtYp29/0SKS1HOSTNndIYibmjowWCRiUmCc02IDo6+DQgw55UOCflMXjkAUFRA6DD0VmXZOkORSLof69FncWjnBng==',
  SUPPLIER_NODE: 'W+JXHy9mPw46fXur1Pw3neYbv3mYuMXvTHWHkUZ8h83IQviINndfgBwkDZcKUB+Lh4ffuijV4wZUgG4vnXQ/0lZa7t6uD6wTSUVldBCIRq97ePaMOY1GtsKVOnzVSidiU2huS5/XydHCH8AZItTXXg==',
  ANALYSIS_NODE: 'W+JXHy9mPw46fXur1Pw3neYbv3mYuMXvTHWHkUZ8h830gEMMS+Ik+D8kH2W97uGnpNC18jxllF0rnB361l+xTfZoxatjD0KvsI0NpKqNGVNqHq7WFxctZ0OcX85L4P4TJXjCywB18+QIDCHAD9ZY+w==',
  SPEND_LINK: 'W+JXHy9mPw46fXur1Pw3neYbv3mYuMXvTHWHkUZ8h81jRBh0773FTnf9bISinsFWgQtqLtS+9Zf8CNCfZi2OwqC5UFko0kxK0pbuzXUytcfr1+oml6fArlSfZGZbDJKuxWFDCjG3JXfRIqVH/wtRvw=='
};

// Fallback key from download service
const FALLBACK_KEY = '1J6LLsxGsGrSsuSogoHyFYO3aDUgtfKABrn2Epd9G4QY50Zr6D6Rc1oNIofQhoEJaanKsXHBH9sCR3aCImOIwIlwccKERDJJVadZVAWhzbBzDsuPlrhJEJpgoQVKdXm4';

// Interface for upload progress tracking
export interface UploadProgress {
  totalRecords: number;
  processedRecords: number;
  currentStep: string;
  errors: string[];
}

// Generate unique Analysis ID for the user session
export function generateAnalysisId(userId: string = '1'): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .replace(/\.\d{3}Z$/, '');
  
  const sessionId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const analysisId = `ANALYSIS_USER${userId}_${timestamp}_${sessionId}`;
  console.log('[TADA Upload] Generated Analysis ID:', analysisId);
  
  return analysisId;
}

// Generic upload function with multiple auth approaches
async function uploadToTADA<T>(
  dataType: string,
  token: string,
  data: T[],
  progressCallback?: (progress: UploadProgress) => void
): Promise<{ success: boolean; errors: string[] }> {
  console.log(`[TADA Upload] Uploading ${data.length} ${dataType} records`);
  
  const errors: string[] = [];
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    
    console.log(`[TADA Upload] Processing ${dataType} batch ${batchNumber}/${totalBatches}`);
    console.log(`[TADA Upload] Sample record:`, batch[0]);
    
    let uploadSuccess = false;
    
    // Try different payload formats and authentication approaches
    const approaches = [
      {
        name: 'Array with Bearer token',
        url: TADA_UPLOAD_URL,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        payload: batch // Just the array
      },
      {
        name: 'Wrapped in sampleRequest with Bearer',
        url: TADA_UPLOAD_URL,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        payload: {
          sampleRequest: batch,
          Description: ""
        }
      },
      {
        name: 'Array with fallback Bearer',
        url: TADA_UPLOAD_URL,
        headers: {
          'Authorization': `Bearer ${FALLBACK_KEY}`,
          'Content-Type': 'application/json',
        },
        payload: batch
      },
      {
        name: 'Try BCSV5.1 endpoint with array',
        url: 'https://beta.tadanow.com/DataIntegrations/BCSV5.1',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        payload: batch
      },
      {
        name: 'Try with Python example token',
        url: 'https://beta.tadanow.com/DataIntegrations/BCSV5.1',
        headers: {
          'Authorization': 'Bearer WBajnQfM8khOEQwni0ENZnoIFXHP4tpzZ1q/uljYcjfBtnnLc+DrT57vA3BdsKRFPZPjOi9sAJjLrXeuvSUYdfqHL3iO15nokw/vESUPGaYQ+2h3THzDbpl12RtMzm1LMENpBGaQ2tHEVnesfERRVg==',
          'Content-Type': 'application/json',
        },
        payload: batch
      }
    ];
    
    for (const approach of approaches) {
      try {
        console.log(`[TADA Upload] Trying ${approach.name}...`);
        console.log(`[TADA Upload] Payload type: ${Array.isArray(approach.payload) ? 'Array' : 'Object'}`);
        
        const response = await fetch(approach.url, {
          method: 'POST',
          headers: approach.headers,
          body: JSON.stringify(approach.payload)
        });
        
        console.log(`[TADA Upload] ${approach.name} - Response status: ${response.status}`);
        const responseText = await response.text();
        console.log(`[TADA Upload] ${approach.name} - Response:`, responseText.substring(0, 200));
        
        if (response.ok) {
          console.log(`[TADA Upload] Success with ${approach.name}!`);
          uploadSuccess = true;
          break;
        }
      } catch (error) {
        console.error(`[TADA Upload] ${approach.name} error:`, error);
      }
    }
    
    if (!uploadSuccess) {
      const error = `${dataType} batch ${batchNumber}/${totalBatches} failed - all authentication methods failed`;
      errors.push(error);
      console.error(`[TADA Upload] ${error}`);
    } else {
      console.log(`[TADA Upload] Successfully uploaded ${dataType} batch ${batchNumber}/${totalBatches}`);
    }
    
    if (progressCallback) {
      progressCallback({
        totalRecords: data.length,
        processedRecords: Math.min(i + BATCH_SIZE, data.length),
        currentStep: `Uploading ${dataType}: batch ${batchNumber}/${totalBatches}`,
        errors
      });
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

// Helper function to extract TADA ID
function extractTADAId(fullId: string, prefix: string): string {
  if (!fullId) {
    return '';
  }
  
  if (fullId.startsWith(prefix)) {
    return fullId.substring(prefix.length);
  }
  
  return fullId;
}

// Main upload function
export async function uploadDataToTADA(
  parts: Part[],
  suppliers: Supplier[],
  associations: PartSupplierAssociation[],
  analysisId: string,
  userId: string = 'USER1',
  progressCallback?: (progress: UploadProgress) => void
): Promise<{ success: boolean; analysisId: string; errors: string[] }> {
  console.log(`[TADA Upload] Starting upload with Analysis ID: ${analysisId}`);
  console.log(`[TADA Upload] Data summary - Parts: ${parts.length}, Suppliers: ${suppliers.length}, Associations: ${associations.length}`);
  
  const allErrors: string[] = [];
  
  try {
    // Step 1: Upload Analysis Node (just ID)
    console.log('[TADA Upload] Step 1: Uploading Analysis node...');
    const analysisData = [{ AnalysisID: analysisId }];
    const analysisResult = await uploadToTADA(
      'Analysis',
      TOKENS.ANALYSIS_NODE,
      analysisData,
      progressCallback
    );
    allErrors.push(...analysisResult.errors);
    
    // Step 2: Upload Part Nodes (just IDs)
    console.log('[TADA Upload] Step 2: Uploading Part nodes...');
    const uniquePartIds = new Set<string>();
    parts.forEach(part => {
      const tadaPartId = extractTADAId(part.partId || part.id, 'tada_part_');
      if (tadaPartId) uniquePartIds.add(tadaPartId);
    });
    
    if (uniquePartIds.size > 0) {
      const partData = Array.from(uniquePartIds).map(id => ({ PartID: id }));
      const partResult = await uploadToTADA(
        'Part',
        TOKENS.PART_NODE,
        partData,
        progressCallback
      );
      allErrors.push(...partResult.errors);
    }
    
    // Step 3: Upload Supplier Nodes (just IDs)
    console.log('[TADA Upload] Step 3: Uploading Supplier nodes...');
    const uniqueSupplierIds = new Set<string>();
    suppliers.forEach(supplier => {
      const tadaSupplierId = extractTADAId(supplier.supplierId || supplier.id, 'tada_supplier_');
      if (tadaSupplierId) uniqueSupplierIds.add(tadaSupplierId);
    });
    
    if (uniqueSupplierIds.size > 0) {
      const supplierData = Array.from(uniqueSupplierIds).map(id => ({ SupplierID: id }));
      const supplierResult = await uploadToTADA(
        'Supplier',
        TOKENS.SUPPLIER_NODE,
        supplierData,
        progressCallback
      );
      allErrors.push(...supplierResult.errors);
    }
    
    // Step 4: Upload Part Spend Analysis Links (with all 4 properties)
    console.log('[TADA Upload] Step 4: Uploading Part Spend Analysis links...');
    const spendLinks: any[] = [];
    
    associations.forEach(assoc => {
      const part = parts.find(p => p.id === assoc.partId);
      const supplier = suppliers.find(s => s.id === assoc.supplierId);
      
      if (part && supplier) {
        const tadaPartId = extractTADAId(part.partId || part.id, 'tada_part_');
        const tadaSupplierId = extractTADAId(supplier.supplierId || supplier.id, 'tada_supplier_');
        
        if (tadaPartId && tadaSupplierId) {
          // Calculate spend amount: price * annual demand
          const spendAmount = (part.price || 0) * (part.annualDemand || 0);
          
          spendLinks.push({
            PartID: tadaPartId,
            SupplierID: tadaSupplierId,
            AnalysisID: analysisId,
            SpendAmount: spendAmount
          });
        }
      }
    });
    
    console.log(`[TADA Upload] Prepared ${spendLinks.length} spend links`);
    
    if (spendLinks.length > 0) {
      const linkResult = await uploadToTADA(
        'PartSpendAnalysis',
        TOKENS.SPEND_LINK,
        spendLinks,
        progressCallback
      );
      allErrors.push(...linkResult.errors);
    }
    
    console.log(`[TADA Upload] Upload completed. Total errors: ${allErrors.length}`);
    if (allErrors.length > 0) {
      console.error('[TADA Upload] Errors encountered:', allErrors);
    }
    
    return {
      success: allErrors.length === 0,
      analysisId,
      errors: allErrors
    };
    
  } catch (error) {
    const errorMsg = `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[TADA Upload] Fatal error:`, error);
    allErrors.push(errorMsg);
    
    return {
      success: false,
      analysisId,
      errors: allErrors
    };
  }
}
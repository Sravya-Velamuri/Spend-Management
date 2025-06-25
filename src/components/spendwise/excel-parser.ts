// components/spendwise/excel-parser.ts
import * as XLSX from 'xlsx';
import type { Part, Supplier, PartCategoryMapping, PartSupplierAssociation } from '@/types/spendwise';

export interface ExcelParseResult<T> {
  data: T[];
  errors: string[];
}

export async function parsePartsExcel(
  file: File,
  existingParts: Part[]
): Promise<ExcelParseResult<Part>> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { 
    cellStyles: true, 
    cellFormulas: true, 
    cellDates: true, 
    cellNF: true, 
    sheetStubs: true 
  });

  const errors: string[] = [];
  const newParts: Part[] = [];

  const findActualSheetName = (searchNames: string[]) => {
    return Object.keys(workbook.Sheets).find(actualSheetName =>
      searchNames.some(searchName => 
        actualSheetName.trim().toLowerCase() === searchName.toLowerCase()
      )
    );
  };

  const partsSheetName = findActualSheetName(['Parts', 'parts', 'PARTS']);
  
  if (!partsSheetName) {
    return { data: [], errors: ["No 'Parts' sheet found in the Excel file."] };
  }

  const partsData = XLSX.utils.sheet_to_json(workbook.Sheets[partsSheetName]);
  
  partsData.forEach((row: any, index) => {
    try {
      const partNumber = String(row['PartNumber'] || '').trim();
      const name = String(row['Name'] || '').trim();
      const price = parseFloat(row['Price'] || '0');
      const annualDemand = parseInt(row['AnnualDemand'] || '0', 10);
      const freightOhdCostRaw = row['FreightOhdCost'] || row['FreightOhdCost(%)'] || '0';
      
      let freightOhdCost = 0;
      if (typeof freightOhdCostRaw === 'string' && freightOhdCostRaw.includes('%')) {
        freightOhdCost = parseFloat(freightOhdCostRaw.replace('%', '')) / 100;
      } else {
        freightOhdCost = parseFloat(freightOhdCostRaw) / 100;
      }

      if (!partNumber || !name || isNaN(price) || isNaN(annualDemand) || isNaN(freightOhdCost)) {
        errors.push(`Row ${index + 2}: Invalid data. Check PartNumber, Name, Price, AnnualDemand, and FreightOhdCost.`);
        return;
      }

      if (existingParts.some(p => p.partNumber === partNumber) || newParts.some(p => p.partNumber === partNumber)) {
        errors.push(`Row ${index + 2}: Part number "${partNumber}" already exists. Skipped.`);
        return;
      }

      newParts.push({
        id: `p_excel_${Date.now()}_${index}`,
        partNumber,
        name,
        price,
        annualDemand,
        freightOhdCost
      });
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  return { data: newParts, errors };
}

export async function parseSuppliersExcel(
  file: File,
  existingSuppliers: Supplier[]
): Promise<ExcelParseResult<Supplier>> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { 
    cellStyles: true, 
    cellFormulas: true, 
    cellDates: true, 
    cellNF: true, 
    sheetStubs: true 
  });

  const errors: string[] = [];
  const newSuppliers: Supplier[] = [];

  const findActualSheetName = (searchNames: string[]) => {
    return Object.keys(workbook.Sheets).find(actualSheetName =>
      searchNames.some(searchName => 
        actualSheetName.trim().toLowerCase() === searchName.toLowerCase()
      )
    );
  };

  const suppliersSheetName = findActualSheetName(['Suppliers', 'suppliers', 'SUPPLIERS', 'Supplier', 'supplier', 'SUPPLIER']);
  
  if (!suppliersSheetName) {
    return { data: [], errors: ["No 'Suppliers' sheet found in the Excel file."] };
  }

  const suppliersData = XLSX.utils.sheet_to_json(workbook.Sheets[suppliersSheetName]);
  
  suppliersData.forEach((row: any, index) => {
    try {
      const supplierId = String(row['SupplierID'] || row['SupplierId'] || row['ID'] || '').trim();
      const name = String(row['Name'] || row['SupplierName'] || '').trim();
      const description = String(row['Description'] || '').trim();
      const streetAddress = String(row['StreetAddress'] || row['Street'] || row['Address1'] || '').trim();
      const city = String(row['City'] || '').trim();
      const stateOrProvince = String(row['StateOrProvince'] || row['State'] || row['Province'] || '').trim();
      const postalCode = String(row['PostalCode'] || row['ZipCode'] || row['Zip'] || '').trim();
      const country = String(row['Country'] || 'USA').trim();

      if (!supplierId || !name) {
        errors.push(`Row ${index + 2}: Supplier ID and Name are required.`);
        return;
      }

      if (existingSuppliers.some(s => s.supplierId === supplierId) || newSuppliers.some(s => s.supplierId === supplierId)) {
        errors.push(`Row ${index + 2}: Supplier ID "${supplierId}" already exists. Skipped.`);
        return;
      }

      const addressParts = [streetAddress, city, stateOrProvince, postalCode, country].filter(Boolean);
      const fullAddress = addressParts.join(', ');

      newSuppliers.push({
        id: `s_excel_${Date.now()}_${index}`,
        supplierId,
        name,
        description: description || 'No description',
        streetAddress,
        city,
        stateOrProvince,
        postalCode,
        country,
        address: fullAddress,
        latitude: undefined,
        longitude: undefined
      });
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  return { data: newSuppliers, errors };
}

export async function parsePartCategoriesExcel(
  file: File,
  existingMappings: PartCategoryMapping[],
  parts: Part[]
): Promise<ExcelParseResult<PartCategoryMapping> & { newCategories: string[] }> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { 
    cellStyles: true, 
    cellFormulas: true, 
    cellDates: true, 
    cellNF: true, 
    sheetStubs: true 
  });

  const errors: string[] = [];
  const newMappings: PartCategoryMapping[] = [];
  const newCategories: Set<string> = new Set();

  const findActualSheetName = (searchNames: string[]) => {
    return Object.keys(workbook.Sheets).find(actualSheetName =>
      searchNames.some(searchName => 
        actualSheetName.trim().toLowerCase() === searchName.toLowerCase()
      )
    );
  };

  const mappingSheetName = findActualSheetName([
    'Part-Category', 'PartCategory', 'Part Category',
    'Categories', 'Category', 'Part Categories',
    'part-category', 'partcategory', 'part category'
  ]);
  
  if (!mappingSheetName) {
    return { data: [], errors: ["No part-category mapping sheet found."], newCategories: [] };
  }

  const mappingData = XLSX.utils.sheet_to_json(workbook.Sheets[mappingSheetName]);
  
  mappingData.forEach((row: any, index) => {
    try {
      const partNumber = String(row['PartNumber'] || row['Part Number'] || row['Part'] || '').trim();
      const categoryName = String(row['Category'] || row['CategoryName'] || row['Category Name'] || '').trim();

      if (!partNumber || !categoryName) {
        errors.push(`Row ${index + 2}: Part number and category name are required.`);
        return;
      }

      const part = parts.find(p => p.partNumber === partNumber);
      if (!part) {
        errors.push(`Row ${index + 2}: Part number "${partNumber}" not found in parts list.`);
        return;
      }

      const existingMapping = existingMappings.find(m => 
        m.partId === part.id && m.categoryName === categoryName
      );
      
      if (existingMapping || newMappings.some(m => 
        m.partId === part.id && m.categoryName === categoryName
      )) {
        errors.push(`Row ${index + 2}: Mapping for "${partNumber}" to "${categoryName}" already exists.`);
        return;
      }

      newCategories.add(categoryName);
      newMappings.push({
        id: `pcm_excel_${Date.now()}_${index}`,
        partId: part.id,
        categoryName
      });
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  return { data: newMappings, errors, newCategories: Array.from(newCategories) };
}

export async function parsePartSupplierMappingsExcel(
  file: File,
  existingMappings: PartSupplierAssociation[],
  parts: Part[],
  suppliers: Supplier[]
): Promise<ExcelParseResult<PartSupplierAssociation>> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { 
    cellStyles: true, 
    cellFormulas: true, 
    cellDates: true, 
    cellNF: true, 
    sheetStubs: true 
  });

  const errors: string[] = [];
  const newMappings: PartSupplierAssociation[] = [];

  const findActualSheetName = (searchNames: string[]) => {
    return Object.keys(workbook.Sheets).find(actualSheetName =>
      searchNames.some(searchName => 
        actualSheetName.trim().toLowerCase() === searchName.toLowerCase()
      )
    );
  };

  const mappingSheetName = findActualSheetName([
    'Part-Supplier', 'PartSupplier', 'Part Supplier',
    'Source Mix', 'SourceMix', 'Part Suppliers',
    'part-supplier', 'partsupplier', 'source mix'
  ]);
  
  if (!mappingSheetName) {
    return { data: [], errors: ["No part-supplier mapping sheet found."] };
  }

  const mappingData = XLSX.utils.sheet_to_json(workbook.Sheets[mappingSheetName]);
  
  mappingData.forEach((row: any, index) => {
    try {
      const partNumber = String(row['PartNumber'] || row['Part Number'] || row['Part'] || '').trim();
      const supplierId = String(row['SupplierID'] || row['Supplier ID'] || row['Supplier'] || '').trim();

      if (!partNumber || !supplierId) {
        errors.push(`Row ${index + 2}: Part number and supplier ID are required.`);
        return;
      }

      const part = parts.find(p => p.partNumber === partNumber);
      if (!part) {
        errors.push(`Row ${index + 2}: Part number "${partNumber}" not found in parts list.`);
        return;
      }

      const supplier = suppliers.find(s => s.supplierId === supplierId);
      if (!supplier) {
        errors.push(`Row ${index + 2}: Supplier ID "${supplierId}" not found in suppliers list.`);
        return;
      }

      const existingMapping = existingMappings.find(m => 
        m.partId === part.id && m.supplierId === supplier.id
      );
      
      if (existingMapping || newMappings.some(m => 
        m.partId === part.id && m.supplierId === supplier.id
      )) {
        errors.push(`Row ${index + 2}: Mapping for "${partNumber}" to "${supplierId}" already exists.`);
        return;
      }

      newMappings.push({
        id: `psa_excel_${Date.now()}_${index}`,
        partId: part.id,
        supplierId: supplier.id
      });
    } catch (err) {
      errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  return { data: newMappings, errors };
}
// components/spendwise/chatbot/dataTransformers.ts
import type { Part, Supplier, PartCategoryMapping, PartSupplierAssociation } from '@/types/spendwise';

interface ChatbotProduct {
  name: string;
  baseCost: number;
  volume: number;
  margin: number;
  category: string;
  freightOverhead: number;
}

interface ChatbotSupplierCountry {
  percentage: number;
  typicalProducts: string[];
  coordinates?: { lat: number; lng: number };
}

interface ChatbotData {
  products: ChatbotProduct[];
  sourceMix: Record<string, ChatbotSupplierCountry>;
  industry: string;
  role: string;
  categories: string[];
  homeCountry: string;
  spendRange: string;
  supplierCount: string;
}

interface TransformedData {
  parts: Part[];
  suppliers: Supplier[];
  partCategoryMappings: PartCategoryMapping[];
  partSupplierAssociations: PartSupplierAssociation[];
}

// Enhanced helper functions for large-scale data generation
function generatePartNumber(index: number, category: string): string {
  const categoryPrefix = category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const yearCode = new Date().getFullYear().toString().slice(-2);
  return `${categoryPrefix}-${yearCode}-${String(index + 1).padStart(5, '0')}`;
}

function generateSupplierId(country: string, index: number, tier: string = 'T1'): string {
  const countryCode = country.substring(0, 2).toUpperCase();
  return `SUP-${countryCode}-${tier}-${String(index + 1).padStart(4, '0')}`;
}

function parseSupplierCount(range: string): number {
  if (range.includes('+')) {
    const base = parseInt(range.replace('+', '')) || 100;
    // For "100+" return a number between 100-150
    return base + Math.floor(Math.random() * 50);
  }
  const parts = range.split('-');
  if (parts.length === 2) {
    const min = parseInt(parts[0]);
    const max = parseInt(parts[1]);
    // Return a random number in the range
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  return parseInt(range) || 50;
}

// Expanded supplier name generation with more variety
function generateSupplierName(country: string, index: number, industry: string, tier: number): string {
  const prefixes = {
    'China': ['Sino', 'Dragon', 'Golden', 'Eastern', 'Great Wall', 'Red Star', 'Phoenix', 'Jade', 'Pearl River', 'Yangzte'],
    'USA': ['American', 'United', 'Liberty', 'Eagle', 'Star', 'National', 'Federal', 'Patriot', 'Freedom', 'Pioneer'],
    'Mexico': ['Aztec', 'Maya', 'Sierra', 'Sol', 'Rio', 'Monterrey', 'Guadalajara', 'Pacifico', 'Corona', 'Águila'],
    'Germany': ['Precision', 'Deutsche', 'Rhine', 'Bayern', 'Berlin', 'Frankfurt', 'Munich', 'Hamburg', 'Stuttgart', 'Köln'],
    'Japan': ['Nippon', 'Sakura', 'Fuji', 'Tokyo', 'Osaka', 'Kyoto', 'Samurai', 'Rising Sun', 'Kansai', 'Hokkaido'],
    'Vietnam': ['Mekong', 'Saigon', 'Hanoi', 'Lotus', 'Delta', 'Golden Dragon', 'Red River', 'Central', 'Highland', 'Coastal'],
    'Taiwan': ['Formosa', 'Taipei', 'Island', 'Pacific', 'Tech', 'Kaohsiung', 'Taichung', 'Silicon', 'Micro', 'Nano'],
    'India': ['Bharat', 'Ganges', 'Mumbai', 'Delhi', 'Tech', 'Bangalore', 'Chennai', 'Pune', 'Gujarat', 'Tamil'],
    'Canada': ['Maple', 'Northern', 'Canadian', 'Arctic', 'Pacific', 'Atlantic', 'Rocky', 'Prairie', 'Great Lakes', 'Hudson'],
    'South Korea': ['Samsung', 'Hyundai', 'LG', 'SK', 'Lotte', 'Seoul', 'Busan', 'Incheon', 'Daegu', 'Han River'],
    'Thailand': ['Siam', 'Bangkok', 'Chao Phraya', 'Golden Temple', 'Royal', 'Central', 'Northern', 'Southern', 'Eastern', 'Thai'],
    'Poland': ['Polski', 'Warsaw', 'Krakow', 'Baltic', 'Vistula', 'Central European', 'Gdansk', 'Poznan', 'Silesian', 'Mazovia'],
    'Turkey': ['Anatolian', 'Istanbul', 'Ankara', 'Bosphorus', 'Ottoman', 'Mediterranean', 'Black Sea', 'Aegean', 'Central', 'Eastern'],
    'Brazil': ['Brasil', 'Amazon', 'São Paulo', 'Rio', 'Southern', 'Tropical', 'Atlantic', 'Industrial', 'Mercosul', 'Latin']
  };

  const suffixes = {
    'Automotive Manufacturing': [
      'Auto Parts', 'Motors', 'Components', 'Systems', 'Manufacturing',
      'Automotive Group', 'Vehicle Systems', 'Auto Tech', 'Mobility Solutions', 'Drive Systems',
      'Precision Auto', 'Advanced Automotive', 'Auto Innovations', 'Vehicle Components', 'Automotive Excellence'
    ],
    'Electronics & Technology': [
      'Electronics', 'Tech', 'Semiconductors', 'Components', 'Solutions',
      'Technology Group', 'Electronic Systems', 'Digital Solutions', 'Tech Innovations', 'Silicon Works',
      'Micro Systems', 'Nano Tech', 'Electronic Manufacturing', 'Tech Components', 'Digital Dynamics'
    ],
    'Industrial Equipment': [
      'Industries', 'Machinery', 'Equipment', 'Systems', 'Manufacturing',
      'Industrial Group', 'Heavy Industries', 'Equipment Solutions', 'Industrial Tech', 'Machinery Works',
      'Industrial Systems', 'Equipment Manufacturing', 'Heavy Machinery', 'Industrial Innovations', 'Equipment Tech'
    ],
    'Consumer Products': [
      'Products', 'Goods', 'Manufacturing', 'Enterprises', 'Co.',
      'Consumer Group', 'Product Solutions', 'Consumer Goods', 'Manufacturing Group', 'Product Innovations',
      'Consumer Tech', 'Lifestyle Products', 'Home Solutions', 'Consumer Manufacturing', 'Product Excellence'
    ]
  };

  const tierPrefixes = ['Prime', 'Elite', 'Premium', 'Advanced', 'Global', 'International', 'Strategic', 'Preferred'];
  
  const countryPrefixes = prefixes[country] || prefixes['USA'];
  const industrySuffixes = suffixes[industry] || suffixes['Automotive Manufacturing'];
  
  const prefix = tier <= 3 ? tierPrefixes[tier - 1] + ' ' : '';
  const countryPrefix = countryPrefixes[index % countryPrefixes.length];
  const suffix = industrySuffixes[index % industrySuffixes.length];
  
  return `${prefix}${countryPrefix} ${suffix}`;
}

// Enhanced address generation with more variety
function generateSupplierAddress(country: string, index: number): {
  streetAddress: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
} {
  const addresses: Record<string, Array<{street: string; city: string; state: string; postal: string}>> = {
    'China': [
      { street: '888 Hongqiao Road', city: 'Shanghai', state: 'Shanghai', postal: '200030' },
      { street: '168 Nanshan Avenue', city: 'Shenzhen', state: 'Guangdong', postal: '518000' },
      { street: '456 Tianhe Street', city: 'Guangzhou', state: 'Guangdong', postal: '510620' },
      { street: '999 Chang\'an Road', city: 'Beijing', state: 'Beijing', postal: '100022' },
      { street: '321 Jiangnan Avenue', city: 'Hangzhou', state: 'Zhejiang', postal: '310000' },
      { street: '777 Pudong Boulevard', city: 'Shanghai', state: 'Shanghai', postal: '201203' },
      { street: '555 Xiamen Road', city: 'Xiamen', state: 'Fujian', postal: '361000' },
      { street: '222 Chengdu Street', city: 'Chengdu', state: 'Sichuan', postal: '610000' },
      { street: '666 Wuhan Avenue', city: 'Wuhan', state: 'Hubei', postal: '430000' },
      { street: '111 Dalian Road', city: 'Dalian', state: 'Liaoning', postal: '116000' }
    ],
    'USA': [
      { street: '100 Industrial Blvd', city: 'Detroit', state: 'MI', postal: '48201' },
      { street: '500 Tech Park Way', city: 'San Jose', state: 'CA', postal: '95110' },
      { street: '250 Manufacturing Dr', city: 'Chicago', state: 'IL', postal: '60601' },
      { street: '800 Commerce Street', city: 'Dallas', state: 'TX', postal: '75201' },
      { street: '350 Innovation Ave', city: 'Boston', state: 'MA', postal: '02108' },
      { street: '1200 Enterprise Pkwy', city: 'Atlanta', state: 'GA', postal: '30301' },
      { street: '600 Supply Chain Blvd', city: 'Memphis', state: 'TN', postal: '38103' },
      { street: '900 Logistics Way', city: 'Columbus', state: 'OH', postal: '43215' },
      { street: '400 Assembly Lane', city: 'Louisville', state: 'KY', postal: '40202' },
      { street: '750 Distribution Dr', city: 'Phoenix', state: 'AZ', postal: '85001' }
    ],
    // Add more countries with 10+ addresses each...
  };

  const defaultAddress = { 
    street: `${100 + index} Industrial Park`, 
    city: 'Capital City', 
    state: 'State', 
    postal: `${10000 + index}` 
  };
  
  const countryAddresses = addresses[country] || [defaultAddress];
  const addressIndex = index % countryAddresses.length;
  const address = countryAddresses[addressIndex];
  
  // Add building/unit numbers for variety
  const buildingNumber = Math.floor(index / countryAddresses.length) + 1;
  const unitSuffix = buildingNumber > 1 ? `, Building ${buildingNumber}` : '';
  
  return {
    streetAddress: address.street + unitSuffix,
    city: address.city,
    stateOrProvince: address.state,
    postalCode: address.postal
  };
}

export function transformChatbotData(chatbotData: ChatbotData): TransformedData {
  const timestamp = Date.now();
  
  // Transform products to parts with enhanced variety
  const parts: Part[] = chatbotData.products.map((product, index) => {
    // Add some randomization to prices and volumes for variety
    const priceVariation = 0.9 + (Math.random() * 0.2); // ±10% price variation
    const demandVariation = 0.8 + (Math.random() * 0.4); // ±20% demand variation
    
    return {
      id: `part_${timestamp}_${index}`,
      partNumber: generatePartNumber(index, product.category),
      name: product.name,
      price: Math.round(product.baseCost * priceVariation * 100) / 100,
      annualDemand: Math.round(product.volume * demandVariation),
      freightOhdCost: product.freightOverhead || 0.03
    };
  });

  // Generate suppliers based on source mix and supplier count
  const totalSuppliers = parseSupplierCount(chatbotData.supplierCount);
  const suppliers: Supplier[] = [];
  const suppliersByCountry: Record<string, Supplier[]> = {};
  const supplierTiers: Record<string, number> = {};

  // Calculate suppliers per country based on percentages
  const supplierDistribution: Array<{country: string; count: number; data: ChatbotSupplierCountry}> = [];
  let remainingSuppliers = totalSuppliers;
  
  const countries = Object.entries(chatbotData.sourceMix);
  countries.forEach(([country, data], index) => {
    const isLastCountry = index === countries.length - 1;
    const count = isLastCountry 
      ? remainingSuppliers 
      : Math.max(1, Math.round((data.percentage / 100) * totalSuppliers));
    
    supplierDistribution.push({ country, count, data });
    remainingSuppliers -= count;
  });

  // Generate suppliers for each country
  supplierDistribution.forEach(({ country, count, data }) => {
    const countrySuppliers: Supplier[] = [];
    
    for (let i = 0; i < count; i++) {
      // Assign tiers: 20% Tier 1, 30% Tier 2, 50% Tier 3+
      let tier: number;
      const tierRoll = Math.random();
      if (tierRoll < 0.2) tier = 1;
      else if (tierRoll < 0.5) tier = 2;
      else tier = 3 + Math.floor(Math.random() * 2); // Tier 3 or 4
      
      supplierTiers[country] = (supplierTiers[country] || 0) + 1;
      const supplierIndex = supplierTiers[country] - 1;
      
      const address = generateSupplierAddress(country, supplierIndex);
      const supplier: Supplier = {
        id: `supplier_${timestamp}_${country}_${i}`,
        supplierId: generateSupplierId(country, i, `T${tier}`),
        name: generateSupplierName(country, supplierIndex, chatbotData.industry, tier),
        description: `Tier ${tier} ${chatbotData.industry.toLowerCase()} supplier specializing in ${data.typicalProducts.join(', ')}. ISO 9001:2015 certified.`,
        streetAddress: address.streetAddress,
        city: address.city,
        stateOrProvince: address.stateOrProvince,
        postalCode: address.postalCode,
        country: country,
        address: `${address.streetAddress}, ${address.city}, ${address.stateOrProvince} ${address.postalCode}, ${country}`,
        latitude: data.coordinates?.lat ? data.coordinates.lat + (Math.random() * 2 - 1) : undefined,
        longitude: data.coordinates?.lng ? data.coordinates.lng + (Math.random() * 2 - 1) : undefined
      };
      
      suppliers.push(supplier);
      countrySuppliers.push(supplier);
    }
    
    suppliersByCountry[country] = countrySuppliers;
  });

  // Create part-category mappings
  const partCategoryMappings: PartCategoryMapping[] = parts.map((part, index) => {
    const product = chatbotData.products[index];
    return {
      id: `pcm_${timestamp}_${index}`,
      partId: part.id,
      categoryName: product.category
    };
  });

  // Create part-supplier associations with realistic distribution
  const partSupplierAssociations: PartSupplierAssociation[] = [];
  
  parts.forEach((part, partIndex) => {
    const product = chatbotData.products[partIndex];
    
    // Determine number of suppliers for this part (1-5, weighted towards 2-3)
    const supplierCountForPart = Math.min(
      Math.max(1, Math.floor(Math.random() * 4) + 1),
      Math.floor(totalSuppliers * 0.3) // Max 30% of total suppliers per part
    );
    
    // Collect potential suppliers based on country capabilities
    const potentialSuppliers: Array<{supplier: Supplier; weight: number}> = [];
    
    Object.entries(suppliersByCountry).forEach(([country, countrySuppliers]) => {
      const countryData = chatbotData.sourceMix[country];
      if (!countryData) return;
      
      // Check if this country typically produces this category
      const isTypicalProduct = countryData.typicalProducts.some(tp => 
        product.category.toLowerCase().includes(tp.toLowerCase()) ||
        tp.toLowerCase().includes(product.category.toLowerCase()) ||
        tp.toLowerCase() === 'all categories'
      );
      
      // Weight suppliers based on country capability
      const weight = isTypicalProduct ? 3 : 1;
      
      countrySuppliers.forEach(supplier => {
        potentialSuppliers.push({ supplier, weight });
      });
    });
    
    // Weighted random selection of suppliers
    const selectedSuppliers = new Set<string>();
    while (selectedSuppliers.size < supplierCountForPart && potentialSuppliers.length > 0) {
      const totalWeight = potentialSuppliers.reduce((sum, ps) => sum + ps.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (let i = 0; i < potentialSuppliers.length; i++) {
        random -= potentialSuppliers[i].weight;
        if (random <= 0) {
          const selected = potentialSuppliers[i].supplier;
          if (!selectedSuppliers.has(selected.id)) {
            selectedSuppliers.add(selected.id);
            partSupplierAssociations.push({
              id: `psa_${timestamp}_${part.id}_${selected.id}`,
              partId: part.id,
              supplierId: selected.id
            });
          }
          potentialSuppliers.splice(i, 1);
          break;
        }
      }
    }
  });

  return {
    parts,
    suppliers,
    partCategoryMappings,
    partSupplierAssociations
  };
}
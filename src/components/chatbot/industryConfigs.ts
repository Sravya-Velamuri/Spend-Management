// components/spendwise/chatbot/industryConfigs.ts
import type { LucideIcon } from 'lucide-react';
import { Factory, Car, Cpu, ShoppingCart } from 'lucide-react';

// --- INTERFACES ---

interface Product {
  name: string;
  baseCost: number;
  volume: number;
  margin: number;
  category: string;
  freightOverhead: number;
}

interface MajorHub {
  city: string;
  specialization: string;
  lat: number;
  lng: number;
}

interface SupplierCountry {
  percentage: number;
  typicalProducts: string[];
  coordinates: { lat: number; lng: number };
  majorHubs?: MajorHub[];
}

interface IndustryConfig {
  icon: LucideIcon;
  name: string;
  color: string;
  gradient: string;
  categories: string[];
  supplierCountries: Record<string, SupplierCountry>;
  roles: Record<string, {
    products: Product[];
    avgSpend: 'low' | 'medium' | 'high';
  }>;
}

interface ProductTemplate {
  baseName: string;
  category: string;
  variants: string[];
  specs: string[];
  materials?: string[];
  baseCostRange: [number, number];
  volumeRange: [number, number];
  marginRange: [number, number];
  freightOverhead: number;
}

// --- HELPER FUNCTIONS ---

const createProduct = (
  name: string,
  baseCost: number,
  volume: number,
  margin: number,
  category: string,
  freightOverhead: number
): Product => {
  const costJitter = 0.9 + Math.random() * 0.2; // +/- 10%
  const volumeJitter = 0.8 + Math.random() * 0.4; // +/- 20%
  return {
    name,
    baseCost: parseFloat((baseCost * costJitter).toFixed(2)),
    volume: Math.round(volume * volumeJitter),
    margin: parseFloat((margin + (Math.random() * 4 - 2)).toFixed(1)), // +/- 2%
    category,
    freightOverhead: parseFloat((freightOverhead * costJitter).toFixed(4)),
  };
};

function generateProductsFromTemplate(template: ProductTemplate, count: number): Product[] {
  const products: Product[] = [];
  for (let i = 0; i < count; i++) {
    const variant = template.variants[i % template.variants.length];
    const specIndex = Math.floor(i / template.variants.length) % template.specs.length;
    const spec = template.specs[specIndex];
    const material = template.materials ? template.materials[i % template.materials.length] : '';

    const name = `${template.baseName} - ${variant} ${spec} ${material}`.replace(/\s+/g, ' ').trim();

    const costFraction = (i % template.variants.length) / template.variants.length;
    const baseCost = template.baseCostRange[0] + costFraction * (template.baseCostRange[1] - template.baseCostRange[0]);
    
    // Inverse relationship: higher cost -> lower volume
    const volumeFraction = 1 - ( (baseCost - template.baseCostRange[0]) / (template.baseCostRange[1] - template.baseCostRange[0] || 1) );
    const volume = template.volumeRange[0] + volumeFraction * (template.volumeRange[1] - template.volumeRange[0]);
    
    const margin = template.marginRange[0] + Math.random() * (template.marginRange[1] - template.marginRange[0]);

    products.push(createProduct(name, baseCost, Math.floor(volume), margin, template.category, template.freightOverhead));
  }
  return products;
}

// --- PRODUCT TEMPLATES (VOLUMES REDUCED BY 250x) ---

// Automotive Product Templates
const automotiveOemTemplates: ProductTemplate[] = [
  { baseName: 'Engine Control Module', category: 'Electronics', variants: ['Bosch ME17', 'Continental EMS3', 'Delphi E92', 'Denso Gen5'], specs: ['2.0L I4 Turbo', '3.5L V6', '5.0L V8', '1.5L Hybrid'], materials: ['Conformal Coated', 'Potted IP67'], baseCostRange: [380, 750], volumeRange: [400, 1800], marginRange: [25, 32], freightOverhead: 0.02 },
  { baseName: 'Transmission Assembly', category: 'Powertrain', variants: ['ZF 8HP', 'Aisin AW F8F45', 'Getrag 7DCL', 'Ford 10R80'], specs: ['RWD', 'AWD', 'FWD', 'Transaxle'], baseCostRange: [2800, 4500], volumeRange: [320, 1200], marginRange: [15, 22], freightOverhead: 0.05 },
  { baseName: 'Suspension Strut', category: 'Body & Chassis', variants: ['Sachs', 'Monroe', 'Bilstein B6', 'KYB Gas-A-Just'], specs: ['Passive Damper', 'Adaptive Electronic', 'MagneRide', 'Air Suspension'], materials: ['Front Left', 'Front Right', 'Rear Left', 'Rear Right'], baseCostRange: [180, 950], volumeRange: [200, 2000], marginRange: [22, 28], freightOverhead: 0.04 },
  { baseName: 'Infotainment System', category: 'Electronics', variants: ['Harman Kardon', 'Panasonic', 'Visteon', 'Bosch'], specs: ['8.8" Standard', '10.25" Pro', '12.3" Widescreen', '15" Portrait'], baseCostRange: [800, 2200], volumeRange: [300, 1600], marginRange: [28, 35], freightOverhead: 0.02 },
  { baseName: 'Brake Caliper', category: 'Body & Chassis', variants: ['Brembo', 'Akebono', 'TRW', 'Continental'], specs: ['4-Piston Fixed', '6-Piston Monobloc', 'Single Piston Floating', 'EPB Integrated'], materials: ['Cast Iron', 'Aluminum'], baseCostRange: [250, 1400], volumeRange: [240, 1800], marginRange: [24, 30], freightOverhead: 0.04 },
  { baseName: 'Seat Assembly', category: 'Interior', variants: ['Lear', 'Adient', 'Magna', 'Faurecia'], specs: ['Cloth Manual', 'Leather Power', 'Sport Bucket', 'Ventilated Massage'], materials: ['Driver', 'Passenger'], baseCostRange: [700, 2500], volumeRange: [400, 1600], marginRange: [18, 25], freightOverhead: 0.06 },
  { baseName: 'Airbag Module', category: 'Safety Systems', variants: ['Autoliv', 'ZF', 'Joyson Safety'], specs: ['Driver Frontal', 'Passenger Frontal', 'Side Curtain', 'Knee Bolster', 'Center Console'], baseCostRange: [150, 450], volumeRange: [1600, 4000], marginRange: [28, 35], freightOverhead: 0.02 },
];

const automotiveTier1Templates: ProductTemplate[] = [
    { baseName: 'Wire Harness', category: 'Electronics', variants: ['Yazaki', 'Sumitomo', 'Aptiv', 'Leoni'], specs: ['Engine Bay', 'Main Cabin', 'Dashboard', 'Door Assembly'], baseCostRange: [250, 800], volumeRange: [800, 2000], marginRange: [18, 24], freightOverhead: 0.05 },
    { baseName: 'Fuel Injector', category: 'Powertrain', variants: ['Bosch', 'Denso', 'Vitesco', 'Stanadyne'], specs: ['GDI 200bar', 'PFI 5bar', 'Diesel Piezo 2500bar', 'High Flow E85'], baseCostRange: [60, 250], volumeRange: [3200, 12000], marginRange: [25, 32], freightOverhead: 0.01 },
    { baseName: 'ABS Wheel Speed Sensor', category: 'Electronics', variants: ['Continental', 'Bosch', 'NTN-SNR'], specs: ['Hall Effect', 'Magneto-Resistive'], materials: ['Front Left', 'Front Right', 'Rear Left', 'Rear Right'], baseCostRange: [35, 85], volumeRange: [4000, 16000], marginRange: [30, 38], freightOverhead: 0.01 },
    { baseName: 'Dashboard Substrate', category: 'Interior', variants: ['Magna', 'Faurecia', 'Antolin'], specs: ['Injection Molded PP', 'Slush Molded TPO', 'Structural Foam'], baseCostRange: [180, 450], volumeRange: [1000, 2000], marginRange: [15, 22], freightOverhead: 0.08 },
];

const automotiveDistributorTemplates: ProductTemplate[] = [
    { baseName: 'Fastener', category: 'Body & Chassis', variants: ['M6x1.0', 'M8x1.25', 'M10x1.5', 'M12x1.75'], specs: ['Flange Bolt', 'Hex Nut', 'Washer', 'Stud'], materials: ['Class 8.8 Zinc', 'Class 10.9 Geomet', 'Stainless A2'], baseCostRange: [0.10, 2.50], volumeRange: [40000, 320000], marginRange: [30, 40], freightOverhead: 0.02 },
    { baseName: 'Relay', category: 'Electronics', variants: ['TE Connectivity', 'Omron', 'Panasonic'], specs: ['12V 40A SPDT', '12V 20A Micro', '24V 70A Power'], materials: ['Sealed IP67', 'Standard'], baseCostRange: [2, 15], volumeRange: [20000, 100000], marginRange: [32, 40], freightOverhead: 0.01 },
    { baseName: 'Bearing', category: 'Powertrain', variants: ['SKF', 'Timken', 'NSK', 'Koyo'], specs: ['Deep Groove Ball', 'Tapered Roller', 'Needle Roller', 'Wheel Hub Unit'], baseCostRange: [8, 120], volumeRange: [3200, 24000], marginRange: [28, 35], freightOverhead: 0.03 },
];

// Electronics Product Templates
const electronicsOemTemplates: ProductTemplate[] = [
  { baseName: 'Mobile SoC', category: 'Semiconductors', variants: ['Qualcomm Snapdragon 8 Gen 3', 'Apple A17 Bionic', 'MediaTek Dimensity 9300'], specs: ['3nm', '4nm', '5nm'], baseCostRange: [120, 200], volumeRange: [20000, 100000], marginRange: [35, 40], freightOverhead: 0.01 },
  { baseName: 'GPU', category: 'Semiconductors', variants: ['NVIDIA RTX 4090', 'AMD Radeon RX 7900XTX', 'NVIDIA RTX 4070'], specs: ['24GB GDDR6X', '20GB GDDR6', '12GB GDDR6X'], baseCostRange: [500, 1400], volumeRange: [2000, 8000], marginRange: [28, 35], freightOverhead: 0.02 },
  { baseName: 'OLED Display', category: 'Displays', variants: ['Samsung Dynamic AMOLED 2X', 'LG Display MLA+', 'BOE Q9+'], specs: ['6.8" 1440p 120Hz', '6.2" 1080p 120Hz', '7.9" Foldable'], baseCostRange: [80, 250], volumeRange: [12000, 80000], marginRange: [25, 32], freightOverhead: 0.03 },
  { baseName: 'DRAM Module', category: 'Semiconductors', variants: ['Samsung', 'SK Hynix', 'Micron'], specs: ['16GB DDR5 6000MHz', '32GB LPDDR5X 7500MHz', '8GB DDR4 3200MHz'], baseCostRange: [30, 150], volumeRange: [20000, 120000], marginRange: [22, 30], freightOverhead: 0.02 },
  { baseName: 'Motherboard PCB', category: 'PCB Assembly', variants: ['Asus ROG', 'Gigabyte Aorus', 'MSI MEG'], specs: ['Z790 Chipset', 'X670E Chipset', 'B650M Chipset'], materials: ['16-Layer', '12-Layer', '8-Layer'], baseCostRange: [150, 800], volumeRange: [1600, 6000], marginRange: [20, 28], freightOverhead: 0.04 },
  { baseName: 'Li-Po Battery', category: 'Batteries', variants: ['ATL', 'BYD', 'Sunwoda'], specs: ['5000mAh 100W', '4500mAh 65W', '6000mAh 45W'], baseCostRange: [18, 45], volumeRange: [40000, 160000], marginRange: [20, 28], freightOverhead: 0.04 },
];

const electronicsCmTemplates: ProductTemplate[] = [
    { baseName: 'MCU', category: 'Semiconductors', variants: ['STM32F429ZIT6', 'ESP32-S3-WROOM', 'NXP i.MX RT1060', 'Raspberry Pi RP2040'], specs: ['ARM Cortex-M4', 'Xtensa LX7', 'ARM Cortex-M7'], baseCostRange: [3, 25], volumeRange: [20000, 200000], marginRange: [25, 35], freightOverhead: 0.01 },
    { baseName: 'Bare PCB', category: 'PCB Assembly', variants: ['JLCPCB', 'PCBWay', 'Eurocircuits'], specs: ['4-Layer ENIG', '6-Layer HASL', '2-Layer OSP', '8-Layer HDI'], baseCostRange: [5, 150], volumeRange: [2000, 40000], marginRange: [18, 25], freightOverhead: 0.04 },
    { baseName: 'USB-C Connector', category: 'Connectors', variants: ['TE Connectivity', 'Molex', 'Amphenol'], specs: ['24-pin Mid-mount', '16-pin Vertical', 'USB4 40Gbps', 'Waterproof IPX8'], baseCostRange: [0.8, 7.5], volumeRange: [32000, 240000], marginRange: [28, 38], freightOverhead: 0.01 },
];

const electronicsDistributorTemplates: ProductTemplate[] = [
    { baseName: 'MLCC Capacitor', category: 'Semiconductors', variants: ['Murata', 'TDK', 'Yageo', 'Kemet'], specs: ['0402 1uF 16V', '0603 10uF 10V', '0805 0.1uF 50V', '1206 22uF 25V'], materials: ['X7R', 'X5R', 'C0G'], baseCostRange: [0.01, 0.20], volumeRange: [400000, 3600000], marginRange: [35, 45], freightOverhead: 0.01 },
    { baseName: 'Thick Film Resistor', category: 'Semiconductors', variants: ['Vishay', 'Yageo', 'KOA Speer'], specs: ['0603 10kOhm 1%', '0402 1kOhm 1%', '0805 0Ohm Jumper', '1206 4.7Ohm 5%'], baseCostRange: [0.005, 0.05], volumeRange: [800000, 4000000], marginRange: [38, 48], freightOverhead: 0.01 },
    { baseName: 'Pin Header', category: 'Connectors', variants: ['Samtec', 'Harwin', 'Molex'], specs: ['2.54mm 1x40', '2.54mm 2x20', '1.27mm 2x25 SMD', '2.00mm 1x10'], materials: ['Gold Plated', 'Tin Plated'], baseCostRange: [0.10, 2.50], volumeRange: [40000, 320000], marginRange: [30, 40], freightOverhead: 0.02 },
];

// Industrial Product Templates
const industrialOemTemplates: ProductTemplate[] = [
  { baseName: 'CNC Vertical Mill', category: 'Heavy Machinery', variants: ['Haas VF-2', 'Mazak VCN-530C', 'DMG MORI NVX 5100'], specs: ['3-Axis', '4-Axis', '5-Axis'], baseCostRange: [85000, 250000], volumeRange: [3, 10], marginRange: [22, 28], freightOverhead: 0.08 },
  { baseName: 'Industrial Robot', category: 'Automation', variants: ['Fanuc R-2000iC', 'KUKA KR 210', 'ABB IRB 6700'], specs: ['210kg Payload', '150kg Payload', '300kg Payload'], baseCostRange: [75000, 150000], volumeRange: [10, 40], marginRange: [25, 32], freightOverhead: 0.06 },
  { baseName: 'Injection Molding Machine', category: 'Heavy Machinery', variants: ['Engel Victory', 'Arburg Allrounder', 'Sumitomo Demag'], specs: ['200 Ton', '500 Ton', '1000 Ton'], baseCostRange: [180000, 500000], volumeRange: [2, 8], marginRange: [20, 26], freightOverhead: 0.08 },
  { baseName: 'Conveyor System', category: 'Automation', variants: ['Dorner 2200', 'FlexLink X85', 'Bosch Rexroth VarioFlow'], specs: ['50ft Modular', '100ft Modular', '200ft Custom'], baseCostRange: [28000, 120000], volumeRange: [5, 20], marginRange: [18, 24], freightOverhead: 0.07 },
  { baseName: 'Industrial Generator', category: 'Power Systems', variants: ['Cummins QSX15', 'Caterpillar C18', 'MTU 16V4000'], specs: ['500kW', '1000kW', '2000kW'], baseCostRange: [150000, 450000], volumeRange: [3, 12], marginRange: [20, 25], freightOverhead: 0.08 },
];

const industrialIntegratorTemplates: ProductTemplate[] = [
  { baseName: 'PLC System', category: 'Control Systems', variants: ['Siemens S7-1500', 'Allen-Bradley ControlLogix', 'Schneider Modicon M580'], specs: ['Basic CPU', 'Advanced CPU', 'Safety CPU'], baseCostRange: [2500, 15000], volumeRange: [100, 400], marginRange: [30, 38], freightOverhead: 0.02 },
  { baseName: 'Servo Drive', category: 'Automation', variants: ['Yaskawa Sigma-7', 'Mitsubishi MR-J5', 'Bosch Rexroth IndraDrive'], specs: ['400W', '1kW', '5kW', '15kW'], baseCostRange: [800, 5000], volumeRange: [80, 300], marginRange: [25, 32], freightOverhead: 0.03 },
  { baseName: 'Variable Frequency Drive', category: 'Power Systems', variants: ['ABB ACS880', 'Danfoss VLT', 'Siemens SINAMICS'], specs: ['10HP', '50HP', '100HP', '500HP'], baseCostRange: [1500, 25000], volumeRange: [60, 200], marginRange: [24, 30], freightOverhead: 0.04 },
  { baseName: 'HMI Panel', category: 'Control Systems', variants: ['Siemens Comfort Panel', 'Rockwell PanelView', 'Pro-face GP4000'], specs: ['10" Touch', '15" Touch', '22" Touch'], baseCostRange: [2500, 8500], volumeRange: [120, 400], marginRange: [28, 35], freightOverhead: 0.03 },
];

const industrialSupplierTemplates: ProductTemplate[] = [
  { baseName: 'Proximity Sensor', category: 'Automation', variants: ['Turck', 'SICK', 'Omron', 'Balluff'], specs: ['Inductive M12', 'Inductive M18', 'Capacitive M30', 'Ultrasonic'], baseCostRange: [45, 180], volumeRange: [2400, 8000], marginRange: [32, 40], freightOverhead: 0.01 },
  { baseName: 'Pneumatic Cylinder', category: 'Hydraulics', variants: ['SMC', 'Festo', 'Parker', 'Norgren'], specs: ['32mm Bore', '50mm Bore', '80mm Bore', '100mm Bore'], baseCostRange: [150, 600], volumeRange: [800, 3200], marginRange: [26, 32], freightOverhead: 0.04 },
  { baseName: 'Industrial Valve', category: 'Hydraulics', variants: ['Eaton Vickers', 'Bosch Rexroth', 'Sun Hydraulics'], specs: ['Directional', 'Proportional', 'Servo', 'Safety Relief'], baseCostRange: [250, 2500], volumeRange: [400, 2000], marginRange: [24, 30], freightOverhead: 0.03 },
];

// Consumer Product Templates
const consumerBrandTemplates: ProductTemplate[] = [
  { baseName: 'Cordless Vacuum', category: 'Home Appliances', variants: ['Dyson V15', 'Shark IZ462H', 'Bissell ICONpet'], specs: ['Detect Model', 'Pet Model', 'Allergy Model'], baseCostRange: [250, 450], volumeRange: [3200, 12000], marginRange: [32, 40], freightOverhead: 0.05 },
  { baseName: 'Air Fryer', category: 'Home Appliances', variants: ['Ninja Foodi', 'Instant Vortex', 'Philips Airfryer'], specs: ['4 Quart', '6 Quart', '8 Quart', '10 Quart'], baseCostRange: [60, 150], volumeRange: [6000, 20000], marginRange: [28, 35], freightOverhead: 0.06 },
  { baseName: 'Electric Toothbrush', category: 'Personal Care', variants: ['Philips Sonicare', 'Oral-B iO', 'Quip'], specs: ['9900 Prestige', 'Series 9', 'Smart Rechargeable'], baseCostRange: [80, 250], volumeRange: [4800, 16000], marginRange: [35, 42], freightOverhead: 0.03 },
  { baseName: 'Board Game', category: 'Toys & Games', variants: ['Catan', 'Ticket to Ride', 'Pandemic', 'Wingspan'], specs: ['Base Game', 'Expansion Pack', 'Deluxe Edition'], baseCostRange: [15, 60], volumeRange: [8000, 32000], marginRange: [30, 38], freightOverhead: 0.05 },
  { baseName: 'Denim Jeans', category: 'Textiles', variants: ['Levis 501', 'Wrangler Cowboy Cut', 'Lee Regular Fit'], specs: ['Mens 32x32', 'Womens 28x30', 'Kids 12'], baseCostRange: [25, 80], volumeRange: [16000, 48000], marginRange: [28, 35], freightOverhead: 0.05 },
];

const consumerCmTemplates: ProductTemplate[] = [
  { baseName: 'BLDC Motor', category: 'Home Appliances', variants: ['120k RPM Vacuum', '50k RPM Blender', '25k RPM Fan'], specs: ['500W', '750W', '1000W'], baseCostRange: [35, 85], volumeRange: [4800, 16000], marginRange: [18, 24], freightOverhead: 0.03 },
  { baseName: 'Injection Molded Housing', category: 'Home Appliances', variants: ['ABS', 'PC/ABS', 'PP', 'PA66'], specs: ['Vacuum Body', 'Blender Jar', 'Coffee Maker Base'], baseCostRange: [15, 45], volumeRange: [4000, 20000], marginRange: [20, 26], freightOverhead: 0.06 },
  { baseName: 'PCB Assembly', category: 'Personal Care', variants: ['Toothbrush Controller', 'Hair Dryer Control', 'Shaver Control'], specs: ['Bluetooth Enabled', 'Basic Timer', 'Smart Features'], baseCostRange: [8, 25], volumeRange: [10000, 40000], marginRange: [19, 25], freightOverhead: 0.02 },
  { baseName: 'Fabric Cut & Sew', category: 'Textiles', variants: ['T-Shirt', 'Polo Shirt', 'Hoodie', 'Jacket'], specs: ['Small', 'Medium', 'Large', 'XL'], baseCostRange: [3, 18], volumeRange: [40000, 160000], marginRange: [14, 20], freightOverhead: 0.04 },
];

const consumerSupplierTemplates: ProductTemplate[] = [
  { baseName: 'Plastic Resin', category: 'Home Appliances', variants: ['ABS Virgin', 'PP Recycled', 'PC/ABS Blend', 'PA66 GF30'], specs: ['Natural', 'Black', 'White', 'Custom Color'], baseCostRange: [1200, 2500], volumeRange: [40, 160], marginRange: [12, 18], freightOverhead: 0.07 },
  { baseName: 'Cotton Yarn', category: 'Textiles', variants: ['30/1 Combed', '20/1 Carded', '40/1 Combed', 'Organic 30/1'], specs: ['White', 'Black', 'Heather Grey', 'Custom Dyed'], baseCostRange: [4, 12], volumeRange: [36000, 120000], marginRange: [14, 20], freightOverhead: 0.05 },
  { baseName: 'Packaging Material', category: 'Packaging', variants: ['Corrugated Box', 'Poly Mailer', 'Bubble Wrap', 'Tissue Paper'], specs: ['Small', 'Medium', 'Large', 'Custom'], baseCostRange: [0.20, 5], volumeRange: [48000, 200000], marginRange: [16, 24], freightOverhead: 0.06 },
  { baseName: 'Button/Fastener', category: 'Textiles', variants: ['4-Hole Button', 'Shank Button', 'Snap Fastener', 'YKK Zipper'], specs: ['18L', '24L', '32L', '10"'], baseCostRange: [0.05, 2], volumeRange: [480000, 1600000], marginRange: [28, 38], freightOverhead: 0.01 },
];

// --- MAIN CONFIG OBJECT ---

export const spendWiseIndustryConfigs: Record<string, IndustryConfig> = {
  automotive: {
    icon: Car,
    name: 'Automotive Manufacturing',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    categories: ['Powertrain', 'Body & Chassis', 'Electronics', 'Interior', 'Safety Systems'],
    supplierCountries: {
      'China': { 
        percentage: 25, 
        typicalProducts: ['Electronics', 'Interior Trim', 'Batteries'],
        coordinates: { lat: 31.2304, lng: 121.4737 },
        majorHubs: [ { city: 'Shanghai', specialization: 'Electronics & EVs', lat: 31.2304, lng: 121.4737 }, { city: 'Guangzhou', specialization: 'Auto Parts', lat: 23.1291, lng: 113.2644 } ]
      },
      'Mexico': { 
        percentage: 18, 
        typicalProducts: ['Wire Harnesses', 'Seats', 'Final Assembly'],
        coordinates: { lat: 25.6866, lng: -100.3161 },
        majorHubs: [ { city: 'Monterrey', specialization: 'Heavy Components', lat: 25.6866, lng: -100.3161 }, { city: 'Guanajuato', specialization: 'Japanese OEMs', lat: 21.0190, lng: -101.2574 } ]
      },
      'USA': { 
        percentage: 15, 
        typicalProducts: ['Engines', 'Transmissions', 'R&D'],
        coordinates: { lat: 42.3314, lng: -83.0458 },
        majorHubs: [ { city: 'Detroit', specialization: 'R&D', lat: 42.3314, lng: -83.0458 }, { city: 'Huntsville, AL', specialization: 'Engine Mfg', lat: 34.7304, lng: -86.5861 } ]
      },
      'Germany': { 
        percentage: 12, 
        typicalProducts: ['High-Performance Engines', 'Advanced Electronics'],
        coordinates: { lat: 48.7758, lng: 9.1829 },
        majorHubs: [ { city: 'Stuttgart', specialization: 'Powertrain', lat: 48.7758, lng: 9.1829 }, { city: 'Munich', specialization: 'Electronics', lat: 48.1351, lng: 11.5820 } ]
      },
      'Japan': { 
        percentage: 8, 
        typicalProducts: ['Electronics', 'Transmission Components', 'Robotics'],
        coordinates: { lat: 35.1815, lng: 136.9066 },
      },
      'South Korea': { 
        percentage: 6, 
        typicalProducts: ['Batteries', 'Displays', 'Steel Panels'],
        coordinates: { lat: 37.5665, lng: 126.9780 },
      },
      'Canada': { 
        percentage: 4, 
        typicalProducts: ['Final Assembly', 'Aluminum Parts', 'Tooling'],
        coordinates: { lat: 43.6532, lng: -79.3832 },
      },
      'Czech Republic': { percentage: 3, typicalProducts: ['Sub-assemblies', 'Headlights'], coordinates: { lat: 50.0755, lng: 14.4378 } },
      'Poland': { percentage: 3, typicalProducts: ['Engine Components', 'Seating Systems'], coordinates: { lat: 52.2297, lng: 21.0122 } },
      'Romania': { percentage: 2, typicalProducts: ['Wire Harnesses', 'Gearboxes'], coordinates: { lat: 44.4268, lng: 26.1025 } },
      'Morocco': { percentage: 2, typicalProducts: ['Wire Harnesses', 'Interior Trim'], coordinates: { lat: 34.0209, lng: -6.8417 } },
      'India': { percentage: 2, typicalProducts: ['Forgings', 'Software', 'Small Components'], coordinates: { lat: 19.0760, lng: 72.8777 } },
    },
    roles: {
      'OEM': {
        products: [
            ...generateProductsFromTemplate(automotiveOemTemplates[0], 40),
            ...generateProductsFromTemplate(automotiveOemTemplates[1], 30),
            ...generateProductsFromTemplate(automotiveOemTemplates[2], 50),
            ...generateProductsFromTemplate(automotiveOemTemplates[3], 40),
            ...generateProductsFromTemplate(automotiveOemTemplates[4], 40),
            ...generateProductsFromTemplate(automotiveOemTemplates[5], 30),
            ...generateProductsFromTemplate(automotiveOemTemplates[6], 20),
        ],
        avgSpend: 'high'
      },
      'Tier 1 Supplier': {
        products: [
            ...generateProductsFromTemplate(automotiveTier1Templates[0], 50),
            ...generateProductsFromTemplate(automotiveTier1Templates[1], 40),
            ...generateProductsFromTemplate(automotiveTier1Templates[2], 40),
            ...generateProductsFromTemplate(automotiveTier1Templates[3], 30),
        ],
        avgSpend: 'medium'
      },
      'Component Distributor': {
        products: [
            ...generateProductsFromTemplate(automotiveDistributorTemplates[0], 60),
            ...generateProductsFromTemplate(automotiveDistributorTemplates[1], 50),
            ...generateProductsFromTemplate(automotiveDistributorTemplates[2], 50),
        ],
        avgSpend: 'low'
      }
    }
  },

  electronics: {
    icon: Cpu,
    name: 'Electronics & Technology',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    categories: ['Semiconductors', 'PCB Assembly', 'Displays', 'Batteries', 'Connectors'],
    supplierCountries: {
      'Taiwan': { 
        percentage: 30, 
        typicalProducts: ['Semiconductors (Leading Edge)', 'Advanced PCB'],
        coordinates: { lat: 24.8039, lng: 120.9657 },
        majorHubs: [ { city: 'Hsinchu', specialization: 'Wafer Fabs', lat: 24.8039, lng: 120.9657 }, { city: 'Tainan', specialization: 'Advanced Nodes', lat: 22.9997, lng: 120.2133 } ]
      },
      'China': { 
        percentage: 28, 
        typicalProducts: ['PCB Assembly', 'Displays', 'Batteries', 'Connectors'],
        coordinates: { lat: 22.5431, lng: 114.0579 },
        majorHubs: [ { city: 'Shenzhen', specialization: 'Everything', lat: 22.5431, lng: 114.0579 }, { city: 'Suzhou', specialization: 'Assembly', lat: 31.3040, lng: 120.6169 } ]
      },
      'South Korea': { 
        percentage: 18, 
        typicalProducts: ['Semiconductors (Memory)', 'OLED Displays'],
        coordinates: { lat: 37.5665, lng: 126.9780 },
        majorHubs: [ { city: 'Suwon', specialization: 'Memory & Mobile', lat: 37.2636, lng: 127.0286 } ]
      },
      'USA': { 
        percentage: 8, 
        typicalProducts: ['Semiconductor Design', 'High-End ICs'],
        coordinates: { lat: 37.3541, lng: -121.9552 },
        majorHubs: [ { city: 'Santa Clara', specialization: 'Chip Design', lat: 37.3541, lng: -121.9552 } ]
      },
      'Japan': { 
        percentage: 7, 
        typicalProducts: ['Specialty Semiconductors', 'Passive Components', 'Camera Sensors'],
        coordinates: { lat: 35.6762, lng: 139.6503 }
      },
      'Vietnam': { 
        percentage: 5, 
        typicalProducts: ['Final Assembly', 'Connector Assembly'],
        coordinates: { lat: 10.8231, lng: 106.6297 }
      },
      'Malaysia': { 
        percentage: 4, 
        typicalProducts: ['Semiconductor Assembly & Test', 'Passives'],
        coordinates: { lat: 3.1390, lng: 101.6869 }
      },
    },
    roles: {
      'OEM': {
        products: [
            ...generateProductsFromTemplate(electronicsOemTemplates[0], 25),
            ...generateProductsFromTemplate(electronicsOemTemplates[1], 25),
            ...generateProductsFromTemplate(electronicsOemTemplates[2], 50),
            ...generateProductsFromTemplate(electronicsOemTemplates[3], 40),
            ...generateProductsFromTemplate(electronicsOemTemplates[4], 30),
            ...generateProductsFromTemplate(electronicsOemTemplates[5], 30),
        ],
        avgSpend: 'high'
      },
      'Contract Manufacturer': {
        products: [
            ...generateProductsFromTemplate(electronicsCmTemplates[0], 60),
            ...generateProductsFromTemplate(electronicsCmTemplates[1], 50),
            ...generateProductsFromTemplate(electronicsCmTemplates[2], 50),
        ],
        avgSpend: 'medium'
      },
      'Component Distributor': {
        products: [
            ...generateProductsFromTemplate(electronicsDistributorTemplates[0], 70),
            ...generateProductsFromTemplate(electronicsDistributorTemplates[1], 70),
            ...generateProductsFromTemplate(electronicsDistributorTemplates[2], 50),
        ],
        avgSpend: 'low'
      }
    }
  },
  
  industrial: {
    icon: Factory,
    name: 'Industrial Equipment',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    categories: ['Heavy Machinery', 'Automation', 'Power Systems', 'Control Systems', 'Hydraulics'],
    supplierCountries: {
      'Germany': { 
        percentage: 25, 
        typicalProducts: ['Heavy Machinery', 'Control Systems', 'Automation'],
        coordinates: { lat: 51.1657, lng: 10.4515 }
      },
      'USA': { 
        percentage: 20, 
        typicalProducts: ['Heavy Machinery', 'Power Systems', 'Control Systems'],
        coordinates: { lat: 41.8781, lng: -87.6298 }
      },
      'China': { 
        percentage: 18, 
        typicalProducts: ['Heavy Machinery (Value)', 'Power Systems', 'Components'],
        coordinates: { lat: 35.8617, lng: 104.1954 }
      },
      'Japan': { 
        percentage: 15, 
        typicalProducts: ['Automation (Robotics)', 'Hydraulics', 'Precision Motors'],
        coordinates: { lat: 36.2048, lng: 138.2529 }
      },
      'Italy': { 
        percentage: 8, 
        typicalProducts: ['Specialty Machinery', 'Hydraulics', 'Packaging Automation'],
        coordinates: { lat: 41.8719, lng: 12.5674 }
      },
      'Switzerland': { 
        percentage: 6, 
        typicalProducts: ['Precision Machinery', 'Advanced Sensors', 'Control Systems'],
        coordinates: { lat: 46.8182, lng: 8.2275 }
      },
      'Sweden': { 
        percentage: 4, 
        typicalProducts: ['Mining Equipment', 'Bearings', 'Power Tools'],
        coordinates: { lat: 60.1282, lng: 18.6435 }
      },
      'South Korea': { 
        percentage: 4, 
        typicalProducts: ['Heavy Machinery', 'Excavators'],
        coordinates: { lat: 35.9078, lng: 127.7669 }
      }
    },
    roles: {
      'Equipment Manufacturer': {
        products: [
            ...generateProductsFromTemplate(industrialOemTemplates[0], 30),
            ...generateProductsFromTemplate(industrialOemTemplates[1], 40),
            ...generateProductsFromTemplate(industrialOemTemplates[2], 25),
            ...generateProductsFromTemplate(industrialOemTemplates[3], 35),
            ...generateProductsFromTemplate(industrialOemTemplates[4], 20),
        ],
        avgSpend: 'high'
      },
      'Systems Integrator': {
        products: [
            ...generateProductsFromTemplate(industrialIntegratorTemplates[0], 50),
            ...generateProductsFromTemplate(industrialIntegratorTemplates[1], 45),
            ...generateProductsFromTemplate(industrialIntegratorTemplates[2], 40),
            ...generateProductsFromTemplate(industrialIntegratorTemplates[3], 35),
        ],
        avgSpend: 'medium'
      },
      'Component Supplier': {
        products: [
            ...generateProductsFromTemplate(industrialSupplierTemplates[0], 60),
            ...generateProductsFromTemplate(industrialSupplierTemplates[1], 50),
            ...generateProductsFromTemplate(industrialSupplierTemplates[2], 45),
        ],
        avgSpend: 'low'
      }
    }
  },
  
  consumer: {
    icon: ShoppingCart,
    name: 'Consumer Products',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    categories: ['Home Appliances', 'Personal Care', 'Toys & Games', 'Packaging', 'Textiles'],
    supplierCountries: {
      'China': { 
        percentage: 45, 
        typicalProducts: ['Home Appliances', 'Personal Care', 'Toys & Games', 'Packaging', 'Textiles'],
        coordinates: { lat: 22.3193, lng: 114.1694 }
      },
      'Vietnam': { 
        percentage: 15, 
        typicalProducts: ['Textiles', 'Footwear', 'Furniture'],
        coordinates: { lat: 21.0285, lng: 105.8542 }
      },
      'India': { 
        percentage: 8, 
        typicalProducts: ['Textiles', 'Home Goods', 'Leather'],
        coordinates: { lat: 28.6139, lng: 77.2090 }
      },
      'Bangladesh': { 
        percentage: 8, 
        typicalProducts: ['Garments', 'Textiles'],
        coordinates: { lat: 23.8103, lng: 90.4125 }
      },
      'Indonesia': { 
        percentage: 6, 
        typicalProducts: ['Furniture', 'Textiles', 'Footwear'],
        coordinates: { lat: -6.2088, lng: 106.8456 }
      },
      'Mexico': { 
        percentage: 5, 
        typicalProducts: ['Home Appliances', 'Packaging'],
        coordinates: { lat: 19.4326, lng: -99.1332 }
      },
      'Turkey': { 
        percentage: 4, 
        typicalProducts: ['Home Appliances', 'Textiles (Denim)'],
        coordinates: { lat: 39.9334, lng: 32.8597 }
      },
      'USA': { 
        percentage: 4, 
        typicalProducts: ['Packaging', 'High-End Personal Care', 'R&D'],
        coordinates: { lat: 34.0522, lng: -118.2437 }
      },
      'Italy': { 
        percentage: 3, 
        typicalProducts: ['High-End Textiles', 'Luxury Packaging', 'Personal Care Formulation'],
        coordinates: { lat: 45.4642, lng: 9.1900 }
      },
      'Brazil': { 
        percentage: 2, 
        typicalProducts: ['Packaging (Pulp)', 'Cosmetics'],
        coordinates: { lat: -23.5505, lng: -46.6333 }
      },
    },
    roles: {
      'Brand Owner': {
        products: [
            ...generateProductsFromTemplate(consumerBrandTemplates[0], 30),
            ...generateProductsFromTemplate(consumerBrandTemplates[1], 40),
            ...generateProductsFromTemplate(consumerBrandTemplates[2], 35),
            ...generateProductsFromTemplate(consumerBrandTemplates[3], 45),
            ...generateProductsFromTemplate(consumerBrandTemplates[4], 50),
        ],
        avgSpend: 'high'
      },
      'Contract Manufacturer': {
        products: [
            ...generateProductsFromTemplate(consumerCmTemplates[0], 40),
            ...generateProductsFromTemplate(consumerCmTemplates[1], 45),
            ...generateProductsFromTemplate(consumerCmTemplates[2], 40),
            ...generateProductsFromTemplate(consumerCmTemplates[3], 35),
        ],
        avgSpend: 'medium'
      },
      'Component Supplier': {
        products: [
            ...generateProductsFromTemplate(consumerSupplierTemplates[0], 30),
            ...generateProductsFromTemplate(consumerSupplierTemplates[1], 50),
            ...generateProductsFromTemplate(consumerSupplierTemplates[2], 60),
            ...generateProductsFromTemplate(consumerSupplierTemplates[3], 40),
        ],
        avgSpend: 'low'
      }
    }
  }
};
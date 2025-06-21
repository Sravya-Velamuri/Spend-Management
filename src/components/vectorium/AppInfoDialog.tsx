
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Package, Building, ArrowRightLeft, FolderTree, ListChecks, HelpCircle, BarChart3, Sparkles, Wand2, UploadCloud, FileSpreadsheet, MessageCircle, FileText } from "lucide-react";

interface AppInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppInfoDialog({ isOpen, onClose }: AppInfoDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl"> {/* Increased width for more content */}
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            About Spend by TADA
          </DialogTitle>
          <DialogDescription>
            A comprehensive spend management and analysis tool. Version 2R25.6.12.1
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4 text-sm">
            <div className="space-y-6 py-4">
                <section>
                    <h4 className="font-semibold mb-1 text-base">Purpose:</h4>
                    <p className="text-xs text-muted-foreground">
                        Spend by TADA is designed to help you manage, analyze, and optimize your procurement spend.
                        It allows for detailed tracking of parts, suppliers, and their relationships,
                        facilitating what-if scenario modeling for cost adjustments, tariff changes, and demand fluctuations.
                        You can load your data via XML, individual CSVs, or a comprehensive Excel workbook.
                    </p>
                </section>

                <section>
                    <h4 className="font-semibold mb-2 text-base">Key Features & Usage Examples:</h4>
                    <div className="space-y-3 text-xs text-muted-foreground">
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><Package className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>1. Add/Update Parts (Tab 1):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Manage part details: Part Number, Name, Base Cost, Annual Demand (units), Freight & OHD (as a percentage, e.g., 5 for 5%).</li>
                                <li>Select a part radio button to open the "Part360" panel for detailed insights on that specific part.</li>
                                <li>Upload parts via CSV (expects: PartNumber, Name, Price, AnnualDemand, FreightOhdCost(%)) or from the "Parts" sheet in an Excel workbook.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><Building className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>2. Add/Update Suppliers (Tab 2):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Maintain supplier information: Supplier ID, Name, Description, City, Country. Full address details can be entered to enable geocoding.</li>
                                <li>Click the <MapPin className="inline h-3 w-3"/> icon to geocode a supplier's address for map visualization (requires valid address components like city/country or street address).</li>
                                <li>Upload suppliers via CSV (expects: SupplierId, Name, Description, StreetAddress, City, StateOrProvince, PostalCode, Country) or from the "Suppliers" sheet in an Excel workbook.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><ArrowRightLeft className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>3. Update Source Mix (Tab 3):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Create many-to-many relationships by dragging parts from "Available Parts" to suppliers in "Available Suppliers" (or vice-versa).</li>
                                <li>View established links in the "Source Network" list. Remove links using the trash icon.</li>
                                <li>Upload source mix via CSV (expects: PartNumber, SupplierId) or from the "Supplier Mix" (or "SourceMix") sheet in an Excel workbook.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><FolderTree className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>4. Add/Update Categories (Tab 4):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Create new categories (e.g., "Electronics", "Mechanical Components").</li>
                                <li>Drag parts from "Available Parts" onto category buckets to assign them. A part can belong to multiple categories.</li>
                                <li>Upload part-category mappings via CSV (expects: PartNumber, CategoryName) or from the "Parts Categories" (or "PartCategories") sheet in an Excel workbook.</li>
                            </ul>
                        </div>
                         <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><ListChecks className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>5. Validate Spend Network (Tab 5):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Run data integrity checks: e.g., find parts without suppliers, suppliers without parts, duplicate entries (by ID, number, or name), single-source parts, and case-insensitive duplicate categories.</li>
                                <li>Use the search bars within each validation section to quickly find items.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><HelpCircle className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>6. What-if Analysis (Tab 6):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Model scenarios: Adjust global parameters (Scenario Home Country, Tariff Multiplier Points, Logistics Cost Points).</li>
                                <li>Apply category-specific cost adjustments (e.g., "Electronics" +10% cost).</li>
                                <li>Set country-specific additional tariff points for foreign suppliers (e.g., "China" +15 tariff points).</li>
                                <li>Adjust demand globally, by category, or by individual part.</li>
                                <li>Save and load scenarios to compare impacts on total spend using the waterfall chart and P&L table.</li>
                                <li>Example: Model a 10% tariff increase on parts from 'China' by setting 'China' as a Supplier Country with "+10" additional tariff points, assuming 'China' is not the Scenario Home Country.</li>
                            </ul>
                        </div>
                         <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><BarChart3 className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>7. Review Spend (Tab 7):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Analyze current spend data through various charts (Spend by Category, Top Parts by Spend, Top Parts by Demand).</li>
                                <li>Use filters for Parts, Suppliers, and Categories to drill down. Results update based on the current data and filters.</li>
                            </ul>
                        </div>
                         <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><Sparkles className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>8. Release Notes (Tab 8):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Stay updated with the latest application changes and features.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><Wand2 className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>AI-Powered Data Generation:</h5>
                             <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Click the <Wand2 className="inline h-3 w-3"/> icon in the header.</li>
                                <li>Specify a domain (e.g., "Consumer Electronics"), number of parts, suppliers, and categories.</li>
                                <li>The AI generates sample data, including part numbers, names, supplier details (addresses, etc.), and initial associations. Price, demand, and freight are randomized.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center"><MessageCircle className="inline h-4 w-4 mr-1.5 text-primary-foreground bg-primary p-0.5 rounded"/>SpendWise Assistant (AI Chat):</h5>
                            <ul className="list-disc list-inside pl-4 space-y-0.5">
                                <li>Click the <MessageCircle className="inline h-3 w-3"/> icon in the header to open the chat.</li>
                                <li>Ask questions about your *currently loaded and filtered data*. Examples:
                                    <ul className="list-circle list-inside pl-5 mt-0.5">
                                        <li>"What is my total spend on parts from supplier X?"</li>
                                        <li>"Which parts are in the 'Capacitors' category?"</li>
                                        <li>"Show me suppliers located in Germany."</li>
                                        <li>"How many parts are single-sourced?"</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="font-semibold mb-2 text-base flex items-center">
                        <FileSpreadsheet className="inline h-4 w-4 mr-1.5"/> Example Data Formats for Upload
                    </h4>
                    <div className="space-y-3 text-xs text-muted-foreground">
                        <div>
                            <h5 className="font-medium text-sm mb-1">Excel Workbook Upload (<FileSpreadsheet className="inline h-3 w-3 mr-0.5"/> icon in header):</h5>
                            <p>Upload a single .xlsx or .xls file. The importer looks for sheets with these specific names (case-insensitive matching for common variations):</p>
                            <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5">
                                <li><strong>Parts:</strong> Sheet named "Parts". Key columns: <code>PartNumber</code>, <code>Name</code>, <code>Price</code>, <code>AnnualDemand</code>, <code>FreightOhdCost</code> (or <code>FreightOhdCost(%)</code> - value like '5' or '5%' for 5%).</li>
                                <li><strong>Suppliers:</strong> Sheet named "Suppliers". Key columns: <code>SupplierId</code>, <code>Name</code>, <code>Description</code>, <code>StreetAddress</code>, <code>City</code>, <code>StateOrProvince</code>, <code>PostalCode</code>, <code>Country</code>.</li>
                                <li><strong>Source Mix:</strong> Sheet named "Supplier Mix" (or "SupplierMix", "SourceMix"). Key columns: <code>PartNumber</code>, <code>SupplierId</code>.</li>
                                <li><strong>Part Categories:</strong> Sheet named "Parts Categories" (or "PartCategories"). Key columns: <code>PartNumber</code>, <code>CategoryName</code>.</li>
                            </ul>
                             <p className="mt-1">Duplicates (by PartNumber or SupplierId) will be skipped. Ensure headers are present in the first row.</p>
                        </div>
                        <div>
                            <h5 className="font-medium text-sm mb-1">Individual CSV Uploads (<FileText className="inline h-3 w-3 mr-0.5"/> icon in respective tabs):</h5>
                             <p>Each CSV should have a header row. Data starts from the second row.</p>
                            <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5">
                                <li><strong>Parts CSV (Tab 1):</strong> Columns: <code>PartNumber</code>, <code>Name</code>, <code>Price</code>, <code>AnnualDemand</code>, <code>FreightOhdCost(%)</code> (e.g., 5 for 5%).</li>
                                <li><strong>Suppliers CSV (Tab 2):</strong> Columns: <code>SupplierId</code>, <code>Name</code>, <code>Description</code>, <code>StreetAddress</code>, <code>City</code>, <code>StateOrProvince</code>, <code>PostalCode</code>, <code>Country</code>.</li>
                                <li><strong>Source Mix CSV (Tab 3):</strong> Columns: <code>PartNumber</code>, <code>SupplierId</code>.</li>
                                <li><strong>Part-Category CSV (Tab 4):</strong> Columns: <code>PartNumber</code>, <code>CategoryName</code>.</li>
                            </ul>
                        </div>
                         <div>
                            <h5 className="font-medium text-sm mb-1">XML Configuration (<UploadCloud className="inline h-3 w-3 mr-0.5"/>/<ArrowRightLeft className="inline h-3 w-3 mr-0.5"/> icons in header):</h5>
                            <p>The application can also load and save its entire state (all parts, suppliers, mappings, etc.) as an XML file. This is useful for backups or transferring configurations.</p>
                        </div>
                    </div>
                </section>

                 <section>
                    <h4 className="font-semibold mb-1 text-base">General Tips:</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                        <li>Use the tooltips (hover over icons or elements) for more information on specific controls.</li>
                        <li>Data entered or uploaded is saved locally in your browser's storage, associated with the current filename (default: "SpendByTADADef01.xml"). Use the Download/Load XML buttons in the header to backup or transfer your complete configuration.</li>
                        <li>The application theme (Light, Dark, TADA) can be changed using the selector in the header.</li>
                        <li>The "Home Country" setting in the header affects how "Total Annual Spend" is calculated by determining which parts are subject to import tariffs.</li>
                        <li>The "Tariff Mult." in the header scales the base tariff rate applied to imported parts.</li>
                    </ul>
                </section>
            </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

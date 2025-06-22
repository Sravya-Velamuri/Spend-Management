import React, { useState, useMemo, useRef } from 'react';
import type { Part, Supplier, PartSupplierAssociation } from '@/types/spendwise';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Building, 
  ArrowRightLeft, 
  Info, 
  Trash2, 
  // Plus, // Plus was imported but not used, can be removed if not needed elsewhere
  Target, 
  // CheckCircle, // CheckCircle was imported but not used
  // Sparkles, // Sparkles was imported but not used
  Search,
  FileSpreadsheet, // Added import
  Loader2          // Added import
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { parsePartSupplierMappingsExcel } from './excel-parser'; // Added import

interface PartSupplierMappingTabProps {
  parts: Part[];
  suppliers: Supplier[];
  partSupplierAssociations: PartSupplierAssociation[];
  setPartSupplierAssociations: React.Dispatch<React.SetStateAction<PartSupplierAssociation[]>>;
}

interface DragItem {
  id: string;
  type: 'part' | 'supplier';
  data: Part | Supplier;
}

// Mock excel-parser if it doesn't exist for type-checking and local dev
// You should replace this with your actual excel-parser.ts content or ensure it exists
// For example:
// // ./excel-parser.ts
// export const parsePartSupplierMappingsExcel = async (
//   file: File, 
//   currentAssociations: PartSupplierAssociation[], 
//   parts: Part[], 
//   suppliers: Supplier[]
// ): Promise<{ data: PartSupplierAssociation[], errors: string[] }> => {
//   console.log("Mock parsePartSupplierMappingsExcel called with file:", file.name);
//   // Simulate parsing delay
//   await new Promise(resolve => setTimeout(resolve, 1500));
//   // Simulate some successful data and some errors
//   // This is a placeholder, your actual logic will be much more complex
//   const mockData: PartSupplierAssociation[] = [];
//   if (parts.length > 0 && suppliers.length > 0 && !currentAssociations.some(a => a.partId === parts[0].id && a.supplierId === suppliers[0].id)) {
//     mockData.push({ id: `excel_${Date.now()}`, partId: parts[0].id, supplierId: suppliers[0].id });
//   }
//   return {
//     data: mockData,
//     errors: mockData.length === 0 && parts.length > 0 && suppliers.length > 0 ? ["Mock Error: Could not find new mappings or first mapping already exists."] : [],
//   };
// };


export default function PartSupplierMappingTab({ 
  parts, 
  suppliers, 
  partSupplierAssociations, 
  setPartSupplierAssociations, 
}: PartSupplierMappingTabProps) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [hoveredMapping, setHoveredMapping] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const { toast } = useToast();

  const [searchTermParts, setSearchTermParts] = useState('');
  const [searchTermSuppliers, setSearchTermSuppliers] = useState('');

  // Added state
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  const filteredParts = useMemo(() => {
    if (!searchTermParts) return parts;
    const lowerSearchTerm = searchTermParts.toLowerCase();
    return parts.filter(part => 
      part.name.toLowerCase().includes(lowerSearchTerm) ||
      part.partNumber.toLowerCase().includes(lowerSearchTerm)
    );
  }, [parts, searchTermParts]);

  const filteredSuppliers = useMemo(() => {
    if (!searchTermSuppliers) return suppliers;
    const lowerSearchTerm = searchTermSuppliers.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(lowerSearchTerm) ||
      supplier.supplierId.toLowerCase().includes(lowerSearchTerm)
    );
  }, [suppliers, searchTermSuppliers]);

  // Added ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Added handler
  const handleExcelUpload = async (file: File) => {
    setIsUploadingExcel(true);
    try {
      const result = await parsePartSupplierMappingsExcel(file, partSupplierAssociations, parts, suppliers);
      if (result.data.length > 0) {
        setPartSupplierAssociations(prev => [...prev, ...result.data]);
        toast({
          title: "Mappings Imported",
          description: `Successfully imported ${result.data.length} part-supplier mappings from Excel.`
        });
      }
      if (result.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Import Warnings",
          description: `${result.errors.length} rows had issues. Check console for details.`
        });
        console.error("Excel import errors:", result.errors);
      }
      if (result.data.length === 0 && result.errors.length === 0) {
        toast({
          title: "No New Mappings",
          description: "The Excel file did not contain any new part-supplier mappings or all mappings already exist."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to process Excel file"
      });
      console.error("Excel import process error:", error);
    } finally {
      setIsUploadingExcel(false);
    }
  };


  const getPartDisplay = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    return part ? `${part.name} (${part.partNumber})` : 'Unknown Part';
  };

  const getSupplierDisplay = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? `${supplier.name} (${supplier.supplierId})` : 'Unknown Supplier';
  };

  const getPartAssociationCount = (partId: string) => {
    return partSupplierAssociations.filter(a => a.partId === partId).length;
  };

  const getSupplierAssociationCount = (supplierId: string) => {
    return partSupplierAssociations.filter(a => a.supplierId === supplierId).length;
  };

  const isValidDropTarget = (dragType: 'part' | 'supplier', targetType: string, targetId?: string) => {
    if (!draggedItem || !targetId) return false;
    
    if (dragType === 'part' && targetType === 'supplier') {
      return !partSupplierAssociations.some(a => 
        a.partId === draggedItem.data.id && a.supplierId === targetId
      );
    }
    
    if (dragType === 'supplier' && targetType === 'part') {
      return !partSupplierAssociations.some(a => 
        a.supplierId === draggedItem.data.id && a.partId === targetId
      );
    }
    
    return false;
  };

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', ''); 
    
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      padding: 8px 16px;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 8px;
      font-size: 12px;
      position: absolute;
      top: -1000px;
      left: -1000px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    dragImage.textContent = item.type === 'part' 
      ? `📦 ${(item.data as Part).name}` 
      : `🏢 ${(item.data as Supplier).name}`;
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
    dragCounterRef.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent, targetType: string) => {
    e.preventDefault();
    dragCounterRef.current++;
    setDragOverTarget(targetType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetType: string, targetId?: string) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOverTarget(null);

    if (!draggedItem) return;

    if (targetType === 'supplier' && draggedItem.type === 'part' && targetId) {
      createAssociation(draggedItem.data.id, targetId);
    } else if (targetType === 'part' && draggedItem.type === 'supplier' && targetId) {
      createAssociation(targetId, draggedItem.data.id);
    } else if (targetType === 'mapping') {
      if (draggedItem.type === 'part') {
        const availableSupplier = suppliers.find(s => !partSupplierAssociations.some(psa => psa.partId === draggedItem.data.id && psa.supplierId === s.id)) || suppliers[0];
        if (availableSupplier) {
          createAssociation(draggedItem.data.id, availableSupplier.id);
        } else {
          toast({ variant: "destructive", title: "No Supplier", description: "No available supplier to map this part to." });
        }
      } else if (draggedItem.type === 'supplier') {
        const availablePart = parts.find(p => !partSupplierAssociations.some(psa => psa.supplierId === draggedItem.data.id && psa.partId === p.id)) || parts[0];
        if (availablePart) {
          createAssociation(availablePart.id, draggedItem.data.id);
        } else {
           toast({ variant: "destructive", title: "No Part", description: "No available part to map this supplier to." });
        }
      }
    }
    setDraggedItem(null);
  };

  const createAssociation = (partId: string, supplierId: string) => {
    const exists = partSupplierAssociations.some(a => 
      a.partId === partId && a.supplierId === supplierId
    );
    
    if (!exists) {
      const newAssociation: PartSupplierAssociation = {
        id: `psa_drag_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
        partId,
        supplierId
      };
      setPartSupplierAssociations(prev => [...prev, newAssociation]);
      toast({ title: "Association Created", description: `Part linked with supplier.` });
    } else {
      toast({ variant: "default", title: "Already Mapped", description: "This part-supplier association already exists." });
    }
  };

  const handleRemoveAssociation = (associationId: string) => {
    setPartSupplierAssociations(prev => prev.filter(a => a.id !== associationId));
    toast({ title: "Association Removed", description: "Part-supplier link removed." });
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center"> {/* Left side: Title, Description, Info Tooltip */}
              <ArrowRightLeft className="mr-2 h-6 w-6" />
              <div>
                <CardTitle className="text-lg">Source & Mix Parts with Suppliers</CardTitle>
                <CardDescription className="text-sm">
                  Drag parts to suppliers (or vice versa) to create many-to-many sourcing relationships.
                </CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2 h-5 w-5">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Drag parts from the 'Available Parts' list and drop them onto a supplier in the 'Available Suppliers' list (or vice-versa) to link them. Associations appear in the 'Source Network' list. Each part can be sourced from multiple suppliers. Green ring indicates a valid drop target.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Right side: Added Upload Button and input */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingExcel}
              >
                {isUploadingExcel ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                {isUploadingExcel ? "Uploading..." : "Upload Excel"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleExcelUpload(file);
                    e.target.value = ""; // Reset file input to allow re-uploading the same file
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="grid md:grid-cols-3 gap-6 text-xs">
          {/* Parts Column */}
          <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold flex items-center">
                  <Package className="mr-2 h-5 w-5 text-primary" /> 
                  Available Parts ({filteredParts.length}/{parts.length})
                </h3>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search parts by name or number..."
                value={searchTermParts}
                onChange={(e) => setSearchTermParts(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <ScrollArea className="h-[350px] border rounded-md p-3 bg-gradient-to-b from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
              <div className="space-y-2">
                {filteredParts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {parts.length === 0 ? "No parts available. Add parts in Tab 1." : "No parts match your search."}
                  </p>
                )}
                {filteredParts.map((part) => {
                  const associationCount = getPartAssociationCount(part.id);
                  const isDropTarget = draggedItem?.type === 'supplier' && 
                    isValidDropTarget('supplier', 'part', part.id);
                  
                  return (
                    <Card 
                      key={part.id} 
                      className={`p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg ${
                        isDropTarget && dragOverTarget === `part-${part.id}`
                          ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-950/30 scale-105' 
                          : 'bg-white dark:bg-gray-800 hover:scale-105'
                      }`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, { id: part.id, type: 'part', data: part })}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, `part-${part.id}`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'part', part.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm flex items-center">
                            <Package className="h-3 w-3 text-blue-500 mr-1" />
                            {part.name}
                            {associationCount > 0 && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                                {associationCount} supplier{associationCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{part.partNumber}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ${part.price} • {part.annualDemand.toLocaleString()} units
                          </p>
                        </div>
                        {isDropTarget && dragOverTarget === `part-${part.id}` && (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <Target className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </section>

          {/* Suppliers Column */}
          <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold flex items-center">
                  <Building className="mr-2 h-5 w-5 text-primary" /> 
                  Available Suppliers ({filteredSuppliers.length}/{suppliers.length})
                </h3>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search suppliers by name or ID..."
                value={searchTermSuppliers}
                onChange={(e) => setSearchTermSuppliers(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <ScrollArea className="h-[350px] border rounded-md p-3 bg-gradient-to-b from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20">
              <div className="space-y-2">
                {filteredSuppliers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {suppliers.length === 0 ? "No suppliers available. Add suppliers in Tab 2." : "No suppliers match your search."}
                  </p>
                )}
                {filteredSuppliers.map((supplier) => {
                  const associationCount = getSupplierAssociationCount(supplier.id);
                  const isDropTarget = draggedItem?.type === 'part' && 
                    isValidDropTarget('part', 'supplier', supplier.id);
                  
                  return (
                    <Card 
                      key={supplier.id} 
                      className={`p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg ${
                        isDropTarget && dragOverTarget === `supplier-${supplier.id}`
                          ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-950/30 scale-105' 
                          : 'bg-white dark:bg-gray-800 hover:scale-105'
                      }`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, { id: supplier.id, type: 'supplier', data: supplier })}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, `supplier-${supplier.id}`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'supplier', supplier.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm flex items-center">
                            <Building className="h-3 w-3 text-purple-500 mr-1" />
                            {supplier.name}
                            {associationCount > 0 && (
                              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full">
                                {associationCount} part{associationCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{supplier.supplierId}</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            {supplier.country} • {supplier.city}
                          </p>
                        </div>
                        {isDropTarget && dragOverTarget === `supplier-${supplier.id}` && (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <Target className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </section>
          
          {/* Mapping Area */}
          <section>
             <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <Target className="mr-2 h-5 w-5 text-accent" /> 
                  Source Network ({partSupplierAssociations.length})
                </h3>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Info className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs max-w-xs">
                            This area shows existing part-supplier links. Drag items here if no specific target is selected, or create links by dragging between the 'Parts' and 'Suppliers' columns. Click the trash icon to remove a mapping.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
            
            <div
              className={`min-h-[400px] border-2 border-dashed rounded-lg transition-all duration-300 ${
                dragOverTarget === 'mapping'
                  ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 scale-105'
                  : 'border-accent/50 bg-accent/5'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, 'mapping')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'mapping')}
            >
              {partSupplierAssociations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium mb-2">
                    Drop Zone for General Mapping
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Drag parts or suppliers here to automatically map to an available counterpart, or drag items directly between the 'Parts' and 'Suppliers' columns for specific links.
                  </p>
                  {dragOverTarget === 'mapping' && (
                    <div className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                        Drop to create mapping!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[400px] p-2">
                  <div className="space-y-2">
                    {partSupplierAssociations.map((assoc) => (
                      <Card 
                        key={assoc.id} 
                        className={`p-3 transition-all duration-200 hover:shadow-md ${
                          hoveredMapping === assoc.id ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                        }`}
                        onMouseEnter={() => setHoveredMapping(assoc.id)}
                        onMouseLeave={() => setHoveredMapping(null)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <Package className="h-4 w-4 text-blue-500 mr-2" />
                              <p className="text-sm font-medium">
                                {getPartDisplay(assoc.partId)}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-purple-500 mr-2" />
                              <p className="text-sm">
                                {getSupplierDisplay(assoc.supplierId)}
                              </p>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/30" 
                                onClick={() => handleRemoveAssociation(assoc.id)}
                                aria-label="Remove Association"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Remove this association</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
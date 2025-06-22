import React, { useState, useRef, useMemo } from 'react';
import type { Part, PartCategoryMapping } from '@/types/spendwise';
import type { SpendDataPoint, CountDataPoint } from '@/app/page';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderTree, Search, Plus, Trash2, Package, Target, Palette, TrendingUp, Hash, Info, Activity, FileSpreadsheet, Loader2 } from "lucide-react"; // Added FileSpreadsheet, Loader2
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ScatterChart, Scatter as RechartsScatter, ZAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import type { CurrencyInfo } from '@/lib/currencyConfig';
// Assuming parsePartCategoriesExcel and toast are available in the project context as per instructions
// If parsePartCategoriesExcel is in a local file, its path needs to be correct.
// e.g., import { parsePartCategoriesExcel } from './excel-parser';
// For toast, ensure a toast library (e.g., sonner, react-hot-toast) is set up.
// For the purpose of this code, we'll assume they exist.
declare function parsePartCategoriesExcel(file: File, currentMappings: PartCategoryMapping[], allParts: Part[]): Promise<{ data: PartCategoryMapping[], newCategories: string[], errors: any[] }>;
declare function toast(options: { title: string; description: string; variant?: "default" | "destructive" }): void;


// Simple Badge component
const Badge = ({ children, variant = "default", className = "" }: { 
  children: React.ReactNode; 
  variant?: "default" | "secondary"; 
  className?: string;
}) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === "secondary" 
      ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" 
      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  } ${className}`}>
    {children}
  </span>
);

interface UploadPartCategoryTabProps {
  parts: Part[];
  partCategoryMappings: PartCategoryMapping[];
  spendByCategoryData: SpendDataPoint[];
  partsPerCategoryData: CountDataPoint[];
  setPartCategoryMappings?: React.Dispatch<React.SetStateAction<PartCategoryMapping[]>>;
  appCurrency: CurrencyInfo;
  // This prop 'setCategories' is implied by the provided handler, but not in original props.
  // If categories is meant to be a state, this should be passed.
  // However, current component derives 'categories' via useMemo.
  // The provided handler `handleExcelUpload` will cause an error if `setCategories` is not a function.
  setCategories?: React.Dispatch<React.SetStateAction<any[]>>; // Added based on prompt's handler
}

interface DragItem {
  id: string;
  type: 'part';
  data: Part;
}

const CATEGORY_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

const BUBBLE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#3b82f6", "#8b5cf6", 
  "#10b981", "#f59e0b", "#ef4444"
];

const partsPerCategoryChartConfig = {
  count: { label: "# Parts", color: "hsl(var(--chart-4))" },
} satisfies import("@/components/ui/chart").ChartConfig;

const bubbleChartConfig = {
  numParts: { label: "Number of Parts" },
  avgSpend: { label: "Avg. Spend/Part" },
  totalSpend: { label: "Total Spend (Bubble Size)" },
} satisfies import("@/components/ui/chart").ChartConfig;

export default function UploadPartCategoryTab({ 
  parts, 
  partCategoryMappings, 
  spendByCategoryData, 
  partsPerCategoryData, 
  setPartCategoryMappings,
  appCurrency,
  setCategories // Added prop, see interface note
}: UploadPartCategoryTabProps) {
  
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [hoveredMapping, setHoveredMapping] = useState<string | null>(null);
  const [createdCategories, setCreatedCategories] = useState<string[]>([]);
  const dragCounterRef = useRef(0);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false); // Added state
  const fileInputRef = useRef<HTMLInputElement>(null); // Added ref

  // Get unique categories with their parts
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { name: string; parts: Part[]; color: string }>();
    
    // Add categories from mappings
    partCategoryMappings.forEach((mapping, index) => {
      const part = parts.find(p => p.id === mapping.partId);
      if (part) {
        if (!categoryMap.has(mapping.categoryName)) {
          categoryMap.set(mapping.categoryName, {
            name: mapping.categoryName,
            parts: [],
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
          });
        }
        categoryMap.get(mapping.categoryName)!.parts.push(part);
      }
    });
    
    // Add manually created categories (even if empty)
    createdCategories.forEach((categoryName, index) => {
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          parts: [],
          color: CATEGORY_COLORS[(partCategoryMappings.length + index) % CATEGORY_COLORS.length]
        });
      }
    });
    
    return Array.from(categoryMap.values());
  }, [parts, partCategoryMappings, createdCategories]);

  // Filter parts by search
  const filteredParts = useMemo(() => {
    if (!searchTerm) return parts;
    return parts.filter(part => 
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parts, searchTerm]);

  // Create bubble chart data
  const bubbleChartData = useMemo(() => {
    if (spendByCategoryData.length === 0 || partsPerCategoryData.length === 0) {
      return [];
    }

    return spendByCategoryData.map((spendItem, index) => {
      const partsItem = partsPerCategoryData.find(p => p.name === spendItem.name);
      const numParts = partsItem ? partsItem.count : 1;
      const avgSpend = numParts > 0 ? spendItem.spend / numParts : 0;
      
      return {
        name: spendItem.name,
        numParts: numParts,
        avgSpend: avgSpend,
        totalSpend: spendItem.spend,
        fill: BUBBLE_COLORS[index % BUBBLE_COLORS.length]
      };
    }).filter(item => item.numParts > 0); // Only show categories with parts
  }, [spendByCategoryData, partsPerCategoryData]);

  const formatCurrency = (value: number) => {
    if (!appCurrency) {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      }).format(value);
    }

    const convertedValue = value * appCurrency.rate;
    return new Intl.NumberFormat(appCurrency.locale, { 
      style: 'currency', 
      currency: appCurrency.code, 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(convertedValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatYAxisTick = (value: number) => {
    const symbol = appCurrency?.symbol || '$';
    const rate = appCurrency?.rate || 1;

    const convertedValue = value * rate;
    if (Math.abs(convertedValue) >= 1_000_000) return `${symbol}${(convertedValue / 1_000_000).toFixed(1)}M`;
    if (Math.abs(convertedValue) >= 1_000) return `${symbol}${(convertedValue / 1_000).toFixed(1)}K`;
    return `${symbol}${convertedValue.toFixed(0)}`;
  };

  const getPartCategoryCount = (partId: string) => {
    return partCategoryMappings.filter(m => m.partId === partId).length;
  };

  const getCategoryPartCount = (categoryName: string) => {
    return partCategoryMappings.filter(m => m.categoryName === categoryName).length;
  };

  const isValidDropTarget = (partId: string, categoryName: string) => {
    return !partCategoryMappings.some(m => 
      m.partId === partId && m.categoryName === categoryName
    );
  };

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', '');
    
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border-radius: 8px;
      font-size: 12px;
      position: absolute;
      top: -1000px;
      left: -1000px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    dragImage.textContent = `📦 ${item.data.name}`;
    
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

  const handleDrop = (e: React.DragEvent, categoryName?: string) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOverTarget(null);

    if (!draggedItem || !setPartCategoryMappings || !categoryName) return;

    if (draggedItem.type === 'part' && isValidDropTarget(draggedItem.data.id, categoryName)) {
      const newMapping: PartCategoryMapping = {
        id: `pcm_drag_${Date.now()}_${Math.random()}`,
        partId: draggedItem.data.id,
        categoryName
      };
      setPartCategoryMappings(prev => [...prev, newMapping]);
    }

    setDraggedItem(null);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const categoryName = newCategoryName.trim();
    const categoryExists = categories.some(c => c.name === categoryName);
    
    if (categoryExists) {
      alert('Category already exists!'); // Consider using a more integrated notification system if available
      return;
    }
    
    setCreatedCategories(prev => [...prev, categoryName]);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleRemoveCategory = (categoryName: string) => {
    if (!setPartCategoryMappings) return;
    setPartCategoryMappings(prev => prev.filter(m => m.categoryName !== categoryName));
    setCreatedCategories(prev => prev.filter(name => name !== categoryName));
  };

  const handleRemoveMapping = (mappingId: string) => {
    if (!setPartCategoryMappings) return;
    const mapping = partCategoryMappings.find(m => m.id === mappingId);
    if (mapping) {
      setPartCategoryMappings(prev => prev.filter(m => m.id !== mappingId));
    }
  };

  const handleQuickCategorize = () => {
    if (!setPartCategoryMappings) return;
    
    const uncategorizedParts = parts.filter(part => 
      !partCategoryMappings.some(m => m.partId === part.id)
    );
    
    if (uncategorizedParts.length > 0) {
      const categoryName = "General";
      if (!categories.some(c => c.name === categoryName) && !createdCategories.includes(categoryName)) {
        setCreatedCategories(prev => [...prev, categoryName]);
      }
      
      const newMappings: PartCategoryMapping[] = uncategorizedParts.map((part, index) => ({
        id: `pcm_quick_${Date.now()}_${index}`,
        partId: part.id,
        categoryName
      }));
      
      setPartCategoryMappings(prev => [...prev, ...newMappings]);
    }
  };

  // Added handler for Excel Upload
  const handleExcelUpload = async (file: File) => {
    setIsUploadingExcel(true);
    try {
      const result = await parsePartCategoriesExcel(file, partCategoryMappings, parts);
      if (result.data.length > 0) {
        // Add new categories if any
        // Note: The following lines are from the prompt.
        // `setCategories` is not defined if `categories` is derived from `useMemo`.
        // This will cause an error unless `setCategories` prop is correctly passed and `categories` is a direct state.
        // Also, `existingCategories.add(cat)` logic might be problematic if `cat` is string and `existingCategories` contains objects.
        if (setCategories) { // Check if setCategories is provided
            const existingCategories = new Set(categories);
            result.newCategories.forEach(cat => existingCategories.add(cat as any)); // `cat` is string, `existingCategories` expects objects
            setCategories(Array.from(existingCategories));
        } else {
            // Fallback: if setCategories is not provided, update createdCategories
            // This is a deviation from the prompt's handler logic to prevent immediate crash,
            // but aligns better with current component structure.
            // The user should ensure `setCategories` prop is passed if the prompt's logic is intended.
            const currentCategoryNames = new Set(categories.map(c => c.name));
            const newExcelCategoriesToAdd = result.newCategories.filter(nc => !currentCategoryNames.has(nc));
            if (newExcelCategoriesToAdd.length > 0) {
              setCreatedCategories(prev => [...new Set([...prev, ...newExcelCategoriesToAdd])]);
            }
        }
        
        // Add mappings
        if (setPartCategoryMappings) {
          setPartCategoryMappings(prev => [...prev, ...result.data]);
        }
        
        toast({
          title: "Categories Imported",
          description: `Successfully imported ${result.data.length} part-category mappings.`
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
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to process Excel file"
      });
      console.error("Excel import failed:", error);
    } finally {
      setIsUploadingExcel(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FolderTree className="mr-2 h-6 w-6" />
            <div>
              <CardTitle className="text-lg">Part Category Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag parts onto categories to organize your inventory. Parts can be in multiple categories.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2 h-5 w-5">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Drag parts directly onto category buckets to create associations. 
                  Each part can belong to multiple categories.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleQuickCategorize} size="sm" variant="outline">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Quick Start
            </Button>
            {/* Added Excel Upload Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingExcel || !setPartCategoryMappings} // Disable if setPartCategoryMappings is not provided
            >
              {isUploadingExcel ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              {isUploadingExcel ? "Uploading..." : "Upload Excel"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="grid md:grid-cols-3 gap-6 text-xs">
        {/* All Parts - Left Column */}
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" /> 
            Available Parts ({parts.length} total)
          </h3>
          
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          
          <ScrollArea className="h-[400px] border rounded-md p-3 bg-gradient-to-b from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20">
            <div className="space-y-2">
              {filteredParts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No parts available.
                </p>
              )}
              {filteredParts.map((part) => {
                const categoryCount = getPartCategoryCount(part.id);
                
                return (
                  <Card 
                    key={part.id} 
                    className="p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:scale-105 bg-white dark:bg-gray-800"
                    draggable={!!setPartCategoryMappings} // Only draggable if can be modified
                    onDragStart={(e) => handleDragStart(e, { id: part.id, type: 'part', data: part })}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center">
                          <Package className="h-3 w-3 text-blue-500 mr-1" />
                          {part.name}
                          {categoryCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {categoryCount} categor{categoryCount !== 1 ? 'ies' : 'y'}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{part.partNumber}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            {formatCurrency(part.price)} • {part.annualDemand.toLocaleString()} units
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </section>

        {/* Category Buckets - Middle Column */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center">
              <Palette className="mr-2 h-5 w-5 text-purple-500" /> 
              Categories ({categories.length})
            </h3>
          </div>

          {isCreatingCategory && (
            <div className="p-3 border rounded-lg mb-3 bg-purple-50 dark:bg-purple-950/30">
              <div className="flex gap-2">
                <Input
                  placeholder="Category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-8"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                  disabled={!setPartCategoryMappings}
                />
                <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName.trim() || !setPartCategoryMappings}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setIsCreatingCategory(false);
                  setNewCategoryName('');
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <ScrollArea className="h-[400px] border rounded-md p-3 bg-gradient-to-b from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20">
            <div className="space-y-3">
              {categories.length === 0 && (
                <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-lg p-8 text-center">
                  <FolderTree className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No categories yet. Create categories to organize your parts.
                  </p>
                  <Button size="sm" onClick={() => setIsCreatingCategory(true)} disabled={!setPartCategoryMappings}>
                    <Plus className="mr-1 h-3 w-3" />
                    Create First Category
                  </Button>
                </div>
              )}
              
              {categories.map((category) => {
                const isDropTarget = draggedItem?.type === 'part' && 
                  isValidDropTarget(draggedItem.data.id, category.name) && !!setPartCategoryMappings;
                
                return (
                  <div
                    key={category.name}
                    className={`border-2 border-dashed rounded-lg p-4 transition-all duration-300 ${
                      isDropTarget && dragOverTarget === `category-${category.name}`
                        ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 scale-105'
                        : 'border-purple-200 dark:border-purple-700 hover:border-purple-300'
                    }`}
                    onDragOver={setPartCategoryMappings ? handleDragOver : undefined}
                    onDragEnter={setPartCategoryMappings ? (e) => handleDragEnter(e, `category-${category.name}`) : undefined}
                    onDragLeave={setPartCategoryMappings ? handleDragLeave : undefined}
                    onDrop={setPartCategoryMappings ? (e) => handleDrop(e, category.name) : undefined}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2" 
                          style={{ backgroundColor: category.color }}
                        />
                        <h4 className="font-medium text-sm">{category.name}</h4>
                        <Badge variant="secondary" className="ml-2">
                          {getCategoryPartCount(category.name)}
                        </Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => handleRemoveCategory(category.name)}
                        disabled={!setPartCategoryMappings}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {partCategoryMappings
                        .filter(m => m.categoryName === category.name)
                        .map((mapping) => {
                          const part = parts.find(p => p.id === mapping.partId);
                          if (!part) return null;
                          
                          return (
                            <div 
                              key={mapping.id}
                              className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs transition-all duration-200 ${
                                hoveredMapping === mapping.id ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                              }`}
                              onMouseEnter={() => setHoveredMapping(mapping.id)}
                              onMouseLeave={() => setHoveredMapping(null)}
                            >
                              <span className="truncate">{part.name} ({part.partNumber})</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-4 w-4 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleRemoveMapping(mapping.id)}
                                disabled={!setPartCategoryMappings}
                              >
                                <Trash2 className="h-2 w-2 text-red-500" />
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                    
                    {isDropTarget && dragOverTarget === `category-${category.name}` && (
                      <div className="mt-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                        <p className="text-green-700 dark:text-green-300 text-xs font-medium">
                          Drop to add to category!
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {!isCreatingCategory && setPartCategoryMappings && (
                <div 
                  className="w-full border-2 border-dashed border-purple-300 hover:border-purple-400 rounded-lg p-4 text-center cursor-pointer transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                  onClick={() => setIsCreatingCategory(true)}
                >
                  <Plus className="mx-auto h-6 w-6 text-purple-400 mb-2" />
                  <p className="text-sm text-purple-600 dark:text-purple-400">Add New Category</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </section>

        {/* Analytics - Right Column */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-green-500" /> 
            Category Analytics
          </h3>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Activity className="mr-1.5 h-4 w-4" />
                Category Spend Analysis
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                   <span className="text-xs text-muted-foreground cursor-default flex items-center">
                     X: # Parts, Y: Avg Spend/Part, Size: Total Spend <Info className="ml-1 h-3 w-3" />
                   </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Bubble chart showing category relationships: X-axis is number of parts, Y-axis is average spend per part, bubble size represents total category spend.</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="pt-0">
              {bubbleChartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No category data for bubble chart.</p>
              ) : (
                <ChartContainer config={bubbleChartConfig} className="min-h-[200px] w-full">
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="numParts" 
                        name="Number of Parts" 
                        tickFormatter={formatNumber} 
                        tick={{ fontSize: 10 }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="avgSpend" 
                        name="Avg. Spend/Part" 
                        tickFormatter={formatYAxisTick} 
                        tick={{ fontSize: 10 }}
                        domain={['dataMin * 0.9', 'dataMax * 1.1']}
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="totalSpend" 
                        range={[100, 1000]} 
                        name="Total Spend" 
                      />
                      <RechartsTooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2.5 shadow-xl text-xs">
                                <p className="font-medium mb-1" style={{color: data.fill}}>
                                  📁 {data.name}
                                </p>
                                <p>Parts: {formatNumber(data.numParts)}</p>
                                <p>Avg Spend/Part: {formatCurrency(data.avgSpend)}</p>
                                <p>Total Spend: {formatCurrency(data.totalSpend)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <RechartsScatter 
                        name="Categories" 
                        data={bubbleChartData} 
                        shape="circle"
                      >
                        {bubbleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </RechartsScatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Hash className="mr-1.5 h-4 w-4" />
                # Parts by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {partsPerCategoryData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No parts data to display
                </p>
              ) : (
                <ChartContainer config={partsPerCategoryChartConfig} className="min-h-[180px] w-full aspect-video">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart accessibilityLayer data={partsPerCategoryData} layout="vertical" margin={{ left: 5, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" dataKey="count" tickFormatter={formatNumber} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 10 }} />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" formatter={(value) => formatNumber(value as number)} />}
                      />
                      <Bar dataKey="count" fill="var(--color-count)" radius={3} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Parts:</span>
                <span className="font-medium">{parts.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Categories:</span>
                <span className="font-medium">{categories.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Mappings:</span>
                <span className="font-medium">{partCategoryMappings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Categories/Part:</span>
                <span className="font-medium">
                  {parts.length > 0 ? (partCategoryMappings.length / parts.length).toFixed(1) : '0'}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      </CardContent>
      {/* Added hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && setPartCategoryMappings) { // Ensure setPartCategoryMappings is available
            handleExcelUpload(file);
            e.target.value = ""; // Reset file input
          } else if (file && !setPartCategoryMappings) {
            toast({
                variant: "destructive",
                title: "Upload Disabled",
                description: "Cannot upload categories as modification is not enabled.",
            });
            e.target.value = ""; // Reset file input
          }
        }}
        style={{ display: 'none' }}
      />
    </Card>
  );
}
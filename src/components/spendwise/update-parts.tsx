"use client";
//test sravya again test
import type { Part, Supplier, PartSupplierAssociation, PartCategoryMapping } from '@/types/spendwise';
// importing type { SpendDataPoint } from '@/app/page'; // SpendDataPoint not used here anymore
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Package, Info, Trash2, Sigma, PlusCircle, Focus, X, TrendingUp, BarChart3, BadgeDollarSign, Boxes, Users2, Tag, ShoppingCart, Banknote, FileSpreadsheet, Loader2, Search, Filter, TrendingDown, Minus, Database, ChevronDown, Edit3, Check } from "lucide-react"; 
// Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip as RechartsTooltip removed as chart is removed
// ChartContainer, ChartTooltip, ChartTooltipContent removed as chart is removed
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import type { CurrencyInfo } from '@/lib/currencyConfig';
import { parsePartsExcel } from './excel-parser'; // Added import
import { useToast } from "@/hooks/use-toast"; // Assuming toast is from here
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UpdatePartsTabProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  onAddPart: () => void;
  partsWithSpend: (Part & { annualSpend: number })[];
  suppliers: Supplier[];
  partSupplierAssociations: PartSupplierAssociation[];
  partCategoryMappings: PartCategoryMapping[];
  calculateSpendForSummary: (
    part: Part,
    currentTariffChargePercent: number,
    currentTotalLogisticsCostPercent: number,
    localSuppliers: Supplier[],
    localPartSupplierAssociations: PartSupplierAssociation[],
    localHomeCountry: string
  ) => number;
  homeCountry: string;
  tariffChargePercent: number;
  totalLogisticsCostPercent: number;
  appCurrency: CurrencyInfo;
}

// A small, reusable component for the ABC category indicator
const AbcIndicator = ({ category }: { category: 'A' | 'B' | 'C' | 'N/A' }) => {
  if (category === 'N/A') return null;
  return (
    <div
      className={`inline-block px-2 py-1 rounded text-xs font-bold ${
        category === 'A'
          ? 'bg-red-600/20 text-red-400 border border-red-600/30'
          : category === 'B'
          ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
          : 'bg-green-600/20 text-green-400 border border-green-600/30'
      }`}
    >
      {category}
    </div>
  );
};


interface Part360Details extends Part {
  categories: string[];
  abcClass: 'A' | 'B' | 'C' | 'N/A';
  supplierCount: number;
  associatedSuppliers: { id: string; supplierId: string; name: string }[];
  currentSpend: number;
}

export default function UpdatePartsTab({
  parts,
  setParts,
  onAddPart,
  partsWithSpend,
  suppliers,
  partSupplierAssociations,
  partCategoryMappings,
  calculateSpendForSummary,
  homeCountry,
  tariffChargePercent,
  totalLogisticsCostPercent,
  appCurrency,
}: UpdatePartsTabProps) {

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editedPart, setEditedPart] = useState<Partial<Part> | null>(null);
  const [isPart360Open, setIsPart360Open] = useState(false);
  const [part360Details, setPart360Details] = useState<Part360Details | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedABCCategory, setSelectedABCCategory] = useState<'A' | 'B' | 'C' | 'All'>('All');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number, decimals = 0) => {
    const convertedValue = value * appCurrency.rate;
    return new Intl.NumberFormat(appCurrency.locale, { 
      style: 'currency', 
      currency: appCurrency.code, 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    }).format(convertedValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleDeletePart = (partId: string) => {
    setParts(prevParts => prevParts.filter(p => p.id !== partId));
    if (selectedPartId === partId) {
      setSelectedPartId(null);
      setIsPart360Open(false);
      setPart360Details(null);
    }
  };
  const handleEditPart = (part: Part) => {
    setEditingPartId(part.id);
    setEditedPart({ ...part });
  };
  const handleSavePart = () => {
    if (!editedPart || !editingPartId) return;

    setParts(prevParts =>
      prevParts.map(p =>
        p.id === editingPartId ? { ...p, ...editedPart } : p
      )
    );
    setEditingPartId(null);
    setEditedPart(null);
  };

  const handleCancelEdit = () => {
    setEditingPartId(null);
    setEditedPart(null);
  };
  const handleExcelUpload = async (file: File) => {
    setIsUploadingExcel(true);
    try {
      const result = await parsePartsExcel(file, parts);
      if (result.data.length > 0) {
        setParts(prev => [...prev, ...result.data]);
        toast({
          title: "Parts Imported",
          description: `Successfully imported ${result.data.length} parts from Excel.`
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
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const individualPartAbcClasses = useMemo(() => {
    if (partsWithSpend.length === 0) return {};
    const sortedParts = [...partsWithSpend].sort((a, b) => b.annualSpend - a.annualSpend);
    const totalSpendAll = sortedParts.reduce((sum, p) => sum + p.annualSpend, 0);
    if (totalSpendAll === 0) return {};

    const classifications: { [partId: string]: 'A' | 'B' | 'C' } = {};
    let cumulativeSpend = 0;
    for (const part of sortedParts) {
      cumulativeSpend += part.annualSpend;
      const cumulativePercent = cumulativeSpend / totalSpendAll;
      if (cumulativePercent <= 0.80) {
        classifications[part.id] = 'A';
      } else if (cumulativePercent <= 0.95) {
        classifications[part.id] = 'B';
      } else {
        classifications[part.id] = 'C';
      }
    }
    return classifications;
  }, [partsWithSpend]);

  const abcClassSummary = useMemo(() => {
    const summary = {
      A: { count: 0, spend: 0, percentage: 0 },
      B: { count: 0, spend: 0, percentage: 0 },
      C: { count: 0, spend: 0, percentage: 0 },
      All: { count: 0, spend: 0, percentage: 100 }
    };
    
    const grandTotal = partsWithSpend.reduce((sum, p) => sum + p.annualSpend, 0);
    
    partsWithSpend.forEach(part => {
      const abcClass = individualPartAbcClasses[part.id];
      if (abcClass) {
        summary[abcClass].count++;
        summary[abcClass].spend += part.annualSpend;
        summary.All.count++;
        summary.All.spend += part.annualSpend;
      }
    });

    // Calculate percentages
    if (grandTotal > 0) {
      summary.A.percentage = (summary.A.spend / grandTotal) * 100;
      summary.B.percentage = (summary.B.spend / grandTotal) * 100;
      summary.C.percentage = (summary.C.spend / grandTotal) * 100;
    }

    return summary;
  }, [partsWithSpend, individualPartAbcClasses]);

  // Filter and sort parts based on search and ABC category
  const filteredParts = useMemo(() => {
    const filtered = parts.filter(part => {
      // Search filter
      const matchesSearch = part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.name.toLowerCase().includes(searchTerm.toLowerCase());

      // ABC category filter
      const partAbcClass = individualPartAbcClasses[part.id];
      const matchesABC = selectedABCCategory === 'All' || partAbcClass === selectedABCCategory;

      return matchesSearch && matchesABC;
    });

    // Sort by ABC Category alphabetically
    filtered.sort((a, b) => {
      const abcA = individualPartAbcClasses[a.id] || 'Z'; // Default to 'Z' to sort unclassified parts last
      const abcB = individualPartAbcClasses[b.id] || 'Z';
      return abcA.localeCompare(abcB);
    });

    return filtered;
  }, [parts, searchTerm, selectedABCCategory, individualPartAbcClasses]);


  useEffect(() => {
    if (selectedPartId) {
      const partData = parts.find(p => p.id === selectedPartId);
      if (partData) {
        const categories = partCategoryMappings
          .filter(pcm => pcm.partId === selectedPartId)
          .map(pcm => pcm.categoryName);
        
        const associatedSuppliersList = partSupplierAssociations
          .filter(psa => psa.partId === selectedPartId)
          .map(psa => {
            const supplier = suppliers.find(s => s.id === psa.supplierId);
            return supplier ? { id: supplier.id, supplierId: supplier.supplierId, name: supplier.name } : null;
          })
          .filter(s => s !== null) as { id: string; supplierId: string; name: string }[];

        const currentSpend = calculateSpendForSummary(
            partData,
            tariffChargePercent,
            totalLogisticsCostPercent,
            suppliers,
            partSupplierAssociations,
            homeCountry
        );

        setPart360Details({
          ...partData,
          categories,
          abcClass: individualPartAbcClasses[selectedPartId] || 'N/A',
          supplierCount: associatedSuppliersList.length,
          associatedSuppliers: associatedSuppliersList,
          currentSpend,
        });
        setIsPart360Open(true);
      }
    } else {
      setIsPart360Open(false);
      setPart360Details(null);
    }
  }, [selectedPartId, parts, partCategoryMappings, partSupplierAssociations, suppliers, individualPartAbcClasses, calculateSpendForSummary, homeCountry, tariffChargePercent, totalLogisticsCostPercent]);

  const totalPartsCount = useMemo(() => parts.length, [parts]);
  const totalSpend = useMemo(() => partsWithSpend.reduce((sum, p) => sum + p.annualSpend, 0), [partsWithSpend]);
  const totalVolume = useMemo(() => parts.reduce((sum, p) => sum + p.annualDemand, 0), [parts]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">1A - Add/Update/Select Part</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">Manage parts, pricing, and demand. Select a part to view its Part360 details.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Add, update, and manage your parts inventory</CardDescription>
            </div>
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Data
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Data Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onAddPart}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Part
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Excel Operations</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import from Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleExcelUpload(file);
                    e.target.value = ""; 
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* ABC Analysis Classification Tabs - Compact */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 p-1 bg-slate-800 rounded-lg">
              {(['All', 'A', 'B', 'C'] as const).map((category) => {
                const stats = abcClassSummary[category]
                const isSelected = selectedABCCategory === category

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedABCCategory(category)}
                    className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 ${isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        {category === 'All' && <Filter className="h-3.5 w-3.5" />}
                        {category === 'A' && <TrendingUp className="h-3.5 w-3.5 text-red-400" />}
                        {category === 'B' && <Minus className="h-3.5 w-3.5 text-yellow-400" />}
                        {category === 'C' && <TrendingDown className="h-3.5 w-3.5 text-green-400" />}
                        <span className="font-bold text-sm">
                          {category === 'All' ? 'All' : `Category ${category}`}
                        </span>
                      </div>

                      <div className="text-xs space-y-0.5">
                        <div className={`font-medium ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>
                          {stats.count} Parts
                        </div>
                        <div className={`font-bold text-sm ${isSelected ? 'text-white' :
                          category === 'A' ? 'text-red-400' :
                            category === 'B' ? 'text-yellow-400' :
                              category === 'C' ? 'text-green-400' : 'text-blue-400'
                          }`}>
                          {formatCurrency(stats.spend)}
                        </div>
                        <div className={`text-xs h-4 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                          {category !== 'All' ? `${stats.percentage.toFixed(1)}%` : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Category Descriptions - Compact */}
            {selectedABCCategory !== 'All' && (
              <div className="mt-2 p-2 bg-slate-800/50 rounded-md border border-slate-700">
                <div className="flex items-center gap-2">
                  {selectedABCCategory === 'A' && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold text-red-400">Category A:</span> Critical items (70-80% value, 10-20% items) - Tight control required
                      </div>
                    </>
                  )}
                  {selectedABCCategory === 'B' && (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold text-yellow-400">Category B:</span> Moderate items (15-20% value, 20-30% items) - Periodic review
                      </div>
                    </>
                  )}
                  {selectedABCCategory === 'C' && (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold text-green-400">Category C:</span> Low value items (5-10% value, 50-70% items) - Simple controls
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by part number, name, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Active Filters Indicator */}
              {(selectedABCCategory !== 'All' || searchTerm) && (
                <div className="flex items-center gap-2">
                  {selectedABCCategory !== 'All' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <span>Category {selectedABCCategory}</span>
                      <button
                        onClick={() => setSelectedABCCategory('All')}
                        className="ml-1 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      <span>Search</span>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-1 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <span className="text-sm text-slate-400">
                   {filteredParts.length} of {parts.length} parts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Parts Table */}
          <div className="space-y-3 text-xs">
          <Table className="border rounded-lg">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Part #</TableHead>
                  <TableHead className="text-left">Part Name</TableHead>
                  <TableHead className="text-right">Base Cost</TableHead>
                  <TableHead className="text-right">Annual Volume</TableHead>
                  <TableHead className="text-right">Freight & OHD %</TableHead>
                  <TableHead className="text-center">ABC Category</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const abcClass = individualPartAbcClasses[part.id];
                  const isEditing = editingPartId === part.id;
                  return (
                    <TableRow key={part.id}>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editedPart?.partNumber ?? ''}
                            onChange={(e) => setEditedPart({ ...editedPart, partNumber: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <span className="font-mono text-blue-400 hover:text-blue-300 transition-colors duration-200 truncate block w-full">
                            {part.partNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editedPart?.name ?? ''}
                            onChange={(e) => setEditedPart({ ...editedPart, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          part.name
                        )}
                      </TableCell>
                       <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editedPart?.price ?? ''}
                                onChange={(e) => setEditedPart({ ...editedPart, price: parseFloat(e.target.value) || 0 })}
                                className="h-8 text-right"
                              />
                            ) : (
                              <span className="text-green-400 font-bold">
                                {formatCurrency(part.price, 2)}
                              </span>
                            )}
                          </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedPart?.annualDemand ?? ''}
                            onChange={(e) => setEditedPart({ ...editedPart, annualDemand: parseInt(e.target.value) || 0 })}
                            className="h-8 text-right"
                          />
                        ) : (
                          part.annualDemand
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedPart?.freightOhdCost ?? ''}
                            onChange={(e) => setEditedPart({ ...editedPart, freightOhdCost: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right"
                          />
                        ) : (
                          part.freightOhdCost
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <AbcIndicator category={abcClass || 'N/A'} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSavePart}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditPart(part)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePart(part.id)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                aria-label="Delete Part"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Sheet open={isPart360Open} onOpenChange={setIsPart360Open}>
        <SheetContent className="sm:max-w-md w-full p-0">
          {part360Details && (
            <>
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5 text-primary" />
                  Part360: {part360Details.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Part No: {part360Details.partNumber} <span className="mx-1">|</span> ID: {part360Details.id}
                </SheetDescription>
                 <SheetClose className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </SheetClose>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)]">
                <div className="p-4 space-y-4 text-sm">
                  <Card>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium flex items-center"><Banknote className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Financials</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>Base Price:</div><div className="font-medium text-right">{formatCurrency(part360Details.price, 2)}</div>
                      <div>Current Spend:</div><div className="font-medium text-right">{formatCurrency(part360Details.currentSpend)}</div>
                      <div>Freight & OHD:</div><div className="font-medium text-right">{(part360Details.freightOhdCost * 100).toFixed(2)}%</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium flex items-center"><ShoppingCart className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Demand & Classification</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                       <div>Annual Volume:</div><div className="font-medium text-right">{formatNumber(part360Details.annualDemand)} units</div>
                       <div>ABC Category:</div>
                       <div className="font-medium text-right">
                         <AbcIndicator category={part360Details.abcClass} />
                        </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium flex items-center"><Boxes className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Categories</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 text-xs">
                      {part360Details.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {part360Details.categories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Not categorized.</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium flex items-center"><Users2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>Suppliers ({part360Details.supplierCount})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 text-xs">
                      {part360Details.associatedSuppliers.length > 0 ? (
                        <ul className="space-y-1">
                          {part360Details.associatedSuppliers.map(sup => (
                            <li key={sup.id} className="flex justify-between items-center p-1 bg-muted/50 rounded text-2xs">
                                <span>{sup.name}</span>
                                <Badge variant="outline" className="font-mono text-2xs">{sup.supplierId}</Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No suppliers associated.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
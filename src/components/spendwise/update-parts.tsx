
"use client";

import type { Part, Supplier, PartSupplierAssociation, PartCategoryMapping } from '@/types/spendwise';
// import type { SpendDataPoint } from '@/app/page'; // SpendDataPoint not used here anymore
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Package, Info, Trash2, Sigma, PlusCircle, Focus, X, TrendingUp, BarChart3, BadgeDollarSign, Boxes, Users2, Tag, ShoppingCart, Banknote } from "lucide-react"; 
// Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip as RechartsTooltip removed as chart is removed
// ChartContainer, ChartTooltip, ChartTooltipContent removed as chart is removed
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import type { CurrencyInfo } from '@/lib/currencyConfig';

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

const ABC_COLORS = {
  A: "hsl(var(--chart-1))", 
  B: "hsl(var(--chart-2))", 
  C: "hsl(var(--chart-3))", 
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
  const [isPart360Open, setIsPart360Open] = useState(false);
  const [part360Details, setPart360Details] = useState<Part360Details | null>(null);

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

  const formatPriceForInput = (value: number): string => {
    const fixedValue = value.toFixed(2);
    const priceParts = fixedValue.split('.');
    const integerPartFormatted = new Intl.NumberFormat('en-US').format(parseInt(priceParts[0], 10));
    return `${integerPartFormatted}.${priceParts[1]}`;
  };

  const handlePartInputChange = (partId: string, field: keyof Part, value: string | number) => {
    setParts(prevParts =>
      prevParts.map(p => {
        if (p.id === partId) {
          let processedValue = value;
          if (field === 'price') {
            const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
            processedValue = isNaN(numericValue) ? 0 : parseFloat(numericValue.toFixed(2));
          } else if (field === 'annualDemand') {
            const numericValue = typeof value === 'string' ? parseInt(String(value).replace(/,/g, ''), 10) : parseInt(String(value), 10);
            processedValue = isNaN(numericValue) ? 0 : numericValue;
          } else if (field === 'freightOhdCost') {
            const numericValue = typeof value === 'string' ? parseFloat(value) / 100 : Number(value) / 100;
             processedValue = (isNaN(numericValue) || numericValue < 0) ? 0 : Math.min(numericValue, 1);
          }
          return { ...p, [field]: processedValue };
        }
        return p;
      })
    );
  };
  
  const handlePriceChange = (partId: string, rawValue: string) => {
    handlePartInputChange(partId, 'price', rawValue);
  };

  const handleAnnualDemandChange = (partId: string, rawValue: string) => {
    const cleanedValue = rawValue.replace(/,/g, '');
    if (cleanedValue === '') {
      handlePartInputChange(partId, 'annualDemand', 0);
      return;
    }
    const numericValue = parseInt(cleanedValue, 10);
    if (!isNaN(numericValue)) {
      handlePartInputChange(partId, 'annualDemand', numericValue);
    }
  };

  const handlePartNameChange = (partId: string, value: string) => {
     setParts(prevParts =>
      prevParts.map(p => p.id === partId ? { ...p, name: value } : p)
    );
  };

  const handleDeletePart = (partId: string) => {
    setParts(prevParts => prevParts.filter(p => p.id !== partId));
    if (selectedPartId === partId) {
      setSelectedPartId(null);
      setIsPart360Open(false);
      setPart360Details(null);
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
      A: { count: 0, spend: 0 },
      B: { count: 0, spend: 0 },
      C: { count: 0, spend: 0 },
    };
    partsWithSpend.forEach(part => {
      const abcClass = individualPartAbcClasses[part.id];
      if (abcClass) {
        summary[abcClass].count++;
        summary[abcClass].spend += part.annualSpend;
      }
    });
    return summary;
  }, [partsWithSpend, individualPartAbcClasses]);


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
    <div className="flex">
      <Card className="flex-grow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              <CardTitle className="text-lg whitespace-nowrap">1A - Add/Update/Select Part</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2 h-5 w-5">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">Manage parts, pricing, and demand. Select a part to view its Part360 details.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              {['A', 'B', 'C'].map((className) => {
                const classData = abcClassSummary[className as 'A' | 'B' | 'C'];
                return (
                  <Badge key={className} variant="outline" className="px-2 py-1 h-auto text-xs" style={{borderColor: ABC_COLORS[className as 'A' | 'B' | 'C']}}>
                    Class {className}: {classData.count} Parts, {formatCurrency(classData.spend)}
                  </Badge>
                );
              })}
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0 self-start sm:self-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onAddPart} size="icon" aria-label="Add New Part">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add New Part</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Part Spend Analysis Chart Card Removed */}

          <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
            <div className="w-10"> {/* Spacer for radio */} </div>
            <div className="w-24 flex-shrink-0">Part #</div>
            <div className="flex-1 min-w-[120px]">Part Name</div>
            <div className="w-24 text-right">Base Cost</div>
            <div className="w-28 text-right">Annual Volume</div>
            <div className="w-28 text-right">Freight & OHD %</div>
            <div className="w-10"> {/* Spacer for delete */} </div>
          </div>

          {parts.length === 0 ? (
            <p className="text-muted-foreground text-center py-3">No parts available. Generate, add, or upload some parts.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)]"> {/* Adjusted height calculation after chart removal */}
              <RadioGroup value={selectedPartId || undefined} onValueChange={setSelectedPartId} className="space-y-2 pr-2">
                {parts.map((part) => (
                  <div key={part.id} className="flex items-center gap-2 p-2.5 rounded-md border bg-card shadow-sm hover:shadow-md transition-shadow">
                    <RadioGroupItem value={part.id} id={`part-${part.id}`} className="h-5 w-5" />

                    <div className="w-24 flex-shrink-0 font-mono text-xs truncate" title={part.partNumber}>
                      {part.partNumber}
                    </div>

                    <Input
                      type="text"
                      value={part.name}
                      onChange={(e) => handlePartNameChange(part.id, e.target.value)}
                      className="h-8 text-xs flex-1 min-w-[120px]"
                      placeholder="Part Name"
                    />
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{appCurrency.symbol}</span>
                      <Input
                        type="text"
                        value={formatPriceForInput(part.price)}
                        onChange={(e) => handlePriceChange(part.id, e.target.value)}
                        className="h-8 text-xs pl-5 text-right"
                        placeholder="0.00"
                      />
                    </div>
                     <Input
                        type="text"
                        value={formatNumber(part.annualDemand)}
                        onChange={(e) => handleAnnualDemandChange(part.id, e.target.value)}
                        className="h-8 text-xs w-28 text-right"
                        placeholder="0"
                      />
                     <div className="relative w-28">
                      <Input
                        type="number"
                        value={parseFloat((part.freightOhdCost * 100).toFixed(2))}
                        onChange={(e) => handlePartInputChange(part.id, 'freightOhdCost', e.target.value)}
                        className="h-8 text-xs pr-5 text-right"
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeletePart(part.id)} aria-label="Delete Part">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            </ScrollArea>
          )}
          <div className="mt-4 p-3 border rounded-md bg-muted/50">
            <h4 className="text-sm font-semibold mb-2 flex items-center"><Sigma className="h-4 w-4 mr-1.5"/>Summary</h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Total # Parts:</p>
                <p className="font-medium">{formatNumber(totalPartsCount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Spend:</p>
                <p className="font-medium">{formatCurrency(totalSpend)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Volume:</p>
                <p className="font-medium">{formatNumber(totalVolume)}</p>
              </div>
            </div>
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
                       <div>ABC Class:</div>
                       <div className="font-medium text-right">
                         <Badge variant="outline" style={{borderColor: ABC_COLORS[part360Details.abcClass as 'A'|'B'|'C'] || 'grey'}}>
                            {part360Details.abcClass}
                         </Badge>
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

    

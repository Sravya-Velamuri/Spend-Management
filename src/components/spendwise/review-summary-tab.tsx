
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Part, Supplier, PartCategoryMapping, PartSupplierAssociation } from '@/types/spendwise';
import type { SpendDataPoint, DemandDataPoint } from '@/app/page'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarChart3, DollarSign, Package, Users, FolderTree, TrendingUp, ShoppingCart, Filter as FilterIcon, XCircle, Search } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { CurrencyInfo } from '@/lib/currencyConfig';

const LOCAL_STORAGE_SCENARIO_LIST_KEY = "spendwise_scenario_list_v2";
const LOCAL_STORAGE_SCENARIO_DATA_PREFIX = "spendwise_scenario_data_v2_";
const VIEW_CURRENT_DATA_VALUE = "__VIEW_CURRENT_DATA__"; // For scenario loading
const ALL_FILTER_VALUE = "__ALL__"; // Represents 'All' in filter dropdowns

interface SavedScenario {
  name: string;
  description: string;
  analysisHomeCountry: string;
  globalTariffAdjustmentPoints: number;
  globalLogisticsAdjustmentPoints: number;
  activeCategoryAdjustments: { categoryName: string; costAdjustmentPercent: number }[];
  activeCountryTariffAdjustments: { countryName: string; tariffAdjustmentPoints: number }[];
  activeDemandAdjustments: { id: string; type: 'global' | 'category' | 'part'; targetName?: string; targetId?: string; adjustmentPercent: number }[];
}

interface ReviewSummaryTabProps {
  parts: Part[];
  suppliers: Supplier[];
  partCategoryMappings: PartCategoryMapping[];
  partSupplierAssociations: PartSupplierAssociation[];
  partsWithSpend: (Part & { annualSpend: number })[]; 
  defaultAnalysisHomeCountry: string;
  originalTariffMultiplierPercent: number;
  originalTotalLogisticsCostPercent: number;
  totalAnnualSpend: number; 
  totalParts: number; 
  totalSuppliers: number; 
  totalCategories: number; 
  appCurrency: CurrencyInfo;
}

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ReviewSummaryTab({
  parts: allParts, 
  suppliers: allSuppliers,
  partCategoryMappings: allPartCategoryMappings,
  partSupplierAssociations: allPartSupplierAssociations,
  partsWithSpend: allPartsWithSpend, 
  defaultAnalysisHomeCountry,
  originalTariffMultiplierPercent,
  originalTotalLogisticsCostPercent,
  totalAnnualSpend: overallTotalAnnualSpend,
  totalParts: overallTotalParts,
  totalSuppliers: overallTotalSuppliers,
  totalCategories: overallTotalCategories,
  appCurrency
}: ReviewSummaryTabProps) {

  const [selectedScenarioName, setSelectedScenarioName] = useState<string>(VIEW_CURRENT_DATA_VALUE);
  const [loadedScenario, setLoadedScenario] = useState<SavedScenario | null>(null);
  const [savedScenarioNames, setSavedScenarioNames] = useState<string[]>([]);

  const [filterSelectedPartId, setFilterSelectedPartId] = useState<string>(ALL_FILTER_VALUE);
  const [filterSelectedSupplierId, setFilterSelectedSupplierId] = useState<string>(ALL_FILTER_VALUE);
  const [filterSelectedCategory, setFilterSelectedCategory] = useState<string>(ALL_FILTER_VALUE);

  const uniqueCategoriesForFilter = useMemo(() => Array.from(new Set(allPartCategoryMappings.map(pcm => pcm.categoryName))).sort(), [allPartCategoryMappings]);
  const partsForFilterDropdown = useMemo(() => allParts.map(p => ({ value: p.id, label: `${p.partNumber} - ${p.name}` })).sort((a,b) => a.label.localeCompare(b.label)), [allParts]);
  const suppliersForFilterDropdown = useMemo(() => allSuppliers.map(s => ({ value: s.id, label: `${s.supplierId} - ${s.name}` })).sort((a,b) => a.label.localeCompare(b.label)), [allSuppliers]);


  useEffect(() => {
    const storedNames = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_SCENARIO_LIST_KEY) : null;
    if (storedNames) {
      try {
        const parsedNames = JSON.parse(storedNames);
        if (Array.isArray(parsedNames)) {
          setSavedScenarioNames(parsedNames.filter(name => typeof name === 'string' && name.trim() !== ""));
        }
      } catch (e) {
        console.error("Failed to parse saved scenario names from localStorage in ReviewSummaryTab", e);
        setSavedScenarioNames([]);
      }
    }
  }, []);

  const handleLoadScenario = (scenarioName: string) => {
    if (scenarioName === VIEW_CURRENT_DATA_VALUE) {
      setLoadedScenario(null);
      setSelectedScenarioName(VIEW_CURRENT_DATA_VALUE);
      return;
    }
    if (typeof window === 'undefined') {
        setLoadedScenario(null);
        setSelectedScenarioName(VIEW_CURRENT_DATA_VALUE);
        return;
    }
    const scenarioDataString = localStorage.getItem(LOCAL_STORAGE_SCENARIO_DATA_PREFIX + scenarioName);
    if (scenarioDataString) {
      const scenarioData: SavedScenario = JSON.parse(scenarioDataString);
      setLoadedScenario(scenarioData);
      setSelectedScenarioName(scenarioName);
    } else {
      setLoadedScenario(null);
      setSelectedScenarioName(VIEW_CURRENT_DATA_VALUE);
    }
  };

  const formatCurrency = (value: number, decimals = 0) => {
    const convertedValue = value * appCurrency.rate;
    return new Intl.NumberFormat(appCurrency.locale, { 
      style: 'currency', 
      currency: appCurrency.code, 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    }).format(convertedValue);
  };

  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

  const filteredAndCalculatedParts = useMemo(() => {
    let tempFilteredParts = [...allParts];

    if (filterSelectedPartId !== ALL_FILTER_VALUE) {
      tempFilteredParts = tempFilteredParts.filter(p => p.id === filterSelectedPartId);
    }

    if (filterSelectedCategory !== ALL_FILTER_VALUE) {
      const partsInCategory = new Set(allPartCategoryMappings
        .filter(pcm => pcm.categoryName === filterSelectedCategory)
        .map(pcm => pcm.partId)
      );
      tempFilteredParts = tempFilteredParts.filter(p => partsInCategory.has(p.id));
    }

    if (filterSelectedSupplierId !== ALL_FILTER_VALUE) {
      const partsForSupplier = new Set(allPartSupplierAssociations
        .filter(psa => psa.supplierId === filterSelectedSupplierId)
        .map(psa => psa.partId)
      );
      tempFilteredParts = tempFilteredParts.filter(p => partsForSupplier.has(p.id));
    }
    
    return tempFilteredParts.map(part => {
      const partWithOriginalSpend = allPartsWithSpend.find(pws => pws.id === part.id);
      return {
        ...part,
        annualSpend: partWithOriginalSpend ? partWithOriginalSpend.annualSpend : 0,
      };
    });
  }, [allParts, allPartsWithSpend, filterSelectedPartId, filterSelectedCategory, filterSelectedSupplierId, allPartCategoryMappings, allPartSupplierAssociations]);


  const displayMetrics = useMemo(() => {
    const currentTotalSpend = filteredAndCalculatedParts.reduce((sum, p) => sum + p.annualSpend, 0);
    const currentTotalParts = filteredAndCalculatedParts.length;

    let currentTotalSuppliers = 0;
    if (filterSelectedSupplierId !== ALL_FILTER_VALUE) {
        currentTotalSuppliers = filteredAndCalculatedParts.length > 0 ? 1 : 0;
    } else {
        const uniqueSupplierIds = new Set<string>();
        filteredAndCalculatedParts.forEach(part => {
            allPartSupplierAssociations.forEach(psa => {
                if (psa.partId === part.id) {
                    uniqueSupplierIds.add(psa.supplierId);
                }
            });
        });
        currentTotalSuppliers = uniqueSupplierIds.size;
    }
    
    let currentTotalCategories = 0;
    if (filterSelectedCategory !== ALL_FILTER_VALUE && filteredAndCalculatedParts.length > 0) {
        currentTotalCategories = 1;
    } else {
         const uniqueCategoryNames = new Set<string>();
         filteredAndCalculatedParts.forEach(part => {
            allPartCategoryMappings.forEach(pcm => {
                if (pcm.partId === part.id) {
                    uniqueCategoryNames.add(pcm.categoryName);
                }
            });
        });
        currentTotalCategories = uniqueCategoryNames.size;
    }

    return {
      spend: currentTotalSpend,
      parts: currentTotalParts,
      suppliers: currentTotalSuppliers,
      categories: currentTotalCategories,
    };
  }, [filteredAndCalculatedParts, filterSelectedSupplierId, filterSelectedCategory, allPartSupplierAssociations, allPartCategoryMappings]);


  const currentSpendByCategoryData: SpendDataPoint[] = useMemo(() => {
    const categorySpend: Record<string, number> = {};
    filteredAndCalculatedParts.forEach(part => {
      allPartCategoryMappings
        .filter(pcm => pcm.partId === part.id)
        .forEach(mapping => {
          categorySpend[mapping.categoryName] = (categorySpend[mapping.categoryName] || 0) + part.annualSpend;
        });
    });
    return Object.entries(categorySpend)
      .map(([name, spend]) => ({ name, spend }))
      .sort((a,b) => b.spend - a.spend);
  }, [filteredAndCalculatedParts, allPartCategoryMappings]);

  const currentSpendByTopPartsData: SpendDataPoint[] = useMemo(() => {
    return [...filteredAndCalculatedParts]
      .sort((a, b) => b.annualSpend - a.annualSpend)
      .slice(0, 5)
      .map(p => ({ name: p.partNumber, spend: p.annualSpend }));
  }, [filteredAndCalculatedParts]);

  const currentDemandByTopPartsData: DemandDataPoint[] = useMemo(() => {
    return [...filteredAndCalculatedParts] 
      .sort((a, b) => b.annualDemand - a.annualDemand)
      .slice(0, 5)
      .map(p => ({ name: p.partNumber, demand: p.annualDemand }));
  }, [filteredAndCalculatedParts]);


  const handleClearFilters = () => {
    setFilterSelectedPartId(ALL_FILTER_VALUE);
    setFilterSelectedSupplierId(ALL_FILTER_VALUE);
    setFilterSelectedCategory(ALL_FILTER_VALUE);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" />
              Review Spend
            </CardTitle>
            <div className="w-64">
              <Select value={selectedScenarioName} onValueChange={handleLoadScenario}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Load Scenario (View Only)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VIEW_CURRENT_DATA_VALUE} className="text-xs">View Current App Data</SelectItem>
                  {savedScenarioNames.map(name => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {loadedScenario && (
            <CardDescription className="text-xs mt-1">
              Context for scenario: <strong>{loadedScenario.name}</strong>. Filters apply to current app data.
              <br />{loadedScenario.description}
            </CardDescription>
          )}
          {!loadedScenario && (
            <CardDescription className="text-xs mt-1">
              Displaying metrics and charts based on the current application data, adjusted by active filters.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Card className="mb-6 bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <FilterIcon className="mr-2 h-4 w-4 text-primary" />
                Filter Data
              </CardTitle>
              <CardDescription className="text-xs">
                Select filters to refine the data displayed in the charts below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filterPartSelect" className="text-xs font-medium">Filter by Part</Label>
                  <Select value={filterSelectedPartId} onValueChange={setFilterSelectedPartId}>
                    <SelectTrigger id="filterPartSelect" className="h-8 text-xs mt-1">
                      <SelectValue placeholder="All Parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE} className="text-xs">All Parts</SelectItem>
                      {partsForFilterDropdown.map(part => (
                        <SelectItem key={part.value} value={part.value} className="text-xs">{part.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterSupplierSelect" className="text-xs font-medium">Filter by Supplier</Label>
                  <Select value={filterSelectedSupplierId} onValueChange={setFilterSelectedSupplierId}>
                    <SelectTrigger id="filterSupplierSelect" className="h-8 text-xs mt-1">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE} className="text-xs">All Suppliers</SelectItem>
                      {suppliersForFilterDropdown.map(supplier => (
                        <SelectItem key={supplier.value} value={supplier.value} className="text-xs">{supplier.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterCategorySelect" className="text-xs font-medium">Filter by Category</Label>
                  <Select value={filterSelectedCategory} onValueChange={setFilterSelectedCategory}>
                    <SelectTrigger id="filterCategorySelect" className="h-8 text-xs mt-1">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE} className="text-xs">All Categories</SelectItem>
                      {uniqueCategoriesForFilter.map(category => (
                        <SelectItem key={category} value={category} className="text-xs">{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs h-8">
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Filtered Spend</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(displayMetrics.spend)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Filtered Parts</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatNumber(displayMetrics.parts)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Filtered Suppliers</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatNumber(displayMetrics.suppliers)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Filtered Categories</CardTitle><FolderTree className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatNumber(displayMetrics.categories)}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader><CardTitle className="text-base flex items-center"><TrendingUp className="mr-1.5 h-4 w-4" />Spend by Category</CardTitle></CardHeader>
              <CardContent>
                {currentSpendByCategoryData.length === 0 ? (<p className="text-xs text-muted-foreground text-center py-8">No category spend data for current filter.</p>) : (
                  <ChartContainer config={{}} className="min-h-[250px] w-full text-xs">
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsBarChart data={currentSpendByCategoryData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value).replace('$', '')[0] + (Math.abs(value) >= 1e6 ? (value / 1e6).toFixed(0) + 'M' : Math.abs(value) >= 1e3 ? (value / 1e3).toFixed(0) + 'K' : value)} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: '10px', padding: '2px 8px' }} />
                        <Bar dataKey="spend" barSize={15} radius={[0, 3, 3, 0]}>
                          {currentSpendByCategoryData.map((entry, index) => (
                            <Cell key={`cell-cat-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card className="md:col-span-1">
              <CardHeader><CardTitle className="text-base flex items-center"><DollarSign className="mr-1.5 h-4 w-4" />Top 5 Parts by Spend</CardTitle></CardHeader>
              <CardContent>
                {currentSpendByTopPartsData.length === 0 ? (<p className="text-xs text-muted-foreground text-center py-8">No part spend data for current filter.</p>) : (
                  <ChartContainer config={{}} className="min-h-[250px] w-full text-xs">
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsBarChart data={currentSpendByTopPartsData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value).replace('$', '')[0] + (Math.abs(value) >= 1e6 ? (value / 1e6).toFixed(0) + 'M' : Math.abs(value) >= 1e3 ? (value / 1e3).toFixed(0) + 'K' : value)} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: '10px', padding: '2px 8px' }} />
                        <Bar dataKey="spend" barSize={15} radius={[0, 3, 3, 0]}>
                          {currentSpendByTopPartsData.map((entry, index) => (
                            <Cell key={`cell-psp-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card className="md:col-span-1">
              <CardHeader><CardTitle className="text-base flex items-center"><ShoppingCart className="mr-1.5 h-4 w-4" />Top 5 Parts by Demand</CardTitle></CardHeader>
              <CardContent>
                {currentDemandByTopPartsData.length === 0 ? (<p className="text-xs text-muted-foreground text-center py-8">No part demand data for current filter.</p>) : (
                  <ChartContainer config={{}} className="min-h-[250px] w-full text-xs">
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsBarChart data={currentDemandByTopPartsData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatNumber(value).length > 6 ? (value / 1e6).toFixed(1) + 'M' : (value / 1e3).toFixed(1) + 'K'} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                        <RechartsTooltip formatter={(value: number) => formatNumber(value) + " units"} contentStyle={{ fontSize: '10px', padding: '2px 8px' }} />
                        <Bar dataKey="demand" barSize={15} radius={[0, 3, 3, 0]}>
                          {currentDemandByTopPartsData.map((entry, index) => (
                            <Cell key={`cell-pdp-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    

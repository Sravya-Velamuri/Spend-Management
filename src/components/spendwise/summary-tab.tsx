
"use client";

import type { Supplier, Part, PartSupplierAssociation } from '@/types/spendwise';
import type { SpendDataPoint } from '@/app/page'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Building, Info, PieChart as PieChartIcon, Users, Link2, PackageCheck, Blocks, TrendingUp, Focus, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SupplierWorldMap from './supplier-world-map'; // This will now be the Google Map component
import { 
  PieChart as RechartsPieChart, Pie, Cell, Legend as RechartsLegend, 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Tooltip as RechartsTooltipComponent,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useMemo } from 'react';
import type { CurrencyInfo } from '@/lib/currencyConfig';

interface SummaryTabProps {
  suppliers: Supplier[];
  parts: Part[]; 
  partsWithSpend: (Part & { annualSpend: number })[]; 
  partSupplierAssociations: PartSupplierAssociation[];
  spendByCategoryData: SpendDataPoint[];
  appCurrency: CurrencyInfo;
}

const PIE_COLORS_CATEGORIES = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const barChartConfig = (label: string, colorVar: string) => ({
  dataKey: {
    label: label,
    color: `hsl(var(--${colorVar}))`,
  },
} satisfies import("@/components/ui/chart").ChartConfig);

const ABC_COLORS = {
  A: "hsl(var(--chart-1))", 
  B: "hsl(var(--chart-2))", 
  C: "hsl(var(--chart-3))", 
};

const abcBubbleChartConfig = {
  numParts: { label: "Number of Parts" },
  avgSpend: { label: "Avg. Spend/Part" },
  totalSpend: { label: "Total Spend (Bubble Size)" },
  "Class A": { label: "Class A", color: ABC_COLORS.A },
  "Class B": { label: "Class B", color: ABC_COLORS.B },
  "Class C": { label: "Class C", color: ABC_COLORS.C },
} satisfies import("@/components/ui/chart").ChartConfig;


export default function SummaryTab({ 
  suppliers, 
  parts, 
  partsWithSpend,
  partSupplierAssociations, 
  spendByCategoryData,
}: SummaryTabProps) {

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null) return `${appCurrency.symbol}0`;
    const convertedValue = value * appCurrency.rate;
    return new Intl.NumberFormat(appCurrency.locale, { 
      style: 'currency', 
      currency: appCurrency.code, 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(convertedValue);
  };

  
  const formatCurrencyWithDecimals = (value: number) => {
    if (value === undefined || value === null) return `${appCurrency.symbol}0.00`;
    const convertedValue = value * appCurrency.rate;
    return new Intl.NumberFormat(appCurrency.locale, { 
      style: 'currency', 
      currency: appCurrency.code, 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(convertedValue);
  };

  const formatNumber = (value: number) => {
    if (value === undefined || value === null) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatYAxisTick = (value: number) => {
    const convertedValue = value * appCurrency.rate;
    if (Math.abs(convertedValue) >= 1_000_000_000) return `${appCurrency.symbol}${(convertedValue / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(convertedValue) >= 1_000_000) return `${appCurrency.symbol}${(convertedValue / 1_000_000).toFixed(1)}M`;
    if (Math.abs(convertedValue) >= 1_000) return `${appCurrency.symbol}${(convertedValue / 1_000).toFixed(1)}K`;
    return `${appCurrency.symbol}${convertedValue.toFixed(0)}`;
  };
  
  const supplierCountByCountry = useMemo(() => {
    const counts: Record<string, number> = {};
    suppliers.forEach(supplier => {
      counts[supplier.country] = (counts[supplier.country] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); 
  }, [suppliers]);

  const partsBySupplierCountDistribution = useMemo(() => {
    const supplierCountsPerPart: Record<string, number> = {};
    parts.forEach(part => {
      supplierCountsPerPart[part.id] = 0;
    });
    partSupplierAssociations.forEach(assoc => {
      if (supplierCountsPerPart[assoc.partId] !== undefined) {
        supplierCountsPerPart[assoc.partId]++;
      }
    });

    const distribution: Record<number, number> = {};
    Object.values(supplierCountsPerPart).forEach(count => {
      distribution[count] = (distribution[count] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([numSuppliers, partCount]) => ({
        name: `${numSuppliers} Supplier${parseInt(numSuppliers) !== 1 ? 's' : ''}`, 
        count: partCount 
      }))
      .sort((a,b) => parseInt(a.name) - parseInt(b.name));
  }, [parts, partSupplierAssociations]);

  const abcBubbleChartData = useMemo(() => {
    if (partsWithSpend.length === 0) {
      return { A: null, B: null, C: null };
    }

    const sortedParts = [...partsWithSpend].sort((a, b) => b.annualSpend - a.annualSpend);
    const totalAnnualSpendAllParts = sortedParts.reduce((sum, p) => sum + p.annualSpend, 0);

    if (totalAnnualSpendAllParts === 0) {
      return { A: null, B: null, C: null };
    }

    let cumulativeSpend = 0;
    const classifiedParts: { part: Part; annualSpend: number; class: 'A' | 'B' | 'C' }[] = [];

    for (const part of sortedParts) {
      cumulativeSpend += part.annualSpend;
      const cumulativePercent = cumulativeSpend / totalAnnualSpendAllParts;
      if (cumulativePercent <= 0.80) {
        classifiedParts.push({ ...part, class: 'A' });
      } else if (cumulativePercent <= 0.95) {
        classifiedParts.push({ ...part, class: 'B' });
      } else {
        classifiedParts.push({ ...part, class: 'C' });
      }
    }
    
    const classAggregatedData: { A: any; B: any; C: any; } = { A: null, B: null, C: null };
    const classTypes: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];

    classTypes.forEach(className => {
      const partsInThisClass = classifiedParts.filter(p => p.class === className);
      if (partsInThisClass.length > 0) {
        const totalSpendInClass = partsInThisClass.reduce((sum, p) => sum + p.annualSpend, 0);
        classAggregatedData[className] = {
          name: `Class ${className}`,
          numParts: partsInThisClass.length,
          totalSpend: totalSpendInClass,
          avgSpend: totalSpendInClass / partsInThisClass.length,
          fill: ABC_COLORS[className],
        };
      }
    });
    
    return classAggregatedData;
  }, [partsWithSpend]);


  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: ABC Parts Classification (Bubble Chart) */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Focus className="mr-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">ABC Parts Classification</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="ml-1 h-5 w-5"><Info className="h-3 w-3" /></Button></TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    ABC analysis: Class A (top 80% spend), B (next 15%), C (last 5%).<br/>
                    X: # Parts, Y: Avg. Spend/Part, Bubble Size: Total Spend.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {Object.values(abcBubbleChartData).every(c => c === null) ? (
              <p className="text-xs text-muted-foreground text-center py-8">No ABC classification data available.</p>
            ) : (
              <ChartContainer config={abcBubbleChartConfig} className="min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="numParts" name="Number of Parts" tickFormatter={formatNumber} tick={{ fontSize: 10 }} />
                    <YAxis type="number" dataKey="avgSpend" name="Avg. Spend/Part" tickFormatter={formatYAxisTick} tick={{ fontSize: 10 }} />
                    <ZAxis type="number" dataKey="totalSpend" range={[150, 1500]} name="Total Annual Spend" />
                    <RechartsTooltipComponent
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background p-2.5 shadow-xl text-xs">
                              <p className="font-medium mb-1" style={{color: data.fill}}>{data.name}</p>
                              <p>Parts: {formatNumber(data.numParts)}</p>
                              <p>Avg Spend/Part: {formatCurrencyWithDecimals(data.avgSpend)}</p>
                              <p>Total Spend: {formatCurrency(data.totalSpend)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <RechartsLegend wrapperStyle={{fontSize: "10px"}} />
                    {abcBubbleChartData.A && (
                      <Scatter name="Class A" data={[abcBubbleChartData.A]} fill={abcBubbleChartData.A.fill} shape="circle" />
                    )}
                    {abcBubbleChartData.B && (
                      <Scatter name="Class B" data={[abcBubbleChartData.B]} fill={abcBubbleChartData.B.fill} shape="circle" />
                    )}
                    {abcBubbleChartData.C && (
                      <Scatter name="Class C" data={[abcBubbleChartData.C]} fill={abcBubbleChartData.C.fill} shape="circle" />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Suppliers by Country */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Suppliers by Country (Top 5)</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="ml-1 h-5 w-5"><Info className="h-3 w-3" /></Button></TooltipTrigger>
                <TooltipContent><p className="text-xs">Number of suppliers in the top 5 countries.</p></TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {supplierCountByCountry.length === 0 ? (
               <p className="text-xs text-muted-foreground text-center py-8">No supplier country data available.</p>
            ) : (
              <ChartContainer config={barChartConfig('Suppliers', 'chart-2')} className="min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsBarChart data={supplierCountByCountry} layout="vertical" margin={{left: 10, right: 30}}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="count" tickFormatter={formatNumber} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatNumber(value as number)} />} />
                    <Bar dataKey="count" fill="var(--color-dataKey)" radius={3} barSize={15} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: Sourcing Complexity */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Link2 className="mr-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Part Sourcing Distribution</CardTitle>
               <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="ml-1 h-5 w-5"><Info className="h-3 w-3" /></Button></TooltipTrigger>
                <TooltipContent><p className="text-xs">Number of parts by how many suppliers they are sourced from.</p></TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {partsBySupplierCountDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No part sourcing data available.</p>
            ): (
              <ChartContainer config={barChartConfig('Parts', 'chart-3')} className="min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height={200}>
                   <RechartsBarChart data={partsBySupplierCountDistribution} margin={{top: 5, right: 20, left: 10, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatNumber} tick={{ fontSize: 10 }} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatNumber(value as number)} />} />
                    <Bar dataKey="count" fill="var(--color-dataKey)" radius={3} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Spend by Category */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Blocks className="mr-2 h-5 w-5 text-primary" />
              <CardTitle className="text-base">Spend by Category</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="ml-1 h-5 w-5"><Info className="h-3 w-3" /></Button></TooltipTrigger>
                <TooltipContent><p className="text-xs">Total spend distribution across part categories.</p></TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {spendByCategoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No category spend data available.</p>
            ) : (
              <ChartContainer config={{}} className="min-h-[200px] w-full aspect-square">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <RechartsTooltipComponent
                      formatter={(value, name) => [formatCurrency(value as number), name]}
                    />
                    <Pie data={spendByCategoryData} dataKey="spend" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}
                     label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (percent as number) * 100 > 3 ? (
                          <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-medium">
                             {`${name} (${((percent as number) * 100).toFixed(0)}%)`}
                          </text>
                        ) : null;
                      }}
                    >
                      {spendByCategoryData.map((entry, index) => (
                        <Cell key={`cell-cat-${index}`} fill={PIE_COLORS_CATEGORIES[index % PIE_COLORS_CATEGORIES.length]} />
                      ))}
                    </Pie>
                     <RechartsLegend wrapperStyle={{fontSize: "11px", marginTop: "10px"}} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Globe className="mr-2 h-6 w-6" />
            <CardTitle className="text-lg">Supplier Geo-Distribution</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2 h-5 w-5">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">Global supplier locations plotted on an interactive map.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            {/* This will render the Google Map */}
            <SupplierWorldMap suppliers={suppliers} />
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Building className="mr-2 h-5 w-5 text-primary" /> Supplier List &amp; Locations
            </h3>
            {suppliers.length === 0 ? (
              <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md min-h-[100px] flex flex-col items-center justify-center">
                  <Info className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No suppliers available.</p>
                  <p className="text-xs">Generate or add suppliers to see their locations listed here.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Supplier Name</TableHead>
                      <TableHead className="text-xs">Address</TableHead>
                      <TableHead className="text-xs">Country</TableHead>
                      <TableHead className="text-xs">Lat/Lng</TableHead> {/* Added for coordinates */}
                      <TableHead className="text-xs">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}><TableCell className="font-mono text-xs">{supplier.supplierId}</TableCell>
                        <TableCell className="font-medium text-xs">{supplier.name}</TableCell>
                        <TableCell className="text-xs">{supplier.address}</TableCell>
                        <TableCell className="text-xs">{supplier.country}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {supplier.latitude !== undefined && supplier.longitude !== undefined
                            ? `${supplier.latitude.toFixed(3)}, ${supplier.longitude.toFixed(3)}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{supplier.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Supplier } from '@/types/spendwise';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fingerprint, Building, FileText, PlusCircle, Info, Trash2, Globe2, MapPin, Loader2, FileSpreadsheet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SupplierWorldMap from './supplier-world-map';
import { geocodeSupplierAddress } from '@/lib/geocodingService';
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef } from 'react';
import { parseSuppliersExcel } from './excel-parser';

interface UpdateSuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  onAddSupplier: () => void;
}

export default function UpdateSuppliersTab({ suppliers, setSuppliers, onAddSupplier }: UpdateSuppliersTabProps) {
  const { toast } = useToast();
  const [geocodingSupplierId, setGeocodingSupplierId] = useState<string | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSupplierInputChange = (supplierId: string, field: keyof Supplier, value: string | number) => {
    setSuppliers(prevSuppliers =>
      prevSuppliers.map(s => {
        if (s.id === supplierId) {
          const updatedSupplier = { ...s, [field]: value };

          if (['city', 'postalCode', 'country', 'streetAddress', 'stateOrProvince'].includes(field as string)) {
            const street = updatedSupplier.streetAddress || '';
            const cityVal = updatedSupplier.city || '';
            const state = updatedSupplier.stateOrProvince || '';
            const postal = updatedSupplier.postalCode || '';
            const countryVal = updatedSupplier.country || '';

            let fullAddress = [street, cityVal, state, postal, countryVal]
              .filter(Boolean)
              .join(', ');

            if (state && postal) {
                fullAddress = fullAddress.replace(`${cityVal}, ${state}, ${postal}`, `${cityVal}, ${state} ${postal}`);
            }
            updatedSupplier.address = fullAddress.replace(/ , |, $/g, '').replace(/, ,/g, ',').replace(/  +/g, ' ').trim();
          }
          return updatedSupplier;
        }
        return s;
      })
    );
  };

  const handleDeleteSupplier = (supplierId: string) => {
    setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.id !== supplierId));
  };

  const handleGeocodeSupplier = async (supplierToGeocode: Supplier) => {
      if (!supplierToGeocode) return;

      // Check if we have enough address info to geocode
      const hasAddressInfo = supplierToGeocode.city || supplierToGeocode.streetAddress || supplierToGeocode.postalCode || supplierToGeocode.country;
      if (!hasAddressInfo) {
        toast({
          variant: "destructive",
          title: "Insufficient Address Info",
          description: `Cannot geocode ${supplierToGeocode.name}. Please add city, street address, postal code, or country information.`,
          duration: 5000,
        });
        return;
      }

      setGeocodingSupplierId(supplierToGeocode.id);

      try {
        const result = await geocodeSupplierAddress({
          streetAddress: supplierToGeocode.streetAddress,
          city: supplierToGeocode.city,
          stateOrProvince: supplierToGeocode.stateOrProvince,
          postalCode: supplierToGeocode.postalCode,
          country: supplierToGeocode.country,
        });

        setSuppliers(prevSuppliers =>
          prevSuppliers.map(s =>
            s.id === supplierToGeocode.id ? { ...s, latitude: result.lat, longitude: result.lng } : s
          )
        );

        toast({
          title: "Geocoding Successful",
          description: `Coordinates found for ${supplierToGeocode.name}: (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)})`,
          duration: 4000,
        });

      } catch (error: any) {
        console.error("Geocoding error:", error);

        let errorMessage = `Could not find coordinates for ${supplierToGeocode.name}.`;

        if (error.message) {
          if (error.message.includes('ZERO_RESULTS')) {
            errorMessage += " The address was not found. Please check the address details.";
          } else if (error.message.includes('REQUEST_DENIED')) {
            errorMessage += " API access denied. Please check your API key and billing settings.";
          } else if (error.message.includes('OVER_QUERY_LIMIT')) {
            errorMessage += " API quota exceeded. Please try again later.";
          } else if (error.message.includes('INVALID_REQUEST')) {
            errorMessage += " Invalid address format. Please check the address components.";
          } else {
            errorMessage += ` Error: ${error.message}`;
          }
        }

        toast({
          variant: "destructive",
          title: "Geocoding Failed",
          description: errorMessage,
          duration: 8000,
        });

      } finally {
        setGeocodingSupplierId(null);
      }
    };

  const handleExcelUpload = async (file: File) => {
    setIsUploadingExcel(true);
    try {
      const result = await parseSuppliersExcel(file, suppliers);
      if (result.data.length > 0) {
        setSuppliers(prev => [...prev, ...result.data]);
        toast({
          title: "Suppliers Imported",
          description: `Successfully imported ${result.data.length} suppliers from Excel.`
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


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Building className="mr-2 h-5 w-5" />
          <CardTitle className="text-lg">2. Add/Update Suppliers</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2 h-5 w-5">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">Manage supplier information. Click the <MapPin className="inline h-3 w-3" /> icon to fetch coordinates for the map. Ensure Geocoding API is enabled in Google Cloud Console.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-8 gap-6 text-xs">
        <div className="md:col-span-5 space-y-4">
          <section>
            <div className="flex justify-between items-center mb-1.5">
               <h3 className="text-base font-semibold text-muted-foreground">Supplier Details</h3>
              <div className="flex items-center gap-2 ml-auto">
                <Button onClick={onAddSupplier} size="sm" className="text-xs">
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Supplier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingExcel}
                  className="text-xs"
                >
                  {isUploadingExcel ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isUploadingExcel ? "Uploading..." : "Upload"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleExcelUpload(file);
                      e.target.value = ""; // Reset file input
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            {suppliers.length === 0 ? (
              <p className="text-muted-foreground text-center py-3">No suppliers available. Generate, add, or upload some suppliers.</p>
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)] overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] text-xs"><Fingerprint className="inline-block mr-1 h-3.5 w-3.5" />ID</TableHead>
                      <TableHead className="min-w-[130px] text-xs"><Building className="inline-block mr-1 h-3.5 w-3.5" />Name</TableHead>
                      <TableHead className="min-w-[130px] text-xs"><FileText className="inline-block mr-1 h-3.5 w-3.5" />Description</TableHead>
                      <TableHead className="min-w-[90px] text-xs">City</TableHead>
                      <TableHead className="min-w-[90px] text-xs"><Globe2 className="inline-block mr-1 h-3.5 w-3.5" />Country</TableHead>
                      <TableHead className="text-center w-[90px] text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-mono text-xs py-1.5">{supplier.supplierId}</TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="text"
                            value={supplier.name}
                            onChange={(e) => handleSupplierInputChange(supplier.id, 'name', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="text"
                            value={supplier.description}
                            onChange={(e) => handleSupplierInputChange(supplier.id, 'description', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="text"
                            value={supplier.city}
                            onChange={(e) => handleSupplierInputChange(supplier.id, 'city', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="text"
                            value={supplier.country}
                            onChange={(e) => handleSupplierInputChange(supplier.id, 'country', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-center py-1.5 space-x-1">
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleGeocodeSupplier(supplier)}
                                disabled={geocodingSupplierId === supplier.id || (!supplier.city && !supplier.streetAddress && !supplier.postalCode && !supplier.country)}
                                aria-label="Fetch Coordinates"
                              >
                                {geocodingSupplierId === supplier.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <MapPin className={`h-3.5 w-3.5 ${supplier.latitude && supplier.longitude ? 'text-green-500' : 'text-blue-600 hover:text-blue-700' }`} />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{supplier.latitude && supplier.longitude ? `Coords: ${supplier.latitude.toFixed(2)}, ${supplier.longitude.toFixed(2)}` : 'Fetch Coordinates'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                             <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" aria-label="Delete Supplier" onClick={() => handleDeleteSupplier(supplier.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Delete Supplier</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </section>
        </div>
        <div className="md:col-span-3 space-y-4">
          <SupplierWorldMap suppliers={suppliers} />
        </div>
      </CardContent>
    </Card>
  );
}
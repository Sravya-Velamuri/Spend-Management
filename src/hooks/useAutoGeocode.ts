import { useEffect, useRef } from 'react';
import { geocodeSupplierAddress } from '@/lib/geocodingService';
import type { Supplier } from '@/types/spendwise';
import { useToast } from '@/hooks/use-toast';

interface UseAutoGeocodeProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  enabled?: boolean;
}

export function useAutoGeocode({ suppliers, setSuppliers, enabled = true }: UseAutoGeocodeProps) {
  const { toast } = useToast();
  const geocodingQueueRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const suppliersNeedingGeocode = suppliers.filter(supplier => {
      if (supplier.latitude !== undefined && supplier.longitude !== undefined) return false;
      if (geocodingQueueRef.current.has(supplier.id)) return false;
      const hasAddressInfo = supplier.city || supplier.country || supplier.streetAddress || supplier.postalCode;
      return hasAddressInfo;
    });

    if (suppliersNeedingGeocode.length === 0 || isProcessingRef.current) return;

    const processGeocoding = async () => {
      isProcessingRef.current = true;
      
      for (const supplier of suppliersNeedingGeocode) {
        geocodingQueueRef.current.add(supplier.id);
        
        try {
          const result = await geocodeSupplierAddress({
            streetAddress: supplier.streetAddress,
            city: supplier.city,
            stateOrProvince: supplier.stateOrProvince,
            postalCode: supplier.postalCode,
            country: supplier.country,
          });

          setSuppliers(prev =>
            prev.map(s =>
              s.id === supplier.id 
                ? { ...s, latitude: result.lat, longitude: result.lng }
                : s
            )
          );
        } catch (error) {
          console.error(`Failed to auto-geocode ${supplier.name}:`, error);
        } finally {
          geocodingQueueRef.current.delete(supplier.id);
        }
        
        // Delay between requests to avoid API limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      isProcessingRef.current = false;
    };

    processGeocoding();
  }, [suppliers, setSuppliers, enabled, toast]);
}
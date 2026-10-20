import { useState, useEffect, useCallback } from 'react';
import {
  type ReturnRequest,
  returnService,
  type ReturnType,
  type ReturnShippingCompany,
} from '../../../services/returnService';

export const useReturnShippingSelection = (
  request: ReturnRequest,
  setShippingReturnCost: (val: string) => void
) => {
  const [shippingCompanies, setShippingCompanies] = useState<ReturnShippingCompany[]>([]);
  const [returnTypes, setReturnTypes] = useState<ReturnType[]>([]);
  const [shippingCompanyId, setShippingCompanyId] = useState(request.shippingCompanyId || '');
  const [returnTypeId, setReturnTypeId] = useState(request.returnTypeId || '');

  const getSuggestedCost = useCallback(
    (type: ReturnType | undefined): number => {
      if (!type) return 0;
      if (type.costModel === 'FIXED' && type.fixedAmount != null) {
        const fixed = Number(type.fixedAmount);
        return isNaN(fixed) ? 0 : fixed;
      }
      if (type.costModel === 'NONE') {
        return 0;
      }
      if (type.costModel === 'FULL') {
        const orderData = request.order as Record<string, unknown> | undefined;
        const rawCost = orderData?.shippingCost ?? orderData?.shipping ?? 0;
        const parsed = Number(rawCost);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    },
    [request.order]
  );

  const applyReturnTypeCost = useCallback(
    (type: ReturnType | undefined) => {
      if (!type) return;
      const cost = getSuggestedCost(type);
      setShippingReturnCost(String(cost));
    },
    [getSuggestedCost, setShippingReturnCost]
  );

  useEffect(() => {
    returnService
      .getReturnShippingCompanies({ activeOnly: true })
      .then((res) => {
        const companies: ReturnShippingCompany[] = res.data?.data || [];
        const activeCompanies = companies.filter((c) => c.isActive !== false);
        setShippingCompanies(activeCompanies);

        let resolvedCompanyId = request.shippingCompanyId || '';
        if (!resolvedCompanyId) {
          if (activeCompanies.length === 1) {
            resolvedCompanyId = activeCompanies[0].id;
          } else {
            const orderData = request.order as Record<string, unknown> | undefined;
            if (request.order?.turboTrackingNumber || orderData?.turboShipmentId) {
              const turbo = activeCompanies.find(
                (c) =>
                  c.slug?.toLowerCase() === 'turbo' ||
                  c.providerKey?.toUpperCase() === 'TURBO' ||
                  c.name?.toLowerCase().includes('turbo')
              );
              if (turbo) {
                resolvedCompanyId = turbo.id;
              }
            }
          }
        }

        if (resolvedCompanyId) {
          setShippingCompanyId(resolvedCompanyId);
          const company = activeCompanies.find((c) => c.id === resolvedCompanyId);
          const activeTypes = (company?.returnTypes || []).filter(
            (rt) => rt.isActive !== false
          );
          setReturnTypes(activeTypes);

          if (
            request.returnTypeId &&
            (request.shippingReturnCost === undefined ||
              request.shippingReturnCost === null ||
              String(request.shippingReturnCost) === '')
          ) {
            const matchedType =
              activeTypes.find((rt) => rt.id === request.returnTypeId) ||
              activeCompanies
                .flatMap((c) => c.returnTypes || [])
                .find((rt) => rt.id === request.returnTypeId);
            if (matchedType) {
              applyReturnTypeCost(matchedType);
            }
          }
        } else {
          const allActiveTypes = activeCompanies
            .flatMap((c) => c.returnTypes || [])
            .filter((rt) => rt.isActive !== false);
          setReturnTypes(allActiveTypes);

          if (
            request.returnTypeId &&
            (request.shippingReturnCost === undefined ||
              request.shippingReturnCost === null ||
              String(request.shippingReturnCost) === '')
          ) {
            const matchedType = allActiveTypes.find(
              (rt) => rt.id === request.returnTypeId
            );
            if (matchedType) {
              applyReturnTypeCost(matchedType);
            }
          }
        }
      })
      .catch(() => {});
  }, [applyReturnTypeCost, request.order, request.returnTypeId, request.shippingCompanyId, request.shippingReturnCost]);

  const handleShippingCompanyChange = (value: string) => {
    setShippingCompanyId(value);
    setReturnTypeId('');
    if (!value) {
      const allActiveTypes = shippingCompanies
        .flatMap((c) => c.returnTypes || [])
        .filter((rt) => rt.isActive !== false);
      setReturnTypes(allActiveTypes);
      return;
    }
    const company = shippingCompanies.find((c) => c.id === value);
    const activeTypes = (company?.returnTypes || []).filter(
      (rt) => rt.isActive !== false
    );
    setReturnTypes(activeTypes);
  };

  const handleReturnTypeChange = (value: string) => {
    setReturnTypeId(value);
    if (!value) {
      setShippingReturnCost('');
      return;
    }
    const type =
      returnTypes.find((rt) => rt.id === value) ||
      shippingCompanies
        .flatMap((c) => c.returnTypes || [])
        .find((rt) => rt.id === value);

    if (type) {
      if (type.shippingCompanyId && !shippingCompanyId) {
        setShippingCompanyId(type.shippingCompanyId);
      }
      applyReturnTypeCost(type);
    }
  };

  return {
    shippingCompanies,
    returnTypes,
    shippingCompanyId,
    setShippingCompanyId,
    returnTypeId,
    setReturnTypeId,
    getSuggestedCost,
    handleShippingCompanyChange,
    handleReturnTypeChange,
  };
};

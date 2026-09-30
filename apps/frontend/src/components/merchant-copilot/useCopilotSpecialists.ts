import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { SPECIALIST_AGENTS, SpecialistAgent } from './specialists';

interface UseCopilotSpecialistsProps {
  companyId?: string | null;
  pathname?: string;
}

export function useCopilotSpecialists({
  companyId,
  pathname = '',
}: UseCopilotSpecialistsProps) {
  const [specialists, setSpecialists] = useState<SpecialistAgent[]>(SPECIALIST_AGENTS);
  const userHasExplicitlySelectedRef = useRef(false);

  // Initial agent selection — defaults strictly to the primary Executive Assistant
  const [selectedAgent, setSelectedAgentState] = useState<SpecialistAgent>(() => {
    return SPECIALIST_AGENTS[0]!;
  });

  // Track explicit user selection so background syncs don't override manual choice
  const setSelectedAgent = useCallback((agent: SpecialistAgent) => {
    userHasExplicitlySelectedRef.current = true;
    setSelectedAgentState(agent);
  }, []);

  // Background sync: Fetch dynamic specialists and company-specific default from server
  useEffect(() => {
    if (!companyId) return;
    let isMounted = true;

    (async () => {
      try {
        const res = await apiClient.get<{
          success?: boolean;
          defaultAgentSlug?: string;
          specialists?: SpecialistAgent[];
          routeAgentMap?: Record<string, string>;
        }>('/ai/chat/specialists');

        if (!isMounted) return;

        const serverSpecialists = res.data?.specialists;
        if (Array.isArray(serverSpecialists) && serverSpecialists.length > 0) {
          setSpecialists(serverSpecialists);

          // If user hasn't explicitly picked someone, lock strictly to the DASHBOARD routed agent
          if (!userHasExplicitlySelectedRef.current) {
            const serverDefaultSlug = res.data?.defaultAgentSlug;
            const matched = serverSpecialists.find(
              (a) => a.isDefault || a.slug === serverDefaultSlug || a.id === serverDefaultSlug
            ) || serverSpecialists[0];

            if (matched) {
              setSelectedAgentState(matched);
            }
          }
        }
      } catch (err) {
        console.warn('[CopilotSpecialists] Failed to fetch dynamic specialists, keeping resilient baseline:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Contextual page awareness (informational telemetry badge, never hijacking the active agent)
  const contextReason = useMemo(() => {
    const p = pathname.toLowerCase();
    if (p.startsWith('/marketing') || p.startsWith('/facebook-ads')) return 'سياق الصفحة: الإعلانات';
    if (p.startsWith('/orders') || p.startsWith('/shipping')) return 'سياق الصفحة: الطلبات والشحن';
    if (p.startsWith('/inventory') || p.startsWith('/products')) return 'سياق الصفحة: المخزون والمنتجات';
    if (p.startsWith('/customers') || p.startsWith('/conversations') || p.startsWith('/whatsapp')) return 'سياق الصفحة: خدمة العملاء';
    return null;
  }, [pathname]);

  return {
    specialists,
    selectedAgent,
    setSelectedAgent,
    contextReason,
  };
}

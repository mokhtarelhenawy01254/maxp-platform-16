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

  // Synchronous route-aware initial suggestion (0ms, zero layout shift)
  const routeRecommendedSlug = useMemo(() => {
    const p = pathname.toLowerCase();
    if (p.startsWith('/marketing') || p.startsWith('/facebook-ads')) {
      return 'facebook-media-buyer-agent';
    }
    if (p.startsWith('/orders') || p.startsWith('/shipping')) {
      return 'order-confirmation-agent';
    }
    if (p.startsWith('/inventory') || p.startsWith('/products')) {
      return 'inventory-pricing-agent';
    }
    if (p.startsWith('/customers') || p.startsWith('/conversations') || p.startsWith('/whatsapp')) {
      return 'customer-service-agent';
    }
    return null;
  }, [pathname]);

  // Initial agent selection — route-aware if matching, otherwise primary default
  const [selectedAgent, setSelectedAgentState] = useState<SpecialistAgent>(() => {
    if (routeRecommendedSlug) {
      const match = SPECIALIST_AGENTS.find((a) => a.slug === routeRecommendedSlug);
      if (match) return match;
    }
    return SPECIALIST_AGENTS[0]!;
  });

  // Track explicit user selection so route changes or API fetches don't override manual choice
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

          // If user hasn't explicitly picked someone, adapt if appropriate
          if (!userHasExplicitlySelectedRef.current) {
            const serverDefaultSlug = res.data?.defaultAgentSlug;
            const targetSlug = routeRecommendedSlug || serverDefaultSlug;
            if (targetSlug) {
              const matched = serverSpecialists.find((a) => a.slug === targetSlug);
              if (matched) {
                setSelectedAgentState(matched);
              }
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
  }, [companyId, routeRecommendedSlug]);

  return {
    specialists,
    selectedAgent,
    setSelectedAgent,
    routeRecommendedSlug,
  };
}

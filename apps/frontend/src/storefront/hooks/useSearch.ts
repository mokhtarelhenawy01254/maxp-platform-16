import { useState, useEffect, useMemo } from 'react';
import { useProducts, Product } from './useProducts';

export interface UseSearchResult {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  results: Product[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  close: () => void;
}

export const useSearch = (initialQuery = ''): UseSearchResult => {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Only query if debouncedQuery has at least 3 chars
  const hasValidQuery = debouncedQuery.trim().length > 2;
  const { products, isLoading } = useProducts(
    { 
      search: hasValidQuery ? debouncedQuery.trim() : undefined, 
      limit: 5,
    },
    undefined,
    {
      enabled: hasValidQuery,
    },
  );

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  return useMemo(() => ({
    query,
    setQuery,
    debouncedQuery,
    results: debouncedQuery.length > 2 ? products : [],
    isLoading,
    isOpen,
    setIsOpen,
    close
  }), [query, debouncedQuery, products, isLoading, isOpen, close]);
};

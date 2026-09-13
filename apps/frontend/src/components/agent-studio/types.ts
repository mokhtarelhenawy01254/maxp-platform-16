import type { LucideIcon } from "lucide-react";

/**
 * Common Types for Agent Studio Engine (Unified Pro SaaS Cockpit)
 */

export interface StudioEntity {
  id: string;
  name: string;
  slug?: string;
  price?: number;
  cost?: number;
  stock?: number;
  mainImage?: string | null;
  category?: string;
  sku?: string;
}

export interface StudioAgentInfo {
  id: string;
  name: string;
  role: string;
  isRouted?: boolean;
}

export interface StudioQuickPrompt {
  label: string;
  icon?: LucideIcon | string;
  generatePrompt: (entity?: StudioEntity | null) => string;
}

export interface StudioMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  images?: string[];
  toolCalls?: any[];
  timestamp?: string;
}

export interface StudioSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StudioMessage[];
  context?: Record<string, any>;
}

export interface StudioDraftAction {
  id: string;
  type: "PRICE_CHANGE" | "STOCK_ADJUSTMENT" | "REORDER_POINT" | "GENERAL_DRAFT";
  title: string;
  entityId: string;
  entityName: string;
  currentValue?: number | string;
  proposedValue?: number | string;
  delta?: number | string;
  reason?: string;
  details?: Record<string, any>;
  status: "DRAFT" | "APPLIED" | "REJECTED";
}

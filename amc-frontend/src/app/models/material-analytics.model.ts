// ═══════════════════════════════════════════════════════════════════════════
//  R4 — Material Analytics Models
// ═══════════════════════════════════════════════════════════════════════════

/** R4.1 — Rate Analysis */
export interface MaterialRateAnalysis {
  items: ItemRateInfo[];
  totalDistinctItems: number;
}

export interface ItemRateInfo {
  itemName: string;
  minRate: number;
  maxRate: number;
  avgRate: number;
  lastRate: number;
  lastPurchaseDate: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  purchaseCount: number;
  totalQuantity: number;
  totalAmount: number;
  rateHistory: RatePoint[];
}

export interface RatePoint {
  date: string;
  rate: number;
  quantity: number;
  siteName: string;
}

/** R4.2 — Usage Report */
export interface MaterialUsageReport {
  siteId: string;
  siteName: string;
  totalMaterialCost: number;
  distinctItemCount: number;
  items: ItemUsage[];
}

export interface ItemUsage {
  itemName: string;
  totalQuantity: number;
  totalAmount: number;
  avgRate: number;
  purchaseCount: number;
  lastPurchaseDate: string;
}

/** R4.3 — ROI & Breakeven */
export interface MaterialRoiAnalysis {
  siteId: string;
  siteName: string;
  quotation: number;
  materialCost: number;
  labourCost: number;
  otherCost: number;
  totalCost: number;
  profit: number;
  roi: number;
  breakeven: number;
  isProfitable: boolean;
}

/** R4.5 — Inventory Summary */
export interface MaterialInventorySummary {
  items: InventoryRow[];
  totalDistinctItems: number;
  grandTotalAmount: number;
}

export interface InventoryRow {
  itemName: string;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  avgRate: number;
  lastRate: number;
  sitesUsedCount: number;
  purchaseCount: number;
  lastPurchaseDate: string;
}

/** R4.4 — Price List Item */
export interface PriceListItem {
  id: string;
  itemName: string;
  category: string;
  expectedRate: number;
  minRate?: number;
  maxRate?: number;
  unit: string;
  supplier?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteAnalytics {
  siteId: string;
  siteName: string;
  clientName: string;
  company: string;
  address: string;
  quotationAmount: number;
  dateOfStart: string;
  dueDate: string;
  isActive: boolean;

  totalCredits: number;
  totalDebits: number;
  materialCost: number;
  labourCost: number;
  otherCost: number;
  profit: number;
  roi: number;

  transactionCount: number;
  materialEntryCount: number;
  labourEntryCount: number;

  monthlyExpenses: MonthlyAmount[];
  monthlyCredits: MonthlyAmount[];
  expenseBreakdown: CategoryAmount[];
  topMaterials: MaterialSummaryRow[];
  labourEntries: LabourEntry[];
  allCharges: ChargeRow[];
}

export interface MonthlyAmount {
  month: string;
  amount: number;
}

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface MaterialSummaryRow {
  itemName: string;
  totalQuantity: string;
  totalAmount: number;
  avgRate: number;
  entryCount: number;
}

export interface LabourEntry {
  date: string;
  description: string;
  party: string;
  amount: number;
  nature: string;
}

export interface ChargeRow {
  date: string;
  type: string;
  description: string;
  amount: number;
  party: string;
}

export interface SitesOverview {
  totalSites: number;
  activeSites: number;
  inactiveSites: number;
  mainCompanySites: number;
  gstCompanySites: number;
  totalQuotation: number;
  totalExpenses: number;
  totalMaterialCost: number;
  totalLabourCost: number;
  overallProfit: number;
  siteComparisons: SiteComparisonRow[];
  topProfitable: SiteComparisonRow[];
  topExpensive: SiteComparisonRow[];
}

export interface SiteComparisonRow {
  siteId: string;
  siteName: string;
  company: string;
  isActive: boolean;
  quotationAmount: number;
  totalExpense: number;
  materialCost: number;
  labourCost: number;
  profit: number;
  roi: number;
}

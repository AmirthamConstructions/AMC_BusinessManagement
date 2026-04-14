export interface DashboardData {
  kpis: DashboardKpis;
  monthlyRevenue: ChartData;
  monthlyExpenditure: ChartData;
  siteExpenses: ChartData;
  companySplit: ChartData;
  recentTransactions: RecentTransaction[];
  startDate: string;
  endDate: string;
}

export interface DashboardKpis {
  revenue: number;
  expenditure: number;
  netProfit: number;
  mainRevenue: number;
  mainExpenditure: number;
  gstRevenue: number;
  gstExpenditure: number;
  materialCost: number;
  totalSites: number;
  activeSites: number;
  inactiveSites: number;
  transactionCount: number;
}

export interface ChartData {
  title: string;
  categories?: string[];
  dates?: string[];
  values: number[];
}

export interface RecentTransaction {
  date: string;
  description: string;
  type: string;
  company: string;
  siteName: string;
  amount: number;
  party: string;
}

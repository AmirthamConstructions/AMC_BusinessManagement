export interface DashboardData {
  kpis: DashboardKpis;
  chart1: ChartData;
  chart2: ChartData;
  chart3: ChartData;
}

export interface DashboardKpis {
  revenue: number;
  expenditure: number;
  totalProfit: number;
  companyExpenses: number;
  netProfit: number;
}

export interface ChartData {
  title: string;
  categories?: string[];
  dates?: string[];
  values: number[];
}

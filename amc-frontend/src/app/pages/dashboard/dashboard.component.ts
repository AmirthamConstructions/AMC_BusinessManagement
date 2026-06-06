import { Component, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardData } from '../../models/dashboard.model';
import { CompanyFilterService } from '../../services/company-filter.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  data: DashboardData | null = null;
  fullData: DashboardData | null = null;  // Unfiltered data for company filter
  loading = false;
  error = '';

  // Date range filter
  filterStartDate = '';
  filterEndDate = '';

  // ── Monthly trend chart (line: revenue vs expenditure) ──
  trendChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx) => ' ₹' + Number(ctx.parsed.y).toLocaleString('en-IN') } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN'), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } }
    },
    elements: { line: { tension: 0.4 }, point: { radius: 4, hoverRadius: 6 } }
  };

  // ── Site expenses chart (horizontal bar) ──
  siteChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  siteChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ' ₹' + Number(ctx.parsed.x).toLocaleString('en-IN') } }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN'), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      y: { ticks: { font: { size: 11 } } }
    }
  };

  // ── Main vs GST split chart (grouped bar) ──
  splitChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  splitChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx) => ' ₹' + Number(ctx.parsed.y).toLocaleString('en-IN') } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN'), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { ticks: { font: { size: 11 } } }
    }
  };

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    public companyFilter: CompanyFilterService
  ) {
    // Reload dashboard when company filter changes
    effect(() => {
      this.companyFilter.selectedCompany(); // subscribe to changes
      if (this.data) {
        this.applyCompanyFilter();
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.dashboardService.getData(this.filterStartDate || undefined, this.filterEndDate || undefined).subscribe({
      next: (data) => {
        this.fullData = data;
        this.applyCompanyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      }
    });
  }

  /** R7.2: Re-compute displayed KPIs based on company filter */
  applyCompanyFilter(): void {
    if (!this.fullData) return;
    const company = this.companyFilter.selectedCompany();
    const fd = this.fullData;

    if (company === 'All') {
      this.data = fd;
    } else {
      const isMain = company === 'Main';
      const rev = isMain ? fd.kpis.mainRevenue : fd.kpis.gstRevenue;
      const exp = isMain ? fd.kpis.mainExpenditure : fd.kpis.gstExpenditure;

      this.data = {
        ...fd,
        kpis: {
          ...fd.kpis,
          revenue: rev,
          expenditure: exp,
          netProfit: rev - exp
        }
      };
    }

    this.buildCharts(this.data);
  }

  // Date presets
  datePresets = [
    { label: 'Last 3M', months: 3 },
    { label: 'Last 6M', months: 6 },
    { label: 'Last 12M', months: 12 },
    { label: 'This FY', months: 0 },
  ];
  activePreset = '';

  applyDateFilter(): void {
    this.activePreset = '';
    this.loadData();
  }

  applyPreset(preset: { label: string; months: number }): void {
    this.activePreset = preset.label;
    const today = new Date();
    if (preset.months === 0) {
      // This Financial Year: Apr 1 → today
      const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      this.filterStartDate = `${fy}-04-01`;
    } else {
      const start = new Date(today);
      start.setMonth(start.getMonth() - preset.months);
      this.filterStartDate = start.toISOString().slice(0, 10);
    }
    this.filterEndDate = today.toISOString().slice(0, 10);
    this.loadData();
  }

  clearDateFilter(): void {
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.activePreset = '';
    this.loadData();
  }

  buildCharts(data: DashboardData): void {
    // Monthly trend — line chart with revenue + expenditure
    const months = data.monthlyRevenue?.dates || [];
    const expDates = data.monthlyExpenditure?.dates || [];
    // Merge and sort all month labels
    const allMonths = Array.from(new Set([...months, ...expDates]));
    const revMap = new Map((data.monthlyRevenue?.dates || []).map((d, i) => [d, data.monthlyRevenue.values[i] || 0]));
    const expMap = new Map((data.monthlyExpenditure?.dates || []).map((d, i) => [d, data.monthlyExpenditure.values[i] || 0]));

    this.trendChartData = {
      labels: allMonths,
      datasets: [
        {
          label: 'Revenue',
          data: allMonths.map(m => revMap.get(m) || 0),
          borderColor: 'rgba(46, 125, 50, 1)',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          fill: true, borderWidth: 2,
          pointBackgroundColor: 'rgba(46, 125, 50, 1)'
        },
        {
          label: 'Expenditure',
          data: allMonths.map(m => expMap.get(m) || 0),
          borderColor: 'rgba(198, 40, 40, 1)',
          backgroundColor: 'rgba(198, 40, 40, 0.1)',
          fill: true, borderWidth: 2,
          pointBackgroundColor: 'rgba(198, 40, 40, 1)'
        }
      ]
    };

    // Site expenses — horizontal bar
    const siteLabels = data.siteExpenses?.categories || [];
    this.siteChartData = {
      labels: siteLabels,
      datasets: [{
        label: 'Expenses',
        data: data.siteExpenses?.values || [],
        backgroundColor: [
          'rgba(230,81,0,0.8)', 'rgba(245,124,0,0.8)', 'rgba(251,140,0,0.8)',
          'rgba(255,160,0,0.8)', 'rgba(255,193,7,0.8)', 'rgba(21,101,192,0.8)',
          'rgba(0,151,167,0.8)', 'rgba(46,125,50,0.8)', 'rgba(123,31,162,0.8)',
          'rgba(198,40,40,0.8)'
        ],
        borderWidth: 0,
        borderRadius: 4
      }]
    } as ChartConfiguration<'bar'>['data'];

    // Company split — grouped bar
    const splitValues = data.companySplit?.values || [0, 0, 0, 0];
    this.splitChartData = {
      labels: ['Revenue', 'Expenditure'],
      datasets: [
        {
          label: 'Main',
          data: [splitValues[0] || 0, splitValues[1] || 0],
          backgroundColor: 'rgba(21, 101, 192, 0.8)',
          borderRadius: 4, borderWidth: 0
        },
        {
          label: 'GST',
          data: [splitValues[2] || 0, splitValues[3] || 0],
          backgroundColor: 'rgba(230, 81, 0, 0.8)',
          borderRadius: 4, borderWidth: 0
        }
      ]
    };
  }

  navigateToSites(): void { this.router.navigate(['/sites']); }
  navigateToTransactions(): void { this.router.navigate(['/transactions']); }

  formatCurrency(val: number | undefined | null): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getFinancialYear(): string {
    if (!this.data) return '';
    return `FY ${this.data.startDate} → ${this.data.endDate}`;
  }
}

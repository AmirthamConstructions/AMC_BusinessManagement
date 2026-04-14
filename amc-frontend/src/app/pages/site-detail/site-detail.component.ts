import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SiteService } from '../../services/site.service';
import { SiteAnalytics, ChargeRow, LabourEntry, MaterialSummaryRow } from '../../models/site-analytics.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-site-detail',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './site-detail.component.html',
  styleUrl: './site-detail.component.scss'
})
export class SiteDetailComponent implements OnInit, AfterViewInit {

  siteId = '';
  analytics: SiteAnalytics | null = null;
  loading = false;
  exporting = false;

  // ── Charges table ──
  chargesDisplayedColumns = ['date', 'type', 'description', 'party', 'amount'];
  chargesDataSource = new MatTableDataSource<ChargeRow>();
  chargesSearch = '';
  chargesFilterType = '';

  // ── Materials table ──
  materialsDisplayedColumns = ['itemName', 'entryCount', 'totalQuantity', 'avgRate', 'totalAmount'];
  materialsDataSource = new MatTableDataSource<MaterialSummaryRow>();

  // ── Labour table ──
  labourDisplayedColumns = ['date', 'description', 'party', 'amount'];
  labourDataSource = new MatTableDataSource<LabourEntry>();

  @ViewChild('chargesPaginator') chargesPaginator!: MatPaginator;
  @ViewChild('chargesSort') chargesSort!: MatSort;
  @ViewChild('labourPaginator') labourPaginator!: MatPaginator;
  @ViewChild('matPaginator') matPaginator!: MatPaginator;

  // ── Monthly trend chart ──
  trendChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => ' ₹' + Number(ctx.parsed.y).toLocaleString('en-IN')
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (val) => '₹' + Number(val).toLocaleString('en-IN'), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } }
    },
    elements: { line: { tension: 0.4 }, point: { radius: 4, hoverRadius: 6 } }
  };

  // ── Expense breakdown doughnut ──
  doughnutChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { font: { size: 12 }, padding: 16 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ₹` + Number(ctx.parsed).toLocaleString('en-IN')
        }
      }
    },
    cutout: '60%'
  };

  // ── Material bar chart (top 8) ──
  matBarChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  matBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ' ₹' + Number(ctx.parsed.x).toLocaleString('en-IN')
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (val) => '₹' + Number(val).toLocaleString('en-IN'), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      y: { ticks: { font: { size: 11 } } }
    }
  };

  // Date range filter for charges
  filterDateFrom = '';
  filterDateTo = '';
  allCharges: ChargeRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private siteService: SiteService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.siteId = this.route.snapshot.paramMap.get('id') || '';
    if (this.siteId) {
      this.loadAnalytics();
    } else {
      this.router.navigate(['/sites']);
    }
  }

  ngAfterViewInit(): void {
    this.chargesDataSource.paginator = this.chargesPaginator;
    this.chargesDataSource.sort = this.chargesSort;
    this.chargesDataSource.filterPredicate = (data: ChargeRow, filter: string) => {
      const search = filter.toLowerCase();
      return (data.description || '').toLowerCase().includes(search)
        || (data.type || '').toLowerCase().includes(search)
        || (data.party || '').toLowerCase().includes(search);
    };
    this.labourDataSource.paginator = this.labourPaginator;
    this.materialsDataSource.paginator = this.matPaginator;
  }

  loadAnalytics(): void {
    this.loading = true;
    this.siteService.getSiteAnalytics(this.siteId).subscribe({
      next: (data) => {
        this.analytics = data;
        this.allCharges = data.allCharges || [];
        this.chargesDataSource.data = this.allCharges;
        this.labourDataSource.data = data.labourEntries || [];
        this.materialsDataSource.data = data.topMaterials || [];
        this.buildCharts(data);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load site analytics', 'OK', { duration: 3000 });
        this.loading = false;
        this.router.navigate(['/sites']);
      }
    });
  }

  buildCharts(data: SiteAnalytics): void {
    // Monthly trend line chart
    const months = Array.from(new Set([
      ...(data.monthlyExpenses || []).map(m => m.month),
      ...(data.monthlyCredits || []).map(m => m.month)
    ])).sort();

    const expMap = new Map((data.monthlyExpenses || []).map(m => [m.month, m.amount]));
    const credMap = new Map((data.monthlyCredits || []).map(m => [m.month, m.amount]));

    this.trendChartData = {
      labels: months.map(m => this.formatMonthLabel(m)),
      datasets: [
        {
          label: 'Expenses',
          data: months.map(m => expMap.get(m) || 0),
          borderColor: 'rgba(198, 40, 40, 1)',
          backgroundColor: 'rgba(198, 40, 40, 0.1)',
          fill: true,
          borderWidth: 2,
          pointBackgroundColor: 'rgba(198, 40, 40, 1)'
        },
        {
          label: 'Credits',
          data: months.map(m => credMap.get(m) || 0),
          borderColor: 'rgba(46, 125, 50, 1)',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          fill: true,
          borderWidth: 2,
          pointBackgroundColor: 'rgba(46, 125, 50, 1)'
        }
      ]
    };

    // Expense breakdown doughnut
    const breakdown = data.expenseBreakdown || [];
    const colors: Record<string, string> = {
      Material: 'rgba(21, 101, 192, 0.85)',
      Labour:   'rgba(46, 125, 50, 0.85)',
      Other:    'rgba(255, 152, 0, 0.85)'
    };
    this.doughnutChartData = {
      labels: breakdown.map(b => b.category),
      datasets: [{
        data: breakdown.map(b => b.amount),
        backgroundColor: breakdown.map(b => colors[b.category] || 'rgba(150,150,150,0.7)'),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8
      }]
    };

    // Top 8 materials bar chart
    const top8 = (data.topMaterials || []).slice(0, 8);
    this.matBarChartData = {
      labels: top8.map(m => this.truncate(m.itemName, 22)),
      datasets: [{
        label: 'Amount',
        data: top8.map(m => m.totalAmount),
        backgroundColor: [
          'rgba(21, 101, 192, 0.8)', 'rgba(0, 151, 167, 0.8)',
          'rgba(46, 125, 50, 0.8)',  'rgba(123, 31, 162, 0.8)',
          'rgba(230, 81, 0, 0.8)',   'rgba(198, 40, 40, 0.8)',
          'rgba(245, 127, 23, 0.8)', 'rgba(56, 142, 60, 0.8)'
        ],
        borderWidth: 0,
        borderRadius: 4
      }]
    } as ChartConfiguration<'bar'>['data'];
  }

  // ── Filter charges ────────────────────────────────────────────────────────

  applyChargesFilter(): void {
    let filtered = [...this.allCharges];
    if (this.chargesFilterType) {
      filtered = filtered.filter(c => c.type === this.chargesFilterType);
    }
    if (this.filterDateFrom) {
      filtered = filtered.filter(c => c.date >= this.filterDateFrom);
    }
    if (this.filterDateTo) {
      filtered = filtered.filter(c => c.date <= this.filterDateTo);
    }
    this.chargesDataSource.data = filtered;
    this.chargesDataSource.filter = this.chargesSearch.trim().toLowerCase();
    if (this.chargesPaginator) this.chargesPaginator.firstPage();
  }

  onChargesSearch(): void {
    this.chargesDataSource.filter = this.chargesSearch.trim().toLowerCase();
  }

  clearChargesFilters(): void {
    this.chargesSearch = '';
    this.chargesFilterType = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyChargesFilter();
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportExcel(): void {
    this.exporting = true;
    this.siteService.exportSiteDetail(this.siteId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Site_${this.analytics?.siteName || this.siteId}_Report.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
        this.snackBar.open('Export downloaded', 'OK', { duration: 2000 });
      },
      error: () => {
        this.exporting = false;
        this.snackBar.open('Export failed', 'OK', { duration: 3000 });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatCurrency(value: number | undefined | null): string {
    return '₹' + (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getChargesTotal(): number {
    return this.chargesDataSource.filteredData.reduce((sum, c) => sum + (c.amount || 0), 0);
  }

  getLabourTotal(): number {
    return (this.analytics?.labourEntries || []).reduce((sum, l) => sum + (l.amount || 0), 0);
  }

  getUtilizationPct(): number {
    if (!this.analytics || !this.analytics.quotationAmount) return 0;
    return Math.min(100, Math.round((this.analytics.totalDebits / this.analytics.quotationAmount) * 100));
  }

  getBudgetClass(): string {
    const pct = this.getUtilizationPct();
    if (pct >= 100) return 'over-budget';
    if (pct >= 85)  return 'near-budget';
    return 'on-budget';
  }

  goBack(): void {
    this.router.navigate(['/sites']);
  }

  private formatMonthLabel(monthKey: string): string {
    if (!monthKey || !monthKey.includes('-')) return monthKey;
    const [year, month] = monthKey.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  }

  private truncate(text: string, len: number): string {
    return text && text.length > len ? text.substring(0, len) + '…' : text;
  }
}

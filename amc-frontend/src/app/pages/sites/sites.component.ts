import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { SiteService } from '../../services/site.service';
import { Site } from '../../models/site.model';
import { SitesOverview } from '../../models/site-analytics.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.scss'
})
export class SitesComponent implements OnInit, AfterViewInit {

  // ── Tab control ──
  selectedTab = 0;

  // ── Sites table ──
  displayedColumns = ['name', 'clientName', 'company', 'quotationAmount', 'status', 'actions'];
  comparisonColumns = ['siteName', 'company', 'quotationAmount', 'totalExpense', 'materialCost', 'labourCost', 'profit', 'roi', 'status'];
  dataSource = new MatTableDataSource<Site>();
  allSites: Site[] = [];
  searchText = '';
  filterCompany = '';
  filterStatus = '';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('siteFormDialog') siteFormDialogRef!: TemplateRef<any>;

  // ── Analytics overview ──
  overview: SitesOverview | null = null;
  overviewLoading = false;

  // ── Dialog / Form ──
  editingSite: Site | null = null;
  saving = false;
  siteForm!: FormGroup;
  private dialogRef: MatDialogRef<any> | null = null;

  // ── Charts ──
  // Bar chart: Quotation vs Actual Expense (top 10 sites)
  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Quotation vs Actual Expense (Top Sites)', font: { size: 14 } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (val) => '₹' + Number(val).toLocaleString('en-IN') }
      }
    }
  };

  // Horizontal bar: Top 5 Profitable
  profitChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  profitChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top 5 Most Profitable Sites', font: { size: 14 } }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (val) => '₹' + Number(val).toLocaleString('en-IN') }
      }
    }
  };

  // Horizontal bar: Top 5 Expensive
  expenseChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  expenseChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top 5 Most Expensive Sites', font: { size: 14 } }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (val) => '₹' + Number(val).toLocaleString('en-IN') }
      }
    }
  };

  // Doughnut: Expense breakdown
  doughnutChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Overall Expense Breakdown', font: { size: 14 } }
    }
  };

  constructor(
    private siteService: SiteService,
    private snackBar: MatSnackBar,
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadSites();
    this.loadOverview();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: Site, filter: string) => {
      const search = filter.toLowerCase();
      return (data.name || '').toLowerCase().includes(search)
        || (data.clientName || '').toLowerCase().includes(search)
        || (data.siteId || '').toLowerCase().includes(search)
        || (data.address || '').toLowerCase().includes(search);
    };
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  private initForm(site?: Site): void {
    this.siteForm = this.fb.group({
      name:            [site?.name || '', Validators.required],
      clientName:      [site?.clientName || ''],
      company:         [site?.company || 'Main', Validators.required],
      quotationAmount: [site?.quotationAmount || null],
      address:         [site?.address || ''],
      contactNumber:   [site?.contactNumber || ''],
      dateOfStart:     [site?.dateOfStart ? new Date(site.dateOfStart) : null],
      dueDate:         [site?.dueDate ? new Date(site.dueDate) : null],
      status:          [site?.status || 'Planning', Validators.required]
    });
  }

  // ── Sites List ──────────────────────────────────────────────────────────────

  loadSites(): void {
    this.loading = true;
    this.siteService.getAll().subscribe({
      next: (data) => {
        this.allSites = data;
        this.applyAllFilters();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load sites', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyAllFilters(): void {
    let filtered = [...this.allSites];
    if (this.filterCompany) {
      filtered = filtered.filter(s => s.company === this.filterCompany);
    }
    if (this.filterStatus) {
      filtered = filtered.filter(s => s.status === this.filterStatus);
    }
    this.dataSource.data = filtered;
    this.dataSource.filter = this.searchText.trim().toLowerCase();
    if (this.paginator) this.paginator.firstPage();
  }

  onSearchChange(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterCompany = '';
    this.filterStatus = '';
    this.applyAllFilters();
  }

  viewSiteDetail(site: Site): void {
    this.router.navigate(['/sites', site.id]);
  }

  viewSiteDetailById(siteId: string): void {
    if (!siteId) return;
    const found = this.allSites.find(s => s.siteId === siteId);
    if (found) {
      this.router.navigate(['/sites', found.id]);
    } else {
      this.router.navigate(['/sites', siteId]);
    }
  }

  // ── CRUD Dialog ──────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.editingSite = null;
    this.initForm();
    this.dialogRef = this.dialog.open(this.siteFormDialogRef, { width: '640px', disableClose: false });
  }

  openEditDialog(site: Site): void {
    this.editingSite = site;
    this.initForm(site);
    this.dialogRef = this.dialog.open(this.siteFormDialogRef, { width: '640px', disableClose: false });
  }

  saveSite(): void {
    if (this.siteForm.invalid) return;
    this.saving = true;

    const raw = this.siteForm.value;
    const payload: Partial<Site> = {
      name:            raw.name,
      clientName:      raw.clientName,
      company:         raw.company,
      quotationAmount: raw.quotationAmount ? Number(raw.quotationAmount) : undefined,
      address:         raw.address,
      contactNumber:   raw.contactNumber,
      dateOfStart:     raw.dateOfStart ? this.formatDate(raw.dateOfStart) : undefined,
      dueDate:         raw.dueDate ? this.formatDate(raw.dueDate) : undefined,
      status:          raw.status
    };

    const op = this.editingSite
      ? this.siteService.update(this.editingSite.id, payload)
      : this.siteService.create(payload);

    op.subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef?.close();
        this.snackBar.open(this.editingSite ? 'Site updated' : 'Site created', 'OK', { duration: 2000 });
        this.loadSites();
        this.loadOverview();
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save site', 'OK', { duration: 3000 });
      }
    });
  }

  deleteRow(id: string): void {
    if (confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      this.siteService.delete(id).subscribe({
        next: () => {
          this.loadSites();
          this.loadOverview();
          this.snackBar.open('Site deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete site', 'OK', { duration: 3000 })
      });
    }
  }

  // ── Analytics Overview ──────────────────────────────────────────────────────

  loadOverview(): void {
    this.overviewLoading = true;
    this.siteService.getSitesOverview().subscribe({
      next: (data) => {
        this.overview = data;
        this.buildCharts(data);
        this.overviewLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load site analytics', 'OK', { duration: 3000 });
        this.overviewLoading = false;
      }
    });
  }

  buildCharts(data: SitesOverview): void {
    // Bar chart: top 10 sites by expense
    const top10 = [...data.siteComparisons]
      .filter(s => s.totalExpense > 0 || s.quotationAmount > 0)
      .sort((a, b) => b.totalExpense - a.totalExpense)
      .slice(0, 10);

    this.barChartData = {
      labels: top10.map(s => this.truncate(s.siteName || s.siteId, 20)),
      datasets: [
        {
          label: 'Quotation',
          data: top10.map(s => s.quotationAmount || 0),
          backgroundColor: 'rgba(21, 101, 192, 0.75)',
          borderColor: 'rgba(21, 101, 192, 1)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Actual Expense',
          data: top10.map(s => s.totalExpense || 0),
          backgroundColor: 'rgba(198, 40, 40, 0.75)',
          borderColor: 'rgba(198, 40, 40, 1)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    } as ChartConfiguration<'bar'>['data'];

    // Top 5 profitable
    this.profitChartData = {
      labels: data.topProfitable.map(s => this.truncate(s.siteName || s.siteId, 20)),
      datasets: [{
        label: 'Profit',
        data: data.topProfitable.map(s => s.profit || 0),
        backgroundColor: data.topProfitable.map(s =>
          (s.profit || 0) >= 0 ? 'rgba(46, 125, 50, 0.8)' : 'rgba(198, 40, 40, 0.8)'
        ),
        borderWidth: 0,
        borderRadius: 4
      }]
    } as ChartConfiguration<'bar'>['data'];

    // Top 5 expensive
    this.expenseChartData = {
      labels: data.topExpensive.map(s => this.truncate(s.siteName || s.siteId, 20)),
      datasets: [{
        label: 'Total Expense',
        data: data.topExpensive.map(s => s.totalExpense || 0),
        backgroundColor: [
          'rgba(230, 81, 0, 0.85)',
          'rgba(245, 124, 0, 0.85)',
          'rgba(251, 140, 0, 0.85)',
          'rgba(255, 160, 0, 0.85)',
          'rgba(255, 193, 7, 0.85)'
        ],
        borderWidth: 0,
        borderRadius: 4
      }]
    } as ChartConfiguration<'bar'>['data'];

    // Doughnut
    const matCost = data.totalMaterialCost || 0;
    const labCost = data.totalLabourCost || 0;
    const otherCost = Math.max(0, (data.totalExpenses || 0) - matCost - labCost);

    this.doughnutChartData = {
      labels: ['Material Cost', 'Labour Cost', 'Other Expenses'],
      datasets: [{
        data: [matCost, labCost, otherCost],
        backgroundColor: [
          'rgba(21, 101, 192, 0.8)',
          'rgba(46, 125, 50, 0.8)',
          'rgba(255, 152, 0, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8
      }]
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatCurrency(value: number | undefined | null): string {
    return '₹' + (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getOtherExpenses(overview: SitesOverview): number {
    return Math.max(0, (overview.totalExpenses || 0) - (overview.totalMaterialCost || 0) - (overview.totalLabourCost || 0));
  }

  getProfitClass(profit: number | undefined | null): string {
    if (!profit) return '';
    return profit >= 0 ? 'profit-positive' : 'profit-negative';
  }

  private truncate(text: string, len: number): string {
    return text && text.length > len ? text.substring(0, len) + '…' : text;
  }

  private formatDate(d: Date | string): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
  }
}

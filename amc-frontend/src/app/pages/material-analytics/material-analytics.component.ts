import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { MaterialService } from '../../services/material.service';
import { SiteService } from '../../services/site.service';
import { Site } from '../../models/site.model';
import {
  MaterialRateAnalysis, ItemRateInfo,
  MaterialUsageReport,
  MaterialRoiAnalysis,
  MaterialInventorySummary, InventoryRow,
  PriceListItem
} from '../../models/material-analytics.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-material-analytics',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './material-analytics.component.html',
  styleUrl: './material-analytics.component.scss'
})
export class MaterialAnalyticsComponent implements OnInit, AfterViewInit {
  activeTab = 0;
  loading = false;

  // ── R4.1: Rate Analysis ──────────────────────────────────────────────────
  rateAnalysis: MaterialRateAnalysis | null = null;
  rateColumns = ['itemName', 'minRate', 'maxRate', 'avgRate', 'lastRate', 'trend', 'purchaseCount', 'totalAmount'];
  rateDataSource = new MatTableDataSource<ItemRateInfo>();
  rateSearchText = '';
  selectedRateItem: ItemRateInfo | null = null;
  rateChart: any = null;

  @ViewChild('ratePaginator') ratePaginator!: MatPaginator;
  @ViewChild('rateSort') rateSort!: MatSort;

  // ── R4.2: Usage Report ───────────────────────────────────────────────────
  sites: Site[] = [];
  selectedUsageSiteId = '';
  usageReport: MaterialUsageReport | null = null;
  usageColumns = ['itemName', 'totalQuantity', 'totalAmount', 'avgRate', 'purchaseCount', 'lastPurchaseDate'];
  usageDataSource = new MatTableDataSource<any>();
  usageChart: any = null;

  // ── R4.3: ROI Analysis ───────────────────────────────────────────────────
  selectedRoiSiteId = '';
  roiAnalysis: MaterialRoiAnalysis | null = null;
  roiChart: any = null;

  // ── R4.4: Price List ─────────────────────────────────────────────────────
  priceList: PriceListItem[] = [];
  priceColumns = ['itemName', 'category', 'expectedRate', 'minRate', 'maxRate', 'unit', 'supplier', 'actions'];
  priceDataSource = new MatTableDataSource<PriceListItem>();
  priceSearchText = '';
  showPriceForm = false;
  editingPriceItem: PriceListItem | null = null;
  priceForm: Partial<PriceListItem> = {};
  categories = ['Electrical', 'Plumbing', 'Civil', 'M-Sand', 'Cement', 'Painting', 'Tiles', 'Other'];
  units = ['Nos', 'Kg', 'Bags', 'Sqft', 'Litre', 'Bundle', 'Truck', 'CFT'];

  @ViewChild('pricePaginator') pricePaginator!: MatPaginator;

  // ── R4.5: Inventory Summary ──────────────────────────────────────────────
  inventorySummary: MaterialInventorySummary | null = null;
  inventoryColumns = ['itemName', 'category', 'totalQuantity', 'totalAmount', 'avgRate', 'lastRate', 'sitesUsedCount', 'purchaseCount', 'lastPurchaseDate'];
  inventoryDataSource = new MatTableDataSource<InventoryRow>();
  inventorySearchText = '';
  selectedCategory = '';

  @ViewChild('inventoryPaginator') inventoryPaginator!: MatPaginator;
  @ViewChild('inventorySort') inventorySort!: MatSort;

  // Overpayment alerts (R4.4)
  overpaymentAlerts: { itemName: string; lastRate: number; expectedRate: number; overpayPct: number }[] = [];

  constructor(
    private materialService: MaterialService,
    private siteService: SiteService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSites();
    this.loadRateAnalysis();
  }

  ngAfterViewInit(): void {
    this.rateDataSource.paginator = this.ratePaginator;
    this.rateDataSource.sort = this.rateSort;
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    if (index === 0 && !this.rateAnalysis) this.loadRateAnalysis();
    if (index === 3 && this.priceList.length === 0) this.loadPriceList();
    if (index === 4 && !this.inventorySummary) this.loadInventorySummary();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.1 — Rate Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  loadRateAnalysis(): void {
    this.loading = true;
    this.materialService.getRateAnalysis().subscribe({
      next: (data) => {
        this.rateAnalysis = data;
        this.rateDataSource.data = data.items;
        this.loading = false;
        this.checkOverpayments();
      },
      error: () => {
        this.snackBar.open('Failed to load rate analysis', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyRateFilter(): void {
    this.rateDataSource.filter = this.rateSearchText.trim().toLowerCase();
  }

  selectRateItem(item: ItemRateInfo): void {
    this.selectedRateItem = item;
    setTimeout(() => this.buildRateChart(item), 100);
  }

  closeRateChart(): void {
    this.selectedRateItem = null;
    if (this.rateChart) { this.rateChart.destroy(); this.rateChart = null; }
  }

  private buildRateChart(item: ItemRateInfo): void {
    if (this.rateChart) this.rateChart.destroy();
    const canvas = document.getElementById('rateHistoryChart') as HTMLCanvasElement;
    if (!canvas) return;

    const labels = item.rateHistory.map(p => p.date || '');
    const rates = item.rateHistory.map(p => p.rate);

    this.rateChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Rate — ${item.itemName}`,
          data: rates,
          borderColor: '#1565c0',
          backgroundColor: 'rgba(21,101,192,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: false, ticks: { callback: (v) => '₹' + v } }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.2 — Usage Report
  // ═══════════════════════════════════════════════════════════════════════════

  loadSites(): void {
    this.siteService.getAll().subscribe({
      next: (sites) => this.sites = sites,
      error: () => this.snackBar.open('Failed to load sites', 'OK', { duration: 3000 })
    });
  }

  loadUsageReport(): void {
    if (!this.selectedUsageSiteId) return;
    this.loading = true;
    this.materialService.getUsageReport(this.selectedUsageSiteId).subscribe({
      next: (data) => {
        this.usageReport = data;
        this.usageDataSource.data = data.items;
        this.loading = false;
        setTimeout(() => this.buildUsageChart(data), 100);
      },
      error: () => {
        this.snackBar.open('Failed to load usage report', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private buildUsageChart(data: MaterialUsageReport): void {
    if (this.usageChart) this.usageChart.destroy();
    const canvas = document.getElementById('usageChart') as HTMLCanvasElement;
    if (!canvas) return;

    const top10 = data.items.slice(0, 10);

    this.usageChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top10.map(i => this.truncate(i.itemName, 15)),
        datasets: [{
          label: 'Total Amount (₹)',
          data: top10.map(i => i.totalAmount),
          backgroundColor: '#42a5f5'
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') } }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.3 — ROI Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  loadRoiAnalysis(): void {
    if (!this.selectedRoiSiteId) return;
    this.loading = true;
    this.materialService.getRoiAnalysis(this.selectedRoiSiteId).subscribe({
      next: (data) => {
        this.roiAnalysis = data;
        this.loading = false;
        setTimeout(() => this.buildRoiChart(data), 100);
      },
      error: () => {
        this.snackBar.open('Failed to load ROI analysis', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private buildRoiChart(data: MaterialRoiAnalysis): void {
    if (this.roiChart) this.roiChart.destroy();
    const canvas = document.getElementById('roiChart') as HTMLCanvasElement;
    if (!canvas) return;

    this.roiChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Material Cost', 'Labour Cost', 'Other Cost', 'Profit'],
        datasets: [{
          data: [data.materialCost, data.labourCost, data.otherCost, Math.max(data.profit, 0)],
          backgroundColor: ['#ef5350', '#ff9800', '#9e9e9e', '#4caf50']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` } }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.4 — Price List
  // ═══════════════════════════════════════════════════════════════════════════

  loadPriceList(): void {
    this.loading = true;
    this.materialService.getPriceList().subscribe({
      next: (data) => {
        this.priceList = data;
        this.priceDataSource.data = data;
        this.loading = false;
        if (this.pricePaginator) this.priceDataSource.paginator = this.pricePaginator;
        this.checkOverpayments();
      },
      error: () => {
        this.snackBar.open('Failed to load price list', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyPriceFilter(): void {
    this.priceDataSource.filter = this.priceSearchText.trim().toLowerCase();
  }

  openPriceForm(item?: PriceListItem): void {
    this.editingPriceItem = item || null;
    this.priceForm = item ? { ...item } : { category: 'Other', unit: 'Nos' };
    this.showPriceForm = true;
  }

  closePriceForm(): void {
    this.showPriceForm = false;
    this.editingPriceItem = null;
    this.priceForm = {};
  }

  savePriceItem(): void {
    if (!this.priceForm.itemName || !this.priceForm.expectedRate) {
      this.snackBar.open('Item name and expected rate are required', 'OK', { duration: 3000 });
      return;
    }
    if (this.editingPriceItem) {
      this.materialService.updatePriceListItem(this.editingPriceItem.id, this.priceForm).subscribe({
        next: () => { this.closePriceForm(); this.loadPriceList(); this.snackBar.open('Updated', 'OK', { duration: 2000 }); },
        error: () => this.snackBar.open('Failed to update', 'OK', { duration: 3000 })
      });
    } else {
      this.materialService.createPriceListItem(this.priceForm).subscribe({
        next: () => { this.closePriceForm(); this.loadPriceList(); this.snackBar.open('Created', 'OK', { duration: 2000 }); },
        error: () => this.snackBar.open('Failed to create', 'OK', { duration: 3000 })
      });
    }
  }

  deletePriceItem(id: string): void {
    if (confirm('Delete this price list item?')) {
      this.materialService.deletePriceListItem(id).subscribe({
        next: () => { this.loadPriceList(); this.snackBar.open('Deleted', 'OK', { duration: 2000 }); },
        error: () => this.snackBar.open('Failed to delete', 'OK', { duration: 3000 })
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.5 — Inventory Summary
  // ═══════════════════════════════════════════════════════════════════════════

  loadInventorySummary(): void {
    this.loading = true;
    this.materialService.getInventorySummary().subscribe({
      next: (data) => {
        this.inventorySummary = data;
        this.inventoryDataSource.data = data.items;
        this.loading = false;
        setTimeout(() => {
          if (this.inventoryPaginator) this.inventoryDataSource.paginator = this.inventoryPaginator;
          if (this.inventorySort) this.inventoryDataSource.sort = this.inventorySort;
        });
      },
      error: () => {
        this.snackBar.open('Failed to load inventory summary', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyInventoryFilter(): void {
    this.inventoryDataSource.filter = this.inventorySearchText.trim().toLowerCase();
  }

  filterByCategory(): void {
    if (this.selectedCategory && this.inventorySummary) {
      this.inventoryDataSource.data = this.inventorySummary.items.filter(i => i.category === this.selectedCategory);
    } else if (this.inventorySummary) {
      this.inventoryDataSource.data = this.inventorySummary.items;
    }
  }

  exportExcel(): void {
    this.materialService.exportExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Material_Inventory_Report.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Excel exported', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Export failed', 'OK', { duration: 3000 })
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Overpayment Detection (R4.4)
  // ═══════════════════════════════════════════════════════════════════════════

  private checkOverpayments(): void {
    if (!this.rateAnalysis || this.priceList.length === 0) return;
    this.overpaymentAlerts = [];
    for (const item of this.rateAnalysis.items) {
      const priceEntry = this.priceList.find(p => p.itemName.toLowerCase() === item.itemName.toLowerCase());
      if (priceEntry && item.lastRate > priceEntry.expectedRate) {
        const pct = ((item.lastRate - priceEntry.expectedRate) / priceEntry.expectedRate) * 100;
        this.overpaymentAlerts.push({
          itemName: item.itemName,
          lastRate: item.lastRate,
          expectedRate: priceEntry.expectedRate,
          overpayPct: Math.round(pct * 10) / 10
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  formatCurrency(value: number | undefined | null): string {
    return '₹' + (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  private truncate(text: string, len: number): string {
    return text && text.length > len ? text.substring(0, len) + '…' : text;
  }

  getTrendIcon(trend: string): string {
    if (trend === 'UP') return 'trending_up';
    if (trend === 'DOWN') return 'trending_down';
    return 'trending_flat';
  }

  getTrendColor(trend: string): string {
    if (trend === 'UP') return '#e53935';
    if (trend === 'DOWN') return '#43a047';
    return '#757575';
  }
}

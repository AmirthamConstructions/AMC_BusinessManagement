import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DashboardService } from '../../services/dashboard.service';
import { CompanyComparison } from '../../models/dashboard.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-company-reports',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './company-reports.component.html',
  styleUrl: './company-reports.component.scss'
})
export class CompanyReportsComponent implements OnInit {
  data: CompanyComparison | null = null;
  loading = false;

  // Date filter
  filterStartDate = '';
  filterEndDate = '';
  datePresets = [
    { label: 'Last 3M', months: 3 },
    { label: 'Last 6M', months: 6 },
    { label: 'Last 12M', months: 12 },
    { label: 'This FY', months: 0 },
  ];
  activePreset = '';

  constructor(
    private dashboardService: DashboardService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.dashboardService.getCompanyComparison(
      this.filterStartDate || undefined,
      this.filterEndDate || undefined
    ).subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load company comparison', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyDateFilter(): void {
    this.activePreset = '';
    this.loadData();
  }

  applyPreset(preset: { label: string; months: number }): void {
    this.activePreset = preset.label;
    const today = new Date();
    if (preset.months === 0) {
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

  formatCurrency(val: number | undefined | null): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getFinancialYear(): string {
    if (!this.data) return '';
    return `${this.data.startDate} → ${this.data.endDate}`;
  }
}

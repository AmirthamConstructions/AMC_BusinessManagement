import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { GstInwardService } from '../../services/gst-inward.service';
import { GstReconciliation, OutwardSummaryRow, InwardSummaryRow } from '../../models/gst-reconciliation.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-gst-reconciliation',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './gst-reconciliation.component.html',
  styleUrl: './gst-reconciliation.component.scss'
})
export class GstReconciliationComponent implements OnInit {
  selectedYear = '';
  selectedMonth = '';
  loading = false;
  reconciliation: GstReconciliation | null = null;

  // Search filters for the detail tables
  outwardSearch = '';
  inwardSearch = '';

  outwardColumns = ['invoiceNo', 'invoiceDate', 'customerName', 'customerGSTIN', 'taxableValue', 'cgst', 'sgst', 'invoiceValue'];
  inwardColumns = ['purchaseBillNo', 'invoiceDate', 'companyName', 'companyGSTIN', 'taxableValue', 'cgst', 'sgst', 'purchaseBillValue'];

  outwardDataSource = new MatTableDataSource<OutwardSummaryRow>();
  inwardDataSource = new MatTableDataSource<InwardSummaryRow>();

  years: string[] = [];
  months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor(private gstInwardService: GstInwardService, private snackBar: MatSnackBar) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 4; y <= currentYear + 1; y++) {
      this.years.push((y % 100) + '-' + ((y + 1) % 100));
    }
    // Default to current FY and month
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    this.selectedYear = (fy % 100) + '-' + ((fy + 1) % 100);
    this.selectedMonth = this.months[now.getMonth()];
  }

  ngOnInit(): void {
    this.loadReconciliation();
  }

  loadReconciliation(): void {
    if (!this.selectedYear || !this.selectedMonth) {
      this.snackBar.open('Please select both year and month', 'OK', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.outwardSearch = '';
    this.inwardSearch = '';
    this.gstInwardService.getReconciliation(this.selectedYear, this.selectedMonth).subscribe({
      next: (data) => {
        this.reconciliation = data;
        this.outwardDataSource.data = data.outwardDetails || [];
        this.inwardDataSource.data = data.inwardDetails || [];
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load reconciliation data', 'OK', { duration: 3000 });
        this.reconciliation = null;
        this.loading = false;
      }
    });
  }

  onOutwardSearchChange(): void {
    this.outwardDataSource.filter = this.outwardSearch.trim().toLowerCase();
  }

  onInwardSearchChange(): void {
    this.inwardDataSource.filter = this.inwardSearch.trim().toLowerCase();
  }

  formatCurrency(value: number | undefined | null): string {
    return '₹' + (value || 0).toLocaleString('en-IN');
  }

  getPayableClass(): string {
    if (!this.reconciliation) return '';
    return this.reconciliation.netGstPayable >= 0 ? 'payable' : 'refund';
  }
}

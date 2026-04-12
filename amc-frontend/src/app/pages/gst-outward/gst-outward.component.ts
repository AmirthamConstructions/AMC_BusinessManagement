import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { GstOutwardService } from '../../services/gst-outward.service';
import { GstOutward } from '../../models/gst-outward.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-gst-outward',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './gst-outward.component.html',
  styleUrl: './gst-outward.component.scss'
})
export class GstOutwardComponent implements OnInit, AfterViewInit {
  displayedColumns = [
    'invoiceDate', 'invoiceNo', 'customerName', 'customerGSTIN',
    'description', 'taxableValue', 'cgstAmount', 'sgstAmount', 'invoiceValue', 'actions'
  ];
  dataSource = new MatTableDataSource<GstOutward>();
  allData: GstOutward[] = [];                // Full unfiltered dataset
  searchText = '';
  loading = false;
  exporting = false;

  // Summary KPIs (recomputed on every filter change)
  totalTaxable = 0;
  totalCgst = 0;
  totalSgst = 0;
  totalValue = 0;
  invoiceCount = 0;

  // Filter dropdowns
  filterYear = '';
  filterMonth = '';
  years: string[] = [];
  months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Add / Edit form state
  showForm = false;
  editingId: string | null = null;
  formData: Partial<GstOutward> = {};

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private gstService: GstOutwardService,
    private snackBar: MatSnackBar
  ) {
    // Build FY list: 22-23, 23-24, 24-25, 25-26, 26-27
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 4; y <= currentYear + 1; y++) {
      const fy = (y % 100) + '-' + ((y + 1) % 100);
      this.years.push(fy);
    }
  }

  ngOnInit(): void {
    this.resetForm();
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // ── Data Loading ────────────────────────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    this.gstService.getAll(0, 5000).subscribe({
      next: (res) => {
        this.allData = res.data;
        this.applyAllFilters();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load GST outward data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // ── Filtering (year + month dropdown + search text) ─────────────────────────

  applyAllFilters(): void {
    let filtered = [...this.allData];

    // 1) Year dropdown filter
    if (this.filterYear) {
      filtered = filtered.filter(r => r.year === this.filterYear);
    }

    // 2) Month dropdown filter
    if (this.filterMonth) {
      filtered = filtered.filter(r => r.invoiceMonth === this.filterMonth);
    }

    // Set filtered data to table
    this.dataSource.data = filtered;

    // 3) Text search filter (applied on top via MatTableDataSource.filter)
    this.dataSource.filter = this.searchText.trim().toLowerCase();

    // Recompute summary from visible (filtered) data
    this.computeSummary(filtered);

    // Reset paginator to first page
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  onSearchChange(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
    // Recompute summary based on the actual filtered rows
    this.computeSummary(this.dataSource.filteredData);
  }

  computeSummary(data: GstOutward[]): void {
    this.invoiceCount = data.length;
    this.totalTaxable = data.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
    this.totalCgst = data.reduce((sum, r) => sum + (r.cgstAmount || 0), 0);
    this.totalSgst = data.reduce((sum, r) => sum + (r.sgstAmount || 0), 0);
    this.totalValue = data.reduce((sum, r) => sum + (r.invoiceValue || 0), 0);
  }

  // ── Add / Edit Form ─────────────────────────────────────────────────────────

  openAddForm(): void {
    this.resetForm();
    this.editingId = null;
    this.showForm = true;
  }

  openEditForm(row: GstOutward): void {
    this.editingId = row.id;
    this.formData = { ...row };
    // Convert date string to proper input format (yyyy-MM-dd)
    if (row.invoiceDate) {
      this.formData.invoiceDate = row.invoiceDate.toString().substring(0, 10);
    }
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      year: '',
      invoiceMonth: '',
      filingMonth: '',
      invoiceNo: '',
      invoiceDate: '',
      customerName: '',
      customerGSTIN: '',
      description: '',
      taxableValue: 0,
      cgstPercent: 9,
      cgstAmount: 0,
      sgstPercent: 9,
      sgstAmount: 0,
      invoiceValue: 0,
      placeOfSupply: 'Tamil Nadu',
      inputCreditEligible: 'Yes',
      remarks: ''
    };
  }

  // Auto-compute tax amounts when taxable value or rates change
  onTaxableChange(): void {
    const taxable = this.formData.taxableValue || 0;
    const cgstPct = this.formData.cgstPercent || 0;
    const sgstPct = this.formData.sgstPercent || 0;
    this.formData.cgstAmount = Math.round(taxable * cgstPct / 100 * 100) / 100;
    this.formData.sgstAmount = Math.round(taxable * sgstPct / 100 * 100) / 100;
    this.formData.invoiceValue = Math.round((taxable + this.formData.cgstAmount + this.formData.sgstAmount) * 100) / 100;
  }

  // Auto-derive year and month from date
  onDateChange(): void {
    if (this.formData.invoiceDate) {
      const d = new Date(this.formData.invoiceDate);
      if (!isNaN(d.getTime())) {
        const monthIdx = d.getMonth();
        this.formData.invoiceMonth = this.months[monthIdx];
        this.formData.filingMonth = this.months[(monthIdx + 1) % 12];
        const fy = monthIdx >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        this.formData.year = (fy % 100) + '-' + ((fy + 1) % 100);
      }
    }
  }

  saveForm(): void {
    // Basic validation
    if (!this.formData.invoiceNo || !this.formData.invoiceNo.trim()) {
      this.snackBar.open('Invoice number is required', 'OK', { duration: 3000 });
      return;
    }
    if (!this.formData.customerName || !this.formData.customerName.trim()) {
      this.snackBar.open('Customer name is required', 'OK', { duration: 3000 });
      return;
    }

    if (this.editingId) {
      // UPDATE
      this.gstService.update(this.editingId, this.formData).subscribe({
        next: () => {
          this.snackBar.open('Invoice updated successfully', 'OK', { duration: 2000 });
          this.showForm = false;
          this.resetForm();
          this.loadData();
        },
        error: (err) => {
          const msg = err?.error?.error?.message || 'Failed to update invoice';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    } else {
      // CREATE
      this.gstService.create(this.formData).subscribe({
        next: () => {
          this.snackBar.open('Invoice created successfully', 'OK', { duration: 2000 });
          this.showForm = false;
          this.resetForm();
          this.loadData();
        },
        error: (err) => {
          const msg = err?.error?.error?.message || 'Failed to create invoice';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  deleteRow(id: string): void {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      this.gstService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Invoice deleted', 'OK', { duration: 2000 });
          this.loadData();
        },
        error: () => this.snackBar.open('Failed to delete invoice', 'OK', { duration: 3000 })
      });
    }
  }

  // ── Export Excel ────────────────────────────────────────────────────────────

  exportExcel(): void {
    this.exporting = true;
    const year = this.filterYear || undefined;
    const month = this.filterMonth || undefined;
    this.gstService.exportExcel(year, month).subscribe({
      next: (blob) => {
        let filename = 'GSTR-1_Outward';
        if (year) filename += '_' + year;
        if (month) filename += '_' + month;
        filename += '.xlsx';
        saveAs(blob, filename);
        this.exporting = false;
        this.snackBar.open('Excel downloaded successfully', 'OK', { duration: 2000 });
      },
      error: () => {
        this.exporting = false;
        this.snackBar.open('Failed to export Excel', 'OK', { duration: 3000 });
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatCurrency(value: number): string {
    return '₹' + (value || 0).toLocaleString('en-IN');
  }
}

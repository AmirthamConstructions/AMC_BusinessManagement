import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { GstInwardService } from '../../services/gst-inward.service';
import { GstInward } from '../../models/gst-inward.model';
import { Gst2bUploadResult } from '../../models/gst-reconciliation.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-gst-inward',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './gst-inward.component.html',
  styleUrl: './gst-inward.component.scss'
})
export class GstInwardComponent implements OnInit, AfterViewInit {
  displayedColumns = [
    'invoiceDate', 'purchaseBillNo', 'companyName', 'companyGSTIN',
    'description', 'taxableValue', 'cgstAmount', 'sgstAmount', 'purchaseBillValue', 'actions'
  ];
  dataSource = new MatTableDataSource<GstInward>();
  allData: GstInward[] = [];
  searchText = '';
  loading = false;

  // Upload state
  showUploadDialog = false;
  uploading = false;
  selectedFile: File | null = null;
  uploadResult: Gst2bUploadResult | null = null;

  // Filter dropdowns (filter the TABLE, summary, and export)
  filterYear = '';
  filterMonth = '';
  exporting = false;

  // Summary KPIs (recomputed on every filter change)
  totalTaxable = 0;
  totalCgst = 0;
  totalSgst = 0;
  totalValue = 0;
  billCount = 0;

  // Add / Edit form state
  showForm = false;
  editingId: string | null = null;
  formData: Partial<GstInward> = {};

  years: string[] = [];
  months: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private gstService: GstInwardService, private snackBar: MatSnackBar) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 4; y <= currentYear + 1; y++) {
      this.years.push((y % 100) + '-' + ((y + 1) % 100));
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
        this.snackBar.open('Failed to load GST inward data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // ── Filtering (year + month dropdown + search text) ─────────────────────────

  applyAllFilters(): void {
    let filtered = [...this.allData];

    if (this.filterYear) {
      filtered = filtered.filter(r => r.year === this.filterYear);
    }
    if (this.filterMonth) {
      filtered = filtered.filter(r => r.invoiceMonth === this.filterMonth);
    }

    this.dataSource.data = filtered;
    this.dataSource.filter = this.searchText.trim().toLowerCase();
    this.computeSummary(this.dataSource.filteredData);

    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  onSearchChange(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
    this.computeSummary(this.dataSource.filteredData);
  }

  computeSummary(data: GstInward[]): void {
    this.billCount = data.length;
    this.totalTaxable = data.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
    this.totalCgst = data.reduce((sum, r) => sum + (r.cgstAmount || 0), 0);
    this.totalSgst = data.reduce((sum, r) => sum + (r.sgstAmount || 0), 0);
    this.totalValue = data.reduce((sum, r) => sum + (r.purchaseBillValue || 0), 0);
  }

  // ── Add / Edit Form ─────────────────────────────────────────────────────────

  openAddForm(): void {
    this.resetForm();
    this.editingId = null;
    this.showForm = true;
  }

  openEditForm(row: GstInward): void {
    this.editingId = row.id;
    this.formData = { ...row };
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
      purchaseBillNo: '',
      invoiceDate: '',
      companyName: '',
      companyGSTIN: '',
      description: '',
      taxableValue: 0,
      cgstPercent: 9,
      cgstAmount: 0,
      sgstPercent: 9,
      sgstAmount: 0,
      purchaseBillValue: 0,
      placeOfPurchase: 'Tamil Nadu',
      inputCreditEligible: 'Yes',
      remarks: ''
    };
  }

  onTaxableChange(): void {
    const taxable = this.formData.taxableValue || 0;
    const cgstPct = this.formData.cgstPercent || 0;
    const sgstPct = this.formData.sgstPercent || 0;
    this.formData.cgstAmount = Math.round(taxable * cgstPct / 100 * 100) / 100;
    this.formData.sgstAmount = Math.round(taxable * sgstPct / 100 * 100) / 100;
    this.formData.purchaseBillValue = Math.round((taxable + this.formData.cgstAmount + this.formData.sgstAmount) * 100) / 100;
  }

  onDateChange(): void {
    if (this.formData.invoiceDate) {
      const d = new Date(this.formData.invoiceDate);
      if (!isNaN(d.getTime())) {
        const monthIdx = d.getMonth();
        this.formData.invoiceMonth = this.months[monthIdx];
        const fy = monthIdx >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        this.formData.year = (fy % 100) + '-' + ((fy + 1) % 100);
      }
    }
  }

  saveForm(): void {
    if (!this.formData.purchaseBillNo || !this.formData.purchaseBillNo.trim()) {
      this.snackBar.open('Purchase bill number is required', 'OK', { duration: 3000 });
      return;
    }
    if (!this.formData.companyName || !this.formData.companyName.trim()) {
      this.snackBar.open('Supplier name is required', 'OK', { duration: 3000 });
      return;
    }

    if (this.editingId) {
      this.gstService.update(this.editingId, this.formData).subscribe({
        next: () => {
          this.snackBar.open('Purchase bill updated successfully', 'OK', { duration: 2000 });
          this.showForm = false;
          this.resetForm();
          this.loadData();
        },
        error: (err) => {
          const msg = err?.error?.error?.message || 'Failed to update purchase bill';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    } else {
      this.gstService.create(this.formData).subscribe({
        next: () => {
          this.snackBar.open('Purchase bill created successfully', 'OK', { duration: 2000 });
          this.showForm = false;
          this.resetForm();
          this.loadData();
        },
        error: (err) => {
          const msg = err?.error?.error?.message || 'Failed to create purchase bill';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  deleteRow(id: string): void {
    if (confirm('Are you sure you want to delete this purchase bill? This action cannot be undone.')) {
      this.gstService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Purchase bill deleted', 'OK', { duration: 2000 });
          this.loadData();
        },
        error: () => this.snackBar.open('Failed to delete purchase bill', 'OK', { duration: 3000 })
      });
    }
  }

  // ── Upload Excel ─────────────────────────────────────────────────────────

  toggleUploadDialog(): void {
    this.showUploadDialog = !this.showUploadDialog;
    if (!this.showUploadDialog) {
      this.selectedFile = null;
      this.uploadResult = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadResult = null;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.gstService.uploadExcel(this.selectedFile).subscribe({
      next: (result) => {
        this.uploadResult = result;
        this.uploading = false;
        this.snackBar.open(
          `Imported ${result.importedCount} rows, ${result.skippedCount} skipped, ${result.errorCount} errors`,
          'OK', { duration: 5000 }
        );
        this.loadData();
      },
      error: (err) => {
        this.uploading = false;
        const msg = err.error?.error?.message || 'Upload failed';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
      }
    });
  }

  // ── Export Excel ─────────────────────────────────────────────────────────

  exportExcel(): void {
    this.exporting = true;
    const year = this.filterYear || undefined;
    const month = this.filterMonth || undefined;
    this.gstService.exportExcel(year, month).subscribe({
      next: (blob) => {
        let filename = 'GSTR-2B_Inward';
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

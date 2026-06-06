import { Component, OnInit, ViewChild, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../models/transaction.model';
import { SiteService } from '../../services/site.service';
import { Site } from '../../models/site.model';
import { CompanyFilterService, CompanyFilter } from '../../services/company-filter.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  displayedColumns = ['date', 'transactionId', 'company', 'siteName', 'type', 'nature', 'amount', 'party', 'modeOfPayment', 'actions'];
  dataSource = new MatTableDataSource<Transaction>();
  allTransactions: Transaction[] = [];
  searchText = '';
  loading = false;

  // Company split summary
  summary = {
    mainCredits: 0, mainDebits: 0, mainNet: 0,
    gstCredits: 0, gstDebits: 0, gstNet: 0,
    totalCredits: 0, totalDebits: 0, totalNet: 0
  };

  // Form state
  showForm = false;
  editingId: string | null = null;
  txnForm!: FormGroup;
  saving = false;
  sites: Site[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private txnService: TransactionService,
    private siteService: SiteService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    public companyFilter: CompanyFilterService
  ) {
    // React to global company filter changes
    effect(() => {
      const company = this.companyFilter.selectedCompany();
      this.filterByCompany(company);
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadSites();
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    this.txnService.getAll(0, 500).subscribe({
      next: (res) => {
        this.allTransactions = res.data;
        this.filterByCompany(this.companyFilter.selectedCompany());
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load transactions', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  filterByCompany(company: CompanyFilter): void {
    let filtered = this.allTransactions;
    if (company !== 'All') {
      filtered = this.allTransactions.filter(t => t.company === company);
    }
    this.dataSource.data = filtered;
    this.computeSummary();

    // Re-apply text search filter
    if (this.searchText) {
      this.dataSource.filter = this.searchText.trim().toLowerCase();
    }
  }

  computeSummary(): void {
    const all = this.allTransactions;
    const mainTxns = all.filter(t => t.company === 'Main');
    const gstTxns = all.filter(t => t.company === 'GST');

    this.summary.mainCredits = mainTxns.filter(t => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0);
    this.summary.mainDebits = mainTxns.filter(t => t.type === 'Debit').reduce((s, t) => s + (t.amount || 0), 0);
    this.summary.mainNet = this.summary.mainCredits - this.summary.mainDebits;

    this.summary.gstCredits = gstTxns.filter(t => t.type === 'Credit').reduce((s, t) => s + (t.amount || 0), 0);
    this.summary.gstDebits = gstTxns.filter(t => t.type === 'Debit').reduce((s, t) => s + (t.amount || 0), 0);
    this.summary.gstNet = this.summary.gstCredits - this.summary.gstDebits;

    this.summary.totalCredits = this.summary.mainCredits + this.summary.gstCredits;
    this.summary.totalDebits = this.summary.mainDebits + this.summary.gstDebits;
    this.summary.totalNet = this.summary.totalCredits - this.summary.totalDebits;
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
  }

  deleteRow(id: string): void {
    if (confirm('Delete this transaction?')) {
      this.txnService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Transaction deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete', 'OK', { duration: 3000 })
      });
    }
  }

  getTypeClass(type: string): string {
    return type === 'Credit' ? 'chip-credit' : 'chip-debit';
  }

  getCompanyClass(company: string): string {
    return company === 'Main' ? 'chip-main' : 'chip-gst';
  }

  formatCurrency(val: number): string {
    return '₹' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  // ── Form methods ─────────────────────────────────────────────

  initForm(): void {
    this.txnForm = this.fb.group({
      date: ['', Validators.required],
      company: ['Main', Validators.required],
      siteId: [''],
      siteName: [''],
      type: ['Debit', Validators.required],
      nature: [''],
      description: [''],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      party: [''],
      invoiceNo: [''],
      gstNo: [''],
      companyAccount: [''],
      modeOfPayment: [''],
      notes: ['']
    });
  }

  loadSites(): void {
    this.siteService.getAll().subscribe({
      next: (sites) => this.sites = sites,
      error: () => {} // silent
    });
  }

  onSiteChange(): void {
    const siteId = this.txnForm.get('siteId')?.value;
    const site = this.sites.find(s => s.id === siteId);
    if (site) {
      this.txnForm.patchValue({ siteName: site.name });
    }
  }

  openAddForm(): void {
    this.editingId = null;
    this.txnForm.reset({ company: 'Main', type: 'Debit' });
    this.showForm = true;
  }

  openEditForm(txn: Transaction): void {
    this.editingId = txn.id;
    this.txnForm.patchValue({
      date: txn.date,
      company: txn.company,
      siteId: txn.siteId || '',
      siteName: txn.siteName || '',
      type: txn.type,
      nature: txn.nature || '',
      description: txn.description || '',
      amount: txn.amount,
      party: txn.party || '',
      invoiceNo: txn.invoiceNo || '',
      gstNo: txn.gstNo || '',
      companyAccount: txn.companyAccount || '',
      modeOfPayment: txn.modeOfPayment || '',
      notes: txn.notes || ''
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  saveTransaction(): void {
    if (this.txnForm.invalid) {
      this.txnForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload = this.txnForm.value;

    const op = this.editingId
      ? this.txnService.update(this.editingId, payload)
      : this.txnService.create(payload);

    op.subscribe({
      next: () => {
        this.snackBar.open(this.editingId ? 'Transaction updated' : 'Transaction created', 'OK', { duration: 2000 });
        this.showForm = false;
        this.editingId = null;
        this.saving = false;
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Failed to save transaction', 'OK', { duration: 3000 });
        this.saving = false;
      }
    });
  }
}

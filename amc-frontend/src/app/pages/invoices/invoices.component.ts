import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { InvoiceService } from '../../services/invoice.service';
import { SiteService } from '../../services/site.service';
import { GstOutwardService } from '../../services/gst-outward.service';
import { Invoice, InvoiceLineItem, InvoiceKpi, COMPANY_INFO } from '../../models/invoice.model';
import { Site } from '../../models/site.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent implements OnInit {
  Math = Math; // expose for template
  company = COMPANY_INFO;

  // View state: 'list' | 'form' | 'preview'
  view: 'list' | 'form' | 'preview' = 'list';
  editingId: string | null = null;

  // List
  dataSource = new MatTableDataSource<Invoice>();
  displayedColumns = ['invoiceNo', 'invoiceDate', 'customerName', 'nameOfWork', 'grandTotal', 'status', 'actions'];
  listLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Form
  invoiceForm!: FormGroup;
  sites: Site[] = [];
  existingCustomers: { name: string; address: string; gstin: string; state: string; pincode: string }[] = [];
  saving = false;

  // Preview
  previewInvoice!: Invoice;
  @ViewChild('invoicePrint') invoicePrintRef!: ElementRef;
  generatingPdf = false;

  // R1.4 — Templates
  templates: Invoice[] = [];
  showTemplateDialog = false;
  templateName = '';
  templateSaveId = '';

  // R1.5 — KPIs
  kpis: InvoiceKpi | null = null;
  kpiLoading = false;

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private siteService: SiteService,
    private gstOutwardService: GstOutwardService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadList();
    this.loadCustomers();
    this.loadTemplates();
    this.loadKpis();
    this.initForm();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LIST
  // ═══════════════════════════════════════════════════════════════════════════

  loadList(): void {
    this.listLoading = true;
    this.invoiceService.getAll(0, 200).subscribe({
      next: res => {
        this.dataSource.data = res.data.filter(inv => !inv.isTemplate);
        this.listLoading = false;
      },
      error: () => { this.snackBar.open('Failed to load invoices', 'OK', { duration: 3000 }); this.listLoading = false; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════

  loadCustomers(): void {
    this.gstOutwardService.getAll(0, 500).subscribe({
      next: res => {
        const map = new Map<string, any>();
        res.data.forEach(item => {
          if (item.customerName && !map.has(item.customerName)) {
            map.set(item.customerName, {
              name: item.customerName,
              address: '',
              gstin: item.customerGSTIN || '',
              state: 'Tamil Nadu',
              pincode: ''
            });
          }
        });
        this.existingCustomers = Array.from(map.values());
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R1.4 — TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  loadTemplates(): void {
    this.invoiceService.getTemplates().subscribe({
      next: tpls => this.templates = tpls,
      error: () => {} // silent fail
    });
  }

  openSaveAsTemplate(invoiceId: string): void {
    this.templateSaveId = invoiceId;
    this.templateName = '';
    this.showTemplateDialog = true;
  }

  confirmSaveAsTemplate(): void {
    if (!this.templateName.trim()) {
      this.snackBar.open('Template name is required', 'OK', { duration: 3000 });
      return;
    }
    this.invoiceService.saveAsTemplate(this.templateSaveId, this.templateName).subscribe({
      next: () => {
        this.showTemplateDialog = false;
        this.loadTemplates();
        this.loadList();
        this.snackBar.open('Saved as template', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to save template', 'OK', { duration: 3000 })
    });
  }

  createFromTemplate(templateId: string): void {
    this.invoiceService.createFromTemplate(templateId).subscribe({
      next: (invoice) => {
        this.snackBar.open('Invoice created from template', 'OK', { duration: 2000 });
        this.previewInvoice = invoice;
        this.view = 'preview';
        this.loadList();
        this.loadKpis();
      },
      error: () => this.snackBar.open('Failed to create from template', 'OK', { duration: 3000 })
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R1.5 — KPIs
  // ═══════════════════════════════════════════════════════════════════════════

  loadKpis(): void {
    this.kpiLoading = true;
    this.invoiceService.getKpis().subscribe({
      next: data => { this.kpis = data; this.kpiLoading = false; },
      error: () => { this.kpiLoading = false; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FORM
  // ═══════════════════════════════════════════════════════════════════════════

  initForm(): void {
    this.invoiceForm = this.fb.group({
      invoiceNo: ['', Validators.required],
      invoiceDate: [new Date(), Validators.required],
      customerName: ['', Validators.required],
      customerAddress: [''],
      customerState: ['Tamil Nadu'],
      customerPincode: [''],
      customerGSTIN: [''],
      nameOfWork: ['', Validators.required],
      lineItems: this.fb.array([this.createLineItem()]),
      cgstPercent: [9],
      sgstPercent: [9],
      notes: [''],
      status: ['DRAFT']
    });
  }

  createLineItem(): FormGroup {
    return this.fb.group({
      sNo: [1],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get lineItems(): FormArray {
    return this.invoiceForm.get('lineItems') as FormArray;
  }

  addLineItem(): void {
    this.lineItems.push(this.createLineItem());
    this.renumberItems();
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length > 1) {
      this.lineItems.removeAt(index);
      this.renumberItems();
    }
  }

  renumberItems(): void {
    this.lineItems.controls.forEach((ctrl, i) => ctrl.patchValue({ sNo: i + 1 }));
  }

  get subTotal(): number {
    return this.lineItems.controls.reduce((sum, ctrl) => sum + (ctrl.value.amount || 0), 0);
  }

  get cgstAmount(): number {
    return +(this.subTotal * (this.invoiceForm.value.cgstPercent || 0) / 100).toFixed(2);
  }

  get sgstAmount(): number {
    return +(this.subTotal * (this.invoiceForm.value.sgstPercent || 0) / 100).toFixed(2);
  }

  get totalBeforeRound(): number {
    return this.subTotal + this.cgstAmount + this.sgstAmount;
  }

  get grandTotal(): number {
    return Math.round(this.totalBeforeRound);
  }

  get roundOff(): number {
    return +(this.grandTotal - this.totalBeforeRound).toFixed(2);
  }

  onCustomerSelected(customer: any): void {
    this.invoiceForm.patchValue({
      customerName: customer.name,
      customerAddress: customer.address,
      customerGSTIN: customer.gstin,
      customerState: customer.state,
      customerPincode: customer.pincode
    });
  }

  openNewInvoice(): void {
    this.editingId = null;
    this.initForm();
    this.invoiceService.getNextNumber().subscribe({
      next: num => this.invoiceForm.patchValue({ invoiceNo: num }),
      error: () => this.snackBar.open('Failed to generate invoice number', 'OK', { duration: 3000 })
    });
    this.view = 'form';
  }

  openEditInvoice(invoice: Invoice): void {
    this.editingId = invoice.id;
    this.initForm();

    // Rebuild line items
    this.lineItems.clear();
    (invoice.lineItems || []).forEach(item => {
      this.lineItems.push(this.fb.group({
        sNo: [item.sNo],
        description: [item.description, Validators.required],
        amount: [item.amount, [Validators.required, Validators.min(0)]]
      }));
    });

    this.invoiceForm.patchValue({
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      customerAddress: invoice.customerAddress,
      customerState: invoice.customerState,
      customerPincode: invoice.customerPincode,
      customerGSTIN: invoice.customerGSTIN,
      nameOfWork: invoice.nameOfWork,
      cgstPercent: invoice.cgstPercent || 9,
      sgstPercent: invoice.sgstPercent || 9,
      notes: invoice.notes,
      status: invoice.status
    });

    this.view = 'form';
  }

  saveInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    const val = this.invoiceForm.value;
    const payload: Partial<Invoice> = {
      invoiceNo: val.invoiceNo,
      invoiceDate: val.invoiceDate,
      customerName: val.customerName,
      customerAddress: val.customerAddress,
      customerState: val.customerState,
      customerPincode: val.customerPincode,
      customerGSTIN: val.customerGSTIN,
      nameOfWork: val.nameOfWork,
      lineItems: val.lineItems,
      subTotal: this.subTotal,
      cgstPercent: val.cgstPercent,
      cgstAmount: this.cgstAmount,
      sgstPercent: val.sgstPercent,
      sgstAmount: this.sgstAmount,
      roundOff: this.roundOff,
      grandTotal: this.grandTotal,
      amountInWords: this.numberToWords(this.grandTotal),
      status: val.status,
      notes: val.notes
    };

    const obs = this.editingId
      ? this.invoiceService.update(this.editingId, payload)
      : this.invoiceService.create(payload);

    obs.subscribe({
      next: (saved) => {
        this.saving = false;
        this.snackBar.open(`Invoice ${this.editingId ? 'updated' : 'created'} successfully`, 'OK', { duration: 2000 });
        this.previewInvoice = saved;
        this.view = 'preview';
        this.loadList();
        this.loadKpis();
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save invoice', 'OK', { duration: 3000 });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PREVIEW / PDF
  // ═══════════════════════════════════════════════════════════════════════════

  openPreview(invoice: Invoice): void {
    this.previewInvoice = invoice;
    this.view = 'preview';
  }

  async downloadPdf(): Promise<void> {
    this.generatingPdf = true;
    try {
      const el = this.invoicePrintRef.nativeElement;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${this.previewInvoice.invoiceNo.replace(/\//g, '-')}.pdf`);
      this.snackBar.open('PDF downloaded!', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to generate PDF', 'OK', { duration: 3000 });
    }
    this.generatingPdf = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R1.2 — Status Workflow
  // ═══════════════════════════════════════════════════════════════════════════

  changeStatus(newStatus: string): void {
    if (!this.previewInvoice) return;
    this.invoiceService.updateStatus(this.previewInvoice.id, newStatus).subscribe({
      next: (updated) => {
        this.previewInvoice = updated;
        this.loadList();
        this.loadKpis();
        this.snackBar.open(`Status updated to ${newStatus}`, 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err.error?.error?.message || 'Failed to update status';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
      }
    });
  }

  getNextStatuses(currentStatus: string): string[] {
    switch (currentStatus) {
      case 'DRAFT': return ['SENT', 'CANCELLED'];
      case 'SENT': return ['PAID', 'CANCELLED'];
      default: return [];
    }
  }

  duplicateInvoice(id: string): void {
    this.invoiceService.duplicate(id).subscribe({
      next: (copy) => {
        this.snackBar.open('Invoice duplicated', 'OK', { duration: 2000 });
        this.previewInvoice = copy;
        this.view = 'preview';
        this.loadList();
        this.loadKpis();
      },
      error: () => this.snackBar.open('Failed to duplicate invoice', 'OK', { duration: 3000 })
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R1.3 — Copy Shareable Link
  // ═══════════════════════════════════════════════════════════════════════════

  copyShareableLink(): void {
    const link = `${window.location.origin}/invoices?preview=${this.previewInvoice.id}`;
    navigator.clipboard.writeText(link).then(() => {
      this.snackBar.open('Link copied to clipboard!', 'OK', { duration: 2000 });
    }).catch(() => {
      this.snackBar.open('Failed to copy link', 'OK', { duration: 3000 });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  deleteInvoice(id: string): void {
    if (confirm('Delete this invoice?')) {
      this.invoiceService.delete(id).subscribe({
        next: () => { this.loadList(); this.loadKpis(); this.snackBar.open('Invoice deleted', 'OK', { duration: 2000 }); },
        error: () => this.snackBar.open('Failed to delete invoice', 'OK', { duration: 3000 })
      });
    }
  }

  goToList(): void { this.view = 'list'; }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILS
  // ═══════════════════════════════════════════════════════════════════════════

  getStatusColor(status: string): string {
    switch (status) {
      case 'PAID': return 'primary';
      case 'SENT': return 'accent';
      case 'CANCELLED': return 'warn';
      default: return '';
    }
  }

  formatCurrency(val: number): string {
    if (val == null) return '₹0';
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  numberToWords(num: number): string {
    if (num === 0) return 'Rupees Zero Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };

    return 'Rupees ' + convert(Math.round(num)) + ' Only';
  }
}

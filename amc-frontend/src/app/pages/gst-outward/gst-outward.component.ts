import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { GstOutwardService } from '../../services/gst-outward.service';
import { GstOutward } from '../../models/gst-outward.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-gst-outward',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './gst-outward.component.html',
  styleUrl: './gst-outward.component.scss'
})
export class GstOutwardComponent implements OnInit, AfterViewInit {
  displayedColumns = ['invoiceDate', 'invoiceNo', 'customerName', 'description', 'taxableValue', 'cgstAmount', 'sgstAmount', 'invoiceValue', 'actions'];
  dataSource = new MatTableDataSource<GstOutward>();
  searchText = '';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private gstService: GstOutwardService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  loadData(): void {
    this.loading = true;
    this.gstService.getAll(0, 500).subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load GST outward data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(): void { this.dataSource.filter = this.searchText.trim().toLowerCase(); }

  deleteRow(id: string): void {
    if (confirm('Delete this invoice?')) {
      this.gstService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Invoice deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete invoice', 'OK', { duration: 3000 })
      });
    }
  }
}

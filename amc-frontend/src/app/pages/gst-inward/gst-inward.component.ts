import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { GstInwardService } from '../../services/gst-inward.service';
import { GstInward } from '../../models/gst-inward.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-gst-inward',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './gst-inward.component.html',
  styleUrl: './gst-inward.component.scss'
})
export class GstInwardComponent implements OnInit, AfterViewInit {
  displayedColumns = ['invoiceDate', 'purchaseBillNo', 'companyName', 'description', 'taxableValue', 'cgstAmount', 'sgstAmount', 'purchaseBillValue', 'actions'];
  dataSource = new MatTableDataSource<GstInward>();
  searchText = '';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private gstService: GstInwardService, private snackBar: MatSnackBar) {}

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
        this.snackBar.open('Failed to load GST inward data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(): void { this.dataSource.filter = this.searchText.trim().toLowerCase(); }

  deleteRow(id: string): void {
    if (confirm('Delete this purchase bill?')) {
      this.gstService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Purchase bill deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete purchase bill', 'OK', { duration: 3000 })
      });
    }
  }
}

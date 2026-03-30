import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { MaterialService } from '../../services/material.service';
import { Material } from '../../models/material.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './materials.component.html',
  styleUrl: './materials.component.scss'
})
export class MaterialsComponent implements OnInit, AfterViewInit {
  displayedColumns = ['date', 'billNo', 'itemName', 'quantity', 'rate', 'amount', 'siteName', 'shopName', 'actions'];
  dataSource = new MatTableDataSource<Material>();
  searchText = '';
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private matService: MaterialService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    this.matService.getAll(0, 500).subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load materials', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilter(): void { this.dataSource.filter = this.searchText.trim().toLowerCase(); }

  deleteRow(id: string): void {
    if (confirm('Delete this material entry?')) {
      this.matService.delete(id).subscribe({
        next: () => {
          this.loadData();
          this.snackBar.open('Material deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete material', 'OK', { duration: 3000 })
      });
    }
  }
}

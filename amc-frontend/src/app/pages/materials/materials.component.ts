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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private matService: MaterialService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void { this.dataSource.data = this.matService.getAll(); }
  applyFilter(): void { this.dataSource.filter = this.searchText.trim().toLowerCase(); }

  deleteRow(id: string): void {
    if (confirm('Delete this material entry?')) {
      this.matService.delete(id);
      this.loadData();
      this.snackBar.open('Material deleted', 'OK', { duration: 2000 });
    }
  }
}

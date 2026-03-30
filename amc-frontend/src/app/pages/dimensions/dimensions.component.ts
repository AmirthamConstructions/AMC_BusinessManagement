import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { DimensionService } from '../../services/dimension.service';
import { Dimension } from '../../models/dimension.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dimensions',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dimensions.component.html',
  styleUrl: './dimensions.component.scss'
})
export class DimensionsComponent implements OnInit {
  dimensions: Dimension[] = [];
  newValues: Record<string, string> = {};
  loading = false;

  constructor(private dimService: DimensionService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.dimService.getAll().subscribe({
      next: (data) => {
        this.dimensions = data;
        this.dimensions.forEach(d => this.newValues[d.name] = '');
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load dimensions', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  addValue(name: string): void {
    const val = this.newValues[name]?.trim();
    if (!val) return;
    const dim = this.dimensions.find(d => d.name === name);
    if (!dim) return;
    if (dim.values.includes(val)) {
      this.snackBar.open('Value already exists', 'OK', { duration: 2000 });
      return;
    }
    this.dimService.addValue(dim.id, val).subscribe({
      next: () => {
        this.newValues[name] = '';
        this.loadData();
        this.snackBar.open(`Added "${val}" to ${name}`, 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to add value', 'OK', { duration: 3000 })
    });
  }

  removeValue(name: string, value: string): void {
    const dim = this.dimensions.find(d => d.name === name);
    if (!dim) return;
    this.dimService.removeValue(dim.id, value).subscribe({
      next: () => {
        this.loadData();
        this.snackBar.open(`Removed "${value}"`, 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to remove value', 'OK', { duration: 3000 })
    });
  }
}

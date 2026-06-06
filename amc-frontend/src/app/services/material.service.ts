import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Material } from '../models/material.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';
import {
  MaterialRateAnalysis,
  MaterialUsageReport,
  MaterialRoiAnalysis,
  MaterialInventorySummary,
  PriceListItem
} from '../models/material-analytics.model';

@Injectable({ providedIn: 'root' })
export class MaterialService {

  private url = `${environment.apiUrl}/materials`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 50, sortBy = 'date', direction = 'desc'): Observable<{ data: Material[]; meta?: PaginationMeta }> {
    const params = new HttpParams()
      .set('page', page).set('size', size)
      .set('sortBy', sortBy).set('direction', direction);
    return this.http.get<ApiResponse<Material[]>>(this.url, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getById(id: string): Observable<Material> {
    return this.http.get<ApiResponse<Material>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  create(mat: Partial<Material>): Observable<Material> {
    return this.http.post<ApiResponse<Material>>(this.url, mat)
      .pipe(map(res => res.data));
  }

  update(id: string, mat: Partial<Material>): Observable<Material> {
    return this.http.put<ApiResponse<Material>>(`${this.url}/${id}`, mat)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.1 — Rate Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  getRateAnalysis(): Observable<MaterialRateAnalysis> {
    return this.http.get<ApiResponse<MaterialRateAnalysis>>(`${this.url}/rate-analysis`)
      .pipe(map(res => res.data));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.2 — Usage Report
  // ═══════════════════════════════════════════════════════════════════════════

  getUsageReport(siteId: string): Observable<MaterialUsageReport> {
    return this.http.get<ApiResponse<MaterialUsageReport>>(`${this.url}/usage`, {
      params: new HttpParams().set('siteId', siteId)
    }).pipe(map(res => res.data));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.3 — ROI Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  getRoiAnalysis(siteId: string): Observable<MaterialRoiAnalysis> {
    return this.http.get<ApiResponse<MaterialRoiAnalysis>>(`${this.url}/roi`, {
      params: new HttpParams().set('siteId', siteId)
    }).pipe(map(res => res.data));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.5 — Inventory Summary
  // ═══════════════════════════════════════════════════════════════════════════

  getInventorySummary(): Observable<MaterialInventorySummary> {
    return this.http.get<ApiResponse<MaterialInventorySummary>>(`${this.url}/inventory-summary`)
      .pipe(map(res => res.data));
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.url}/export`, { responseType: 'blob' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  R4.4 — Price List CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  getPriceList(): Observable<PriceListItem[]> {
    return this.http.get<ApiResponse<PriceListItem[]>>(`${this.url}/price-list`)
      .pipe(map(res => res.data));
  }

  createPriceListItem(item: Partial<PriceListItem>): Observable<PriceListItem> {
    return this.http.post<ApiResponse<PriceListItem>>(`${this.url}/price-list`, item)
      .pipe(map(res => res.data));
  }

  updatePriceListItem(id: string, item: Partial<PriceListItem>): Observable<PriceListItem> {
    return this.http.put<ApiResponse<PriceListItem>>(`${this.url}/price-list/${id}`, item)
      .pipe(map(res => res.data));
  }

  deletePriceListItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/price-list/${id}`);
  }
}

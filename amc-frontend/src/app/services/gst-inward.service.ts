import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { GstInward } from '../models/gst-inward.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';
import { Gst2bUploadResult, GstReconciliation } from '../models/gst-reconciliation.model';

@Injectable({ providedIn: 'root' })
export class GstInwardService {

  private url = `${environment.apiUrl}/gst-inward`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 50, sortBy = 'invoiceDate', direction = 'desc'): Observable<{ data: GstInward[]; meta?: PaginationMeta }> {
    const params = new HttpParams()
      .set('page', page).set('size', size)
      .set('sortBy', sortBy).set('direction', direction);
    return this.http.get<ApiResponse<GstInward[]>>(this.url, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getById(id: string): Observable<GstInward> {
    return this.http.get<ApiResponse<GstInward>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  create(item: Partial<GstInward>): Observable<GstInward> {
    return this.http.post<ApiResponse<GstInward>>(this.url, item)
      .pipe(map(res => res.data));
  }

  update(id: string, item: Partial<GstInward>): Observable<GstInward> {
    return this.http.put<ApiResponse<GstInward>>(`${this.url}/${id}`, item)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ── R2.1 — Upload GST 2B Excel ──────────────────────────────────────────
  uploadExcel(file: File): Observable<Gst2bUploadResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<Gst2bUploadResult>>(`${this.url}/upload`, formData)
      .pipe(map(res => res.data));
  }

  // ── R2.2 — Export GST 2B as Excel ────────────────────────────────────────
  exportExcel(year?: string, month?: string): Observable<Blob> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    return this.http.get(`${this.url}/export`, {
      params,
      responseType: 'blob'
    });
  }

  // ── R2.4 — GST Reconciliation ─────────────────────────────────────────────
  getReconciliation(year: string, month: string): Observable<GstReconciliation> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<ApiResponse<GstReconciliation>>(`${this.url}/reconciliation`, { params })
      .pipe(map(res => res.data));
  }
}

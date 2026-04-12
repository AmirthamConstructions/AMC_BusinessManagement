import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { GstOutward } from '../models/gst-outward.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class GstOutwardService {

  private url = `${environment.apiUrl}/gst-outward`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 50, sortBy = 'invoiceDate', direction = 'desc'): Observable<{ data: GstOutward[]; meta?: PaginationMeta }> {
    const params = new HttpParams()
      .set('page', page).set('size', size)
      .set('sortBy', sortBy).set('direction', direction);
    return this.http.get<ApiResponse<GstOutward[]>>(this.url, { params })
      .pipe(map(res => ({ data: res.data, meta: res.meta })));
  }

  getById(id: string): Observable<GstOutward> {
    return this.http.get<ApiResponse<GstOutward>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  create(item: Partial<GstOutward>): Observable<GstOutward> {
    return this.http.post<ApiResponse<GstOutward>>(this.url, item)
      .pipe(map(res => res.data));
  }

  update(id: string, item: Partial<GstOutward>): Observable<GstOutward> {
    return this.http.put<ApiResponse<GstOutward>>(`${this.url}/${id}`, item)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  // ── R2.2 — Export GSTR-1 as Excel ─────────────────────────────────────────
  exportExcel(year?: string, month?: string): Observable<Blob> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    return this.http.get(`${this.url}/export`, {
      params,
      responseType: 'blob'
    });
  }
}

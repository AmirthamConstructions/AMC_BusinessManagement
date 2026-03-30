import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { GstInward } from '../models/gst-inward.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';

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
}

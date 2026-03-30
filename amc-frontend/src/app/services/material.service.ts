import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Material } from '../models/material.model';
import { ApiResponse, PaginationMeta } from '../models/api-response.model';

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
}

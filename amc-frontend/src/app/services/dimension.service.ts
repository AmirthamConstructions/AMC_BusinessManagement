import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Dimension } from '../models/dimension.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DimensionService {

  private url = `${environment.apiUrl}/dimensions`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Dimension[]> {
    return this.http.get<ApiResponse<Dimension[]>>(this.url)
      .pipe(map(res => res.data));
  }

  getByName(name: string): Observable<Dimension> {
    return this.http.get<ApiResponse<Dimension>>(`${this.url}/name/${name}`)
      .pipe(map(res => res.data));
  }

  create(dimension: Partial<Dimension>): Observable<Dimension> {
    return this.http.post<ApiResponse<Dimension>>(this.url, dimension)
      .pipe(map(res => res.data));
  }

  addValue(id: string, value: string): Observable<Dimension> {
    return this.http.patch<ApiResponse<Dimension>>(`${this.url}/${id}/add-value`, { value })
      .pipe(map(res => res.data));
  }

  removeValue(id: string, value: string): Observable<Dimension> {
    return this.http.patch<ApiResponse<Dimension>>(`${this.url}/${id}/remove-value`, { value })
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

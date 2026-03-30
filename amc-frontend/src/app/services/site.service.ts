import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Site } from '../models/site.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class SiteService {

  private url = `${environment.apiUrl}/sites`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Site[]> {
    return this.http.get<ApiResponse<Site[]>>(this.url)
      .pipe(map(res => res.data));
  }

  getById(id: string): Observable<Site> {
    return this.http.get<ApiResponse<Site>>(`${this.url}/${id}`)
      .pipe(map(res => res.data));
  }

  getByCompany(company: string): Observable<Site[]> {
    return this.http.get<ApiResponse<Site[]>>(`${this.url}/company/${company}`)
      .pipe(map(res => res.data));
  }

  getActive(): Observable<Site[]> {
    return this.http.get<ApiResponse<Site[]>>(`${this.url}/active`)
      .pipe(map(res => res.data));
  }

  create(site: Partial<Site>): Observable<Site> {
    return this.http.post<ApiResponse<Site>>(this.url, site)
      .pipe(map(res => res.data));
  }

  update(id: string, site: Partial<Site>): Observable<Site> {
    return this.http.put<ApiResponse<Site>>(`${this.url}/${id}`, site)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

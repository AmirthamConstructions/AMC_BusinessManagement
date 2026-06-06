import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardData, CompanyComparison } from '../models/dashboard.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private url = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getData(startDate?: string, endDate?: string): Observable<DashboardData> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<DashboardData>>(this.url, { params })
      .pipe(map(res => res.data));
  }

  getCompanyComparison(startDate?: string, endDate?: string): Observable<CompanyComparison> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<CompanyComparison>>(`${this.url}/company-comparison`, { params })
      .pipe(map(res => res.data));
  }
}

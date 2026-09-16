import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface BenchDetail {
  employeecode: number;
  employeeName: string;
  businessUnit: string;
  durationCount: number;
  location: string;
  technology: string;
  experience?: string;
  rmgComments?: string;
  assignFrom?: string;
  assignTill?: string;
}

export interface BusinessUnitHeadcount {
  businessUnit: string;
  headcount: number;
}

export interface MonthlyBenchEntry {
  month: string;
  tech: Record<string, number>;
  bu: Record<string, number>;
}

export interface DashboardResult {
  employees: BenchDetail[];
  headcounts?: BusinessUnitHeadcount[];
  overallCounts?: number;
  bench?: MonthlyBenchEntry[];
}

export interface ApiResponse {
  version: string;
  statusCode: number;
  status: boolean;
  message: string;
  result: DashboardResult;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl =
    'https://winverse.winjit.com/backend/api/ProjectAllocationReport/GetAllBenchDetails';
  private readonly username = 'Admin';
  private readonly password = 'Winjit@123';

  private dashboardData$?: Observable<ApiResponse>;

  constructor(private readonly http: HttpClient) { }

  getDashboardData(forceRefresh = false): Observable<ApiResponse> {
    if (!this.dashboardData$ || forceRefresh) {
      const authHeader = 'Basic ' + btoa(`${this.username}:${this.password}`);
      const headers = new HttpHeaders({ Authorization: authHeader });

      this.dashboardData$ = this.http.post<ApiResponse>(this.apiUrl, {}, { headers }).pipe(
        shareReplay(1)
      );
    }
    return this.dashboardData$;
  }
}


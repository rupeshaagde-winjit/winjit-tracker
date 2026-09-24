import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardComponent } from './dashboard.component';
import { ApiService, BenchDetail } from './api.service';

@Component({
  selector: 'app-bench-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardComponent],
  template: `
    <section class="tab-shell">
    <img class="winjit-icon" src="/assets/icons/winjit_logo.svg" alt="Location icon" />
      <div class="tab-header">
        <div class="tab-list" role="tablist" aria-label="Bench dashboard tabs">
          @for (tab of tabs; track tab) {
            <button
              type="button"
              class="tab-button"
              [class.active]="selectedTab === tab"
              [attr.aria-selected]="selectedTab === tab"
              (click)="selectedTab = tab"
            >
              {{ tab }}
            </button>
          }
        </div>

        <div class="tab-meta">Last updated {{ currentUpdatedTime }}</div>
      </div>

      <div class="filter-bar">
        <div class="filter-header-group">
          <button type="button" class="filter-trigger">
            <span class="filter-icon">☰</span>
            <span>Filters</span>
            @if (activeFilterCount > 0) {
              <span class="filter-badge">{{ activeFilterCount }}</span>
            }
          </button>
        </div>

        <div class="filter-controls">
          <div class="dropdown-fields">
            <label class="filter-field select-field">
              <span>Business Unit</span>
              <div class="select-wrapper">
                <select
                  class="filter-select"
                  [value]="selectedBu"
                  (change)="onBuChange($any($event.target).value)"
                >
                  <option value="ALL">All Business Units</option>
                  @for (bu of businessUnits; track bu) {
                    <option [value]="bu">{{ bu }}</option>
                  }
                </select>
              </div>
            </label>

            <label class="filter-field select-field">
              <span>Technology</span>
              <div class="select-wrapper">
                <select
                  class="filter-select"
                  [value]="selectedTech"
                  (change)="onTechChange($any($event.target).value)"
                >
                  <option value="ALL">All Technologies</option>
                  @for (tech of technologies; track tech) {
                    <option [value]="tech">{{ tech }}</option>
                  }
                </select>
              </div>
            </label>
          </div>

          <div class="date-fields">
            <label class="filter-field date-field">
              <span>From</span>
              <input
                type="date"
                #fromInput
                [value]="selectedFromDate"
                [min]="sixMonthsMinDate"
                [max]="todayDate"
                (change)="onDateChange('from', fromInput.value, fromInput)"
              />
            </label>

            <label class="filter-field date-field">
              <span>To</span>
              <input
                type="date"
                #toInput
                [value]="selectedToDate"
                [min]="sixMonthsMinDate"
                [max]="todayDate"
                (change)="onDateChange('to', toInput.value, toInput)"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          class="reset-button"
          [class.has-active]="activeFilterCount > 0"
          (click)="resetFilters(fromInput, toInput)"
        >
          Reset
        </button>
      </div>

      <div class="tab-panel">
        @switch (selectedTab) {
          @case ('Bench Summary') {
            <app-dashboard
              [fromDate]="selectedFromDate"
              [toDate]="selectedToDate"
              [selectedTech]="selectedTech"
              [selectedBu]="selectedBu"
            ></app-dashboard>
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      background: #ffffff;
      color: #1f2937;
      font-family: Inter, 'Segoe UI', sans-serif;
    }

    .tab-shell {
      display: block;
      width: 100%;
      background: #ffffff;
    }

    .winjit-icon{
        padding:10px 0 0 20px;
    }

    .tab-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 20px 0;
      border-bottom: 1px solid #dfe6ee;
      background: #f7f9fb;
      min-height: 60px;
    }

    .tab-list {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 8px;
      padding-bottom: 0;
    }

    .tab-button {
      appearance: none;
      border: 1px solid transparent;
      border-bottom: 0;
      background: transparent;
      color: #1f2937;
      padding: 12px 18px 11px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: -1px;
    }

    .tab-button:hover {
      color: #0f172a;
    }

    .tab-button.active {
      background: #0b5aa8;
      color: #ffffff;
      border-color: #0b5aa8;
      box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
    }

    .tab-meta {
      color: #4b5563;
      font-size: 10px;
      font-weight: 500;
      white-space: nowrap;
    }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: #f7f9fb;
      border-bottom: 1px solid #dfe6ee;
    }

    .filter-header-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .filter-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: #1f2937;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 0;
    }

    .filter-icon {
      font-size: 12px;
      color: #475569;
    }

    .filter-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #0b5aa8;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      line-height: 1;
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .date-fields,
    .dropdown-fields {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .filter-field {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #374151;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    .date-field input {
      width: 140px;
      min-height: 36px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #ffffff;
      color: #1f2937;
      padding: 0 10px;
      font-size: 13px;
      line-height: 1;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .date-field input:focus {
      border-color: #0b5aa8;
      box-shadow: 0 0 0 2px rgba(11, 90, 168, 0.15);
    }

    .select-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .filter-select {
      min-height: 36px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #ffffff;
      color: #1f2937;
      padding: 0 12px;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      max-width: 200px;
    }

    .filter-select:hover {
      border-color: #9ca3af;
    }

    .filter-select:focus {
      border-color: #0b5aa8;
      box-shadow: 0 0 0 2px rgba(11, 90, 168, 0.15);
    }

    .reset-button {
      margin-left: auto;
      background: transparent;
      border: 1px solid transparent;
      color: #6b7280;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .reset-button.has-active {
      color: #0b5aa8;
      font-weight: 700;
      background: rgba(11, 90, 168, 0.08);
    }

    .reset-button:hover {
      color: #0b5aa8;
      background: rgba(11, 90, 168, 0.12);
    }

    .tab-panel {
      background: #ffffff;
    }

    @media (max-width: 980px) {
      .tab-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .tab-meta {
        white-space: normal;
      }

      .filter-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .filter-controls {
        width: 100%;
      }

      .date-fields,
      .dropdown-fields {
        flex-wrap: wrap;
      }

      .reset-button {
        margin-left: 0;
        align-self: flex-start;
      }
    }
  `
})
export class BenchTabsComponent implements OnInit {
  readonly tabs = ['Bench Summary'];
  selectedTab = 'Bench Summary';

  selectedFromDate = '';
  selectedToDate = '';
  selectedTech = 'ALL';
  selectedBu = 'ALL';

  allEmployees: BenchDetail[] = [];
  allTechnologies: string[] = [];
  allBusinessUnits: string[] = [];

  get businessUnits(): string[] {
    if (!this.allEmployees || this.allEmployees.length === 0) {
      return this.allBusinessUnits;
    }
    if (this.selectedTech === 'ALL') {
      return this.allBusinessUnits;
    }
    const buSet = new Set<string>();
    const selectedTechLower = this.selectedTech.trim().toLowerCase();
    this.allEmployees.forEach((emp) => {
      if (emp.technology && emp.technology.trim().toLowerCase() === selectedTechLower) {
        if (emp.businessUnit && emp.businessUnit.trim()) {
          buSet.add(emp.businessUnit.trim());
        }
      }
    });
    return Array.from(buSet).sort((a, b) => a.localeCompare(b));
  }

  get technologies(): string[] {
    if (!this.allEmployees || this.allEmployees.length === 0) {
      return this.allTechnologies;
    }
    if (this.selectedBu === 'ALL') {
      return this.allTechnologies;
    }
    const techSet = new Set<string>();
    const selectedBuLower = this.selectedBu.trim().toLowerCase();
    this.allEmployees.forEach((emp) => {
      if (emp.businessUnit && emp.businessUnit.trim().toLowerCase() === selectedBuLower) {
        if (emp.technology && emp.technology.trim()) {
          techSet.add(emp.technology.trim());
        }
      }
    });
    return Array.from(techSet).sort((a, b) => a.localeCompare(b));
  }

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getDashboardData().subscribe({
      next: (res) => {
        const employees: BenchDetail[] = res.result?.employees || (Array.isArray(res.result) ? (res.result as any) : []);
        this.allEmployees = employees;
        const techSet = new Set<string>();
        const buSet = new Set<string>();

        employees.forEach((emp) => {
          if (emp.technology && emp.technology.trim()) {
            techSet.add(emp.technology.trim());
          }
          if (emp.businessUnit && emp.businessUnit.trim()) {
            buSet.add(emp.businessUnit.trim());
          }
        });

        this.allTechnologies = Array.from(techSet).sort((a, b) => a.localeCompare(b));
        this.allBusinessUnits = Array.from(buSet).sort((a, b) => a.localeCompare(b));
      },
      error: (err) => {
        console.error('Error fetching filter options in BenchTabsComponent', err);
      }
    });
  }

  onBuChange(bu: string): void {
    this.selectedBu = bu;
    if (this.selectedTech !== 'ALL') {
      const availableTechs = this.technologies;
      if (!availableTechs.includes(this.selectedTech)) {
        this.selectedTech = 'ALL';
      }
    }
  }

  onTechChange(tech: string): void {
    this.selectedTech = tech;
    if (this.selectedBu !== 'ALL') {
      const availableBus = this.businessUnits;
      if (!availableBus.includes(this.selectedBu)) {
        this.selectedBu = 'ALL';
      }
    }
  }

  get todayDate(): string {
    return this.formatDateInput(new Date());
  }

  get sixMonthsMinDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return this.formatDateInput(date);
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.selectedFromDate) count++;
    if (this.selectedToDate) count++;
    if (this.selectedTech && this.selectedTech !== 'ALL') count++;
    if (this.selectedBu && this.selectedBu !== 'ALL') count++;
    return count;
  }

  onDateChange(type: 'from' | 'to', value: string, input: HTMLInputElement): void {
    const normalized = this.clampDateWithinRange(value);
    if (type === 'from') {
      this.selectedFromDate = normalized;
      if (this.selectedToDate && normalized > this.selectedToDate) {
        this.selectedToDate = normalized;
      }
    } else {
      this.selectedToDate = normalized;
      if (this.selectedFromDate && normalized < this.selectedFromDate) {
        this.selectedFromDate = normalized;
      }
    }
    input.value = normalized;
  }

  private clampDateWithinRange(value: string): string {
    if (!value) return '';

    const minDate = new Date(this.sixMonthsMinDate);
    const maxDate = new Date(this.todayDate);
    const inputDate = new Date(`${value}T00:00:00`);

    if (Number.isNaN(inputDate.getTime())) {
      return '';
    }

    if (inputDate < minDate) {
      return this.formatDateInput(minDate);
    }

    if (inputDate > maxDate) {
      return this.formatDateInput(maxDate);
    }

    return value;
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  resetFilters(fromInput: HTMLInputElement, toInput: HTMLInputElement): void {
    this.selectedFromDate = '';
    this.selectedToDate = '';
    this.selectedTech = 'ALL';
    this.selectedBu = 'ALL';
    fromInput.value = '';
    toInput.value = '';
  }

  get currentUpdatedTime(): string {
    const now = new Date();
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(now);
  }
}


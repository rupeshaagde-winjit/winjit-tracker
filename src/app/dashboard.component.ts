import { CommonModule } from '@angular/common';
import { Component, computed, signal, Input } from '@angular/core';
import { AppChart } from '../sharedComponent/chart.component';
import { BenchTechBubbleChartComponent } from './bench-tech-bubble-chart/bench-tech-bubble-chart.component';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiResponse, BenchDetail, BusinessUnitHeadcount, MonthlyBenchEntry } from './api.service';

type RiskLevel = 'Critical' | 'Medium' | 'Low';

export interface TableGroup {
  key: string;
  label: string;
  count: number;
  avgExperience: number;
  avgDuration: number;
  items: BenchDetail[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppChart, BenchTechBubbleChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  readonly Math = Math;
  readonly benchDetails = signal<BenchDetail[]>([]);
  readonly headcounts = signal<BusinessUnitHeadcount[]>([]);
  readonly overallCounts = signal<number>(0);
  readonly monthlyBenchHistory = signal<MonthlyBenchEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly fromDateSignal = signal<string | null>(null);
  readonly toDateSignal = signal<string | null>(null);
  readonly selectedTechSignal = signal<string>('ALL');
  readonly selectedBuSignal = signal<string>('ALL');

  // --- Bench Employee Details Table Signals & State ---
  readonly tableSearchQuery = signal<string>('');
  readonly tableTechFilter = signal<string>('ALL');
  readonly tableBuFilter = signal<string>('ALL');
  readonly tableLocationFilter = signal<string>('ALL');
  readonly tableRiskFilter = signal<string>('ALL');
  readonly tableExpFilter = signal<string>('ALL');
  readonly tableSortColumn = signal<string>('employeeName');
  readonly tableSortDirection = signal<'asc' | 'desc'>('asc');
  readonly tableGroupBy = signal<string>('none');
  readonly collapsedGroups = signal<Set<string>>(new Set<string>());
  readonly tablePageSize = signal<number>(10);
  readonly tableCurrentPage = signal<number>(1);

  @Input() set fromDate(val: string | null) {
    this.fromDateSignal.set(val);
    this.tableCurrentPage.set(1);
  }
  @Input() set toDate(val: string | null) {
    this.toDateSignal.set(val);
    this.tableCurrentPage.set(1);
  }
  @Input() set selectedTech(val: string | null | undefined) {
    this.selectedTechSignal.set(val || 'ALL');
    this.tableCurrentPage.set(1);
  }
  @Input() set selectedBu(val: string | null | undefined) {
    this.selectedBuSignal.set(val || 'ALL');
    this.tableCurrentPage.set(1);
  }

  parseExperience(exp: string | number | undefined | null): number {
    if (exp === undefined || exp === null || exp === '') return 0;
    if (typeof exp === 'number') {
      return Number(exp.toFixed(1));
    }
    const str = String(exp).trim();

    // Check for "X Years Y Months" or similar
    const yearsMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
    const monthsMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:months?|mos?|m\b)/i);

    let totalYears = 0;
    if (yearsMatch) {
      totalYears += parseFloat(yearsMatch[1]);
    }
    if (monthsMatch) {
      totalYears += parseFloat(monthsMatch[1]) / 12;
    }

    if (!yearsMatch && !monthsMatch) {
      const directNum = str.match(/(\d+(?:\.\d+)?)/);
      if (directNum) {
        totalYears = parseFloat(directNum[1]);
      }
    }

    return Number(totalYears.toFixed(1));
  }

  formatExperience(exp: string | number | undefined | null): string {
    const num = this.parseExperience(exp);
    return `${num}`;
  }

  readonly filteredBenchDetails = computed(() => {
    const details = this.benchDetails();
    const from = this.fromDateSignal();
    const to = this.toDateSignal();
    const tech = this.selectedTechSignal();
    const bu = this.selectedBuSignal();

    let result = details;

    if (from || to) {
      const fromTime = from ? new Date(from).getTime() : 0;
      const toTime = to ? new Date(to).getTime() : Infinity;

      // Reference point: today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      result = result.filter(item => {
        // Calculate bench start date
        const benchStartDate = new Date(today);
        benchStartDate.setDate(today.getDate() - item.durationCount);
        const startVal = benchStartDate.getTime();

        return startVal >= fromTime && startVal <= toTime;
      });
    }

    if (tech && tech !== 'ALL') {
      result = result.filter(item => item.technology?.trim() === tech);
    }

    if (bu && bu !== 'ALL') {
      result = result.filter(item => item.businessUnit?.trim() === bu);
    }

    return result;
  });

  readonly filteredBenchDetailsByExperience = computed(() => {
    const details = this.filteredBenchDetails();
    let experienceCount = {
      '0-2': 0,
      '2-5': 0,
      '5-10': 0,
      '10+': 0
    };

    details.forEach((item) => {
      const years = this.parseExperience(item?.experience);
      if (years < 2) {
        experienceCount['0-2']++;
      } else if (years < 5) {
        experienceCount['2-5']++;
      } else if (years < 10) {
        experienceCount['5-10']++;
      } else {
        experienceCount['10+']++;
      }
    });
    return experienceCount;
  });

  readonly filterOptions = computed(() => {
    const details = this.filteredBenchDetails();
    const techSet = new Set<string>();
    const buSet = new Set<string>();
    const locSet = new Set<string>();

    details.forEach((item) => {
      if (item.technology) techSet.add(item.technology.trim());
      if (item.businessUnit) buSet.add(item.businessUnit.trim());
      if (item.location) locSet.add(item.location.trim());
    });
    console.log(techSet, ">>technologies")
    return {
      technologies: Array.from(techSet).filter(Boolean).sort(),
      businessUnits: Array.from(buSet).filter(Boolean).sort(),
      locations: Array.from(locSet).filter(Boolean).sort()
    };
  });

  readonly processedTableData = computed(() => {
    let list = [...this.filteredBenchDetails()];
    const query = this.tableSearchQuery().trim().toLowerCase();
    const tech = this.tableTechFilter();
    const bu = this.tableBuFilter();
    const loc = this.tableLocationFilter();
    const risk = this.tableRiskFilter();
    const expRange = this.tableExpFilter();

    if (query) {
      list = list.filter((item) => {
        const expNum = this.formatExperience(item.experience);
        const searchTarget = [
          item.employeeName,
          item.technology,
          item.businessUnit,
          item.location,
          this.getRisk(item),
          item.rmgComments,
          item.employeecode ? String(item.employeecode) : '',
          expNum,
          item.durationCount ? `${item.durationCount} days` : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchTarget.includes(query);
      });
    }

    if (tech !== 'ALL') {
      list = list.filter((item) => item.technology?.trim() === tech);
    }

    if (bu !== 'ALL') {
      list = list.filter((item) => item.businessUnit?.trim() === bu);
    }

    if (loc !== 'ALL') {
      list = list.filter((item) => item.location?.trim() === loc);
    }

    if (risk !== 'ALL') {
      list = list.filter((item) => this.getRisk(item) === risk);
    }

    if (expRange !== 'ALL') {
      list = list.filter((item) => {
        const years = this.parseExperience(item.experience);
        if (expRange === '0-2') return years < 2;
        if (expRange === '2-5') return years >= 2 && years < 5;
        if (expRange === '5-10') return years >= 5 && years < 10;
        if (expRange === '10+') return years >= 10;
        return true;
      });
    }

    // Sort
    const col = this.tableSortColumn();
    const dir = this.tableSortDirection() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (col === 'experience') {
        const expA = this.parseExperience(a.experience);
        const expB = this.parseExperience(b.experience);
        return (expA - expB) * dir;
      }
      if (col === 'durationCount') {
        return ((a.durationCount || 0) - (b.durationCount || 0)) * dir;
      }
      if (col === 'risk') {
        const riskWeight: Record<RiskLevel, number> = { Critical: 3, Medium: 2, Low: 1 };
        const rA = riskWeight[this.getRisk(a)] || 0;
        const rB = riskWeight[this.getRisk(b)] || 0;
        return (rA - rB) * dir;
      }
      if (col === 'employeecode') {
        return ((a.employeecode || 0) - (b.employeecode || 0)) * dir;
      }

      const valA = String((a as any)[col] ?? '').toLowerCase();
      const valB = String((b as any)[col] ?? '').toLowerCase();
      return valA.localeCompare(valB) * dir;
    });

    return list;
  });

  readonly isAnyFilterActive = computed(() => {
    return (
      this.tableSearchQuery().trim() !== '' ||
      this.tableTechFilter() !== 'ALL' ||
      this.tableBuFilter() !== 'ALL' ||
      this.tableLocationFilter() !== 'ALL' ||
      this.tableRiskFilter() !== 'ALL' ||
      this.tableExpFilter() !== 'ALL'
    );
  });

  readonly totalFilteredCount = computed(() => this.processedTableData().length);

  readonly totalPages = computed(() => {
    const size = this.tablePageSize();
    if (size === -1) return 1;
    return Math.max(1, Math.ceil(this.totalFilteredCount() / size));
  });

  readonly paginatedFlatData = computed(() => {
    const list = this.processedTableData();
    const size = this.tablePageSize();
    if (size === -1) return list;
    const page = Math.min(Math.max(1, this.tableCurrentPage()), this.totalPages());
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly tableGroups = computed<TableGroup[]>(() => {
    const groupBy = this.tableGroupBy();
    const list = this.processedTableData();

    if (groupBy === 'none') {
      return [];
    }

    const groupMap = new Map<string, BenchDetail[]>();

    list.forEach((item) => {
      let key = 'Other';
      if (groupBy === 'technology') key = item.technology || 'Unassigned';
      else if (groupBy === 'businessUnit') key = item.businessUnit || 'Unassigned';
      else if (groupBy === 'location') key = item.location || 'Unassigned';
      else if (groupBy === 'risk') key = this.getRisk(item);

      const existing = groupMap.get(key) || [];
      existing.push(item);
      groupMap.set(key, existing);
    });

    const groups: TableGroup[] = [];
    groupMap.forEach((items, key) => {
      const totalExp = items.reduce((sum, it) => sum + this.parseExperience(it.experience), 0);
      const totalDuration = items.reduce((sum, it) => sum + (it.durationCount || 0), 0);
      const avgExp = items.length ? Number((totalExp / items.length).toFixed(1)) : 0;
      const avgDur = items.length ? Math.round(totalDuration / items.length) : 0;

      groups.push({
        key,
        label: key,
        count: items.length,
        avgExperience: avgExp,
        avgDuration: avgDur,
        items
      });
    });

    return groups.sort((a, b) => b.count - a.count);
  });

  readonly totalCount = computed(() => this.filteredBenchDetails().length);
  readonly chartSeries = computed(() => this.getBenchTrendSeries().map((p) => p.value));
  readonly chartCategories = computed(() => this.getBenchTrendSeries().map((p) => p.label));
  readonly technologies = computed(() => this.aggregate('technology'));
  readonly locations = computed(() => this.aggregate('location'));
  readonly businessUnits = computed(() => this.aggregate('businessUnit'));
  readonly riskCounts = computed(() => this.countRisks());

  constructor(private readonly api: ApiService) {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getDashboardData().subscribe({
      next: (data: ApiResponse) => {
        const employees = data.result?.employees || (Array.isArray(data.result) ? data.result : []);
        this.benchDetails.set(employees);
        this.headcounts.set(data.result?.headcounts || []);
        this.overallCounts.set(data.result?.overallCounts || 0);
        this.monthlyBenchHistory.set(data.result?.bench || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard API error', err);
        this.error.set(
          'Failed to load dashboard data. Confirm the API credentials, endpoint, and CORS settings.'
        );
        this.loading.set(false);
      }
    });
  }

  aggregate(field: keyof BenchDetail): Array<{ key: string; count: number; percent: number }> {
    const total = this.totalCount();
    const counts = this.filteredBenchDetails().reduce((acc, item) => {
      const value = String(item[field] ?? 'Unknown');
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([key, count]) => ({ key, count, percent: total ? Number(((count / total) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.count - a.count);
  }

  countRisks(): Array<{ level: RiskLevel; count: number }> {
    const counts: Record<RiskLevel, number> = { Critical: 0, Medium: 0, Low: 0 };
    this.filteredBenchDetails().forEach((item) => {
      counts[this.getRisk(item)] += 1;
    });
    return [
      { level: 'Critical', count: counts.Critical },
      { level: 'Medium', count: counts.Medium },
      { level: 'Low', count: counts.Low }
    ];
  }

  getAgingBuckets(): Array<{ label: string; range: string; count: number; percent: number; barHeight: number; color: string }> {
    const total = this.totalCount();
    const counts = {
      Healthy: 0,
      Watch: 0,
      'At Risk': 0,
      Critical: 0
    };

    this.filteredBenchDetails().forEach((item) => {
      if (item.durationCount <= 15) {
        counts.Healthy += 1;
      } else if (item.durationCount <= 30) {
        counts.Watch += 1;
      } else if (item.durationCount <= 45) {
        counts['At Risk'] += 1;
      } else {
        counts.Critical += 1;
      }
    });

    const maxCount = Math.max(counts.Healthy, counts.Watch, counts['At Risk'], counts.Critical, 0);
    const chartMax = this.agingChartMax(maxCount);

    return [
      {
        label: 'Healthy',
        range: '0 - 15 days',
        count: counts.Healthy,
        percent: total ? Number(((counts.Healthy / total) * 100).toFixed(1)) : 0,
        barHeight: Math.max(8, Math.round((counts.Healthy / chartMax) * 100)),
        color: 'healthy'
      },
      {
        label: 'Watch',
        range: '15 - 30 days',
        count: counts.Watch,
        percent: total ? Number(((counts.Watch / total) * 100).toFixed(1)) : 0,
        barHeight: Math.max(8, Math.round((counts.Watch / chartMax) * 100)),
        color: 'watch'
      },
      {
        label: 'At Risk',
        range: '30 - 45 days',
        count: counts['At Risk'],
        percent: total ? Number(((counts['At Risk'] / total) * 100).toFixed(1)) : 0,
        barHeight: Math.max(8, Math.round((counts['At Risk'] / chartMax) * 100)),
        color: 'at-risk'
      },
      {
        label: 'Critical',
        range: '45+ days',
        count: counts.Critical,
        percent: total ? Number(((counts.Critical / total) * 100).toFixed(1)) : 0,
        barHeight: Math.max(8, Math.round((counts.Critical / chartMax) * 100)),
        color: 'critical'
      }
    ];
  }

  getExperienceBuckets(): Array<{
    label: string;
    range: string;
    count: number;
    percent: number;
    barHeight: number;
    color: string;
  }> {
    const counts = this.filteredBenchDetailsByExperience();
    const total = this.totalCount();
    const maxCount = Math.max(counts['0-2'], counts['2-5'], counts['5-10'], counts['10+'], 0);
    const chartMax = this.experienceChartMax(maxCount);

    return [
      {
        label: '0-2 years',
        range: '0-2',
        count: counts['0-2'],
        percent: total ? Math.round((counts['0-2'] / total) * 100) : 0,
        barHeight: Math.max(8, Math.round((counts['0-2'] / chartMax) * 100)),
        color: 'healthy'
      },
      {
        label: '2-5 years',
        range: '2-5',
        count: counts['2-5'],
        percent: total ? Math.round((counts['2-5'] / total) * 100) : 0,
        barHeight: Math.max(8, Math.round((counts['2-5'] / chartMax) * 100)),
        color: 'watch'
      },
      {
        label: '5-10 years',
        range: '5-10',
        count: counts['5-10'],
        percent: total ? Math.round((counts['5-10'] / total) * 100) : 0,
        barHeight: Math.max(8, Math.round((counts['5-10'] / chartMax) * 100)),
        color: 'at-risk'
      },
      {
        label: '10+ years',
        range: '10+',
        count: counts['10+'],
        percent: total ? Math.round((counts['10+'] / total) * 100) : 0,
        barHeight: Math.max(8, Math.round((counts['10+'] / chartMax) * 100)),
        color: 'critical'
      }
    ];
  }

  agingChartFixedMax(): number {
    return 80;
  }
  agingChartMax(maxCount: number): number {
    const base = Math.max(10, Math.ceil(maxCount / 10) * 10);
    return base;
  }
  experienceChartMax(maxCount: number): number {
    const base = Math.max(10, Math.ceil(maxCount / 10) * 10);
    return base;
  }

  getAgingTicks(): number[] {
    const buckets = this.getAgingBuckets();
    const maxCount = Math.max(...buckets.map((b) => b.count), 0);
    const chartMax = this.agingChartMax(maxCount);
    const step = chartMax / 4;
    return [chartMax, Math.round(chartMax * 0.75), Math.round(chartMax * 0.5), Math.round(chartMax * 0.25), 0];
  }

  getExperienceTicks(): number[] {
    const buckets = this.getExperienceBuckets();
    const maxCount = Math.max(...buckets.map((b) => b.count), 0);
    const chartMax = this.experienceChartMax(maxCount);
    const step = chartMax / 4;
    return [chartMax, Math.round(chartMax * 0.75), Math.round(chartMax * 0.5), Math.round(chartMax * 0.25), 0];
  }

  getRisk(item: BenchDetail): RiskLevel {
    if (item.durationCount > 45) {
      return 'Critical';
    }
    if (item.durationCount > 15) {
      return 'Medium';
    }
    return 'Low';
  }

  barWidth(count: number): number {
    const max = this.technologies().reduce((value, entry) => Math.max(value, entry.count), 0);
    return max === 0 ? 0 : Math.max(12, Math.round((count / max) * 100));
  }

  formatDuration(days: number): string {
    return `${days} days`;
  }

  readonly longestBenchEmployees = computed(() => {
    return [...this.filteredBenchDetails()]
      .sort((a, b) => b.durationCount - a.durationCount)
      .slice(0, 6);
  });

  getAgingInsightText(): string {
    const buckets = this.getAgingBuckets();
    if (!buckets.length) {
      return 'Insight: No bench aging data is available.';
    }

    const topBucket = buckets.reduce((max, bucket) => (bucket.count > max.count ? bucket : max), buckets[0]);
    return `Insight: ${topBucket.label} has the highest bench concentration with ${topBucket.count} employee${topBucket.count !== 1 ? 's' : ''} in the ${topBucket.range} bucket.`;
  }

  estimatedTotalWorkforce(): number {
    const bu = this.selectedBuSignal();
    if (bu && bu !== 'ALL') {
      const headcountsList = this.headcounts();
      const hc = headcountsList.find(
        (h) => h.businessUnit?.toLowerCase().trim() === bu.toLowerCase().trim()
      );
      if (hc) {
        return hc.headcount + this.totalCount();
      }
    }
    if (this.overallCounts() > 0) {
      return this.overallCounts();
    }
    const bench = this.totalCount();
    if (!bench) {
      return 0;
    }
    return Math.round(Math.max(bench, bench / 0.117));
  }

  allocatedEmployees(): number {
    return Math.max(0, this.estimatedTotalWorkforce() - this.totalCount());
  }

  benchPercentage(): number {
    const workforce = this.estimatedTotalWorkforce();
    if (!workforce) {
      return 0;
    }
    return Number(((this.totalCount() / workforce) * 100).toFixed(1));
  }

  longBenchCount(): number {
    return this.filteredBenchDetails().filter((item) => item.durationCount > 45).length;
  }

  benchRecoveryRate(): number {
    const total = this.totalCount();
    if (!total) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((1 - this.longBenchCount() / total) * 100)));
  }

  getTopTechnologyInsight(): string {
    const techs = this.technologies();
    if (!techs.length) {
      return 'No bench technology data is available.';
    }

    const top = techs[0];
    const rest = techs.slice(1, 4).map((item) => item.key);
    const restText = rest.length ? ` followed by ${rest.join(', ')}` : '';
    return `${top.key} has the highest bench concentration with ${top.count} employee${top.count !== 1 ? 's' : ''}${restText}.`;
  }

  getTopLocationInsight(): string {
    if (!this.filteredBenchDetails().length) {
      return 'No bench location data is available.';
    }

    const locationCounts = this.filteredBenchDetails().reduce((acc, item) => {
      acc[item.location] = (acc[item.location] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedLocations = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    const longestBenchLocations = this.filteredBenchDetails().filter((item) => item.durationCount > 45).reduce((acc, item) => {
      acc[item.location] = (acc[item.location] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topLocation = sortedLocations[0];
    const longBenchTotal = this.longBenchCount();
    console.log(topLocation, ">>topLocation", longestBenchLocations, " >>longestBenchLocations")
    const longBenchAtTop = topLocation ? longestBenchLocations[topLocation.location] ?? 0 : 0;

    if (!topLocation) {
      return 'No bench location data is available.';
    }

    return `${topLocation.location} has the highest bench concentration with ${topLocation.count} employee${topLocation.count !== 1 ? 's' : ''}, including ${longBenchAtTop} of ${longBenchTotal} long bench employees.`;
  }

  getLongBenchInsight(): string {
    const count = this.longBenchCount();
    if (!count) {
      return 'No employees have bench duration above 45 days right now.';
    }

    const leader = this.longestBenchEmployees()[0];
    return `${count} employee${count !== 1 ? 's' : ''} have bench duration above 45 days. ${leader.employeeName} leads at ${leader.durationCount} days (${this.getRisk(leader)}).`;
  }

  businessUnitUtilization(limit = 5): Array<{ businessUnit: string; bench: number; billable: number; total: number; percent: number }> {
    const benchGroups = this.filteredBenchDetails().reduce((acc, item) => {
      const key = (item.businessUnit || 'Other').trim();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const headcountsList = this.headcounts();
    const buFilter = this.selectedBuSignal();

    if (headcountsList && headcountsList.length > 0) {
      let allUnits = Array.from(new Set<string>([
        ...headcountsList.map((h) => h.businessUnit.trim()),
        ...Object.keys(benchGroups)
      ]));

      if (buFilter && buFilter !== 'ALL') {
        allUnits = allUnits.filter(u => u.toLowerCase() === buFilter.toLowerCase());
      }

      const items = allUnits.map((businessUnit) => {
        const hc = headcountsList.find(
          (h) => h.businessUnit?.toLowerCase().trim() === businessUnit.toLowerCase().trim()
        );
        const billable = hc ? hc.headcount : 0;
        const bench = benchGroups[businessUnit] ?? 0;
        const total = billable + bench;
        const percent = total ? Number(((bench / total) * 100).toFixed(1)) : 0;

        return {
          businessUnit,
          bench,
          billable,
          total,
          percent
        };
      });

      return items.sort((a, b) => b.bench - a.bench || b.total - a.total).slice(0, limit);
    }

    const totalBench = this.totalCount();
    const totalWorkforce = this.estimatedTotalWorkforce();
    if (!totalBench) {
      return [];
    }

    let entries = Object.entries(benchGroups);
    if (buFilter && buFilter !== 'ALL') {
      entries = entries.filter(([businessUnit]) => businessUnit.toLowerCase() === buFilter.toLowerCase());
    }

    const items = entries.map(([businessUnit, bench]) => {
      const total = totalBench
        ? Math.max(Math.round((bench / totalBench) * totalWorkforce), bench)
        : bench;
      return {
        businessUnit,
        bench,
        billable: Math.max(0, total - bench),
        total,
        percent: total ? Number(((bench / total) * 100).toFixed(1)) : 0
      };
    });

    return items.sort((a, b) => b.bench - a.bench || b.total - a.total).slice(0, limit);
  }

  businessUnitBarHeight(bench: number): number {
    const max = this.businessUnitChartMax() || 1;
    return max === 0 ? 0 : Math.max(8, Math.round((bench / max) * 100));
  }

  businessUnitMaxBench(): number {
    const units = this.businessUnitUtilization();
    return units.reduce((value, unit) => Math.max(value, unit.bench), 0);
  }

  businessUnitMaxTotal(): number {
    const units = this.businessUnitUtilization();
    return units.reduce((value, unit) => Math.max(value, unit.total), 0);
  }

  benchSegmentHeight(item: { bench: number; billable: number; total: number }): number {
    const chartMax = this.businessUnitChartMax();
    const h = Math.round((item.bench / chartMax) * 100);
    return Math.max(6, h);
  }

  billableSegmentHeight(item: { bench: number; billable: number; total: number }): number {
    const chartMax = this.businessUnitChartMax();
    const h = Math.round((item.billable / chartMax) * 100);
    return Math.max(6, h);
  }

  businessUnitChartMax(): number {
    const max = this.businessUnitMaxBench();
    if (!max) return 10;
    if (max <= 10) return 10;
    if (max <= 20) return 20;
    if (max <= 50) return Math.ceil(max / 10) * 10;
    return Math.ceil(max / 20) * 20;
  }

  getResourceYAxisTicks(): number[] {
    const chartMax = this.businessUnitChartMax();
    const step = Math.round(chartMax / 4);
    return [chartMax, Math.round(step * 3), Math.round(step * 2), step, 0];
  }

  getResourceUtilizationInsight(): string {
    const units = this.businessUnitUtilization();
    if (!units.length) {
      return 'Insight: No business unit bench data is available.';
    }

    const top = units[0];
    if (units.length === 1) {
      return `Insight: ${top.businessUnit} has ${top.bench} bench employee${top.bench !== 1 ? 's' : ''} and ${top.billable} billable resources.`;
    }

    const compared = units
      .slice(1)
      .filter((u) => u.bench > 0)
      .map((item) => item.businessUnit)
      .join(' and ');
    return `Insight: ${top.businessUnit} has the highest bench concentration with ${top.bench} employee${top.bench !== 1 ? 's' : ''}${compared ? ` compared to ${compared}` : ''}.`;
  }

  getBenchTrendSeries(): Array<{ label: string; value: number; height: number }> {
    const history = this.monthlyBenchHistory();
    const selectedTech = this.selectedTechSignal();
    const selectedBu = this.selectedBuSignal();

    if (!history || history.length === 0) {
      const fallbackTotal = this.filteredBenchDetails().length;
      return [{
        label: 'Current',
        value: fallbackTotal > 0 ? fallbackTotal : 0,
        height: fallbackTotal > 0 ? 100 : 0
      }];
    }

    const normalizedHistory = history
      .map((entry) => {
        const monthLabel = (entry.month || '').replace(/\d{4}$/g, '').trim() || 'N/A';
        const yearLabel = (entry.month || '').match(/(\d{4})$/)?.[1] || '';
        const fullLabel = monthLabel && yearLabel ? `${monthLabel} ${yearLabel}` : monthLabel;

        let value = 0;

        if (selectedTech !== 'ALL') {
          value = Number(entry.tech?.[selectedTech] ?? 0);
        } else if (selectedBu !== 'ALL') {
          value = Number(entry.bu?.[selectedBu] ?? 0);
        } else {
          value = Object.values(entry.bu || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
        }

        if (selectedTech !== 'ALL' && selectedBu !== 'ALL') {
          const techCount = Number(entry.tech?.[selectedTech] ?? 0);
          const buCount = Number(entry.bu?.[selectedBu] ?? 0);
          value = Math.min(techCount, buCount) || 0;
        }

        return {
          label: fullLabel,
          value,
          height: 0
        };
      })
      .filter((entry) => entry.label && entry.label !== 'N/A');

    if (!normalizedHistory.length) {
      return [{ label: 'No data', value: 0, height: 0 }];
    }

    const maxValue = Math.max(...normalizedHistory.map((point) => point.value), 1);
    return normalizedHistory.map((point) => ({
      label: point.label,
      value: point.value,
      height: Math.round((point.value / maxValue) * 100)
    }));
  }

  getTrendYAxisTicks(): number[] {
    const series = this.getBenchTrendSeries();
    const max = Math.max(...series.map((point) => point.value), 10);
    return [Math.round(max), Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  }

  getTrendPolylinePoints(): string {
    const series = this.getBenchTrendSeries();
    const step = series.length > 1 ? 100 / (series.length - 1) : 0;
    return series
      .map((point, index) => `${index * step},${100 - point.height}`)
      .join(' ');
  }

  getTrendSvgX(index: number, length: number): number {
    return length > 1 ? (index * 100) / (length - 1) : 0;
  }

  /**
   * Return a simple SVG path string (linear segments) for the trend series.
   * Coordinates use the SVG viewBox 0..100 coordinate space used in the template.
   */
  getTrendPathD(): string {
    const series = this.getBenchTrendSeries();
    if (!series.length) return '';
    const step = series.length > 1 ? 100 / (series.length - 1) : 0;
    const points = series.map((p, i) => {
      const x = +(i * step).toFixed(2);
      const y = +(100 - p.height).toFixed(2);
      return `${x},${y}`;
    });
    // Build a simple 'M x,y L x,y ...' path
    return points.map((pt, idx) => (idx === 0 ? `M ${pt}` : `L ${pt}`)).join(' ');
  }

  benchTrendMetrics(): Array<{ label: string; value: string }> {
    const series = this.getBenchTrendSeries();
    const current = series[series.length - 1]?.value ?? 0;
    const prev = series[series.length - 2]?.value ?? current;
    const avg = series.length
      ? Math.round(series.reduce((sum, point) => sum + point.value, 0) / series.length)
      : 0;
    const peak = Math.max(...series.map((point) => point.value), 0);
    const delta = current - prev;
    const deltaLabel = delta >= 0 ? `+${delta}` : `${delta}`;

    return [
      { label: 'Current', value: `${current}` },
      { label: 'Monthly Avg', value: `${avg}` },
      { label: 'Peak', value: `${peak}` },
      { label: 'vs Last Month', value: deltaLabel }
    ];
  }

  getBenchTrendInsight(): string {
    const series = this.getBenchTrendSeries();
    if (!series.length) {
      return 'Insight: No monthly bench trend is available.';
    }

    const first = series[0];
    const last = series[series.length - 1];
    const peak = series.reduce((best, point) => (point.value > best.value ? point : best), series[0]);
    return `Trend Analysis: Bench has grown from ${first.value} (${first.label}) to ${last.value} (${last.label}), peaking at ${peak.value}. ${last.label} shows current headcount and recent recovery activity.`;
  }

  technologyUtilizationRows(): Array<{ technology: string; billable: number; bench: number; total: number; percent: number }> {
    const totalBench = this.totalCount();
    const totalWorkforce = this.estimatedTotalWorkforce();

    if (!totalBench) {
      return [];
    }

    const groups = this.filteredBenchDetails().reduce((acc, item) => {
      const key = (item.technology || 'Unknown').trim();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const items = Object.entries(groups).map(([technology, bench]) => {
      const total = totalBench
        ? Math.max(Math.round((bench / totalBench) * totalWorkforce), bench)
        : bench;
      return {
        technology,
        bench,
        billable: Math.max(0, total - bench),
        total,
        percent: total ? Number(((bench / total) * 100).toFixed(1)) : 0
      };
    });

    return items.sort((a, b) => b.total - a.total);
  }

  readonly packedBubbleSeries: any[] = [
    {
      name: 'Bench Employees',
      data: [
        { x: 'Java', y: 20, z: 20, fillColor: '#d9e6f3' },
        { x: 'Node JS', y: 10, z: 10, fillColor: '#bfd0f1' },
        { x: 'Testing', y: 10, z: 10, fillColor: '#d9dde4' },
        { x: 'Angular', y: 2, z: 100, fillColor: '#0a4f9e' },
        { x: 'Dot Net', y: 5, z: 5, fillColor: '#dfe4ef' },
        { x: 'Python', y: 10, z: 10, fillColor: '#d6e7f3' },
        { x: 'Full Stack', y: 10, z: 10, fillColor: '#d5dfe7' }
      ]
    }
  ];

  readonly packedBubbleChartOptions: any = {
    chart: {
      type: 'packedbubble',
      height: 360,
      toolbar: { show: false },
      background: 'transparent'
    },
    plotOptions: {
      packedBubble: {
        minBubbleSize: 24,
        maxBubbleSize: 110,
        useWeightedSize: false,
        zBottom: 0,
      }
    },
    fill: {
      opacity: 0.95
    },
    legend: {
      show: false
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'middle',
      formatter: (val: any, opts: any) => {
        const point = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex];
        return point?.y ?? val;
      },
      style: {
        colors: ['#1f2d3d'],
        fontSize: '14px',
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif'
      }
    },
    tooltip: {
      enabled: true,
      custom: ({ series, seriesIndex, dataPointIndex }: any) => {
        const point = series[seriesIndex].data[dataPointIndex];
        return `<div style="padding:8px 10px;font-size:12px;">${point.x}: ${point.y}</div>`;
      }
    },
    noData: { text: 'No data' },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 320 }
        }
      }
    ]
  };

  getTechnologyUtilization(limit = 7): Array<{ technology: string; billable: number | null; bench: number; total: number; percent: number }> {
    return this.technologies()
      .slice(0, limit)
      .map((item) => ({
        technology: item.key,
        billable: null,
        bench: item.count,
        total: item.count,
        percent: item.percent
      }));
  }

  getAgingBucket(duration: number): 'healthy' | 'watch' | 'atRisk' | 'critical' {
    if (duration <= 15) {
      return 'healthy';
    }
    if (duration <= 30) {
      return 'watch';
    }
    if (duration <= 45) {
      return 'atRisk';
    }
    return 'critical';
  }

  getTechnologyHeatmap(limit = 7): Array<{
    technology: string;
    healthy: number;
    watch: number;
    atRisk: number;
    critical: number;
    total: number;
    max: number;
  }> {
    const groups = this.filteredBenchDetails().reduce(
      (acc, item) => {
        const technology = item.technology || 'Unknown';
        if (!acc[technology]) {
          acc[technology] = { healthy: 0, watch: 0, atRisk: 0, critical: 0, total: 0 };
        }

        const bucket = this.getAgingBucket(item.durationCount);
        acc[technology][bucket] += 1;
        acc[technology].total += 1;
        return acc;
      },
      {} as Record<string, { healthy: number; watch: number; atRisk: number; critical: number; total: number }>
    );

    return Object.entries(groups)
      .map(([technology, values]) => ({
        technology,
        healthy: values.healthy,
        watch: values.watch,
        atRisk: values.atRisk,
        critical: values.critical,
        total: values.total,
        max: Math.max(values.healthy, values.watch, values.atRisk, values.critical, 1)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  heatOpacity(count: number, max: number): number {
    if (count === 0) {
      return 0.24;
    }
    return 0.3 + (count / max) * 0.55;
  }

  getDurationInsightText(): string {
    const techs = this.technologies();
    if (!techs.length) {
      return 'Insight: No bench data is available to analyze.';
    }

    const topFour = techs.slice(0, 4);
    const surplusText = topFour
      .map((item) => `${item.key} (${item.percent}%)`)
      .join(', ');

    const rest = techs.slice(4).map((item) => item.key);
    const restText = rest.length
      ? `${rest.slice(0, 4).join(', ')}${rest.length > 4 ? ', ...' : ''}`
      : 'other technologies';

    return `Insight: ${surplusText} all have bench surplus. ${restText} are fully utilized.`;
  }

  getHeatmapInsightText(): string {
    const techs = this.technologyUtilizationRows();
    if (!techs.length) {
      return 'Insight: No technology utilization data is available.';
    }

    const surplus = techs
      .filter((item) => item.percent > 0)
      .slice(0, 4)
      .map((item) => `${item.technology} (${item.percent}%)`);

    const fullyUtilized = techs
      .filter((item) => item.percent === 0)
      .slice(0, 4)
      .map((item) => item.technology);

    if (!surplus.length) {
      return `Insight: ${fullyUtilized.join(', ')} are fully utilized.`;
    }

    const surplusText = surplus.slice(0, -1).join(', ');
    const lastSurplus = surplus[surplus.length - 1];
    const surplusSentence = surplus.length > 1
      ? `${surplusText} and ${lastSurplus} all have bench surplus.`
      : `${lastSurplus} all have bench surplus.`;

    const fullyUtilizedSentence = fullyUtilized.length
      ? `${fullyUtilized.join(', ').replace(/, ([^,]*)$/, ' & $1')} are fully utilized.`
      : 'All technologies are currently in use.';

    return `Insight: ${surplusSentence} ${fullyUtilizedSentence}`;
  }

  getBubbleChartInsightText(): string {
    const techs = this.technologies();
    if (!techs.length) {
      return 'No bench employees match the selected criteria.';
    }
    const top = techs[0];
    return `${top.key} has the highest bench concentration with ${top.count} employee${top.count !== 1 ? 's' : ''}.`;
  }

  // --- Table Actions & Helper Methods ---
  onSort(column: string): void {
    if (this.tableSortColumn() === column) {
      this.tableSortDirection.set(this.tableSortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.tableSortColumn.set(column);
      this.tableSortDirection.set('asc');
    }
  }

  setGroupBy(group: string): void {
    this.tableGroupBy.set(group);
    this.collapsedGroups.set(new Set<string>());
  }

  toggleGroupCollapse(groupKey: string): void {
    const current = new Set(this.collapsedGroups());
    if (current.has(groupKey)) {
      current.delete(groupKey);
    } else {
      current.add(groupKey);
    }
    this.collapsedGroups.set(current);
  }

  isGroupCollapsed(groupKey: string): boolean {
    return this.collapsedGroups().has(groupKey);
  }

  expandAllGroups(): void {
    this.collapsedGroups.set(new Set<string>());
  }

  collapseAllGroups(): void {
    const allKeys = new Set(this.tableGroups().map((g) => g.key));
    this.collapsedGroups.set(allKeys);
  }

  resetTableFilters(): void {
    this.tableSearchQuery.set('');
    this.tableTechFilter.set('ALL');
    this.tableBuFilter.set('ALL');
    this.tableLocationFilter.set('ALL');
    this.tableRiskFilter.set('ALL');
    this.tableExpFilter.set('ALL');
    this.tableCurrentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.tableCurrentPage.set(page);
    }
  }

  onPageSizeChange(size: any): void {
    this.tablePageSize.set(Number(size));
    this.tableCurrentPage.set(1);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.tableCurrentPage();
    const pages: number[] = [];

    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  exportToCsv(): void {
    const data = this.processedTableData();
    if (!data.length) return;

    const headers = [
      'Employee Code',
      'Employee Name',
      'Technology',
      'Total Experience (Years)',
      'Business Unit',
      'Duration (Days)',
      'Location',
      'Risk Level',
      'RMG Comment'
    ];

    const rows = data.map((item) => [
      `"${item.employeecode || ''}"`,
      `"${(item.employeeName || '').replace(/"/g, '""')}"`,
      `"${(item.technology || '').replace(/"/g, '""')}"`,
      `"${this.formatExperience(item.experience)}"`,
      `"${(item.businessUnit || '').replace(/"/g, '""')}"`,
      `"${item.durationCount || 0}"`,
      `"${(item.location || '').replace(/"/g, '""')}"`,
      `"${this.getRisk(item)}"`,
      `"${(item.rmgComments || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bench_employees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

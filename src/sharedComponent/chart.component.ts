import { Component, AfterViewInit, OnDestroy, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import ApexCharts from 'apexcharts';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexStroke,
  ApexFill,
  ApexLegend,
  ApexTooltip,
  ApexMarkers,
  ApexPlotOptions,
  ApexResponsive,
  ApexGrid,
  ApexAnnotations,
  ApexStates,
  ApexTheme,
  NgApexchartsModule,
} from 'ng-apexcharts';

export type ChartOptions = {
  series?: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart?: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  title?: ApexTitleSubtitle;
  subtitle?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  fill?: ApexFill;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  markers?: ApexMarkers;
  plotOptions?: ApexPlotOptions;
  responsive?: ApexResponsive[];
  grid?: ApexGrid;
  annotations?: ApexAnnotations;
  states?: ApexStates;
  theme?: ApexTheme;
  colors?: string[];
  labels?: any;
};

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './chart.component.html',
})
export class AppChart implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() seriesData: number[] = [];
  @Input() categories: string[] = [];
  public chartOptions: Partial<ChartOptions> = {
    series: [
      {
        name: 'Bench',
        data: [],
      },
    ],
    chart: {
      height: 350,
      type: 'line',
      zoom: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -6,
      style: {
        fontSize: '11px',
        fontWeight: '700',
        colors: ['#034EA2'],
      },
      background: {
        enabled: false,
      },
    },
    markers: {
      size: 4,
      colors: ['#034EA2'],
      strokeColors: '#ffffff',
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    stroke: {
      curve: 'straight',
    },
    xaxis: {
      categories: [],
    },
    yaxis: {
      title: {
        text: 'No. of employees',
      },
      min: 0,
      forceNiceScale: true,
    },
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['seriesData'] || changes['categories']) {
      const data =
        this.seriesData && this.seriesData.length
          ? this.seriesData
          : (this.chartOptions.series && (this.chartOptions.series as any[])[0]?.data) || [];
      const cats =
        this.categories && this.categories.length
          ? this.categories
          : (this.chartOptions.xaxis as any)?.categories || [];

      const maxVal = data.length ? Math.max(...data, 0) : 0;
      // Provide clean headroom (20%) so data labels and peaks are fully visible without clipping
      const computedMax = maxVal > 0 ? Math.max(10, Math.ceil((maxVal * 1.2) / 10) * 10) : 10;

      this.chartOptions = {
        ...this.chartOptions,
        series: [
          {
            name: 'Bench',
            data,
          },
        ],
        xaxis: {
          categories: cats,
        },
        yaxis: {
          title: {
            text: 'No. of employees',
          },
          min: 0,
          max: computedMax,
          forceNiceScale: true,
        },
      };
    }
  }
  ngAfterViewInit() {
    const apex = ApexCharts || (window as any).ApexCharts;
    if (apex && typeof (apex as any).setLicense === 'function') {
      (apex as any).setLicense('APEX-eyJleHBpcnlEYXRlIjoiMjEyNi0wNy0wNCIsImlzc3VlRGF0ZSI6IjIwMjYtMDctMjgiLCJwbGFuIjoicHJlbWl1bSIsImRvbWFpbnMiOlsiYXBleGNoYXJ0cy5jb20iLCIxMjcuMC4wLjEiLCJsb2NhbGhvc3QiXSwic2lnIjoieVBmb1VCc0Z3TU9ZdUEyaEZkR0I2Y1FtZ0JITUtXcVdJSjB2NVRESXRZbFR3eDJMUmh6R2x0RUc3VXJ4X0s3b25ZMWRZb2Z2VGItN01ydFYyNDVyOWcifQ==');
    }
  }

  ngOnDestroy() {
    // no cleanup needed
  }
}

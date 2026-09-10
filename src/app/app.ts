import { Component, signal } from '@angular/core';
import { BenchTabsComponent } from './bench-tabs.component';

@Component({
  selector: 'app-root',
  imports: [BenchTabsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('dashboard-app');
}

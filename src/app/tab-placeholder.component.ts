import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tab-placeholder',
  standalone: true,
  template: `
    <section class="placeholder-card">
      <div class="placeholder-header">
        <span class="badge">{{ title }}</span>
      </div>
      <div class="placeholder-body">
        <h3>{{ title }}</h3>
        <p>Dummy content for {{ title }}. Replace this with the actual module later.</p>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .placeholder-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
      min-height: 280px;
      overflow: hidden;
    }

    .placeholder-header {
      padding: 16px 20px 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: #eef2ff;
      color: #4338ca;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .placeholder-body {
      padding: 24px 20px 28px;
    }

    h3 {
      margin: 0 0 12px;
      font-size: 28px;
      color: #0f172a;
    }

    p {
      margin: 0;
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
    }
  `
})
export class TabPlaceholderComponent {
  @Input() title = 'Tab';
}

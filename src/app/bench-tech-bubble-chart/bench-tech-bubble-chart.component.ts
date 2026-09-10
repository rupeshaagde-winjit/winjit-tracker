import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';

export interface TechBubbleNode {
  id: string;
  label: string;
  count: number;
  percent: number;
  r: number;
  x: number;
  y: number;
  fill: string;
  textColor: string;
  subTextColor: string;
  isHero: boolean;
  fontSizeCount: number;
  fontSizeLabel: number;
}

@Component({
  selector: 'app-bench-tech-bubble-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bubble-chart-container" (mouseleave)="hoveredNode.set(null)">
      <svg
        class="bubble-chart-svg"
        viewBox="0 0 540 380"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Bench Employees by Technology bubble chart"
      >
        <defs>
          <!-- Subtle drop shadow for bubbles on hover -->
          <filter id="bubbleHoverShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0052b4" flood-opacity="0.25" />
          </filter>
          <filter id="heroGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#0052b4" flood-opacity="0.2" />
          </filter>
          <!-- Clipping paths for each bubble to prevent text overflow -->
          @for (node of orbitingNodes(); track node.id) {
            <clipPath [id]="'clip-' + node.id">
              <circle [attr.cx]="node.x" [attr.cy]="node.y" [attr.r]="node.r - 2" />
            </clipPath>
          }
          @if (heroNode(); as hero) {
            <clipPath id="clip-hero">
              <circle [attr.cx]="hero.x" [attr.cy]="hero.y" [attr.r]="hero.r - 2" />
            </clipPath>
          }
        </defs>

        <!-- Surrounding Orbiting Bubbles -->
        <g class="orbiting-nodes">
          @for (node of orbitingNodes(); track node.id) {
            <g
              class="bubble-group"
              [class.is-hovered]="hoveredNode()?.id === node.id"
              (mouseenter)="onNodeHover(node, $event)"
              (mousemove)="onNodeMove($event)"
              (mouseleave)="hoveredNode.set(null)"
              [style.transform-origin]="node.x + 'px ' + node.y + 'px'"
              tabindex="0"
              [attr.aria-label]="node.label + ': ' + node.count + ' employees'"
            >
              <!-- Bubble circle -->
              <circle
                class="bubble-circle"
                [attr.cx]="node.x"
                [attr.cy]="node.y"
                [attr.r]="node.r"
                [attr.fill]="node.fill"
              />

              <!-- Count Text -->
              <text
                class="bubble-count-text"
                [attr.x]="node.x"
                [attr.y]="node.y - (node.fontSizeLabel * 0.6)"
                [attr.fill]="node.textColor"
                [style.font-size.px]="node.fontSizeCount"
                text-anchor="middle"
                dominant-baseline="central"
              >
                {{ node.count }}
              </text>

              <!-- Technology Label Text with multi-line wrap clipped to circle -->
              <text
                class="bubble-label-text"
                [attr.x]="node.x"
                [attr.y]="node.y + (node.fontSizeCount * 0.55)"
                [attr.fill]="node.subTextColor"
                [style.font-size.px]="node.fontSizeLabel"
                text-anchor="middle"
                dominant-baseline="central"
                [attr.clip-path]="'url(#clip-' + node.id + ')'"
              >
                @for (line of getLabelLines(node.label, getMaxCharsForRadius(node.r)); track $index) {
                  <tspan
                    [attr.x]="node.x"
                    [attr.dy]="$index === 0 ? 0 : (node.fontSizeLabel + 1.5)"
                  >{{ line }}</tspan>
                }
              </text>
            </g>
          }
        </g>

        <!-- Center Hero Bubble (Drawn on top) -->
        @if (heroNode(); as hero) {
          <g
            class="bubble-group hero-group"
            [class.is-hovered]="hoveredNode()?.id === hero.id"
            (mouseenter)="onNodeHover(hero, $event)"
            (mousemove)="onNodeMove($event)"
            (mouseleave)="hoveredNode.set(null)"
            [style.transform-origin]="hero.x + 'px ' + hero.y + 'px'"
            tabindex="0"
            [attr.aria-label]="hero.label + ': ' + hero.count + ' employees'"
          >
            <!-- Concentric Decorative Halo Ring from Figma -->
            <circle
              class="hero-halo-ring"
              [attr.cx]="hero.x"
              [attr.cy]="hero.y"
              [attr.r]="hero.r + 5"
              fill="none"
              stroke="#22c55e"
              stroke-width="1.3"
              stroke-dasharray="3 3"
              opacity="0.85"
            />

            <!-- Hero Bubble Circle -->
            <circle
              class="bubble-circle hero-circle"
              [attr.cx]="hero.x"
              [attr.cy]="hero.y"
              [attr.r]="hero.r"
              [attr.fill]="hero.fill"
              filter="url(#heroGlow)"
            />

            <!-- Count Text -->
            <text
              class="bubble-count-text hero-count-text"
              [attr.x]="hero.x"
              [attr.y]="hero.y - 12"
              [attr.fill]="hero.textColor"
              [style.font-size.px]="hero.fontSizeCount"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ hero.count }}
            </text>

            <!-- Technology Label Text with multi-line wrap -->
            <text
              class="bubble-label-text hero-label-text"
              [attr.x]="hero.x"
              [attr.y]="hero.y + 12"
              [attr.fill]="hero.subTextColor"
              [style.font-size.px]="hero.fontSizeLabel"
              text-anchor="middle"
              dominant-baseline="central"
              clip-path="url(#clip-hero)"
            >
              @for (line of getLabelLines(hero.label, 14); track $index) {
                <tspan
                  [attr.x]="hero.x"
                  [attr.dy]="$index === 0 ? 0 : 13"
                >{{ line }}</tspan>
              }
            </text>
          </g>
        }

        @if (!heroNode()) {
          <text
            x="270"
            y="190"
            text-anchor="middle"
            fill="#94a3b8"
            font-size="14"
            font-weight="500"
          >
            No bench records found
          </text>
        }
      </svg>

      <!-- Floating Tooltip -->
      @if (hoveredNode(); as hovered) {
        <div
          class="bubble-tooltip"
          [style.left.px]="tooltipPos().x"
          [style.top.px]="tooltipPos().y"
        >
          <div class="tooltip-header">
            <span class="tooltip-badge" [style.background]="hovered.fill"></span>
            <strong>{{ hovered.label }}</strong>
          </div>
          <div class="tooltip-body">
            <span>Bench Employees: <strong>{{ hovered.count }}</strong></span>
            @if (hovered.percent > 0) {
              <span>Bench Share: <strong>{{ hovered.percent }}%</strong></span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .bubble-chart-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
      user-select: none;
    }

    .bubble-chart-svg {
      width: 100%;
      height: 100%;
      max-height: 440px;
      overflow: visible;
    }

    .bubble-group {
      cursor: pointer;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
      outline: none;
    }

    .bubble-group:hover,
    .bubble-group.is-hovered {
      transform: scale(1.06);
    }

    .bubble-circle {
      transition: filter 0.2s ease, stroke 0.2s ease;
    }

    .bubble-group:hover .bubble-circle {
      filter: url(#bubbleHoverShadow);
    }

    .hero-halo-ring {
      pointer-events: none;
      animation: haloRotate 24s linear infinite;
      transform-origin: 270px 180px;
    }

    @keyframes haloRotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .bubble-count-text {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-weight: 700;
      pointer-events: none;
      letter-spacing: -0.02em;
    }

    .hero-count-text {
      font-weight: 800;
    }

    .bubble-label-text {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-weight: 500;
      pointer-events: none;
      letter-spacing: -0.01em;
    }

    .hero-label-text {
      font-weight: 600;
    }

    /* Floating Tooltip */
    .bubble-tooltip {
      position: absolute;
      transform: translate(-50%, -120%);
      background: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      pointer-events: none;
      z-index: 100;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
      animation: tooltipFade 0.15s ease-out;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    @keyframes tooltipFade {
      from {
        opacity: 0;
        transform: translate(-50%, -110%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -120%);
      }
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 13px;
    }

    .tooltip-badge {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }

    .tooltip-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: #94a3b8;
      font-size: 11.5px;
    }

    .tooltip-body strong {
      color: #f8fafc;
    }
  `]
})
export class BenchTechBubbleChartComponent implements OnChanges {
  @Input() technologies: Array<{ key: string; count: number; percent?: number }> | null = null;

  readonly heroNode = signal<TechBubbleNode | null>(null);
  readonly orbitingNodes = signal<TechBubbleNode[]>([]);
  readonly hoveredNode = signal<TechBubbleNode | null>(null);
  readonly tooltipPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // Curated Figma color palette
  private readonly figmaColors = [
    { fill: '#bedbf7', textColor: '#1e293b', subTextColor: '#475569' }, // Top 2: Light Blue (Java style)
    { fill: '#9bb9eb', textColor: '#1e293b', subTextColor: '#475569' }, // Top 3: Periwinkle (Node JS style)
    { fill: '#c8d4df', textColor: '#1e293b', subTextColor: '#475569' }, // Top 4: Soft Slate (Testing style)
    { fill: '#8bb0e3', textColor: '#1e293b', subTextColor: '#475569' }, // Top 5: Sky Blue (Full Stack style)
    { fill: '#c0ddf8', textColor: '#1e293b', subTextColor: '#475569' }, // Top 6: Ice Blue (Python style)
    { fill: '#c8cee0', textColor: '#1e293b', subTextColor: '#475569' }, // Top 7: Lavender Gray (Dot Net style)
    { fill: '#b5d4f2', textColor: '#1e293b', subTextColor: '#475569' },
    { fill: '#a2c2ed', textColor: '#1e293b', subTextColor: '#475569' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    this.calculateBubbleLayout();
  }

  calculateBubbleLayout(): void {
    const rawData =
      this.technologies !== undefined && this.technologies !== null
        ? this.technologies
        : this.getDefaultDemoData();

    if (!rawData || rawData.length === 0) {
      this.heroNode.set(null);
      this.orbitingNodes.set([]);
      return;
    }

    // Sort descending by count
    const sorted = [...rawData].sort((a, b) => b.count - a.count);
    const topItem = sorted[0];
    const surroundingRaw = sorted.slice(1);
    const surroundingItems = [...surroundingRaw];

    const totalCount = sorted.reduce((sum, item) => sum + item.count, 0) || 1;
    const maxCount = topItem.count || 1;

    // Center coordinates
    const centerX = 270;
    const centerY = 180;

    // 1. Hero Node (Top 1)
    const heroRadius = 80;
    const hero: TechBubbleNode = {
      id: `hero-${topItem.key}`,
      label: topItem.key,
      count: topItem.count,
      percent: topItem.percent ?? Number(((topItem.count / totalCount) * 100).toFixed(1)),
      r: heroRadius,
      x: centerX,
      y: centerY,
      fill: '#0052b4', // Primary deep blue from Figma
      textColor: '#ffffff',
      subTextColor: '#ffffff',
      isHero: true,
      fontSizeCount: 24,
      fontSizeLabel: 12.5
    };

    // 2. Surrounding Orbiting Nodes matching Figma configuration
    const figmaSlots = [
      { angleDeg: -145, distMultiplier: 1.02, baseRadius: 56 }, // Top-Left
      { angleDeg: -35, distMultiplier: 1.03, baseRadius: 56 }, // Top-Right
      { angleDeg: -195, distMultiplier: 0.98, baseRadius: 40 }, // Mid-Left
      { angleDeg: 125, distMultiplier: 1.02, baseRadius: 40 }, // Bottom-Left
      { angleDeg: 60, distMultiplier: 1.00, baseRadius: 37 }, // Bottom-Right
      { angleDeg: 18, distMultiplier: 1.04, baseRadius: 42 }, // Mid-Right
      { angleDeg: -80, distMultiplier: 1.01, baseRadius: 36 }, // Top (Others slot)
    ];

    const slotUsageCounts = Array(figmaSlots.length).fill(0);
    const nodes: TechBubbleNode[] = [];
    surroundingItems.forEach((item, index) => {
      const slotIndex = index % figmaSlots.length;
      const slot = figmaSlots[slotIndex];
      const reuseIndex = slotUsageCounts[slotIndex]++;
      const colorScheme = this.figmaColors[index % this.figmaColors.length];

      // Proportional radius scaling
      const ratio = Math.sqrt(item.count / maxCount);
      const computedR = Math.max(30, Math.min(62, slot.baseRadius * (0.7 + 0.4 * ratio)));

      const angleOffsetDeg =
        reuseIndex === 0
          ? 0
          : (reuseIndex % 2 === 0 ? -1 : 1) * (10 + Math.floor((reuseIndex - 1) / 2) * 6);
      const distanceOffset = reuseIndex * Math.max(24, computedR * 0.9);
      const angleRad = ((slot.angleDeg + angleOffsetDeg) * Math.PI) / 180;
      const targetDistance = (heroRadius + computedR + 3) * slot.distMultiplier + distanceOffset;

      const x = Math.round(centerX + Math.cos(angleRad) * targetDistance);
      const y = Math.round(centerY + Math.sin(angleRad) * targetDistance);

      const countFontSize = computedR > 50 ? 18 : computedR > 40 ? 16 : 13;
      const labelFontSize = computedR > 50 ? 11 : computedR > 40 ? 10 : 9;

      nodes.push({
        id: `node-${item.key}-${index}`,
        label: item.key,
        count: item.count,
        percent: item.percent ?? Number(((item.count / totalCount) * 100).toFixed(1)),
        r: computedR,
        x,
        y,
        fill: colorScheme.fill,
        textColor: colorScheme.textColor,
        subTextColor: colorScheme.subTextColor,
        isHero: false,
        fontSizeCount: countFontSize,
        fontSizeLabel: labelFontSize
      });
    });

    // Simple overlap resolution pass to guarantee no bubble collisions
    this.resolveOverlaps(hero, nodes);

    this.heroNode.set(hero);
    this.orbitingNodes.set(nodes);
  }

  private resolveOverlaps(hero: TechBubbleNode, nodes: TechBubbleNode[]): void {
    const iterations = 15;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];

        // Check collision with hero
        const dxHero = a.x - hero.x;
        const dyHero = a.y - hero.y;
        const distHero = Math.sqrt(dxHero * dxHero + dyHero * dyHero);
        const minHeroDist = hero.r + a.r + 3;
        if (distHero < minHeroDist) {
          const { nx, ny, distance } = this.getSeparationVector(dxHero, dyHero, i);
          const overlap = minHeroDist - distance;
          a.x += nx * overlap;
          a.y += ny * overlap;
        }

        // Check collision with other surrounding nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.r + b.r + 4;

          if (dist < minDist) {
            const { nx, ny, distance } = this.getSeparationVector(dx, dy, i + j + iter);
            const overlap = (minDist - distance) / 2;

            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
          }
        }

        // Keep inside bounds
        a.x = Math.max(a.r + 5, Math.min(540 - a.r - 5, a.x));
        a.y = Math.max(a.r + 5, Math.min(380 - a.r - 5, a.y));
      }
    }
  }

  private getSeparationVector(dx: number, dy: number, seed: number): { nx: number; ny: number; distance: number } {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0.001) {
      return {
        nx: dx / distance,
        ny: dy / distance,
        distance
      };
    }

    const angle = (((seed + 1) * 137.5) * Math.PI) / 180;
    return {
      nx: Math.cos(angle),
      ny: Math.sin(angle),
      distance: 0
    };
  }

  /**
   * Returns the maximum characters per line that will safely fit inside
   * a circle of the given radius, preventing text overflow outside the bubble.
   * Smaller circles get fewer characters to avoid overflow.
   */
  getMaxCharsForRadius(r: number): number {
    if (r >= 60) return 12;
    if (r >= 50) return 10;
    if (r >= 42) return 9;
    if (r >= 36) return 8;
    if (r >= 30) return 6;
    return 5;
  }

  getLabelLines(label: string, maxCharsPerLine = 12): string[] {
    if (!label) return [];
    const clean = label.replace(/[–—]/g, '-').trim();

    // If short enough, single line
    if (clean.length <= maxCharsPerLine) {
      return [clean];
    }

    // Split words
    const words = clean.split(/\s+/);
    if (words.length <= 1) {
      // Single word - truncate with ellipsis
      return [clean.length > maxCharsPerLine ? clean.substring(0, Math.max(1, maxCharsPerLine - 1)) + '…' : clean];
    }

    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        // First word on the line - truncate if too long
        if (word.length > maxCharsPerLine) {
          currentLine = word.substring(0, Math.max(1, maxCharsPerLine - 1)) + '…';
          lines.push(currentLine);
          currentLine = '';
          if (lines.length >= 2) break;
        } else {
          currentLine = word;
        }
      } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += ' ' + word;
      } else {
        // Word doesn't fit - save current line and start new one
        lines.push(currentLine);
        currentLine = '';
        
        if (lines.length >= 2) break;
        
        // Try to add the word to the next line
        if (word.length > maxCharsPerLine) {
          currentLine = word.substring(0, Math.max(1, maxCharsPerLine - 1)) + '…';
          lines.push(currentLine);
          currentLine = '';
          break;
        } else {
          currentLine = word;
        }
      }
    }

    // Add the last line if there's room
    if (currentLine && lines.length < 2) {
      lines.push(currentLine);
    } else if (currentLine && lines.length >= 2) {
      // We're at line limit, add ellipsis to last line if it has room
      const lastLine = lines[lines.length - 1];
      if (lastLine.length < maxCharsPerLine) {
        lines[lines.length - 1] = lastLine + '…';
      }
    }

    return lines.length > 0 ? lines : [clean.substring(0, maxCharsPerLine)];
  }

  onNodeHover(node: TechBubbleNode, event: MouseEvent): void {
    this.hoveredNode.set(node);
    this.updateTooltipPosition(event);
  }

  onNodeMove(event: MouseEvent): void {
    if (this.hoveredNode()) {
      this.updateTooltipPosition(event);
    }
  }

  private updateTooltipPosition(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const container = target?.closest('.bubble-chart-container') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.tooltipPos.set({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  }

  private getDefaultDemoData(): Array<{ key: string; count: number; percent: number }> {
    return [
      { key: 'Angular JS', count: 100, percent: 58.8 },
      { key: 'Java', count: 20, percent: 11.8 },
      { key: 'Node JS', count: 10, percent: 5.9 },
      { key: 'Testing', count: 10, percent: 5.9 },
      { key: 'Full Stack', count: 10, percent: 5.9 },
      { key: 'Python', count: 10, percent: 5.9 },
      { key: 'Dot Net', count: 5, percent: 2.9 }
    ];
  }
}

import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import { MAP_SCALE_MAX, MAP_SCALE_MIN, MAP_SCALE_STEP, PriceSource, ThemeName } from '../models/settings';

@Component({
  selector: 'app-settings-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-root" (click)="$event.stopPropagation()">
      <button
        type="button"
        class="settings-toggle"
        [class.open]="open"
        (click)="toggle($event)"
        aria-haspopup="true"
        [attr.aria-expanded]="open"
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 13.94a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.61.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.23.1.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
        </svg>
      </button>

      <div class="settings-panel" *ngIf="open" role="dialog" aria-label="Application settings">
        <h2>Settings</h2>

        <fieldset>
          <legend>Price source</legend>
          <label class="radio-row" *ngFor="let option of priceOptions">
            <input
              type="radio"
              name="priceSource"
              [value]="option.id"
              [ngModel]="settings.priceSource"
              (ngModelChange)="setPriceSource($event)"
            >
            {{ option.label }}
          </label>
        </fieldset>

        <label class="scale-row">
          <span>
            <strong>Map size</strong>
            <small>{{ scalePercent }}%</small>
          </span>
          <input
            type="range"
            [min]="scaleMin"
            [max]="scaleMax"
            [step]="scaleStep"
            [ngModel]="settings.mapScale"
            (ngModelChange)="setScale($event)"
          >
        </label>

        <fieldset>
          <legend>Sheet</legend>
          <label class="radio-row" *ngFor="let option of themeOptions">
            <input
              type="radio"
              name="theme"
              [value]="option.id"
              [ngModel]="settings.theme"
              (ngModelChange)="setTheme($event)"
            >
            {{ option.label }}
          </label>
        </fieldset>

        <label class="check-row">
          <input
            type="checkbox"
            [ngModel]="settings.colorCoding"
            (ngModelChange)="setColorCoding($event)"
          >
          <span>
            <strong>Color code distinctions</strong>
            <small>Tint starports, bases, lanes, and status where the color names a type.</small>
          </span>
        </label>
      </div>
    </div>
  `,
  styles: [`
    .settings-root {
      position: relative;
      z-index: 20;
    }

    .settings-toggle {
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 0;
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .settings-toggle:hover,
    .settings-toggle.open {
      background: var(--control, currentColor);
      color: var(--control-inverse, var(--paper));
    }

    .settings-toggle svg {
      width: 1.35rem;
      height: 1.35rem;
      fill: currentColor;
    }

    .settings-panel {
      position: absolute;
      top: calc(100% + 0.35rem);
      right: 0;
      width: 18rem;
      max-width: calc(100vw - 2rem);
      background: var(--paper, #fff);
      color: var(--ink, #111);
      border: 1px solid var(--rule, #111);
      border-radius: 0;
      box-shadow: none;
      padding: 0.75rem 0.8rem 0.85rem;
      text-align: left;
    }

    h2 {
      margin: 0 0 0.7rem;
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    fieldset {
      border: 0;
      margin: 0.85rem 0 0;
      padding: 0;
    }

    legend,
    .toggle-row strong,
    .scale-row strong,
    .check-row strong {
      display: block;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.3rem;
    }

    .toggle-row,
    .radio-row,
    .check-row,
    .scale-row {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      margin: 0.55rem 0;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .toggle-row small,
    .check-row small,
    .scale-row small {
      display: block;
      color: var(--ink-soft, #444);
      font-weight: 400;
      font-size: 0.75rem;
      letter-spacing: 0;
      text-transform: none;
      line-height: 1.35;
    }

    .scale-row {
      flex-direction: column;
      gap: 0.35rem;
    }

    .scale-row span {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
    }

    input[type="range"] {
      width: 100%;
    }
  `]
})
export class SettingsMenuComponent {
  open = false;
  readonly scaleMin = MAP_SCALE_MIN;
  readonly scaleMax = MAP_SCALE_MAX;
  readonly scaleStep = MAP_SCALE_STEP;
  readonly priceOptions: { id: PriceSource; label: string }[] = [
    { id: 'base', label: 'Base price' },
    { id: 'purchase', label: 'Purchase modifier' },
    { id: 'resale', label: 'Resale modifier' }
  ];
  readonly themeOptions: { id: ThemeName; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' }
  ];

  constructor(
    private settingsService: SettingsService,
    private host: ElementRef<HTMLElement>
  ) {}

  get settings() {
    return this.settingsService.snapshot;
  }

  get scalePercent(): number {
    return Math.round(this.settings.mapScale * 100);
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  setPriceSource(value: PriceSource): void {
    this.settingsService.patch({ priceSource: value });
  }

  setScale(value: number): void {
    this.settingsService.patch({ mapScale: Number(value) });
  }

  setTheme(value: ThemeName): void {
    this.settingsService.patch({ theme: value });
  }

  setColorCoding(value: boolean): void {
    this.settingsService.patch({ colorCoding: value });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open = false;
    }
  }
}

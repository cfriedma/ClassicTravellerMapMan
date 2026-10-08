import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubsectorManagerService, SubsectorData } from '../services/subsector-manager.service';
import { SettingsMenuComponent } from '../shared/settings-menu.component';
import { GenerationSetupComponent } from '../shared/generation-setup.component';
import { SettingsService } from '../services/settings.service';
import {
  cloneGenerationOptions,
  GenerationOptions
} from '../models/generation-options';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, SettingsMenuComponent, GenerationSetupComponent],
  template: `
    <div class="home-container">
      <header class="cover">
        <div class="cover-toolbar">
          <app-settings-menu></app-settings-menu>
        </div>
        <svg class="cover-mark" viewBox="0 0 68 66" aria-hidden="true">
          <polygon points="34.4,30 24,36 13.6,30 13.6,18 24,12 34.4,18" />
          <polygon points="55.2,30 44.8,36 34.4,30 34.4,18 44.8,12 55.2,18" />
          <polygon points="44.8,48 34.4,54 24,48 24,36 34.4,30 44.8,36" />
        </svg>
        <h1>Classic Traveller Map Manager</h1>
      </header>

      <main class="sheet">
        <section class="form-section">
          <h2><span class="sec-no">1</span> Generate a subsector</h2>
          <div class="form-body">
            <p class="lede">File a new subsector. Worlds, starports, and lanes are rolled from the rules you set.</p>
            <div class="input-group">
              <label for="subsectorName">Subsector name (optional)</label>
              <input
                type="text"
                id="subsectorName"
                [(ngModel)]="newSubsectorName"
                placeholder="Designation"
                maxlength="50"
                (keyup.enter)="openGenerationSetup()"
              >
            </div>
            <button class="btn" type="button" (click)="openGenerationSetup()">Generate</button>
          </div>
        </section>

        <section class="form-section">
          <h2><span class="sec-no">2</span> Recall by code</h2>
          <div class="form-body">
            <p class="lede">Enter the 8-character code of a subsector already on file.</p>
            <div class="input-group">
              <label for="subsectorCode">Subsector code</label>
              <input
                type="text"
                id="subsectorCode"
                [(ngModel)]="accessCode"
                placeholder="ABC123XY"
                maxlength="8"
                (input)="onCodeInput($event)"
                class="code-input"
              >
            </div>
            <button
              class="btn btn-line"
              type="button"
              (click)="accessSubsector()"
              [disabled]="!isValidCode(accessCode) || isAccessing"
            >
              <span *ngIf="!isAccessing">Open record</span>
              <span *ngIf="isAccessing">Opening</span>
            </button>
            <p *ngIf="accessError" class="note">{{ accessError }}</p>
          </div>
        </section>

        <section class="form-section" *ngIf="recentSubsectors.length > 0">
          <h2><span class="sec-no">3</span> Recent records</h2>
          <div class="form-body">
            <table class="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Last access</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let subsector of recentSubsectors">
                  <td>
                    <button type="button" class="linkish" (click)="accessSubsectorById(subsector.id)">
                      {{ subsector.name }}
                    </button>
                  </td>
                  <td class="mono">{{ subsector.id }}</td>
                  <td>{{ subsector.lastAccessed | date:'medium' }}</td>
                  <td class="row-actions">
                    <button
                      type="button"
                      class="btn btn-line btn-small"
                      (click)="copyToClipboard(subsector.id)"
                    >Copy code</button>
                    <button
                      type="button"
                      class="btn btn-line btn-small"
                      (click)="deleteSubsector(subsector.id)"
                    >Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="form-section">
          <h2><span class="sec-no">4</span> Procedure</h2>
          <div class="form-body">
            <ol class="procedure">
              <li><strong>Generate.</strong> Open section 1. Set the grid, cell types, and campaign rules, then file the hex plate.</li>
              <li><strong>Share.</strong> Each subsector receives an 8-character code. Pass the code, or the address, to return to the same record.</li>
              <li><strong>Inspect.</strong> Read the world statistics, trade classes, and lanes on the plate. Markets and encounter tables open from the world entry.</li>
            </ol>
          </div>
        </section>
      </main>
    </div>

    <app-generation-setup
      *ngIf="showGenerationSetup"
      [initialName]="newSubsectorName"
      [initialOptions]="setupOptions"
      (cancelled)="closeGenerationSetup()"
      (confirmed)="onGenerationConfirmed($event)"
    ></app-generation-setup>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      background: var(--paper);
    }

    .cover {
      position: relative;
      background: var(--cover);
      color: var(--cover-ink);
      --control: var(--cover-ink);
      --control-inverse: var(--cover);
      padding: 1.6rem 1.5rem 1.35rem;
    }

    .cover-toolbar {
      position: absolute;
      top: 0.85rem;
      right: 0.85rem;
    }

    .cover-mark {
      width: 4.25rem;
      height: auto;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.15;
    }

    .cover h1 {
      margin: 0.85rem 0 0;
      max-width: 22rem;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      line-height: 1.15;
    }

    .sheet {
      max-width: 46rem;
      margin: 0 auto;
      padding: 1.1rem 1rem 2.5rem;
    }

    .form-section {
      border: 1px solid var(--rule);
      margin-bottom: 0.75rem;
      background: var(--paper);
    }

    .form-section h2 {
      margin: 0;
      padding: 0.4rem 0.65rem;
      border-bottom: 1px solid var(--rule);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .sec-no {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      margin-right: 0.5rem;
    }

    .form-body {
      padding: 0.7rem 0.65rem 0.8rem;
    }

    .lede {
      margin: 0 0 0.7rem;
      color: var(--ink-soft);
      font-size: 0.85rem;
    }

    .input-group {
      margin-bottom: 0.7rem;
    }

    .input-group label {
      display: block;
      margin-bottom: 0.25rem;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .input-group input {
      width: 100%;
    }

    .code-input {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .note {
      margin: 0.7rem 0 0;
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--rule);
      color: var(--ink);
      font-size: 0.85rem;
    }

    .procedure {
      margin: 0;
      padding-left: 1.25rem;
    }

    .procedure li {
      margin: 0 0 0.4rem;
    }

    .procedure li:last-child {
      margin-bottom: 0;
    }

    .linkish {
      border: 0;
      background: none;
      padding: 0;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
    }

    .linkish:hover {
      text-decoration: underline;
    }

    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    @media (max-width: 768px) {
      .cover h1 {
        font-size: 1.1rem;
        padding-right: 2.5rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  newSubsectorName = '';
  accessCode = '';
  accessError = '';
  isCreating = false;
  isAccessing = false;
  showGenerationSetup = false;
  setupOptions: GenerationOptions | null = null;
  recentSubsectors: SubsectorData[] = [];

  constructor(
    private subsectorManager: SubsectorManagerService,
    private settings: SettingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecentSubsectors();
    
    // Subscribe to subsector changes
    this.subsectorManager.subsectors$.subscribe(subsectors => {
      this.loadRecentSubsectors();
    });
  }

  openGenerationSetup(): void {
    this.setupOptions = cloneGenerationOptions(this.settings.snapshot.lastGenerationOptions);
    this.showGenerationSetup = true;
  }

  closeGenerationSetup(): void {
    this.showGenerationSetup = false;
  }

  onGenerationConfirmed(event: { name: string; options: GenerationOptions }): void {
    if (this.isCreating) {
      return;
    }

    this.isCreating = true;
    try {
      const subsectorData = this.subsectorManager.createNewSubsector(event.name, event.options);
      this.showGenerationSetup = false;
      this.newSubsectorName = '';
      this.router.navigate(['/subsector', subsectorData.id]);
    } catch (error) {
      console.error('Error creating subsector:', error);
      alert('Failed to create subsector. Please try again.');
    } finally {
      this.isCreating = false;
    }
  }

  accessSubsector(): void {
    if (!this.isValidCode(this.accessCode) || this.isAccessing) return;
    
    this.isAccessing = true;
    this.accessError = '';
    
    const subsector = this.subsectorManager.getSubsector(this.accessCode.toUpperCase());
    
    setTimeout(() => { // Simulate loading time
      if (subsector) {
        this.router.navigate(['/subsector', subsector.id]);
      } else {
        this.accessError = 'Subsector not found. Please check the code and try again.';
      }
      this.isAccessing = false;
    }, 500);
  }

  accessSubsectorById(id: string): void {
    const subsector = this.subsectorManager.getSubsector(id);
    if (subsector) {
      this.router.navigate(['/subsector', id]);
    }
  }

  onCodeInput(event: any): void {
    // Auto-uppercase and limit to 8 characters
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.accessCode = value.substring(0, 8);
    this.accessError = '';
  }

  isValidCode(code: string): boolean {
    return /^[A-Z0-9]{8}$/.test(code);
  }

  deleteSubsector(id: string): void {
    if (confirm('Are you sure you want to delete this subsector? This action cannot be undone.')) {
      this.subsectorManager.deleteSubsector(id);
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
      console.log('Code copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  private loadRecentSubsectors(): void {
    const all = this.subsectorManager.getAllSubsectors();
    this.recentSubsectors = all
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
      .slice(0, 5); // Show only the 5 most recent
  }
}

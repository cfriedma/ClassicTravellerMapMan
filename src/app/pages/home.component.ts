import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubsectorManagerService, SubsectorData } from '../services/subsector-manager.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-container">
      <header class="hero-section">
        <h1 class="hero-title">Classic Traveller Map Generator</h1>
        <p class="hero-subtitle">Create and explore randomly generated subsectors in the Traveller universe</p>
      </header>

      <div class="main-content">
        <!-- Create New Subsector Section -->
        <div class="card create-section">
          <div class="card-header">
            <h2>Create New Subsector</h2>
            <p>Generate a new subsector with randomly placed worlds, starports, and space lanes</p>
          </div>
          
          <div class="card-body">
            <div class="input-group">
              <label for="subsectorName">Subsector Name (optional)</label>
              <input 
                type="text" 
                id="subsectorName"
                [(ngModel)]="newSubsectorName" 
                placeholder="Enter a name for your subsector..."
                maxlength="50"
              >
            </div>
            
            <button 
              class="btn btn-primary btn-large"
              (click)="createNewSubsector()"
              [disabled]="isCreating"
            >
              <span *ngIf="!isCreating">🚀 Generate New Subsector</span>
              <span *ngIf="isCreating">🔄 Generating...</span>
            </button>
          </div>
        </div>

        <!-- Access Existing Subsector Section -->
        <div class="card access-section">
          <div class="card-header">
            <h2>Access Existing Subsector</h2>
            <p>Enter a subsector code to view a previously generated subsector</p>
          </div>
          
          <div class="card-body">
            <div class="input-group">
              <label for="subsectorCode">Subsector Code</label>
              <input 
                type="text" 
                id="subsectorCode"
                [(ngModel)]="accessCode" 
                placeholder="Enter 8-character code (e.g., ABC123XY)"
                maxlength="8"
                (input)="onCodeInput($event)"
                class="code-input"
              >
            </div>
            
            <button 
              class="btn btn-secondary btn-large"
              (click)="accessSubsector()"
              [disabled]="!isValidCode(accessCode) || isAccessing"
            >
              <span *ngIf="!isAccessing">🗺️ Access Subsector</span>
              <span *ngIf="isAccessing">🔍 Loading...</span>
            </button>
            
            <div *ngIf="accessError" class="error-message">
              {{ accessError }}
            </div>
          </div>
        </div>

        <!-- Recent Subsectors Section -->
        <div class="card recent-section" *ngIf="recentSubsectors.length > 0">
          <div class="card-header">
            <h2>Recent Subsectors</h2>
            <p>Your recently accessed subsectors</p>
          </div>
          
          <div class="card-body">
            <div class="recent-list">
              <div 
                *ngFor="let subsector of recentSubsectors" 
                class="recent-item"
                (click)="accessSubsectorById(subsector.id)"
              >
                <div class="recent-info">
                  <h3>{{ subsector.name }}</h3>
                  <p class="recent-code">Code: {{ subsector.id }}</p>
                  <p class="recent-date">Last accessed: {{ subsector.lastAccessed | date:'short' }}</p>
                </div>
                <div class="recent-actions">
                  <button 
                    class="btn btn-small btn-outline"
                    (click)="copyToClipboard(subsector.id); $event.stopPropagation()"
                  >
                    📋 Copy Code
                  </button>
                  <button 
                    class="btn btn-small btn-danger"
                    (click)="deleteSubsector(subsector.id); $event.stopPropagation()"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- How It Works Section -->
        <div class="card info-section">
          <div class="card-header">
            <h2>How It Works</h2>
          </div>
          
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-icon">🎲</div>
                <h3>Generate</h3>
                <p>Click "Generate New Subsector" to create a random 8x10 hex grid with worlds, starports, and trade routes following Classic Traveller rules.</p>
              </div>
              
              <div class="info-item">
                <div class="info-icon">🔗</div>
                <h3>Share</h3>
                <p>Each subsector gets a unique 8-character code. Share this code with others or bookmark the URL to return later.</p>
              </div>
              
              <div class="info-item">
                <div class="info-icon">🗺️</div>
                <h3>Explore</h3>
                <p>View detailed world statistics, trade classifications, and space lane connections in an interactive hex map.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 2rem 1rem;
    }

    .hero-section {
      text-align: center;
      color: white;
      margin-bottom: 3rem;
    }

    .hero-title {
      font-size: 3rem;
      font-weight: bold;
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .hero-subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      max-width: 600px;
      margin: 0 auto;
    }

    .main-content {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    }

    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .card-header h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .card-header p {
      margin: 0;
      opacity: 0.9;
    }

    .card-body {
      padding: 2rem;
    }

    .input-group {
      margin-bottom: 1.5rem;
    }

    .input-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .input-group input {
      width: 100%;
      padding: 1rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .input-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .code-input {
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(245, 87, 108, 0.4);
    }

    .btn-outline {
      background: transparent;
      border: 2px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-large {
      width: 100%;
      padding: 1.25rem 2rem;
      font-size: 1.1rem;
    }

    .btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      border: 1px solid #f5c6cb;
    }

    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .recent-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .recent-item:hover {
      background: #e9ecef;
    }

    .recent-info h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .recent-code {
      font-family: 'Courier New', monospace;
      color: #667eea;
      font-weight: bold;
      margin: 0.25rem 0;
    }

    .recent-date {
      color: #666;
      font-size: 0.9rem;
      margin: 0;
    }

    .recent-actions {
      display: flex;
      gap: 0.5rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }

    .info-item {
      text-align: center;
    }

    .info-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .info-item h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .info-item p {
      color: #666;
      line-height: 1.6;
      margin: 0;
    }

    @media (max-width: 768px) {
      .home-container {
        padding: 1rem 0.5rem;
      }

      .hero-title {
        font-size: 2rem;
      }

      .card-body {
        padding: 1.5rem;
      }

      .recent-item {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .recent-actions {
        justify-content: center;
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
  recentSubsectors: SubsectorData[] = [];

  constructor(
    private subsectorManager: SubsectorManagerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecentSubsectors();
    
    // Subscribe to subsector changes
    this.subsectorManager.subsectors$.subscribe(subsectors => {
      this.loadRecentSubsectors();
    });
  }

  createNewSubsector(): void {
    if (this.isCreating) return;
    
    this.isCreating = true;
    
    try {
      const subsectorData = this.subsectorManager.createNewSubsector(this.newSubsectorName);
      this.router.navigate(['/subsector', subsectorData.id]);
    } catch (error) {
      console.error('Error creating subsector:', error);
      alert('Failed to create subsector. Please try again.');
    } finally {
      this.isCreating = false;
      this.newSubsectorName = '';
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

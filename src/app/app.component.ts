import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <header>
        <h1>{{title}}</h1>
        <p>Welcome to the Classic Traveller Map Management System</p>
      </header>
      
      <main>
        <div class="card">
          <h2>Getting Started</h2>
          <p>This is your Classic Traveller Map Man application. You can start building your map management features here.</p>
          
          <div class="features">
            <h3>Planned Features:</h3>
            <ul>
              <li>Star map visualization</li>
              <li>Sector management</li>
              <li>World data tracking</li>
              <li>Trade route planning</li>
              <li>Navigation tools</li>
            </ul>
          </div>
          
          <button class="btn" (click)="onGetStarted()">Get Started</button>
        </div>
      </main>
      
      <footer>
        <p>&copy; 2024 Classic Traveller Map Man. Ready for adventure!</p>
      </footer>
    </div>
  `,
  styles: [`
    header {
      text-align: center;
      padding: 2rem 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin-bottom: 2rem;
      border-radius: 10px;
    }
    
    header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    
    header p {
      font-size: 1.2rem;
      opacity: 0.9;
    }
    
    .features {
      margin: 1.5rem 0;
    }
    
    .features ul {
      list-style-type: none;
      padding-left: 0;
    }
    
    .features li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    
    .features li:before {
      content: "🚀 ";
      margin-right: 0.5rem;
    }
    
    footer {
      text-align: center;
      padding: 2rem 0;
      color: #666;
      border-top: 1px solid #eee;
      margin-top: 2rem;
    }
    
    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      padding: 12px 24px;
      font-size: 1rem;
      border-radius: 25px;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
  `]
})
export class AppComponent {
  title = 'Classic Traveller Map Man';
  
  onGetStarted() {
    alert('Ready to explore the galaxy! Start building your map features.');
  }
}

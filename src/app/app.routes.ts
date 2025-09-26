import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { SubsectorViewComponent } from './pages/subsector-view.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'subsector/:id', component: SubsectorViewComponent },
  { path: '**', redirectTo: '' }
];

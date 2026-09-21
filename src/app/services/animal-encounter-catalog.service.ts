import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AnimalEncounterCatalog } from '../models/animal-encounter';

@Injectable({
  providedIn: 'root'
})
export class AnimalEncounterCatalogService {
  private loadPromise: Promise<void> | null = null;
  private catalog: AnimalEncounterCatalog | null = null;

  constructor(private http: HttpClient) {}

  ensureLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.load();
    }
    return this.loadPromise;
  }

  getCatalog(): AnimalEncounterCatalog {
    if (!this.catalog) {
      throw new Error('Animal encounter catalog is not loaded');
    }
    return this.catalog;
  }

  private async load(): Promise<void> {
    this.catalog = await firstValueFrom(
      this.http.get<AnimalEncounterCatalog>('assets/data/animal-encounters.json')
    );
  }
}

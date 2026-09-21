import { Injectable } from '@angular/core';
import { World } from '../models/world';
import { WorldEncounterState } from '../models/animal-encounter';
import { AnimalEncounterCatalogService } from './animal-encounter-catalog.service';
import { SubsectorManagerService } from './subsector-manager.service';
import { generatePsionicAssaulters, generateWorldEncounters } from '../features/encounters/animal-encounter-generator';

@Injectable({
  providedIn: 'root'
})
export class AnimalEncounterService {
  constructor(
    private catalog: AnimalEncounterCatalogService,
    private subsectors: SubsectorManagerService
  ) {}

  async ensureEncounters(world: World): Promise<WorldEncounterState | null> {
    if (!this.allowsEncounters(world)) {
      return null;
    }
    await this.catalog.ensureLoaded();
    if (!world.encounters) {
      world.encounters = this.generate(world);
      this.persist();
      return world.encounters;
    }
    if (this.shouldHavePsionicAssaulters(world) && !world.encounters.psionicAssaulters) {
      const catalog = this.catalog.getCatalog();
      const terrainName = world.encounters.terrains[0]?.terrain;
      const terrain = catalog.terrains.find(entry => entry.name === terrainName) ?? catalog.terrains[0];
      world.encounters.psionicAssaulters = generatePsionicAssaulters(world, catalog, terrain);
      this.persist();
    }
    return world.encounters;
  }

  async rerollEncounters(world: World): Promise<WorldEncounterState | null> {
    if (!this.allowsEncounters(world)) {
      return null;
    }
    await this.catalog.ensureLoaded();
    world.encounters = this.generate(world);
    this.persist();
    return world.encounters;
  }

  private generate(world: World): WorldEncounterState {
    const options = this.subsectors.current?.generationOptions;
    return generateWorldEncounters(
      world,
      this.catalog.getCatalog(),
      options?.generateAllEcosystems === true,
      options?.psionicsEnabled !== false
    );
  }

  private allowsEncounters(world: World): boolean {
    return world.allowsEncounterTables(this.subsectors.current?.generationOptions.generateAllEcosystems === true);
  }

  private shouldHavePsionicAssaulters(world: World): boolean {
    const options = this.subsectors.current?.generationOptions;
    return options?.psionicsEnabled !== false && world.isPsionicsPermitted();
  }

  private persist(): void {
    this.subsectors.persistCurrentSubsector();
  }
}

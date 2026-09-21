import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Subsector } from '../models/subsector';
import { World } from '../models/world';
import { SubsectorGenerator, ensureWorldBalkanStates } from '../features/worldgen/subsectorgenerator';
import { SettingsService } from './settings.service';
import {
  cloneGenerationOptions,
  createDefaultGenerationOptions,
  GenerationOptions,
  LEGACY_COLUMNS,
  LEGACY_ROWS,
  normalizeGenerationOptions,
  OFF_MAP_TYPE_ID,
  STANDARD_CELL_TYPE_ID
} from '../models/generation-options';

export interface SubsectorData {
  id: string;
  name: string;
  subsector: Subsector;
  generationOptions: GenerationOptions;
  createdAt: Date;
  lastAccessed: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SubsectorManagerService {
  private subsectorsSubject = new BehaviorSubject<SubsectorData[]>([]);
  public subsectors$ = this.subsectorsSubject.asObservable();
  
  private currentSubsectorSubject = new BehaviorSubject<SubsectorData | null>(null);
  public currentSubsector$ = this.currentSubsectorSubject.asObservable();

  private readonly STORAGE_KEY = 'traveller_subsectors';

  constructor(private settings: SettingsService) {
    this.loadSubsectors();
  }

  get current(): SubsectorData | null {
    return this.currentSubsectorSubject.value;
  }

  /**
   * Generates a random alphanumeric code for subsector IDs
   */
  private generateSubsectorId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Creates a new subsector with generated worlds and space lanes
   */
  createNewSubsector(name?: string, options?: GenerationOptions): SubsectorData {
    const id = this.generateSubsectorId();
    const generator = new SubsectorGenerator();
    const generationOptions = normalizeGenerationOptions(
      options ?? this.settings.snapshot.lastGenerationOptions
    );
    
    generator.initializeSubsector(generationOptions);
    generator.generateWorlds(generationOptions);
    generator.generateSpaceLanes();
    
    if (!generator.subsector) {
      throw new Error('Failed to generate subsector');
    }

    if (name && name.trim()) {
      generator.subsector.name = name.trim();
    } else {
      generator.subsector.name = `Subsector ${id}`;
    }

    const subsectorData: SubsectorData = {
      id,
      name: generator.subsector.name,
      subsector: generator.subsector,
      generationOptions: cloneGenerationOptions(generationOptions),
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    this.saveSubsector(subsectorData);
    this.currentSubsectorSubject.next(subsectorData);
    this.settings.patch({ lastGenerationOptions: cloneGenerationOptions(generationOptions) });

    return subsectorData;
  }

  /**
   * Retrieves a subsector by its ID
   */
  getSubsector(id: string): SubsectorData | null {
    const subsectors = this.subsectorsSubject.value;
    const subsector = subsectors.find(s => s.id === id);
    
    if (subsector) {
      subsector.lastAccessed = new Date();
      this.saveSubsector(subsector);
      this.currentSubsectorSubject.next(subsector);
    }
    
    return subsector || null;
  }

  /**
   * Writes the current in-memory subsector collection to localStorage.
   */
  persistCurrentSubsector(): void {
    const current = this.currentSubsectorSubject.value;
    if (current) {
      this.saveSubsector(current);
    }
  }

  /**
   * Rolls balkan states for government-7 worlds that do not have them yet.
   * Also replaces a leftover gov-7 starport state with a rolled government.
   */
  ensureBalkanization(subsectorData: SubsectorData | null = this.currentSubsectorSubject.value): boolean {
    if (!subsectorData) {
      return false;
    }
    let changed = false;
    for (const hex of subsectorData.subsector.sectorHexes) {
      if (hex.world && ensureWorldBalkanStates(hex.world)) {
        changed = true;
      }
    }
    if (changed) {
      this.saveSubsector(subsectorData);
    }
    return changed;
  }

  /**
   * Sets the current active subsector
   */
  setCurrentSubsector(subsectorData: SubsectorData | null): void {
    if (subsectorData) {
      subsectorData.lastAccessed = new Date();
      this.saveSubsector(subsectorData);
    }
    this.currentSubsectorSubject.next(subsectorData);
  }

  /**
   * Gets all stored subsectors
   */
  getAllSubsectors(): SubsectorData[] {
    return this.subsectorsSubject.value;
  }

  /**
   * Deletes a subsector by ID
   */
  deleteSubsector(id: string): boolean {
    const subsectors = this.subsectorsSubject.value;
    const index = subsectors.findIndex(s => s.id === id);
    
    if (index >= 0) {
      subsectors.splice(index, 1);
      this.subsectorsSubject.next([...subsectors]);
      this.saveToStorage();
      
      const current = this.currentSubsectorSubject.value;
      if (current && current.id === id) {
        this.currentSubsectorSubject.next(null);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Saves a single subsector to the collection and storage
   */
  private saveSubsector(subsectorData: SubsectorData): void {
    const subsectors = this.subsectorsSubject.value;
    const existingIndex = subsectors.findIndex(s => s.id === subsectorData.id);
    
    if (existingIndex >= 0) {
      subsectors[existingIndex] = subsectorData;
    } else {
      subsectors.push(subsectorData);
    }
    
    this.subsectorsSubject.next([...subsectors]);
    this.saveToStorage();
  }

  /**
   * Loads subsectors from localStorage
   */
  private loadSubsectors(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const subsectors = data.map((item: any) => this.deserializeSubsectorData(item));
        this.subsectorsSubject.next(subsectors);
      }
    } catch (error) {
      console.error('Failed to load subsectors from storage:', error);
      this.subsectorsSubject.next([]);
    }
  }

  /**
   * Saves current subsectors to localStorage
   */
  private saveToStorage(): void {
    try {
      const subsectors = this.subsectorsSubject.value;
      const serializableSubsectors = subsectors.map(subsectorData => ({
        ...subsectorData,
        generationOptions: cloneGenerationOptions(subsectorData.generationOptions),
        subsector: this.serializeSubsector(subsectorData.subsector)
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializableSubsectors));
    } catch (error) {
      console.error('Failed to save subsectors to storage:', error);
    }
  }

  /**
   * Creates a serializable version of a subsector without circular references
   */
  private serializeSubsector(subsector: Subsector): any {
    const serializedHexes = subsector.sectorHexes.map((hex) => {
      const hexCopy: any = {
        worldGenerationChanceModifier: hex.worldGenerationChanceModifier,
        hasGasGiant: hex.hasGasGiant,
        onMap: hex.onMap,
        cellTypeId: hex.cellTypeId
      };
      
      if (hex.world) {
        hexCopy.world = {
          ...hex.world,
          spaceLanes: (hex.world.spaceLanes || []).map(connectedHex =>
            subsector.sectorHexes.indexOf(connectedHex)
          ).filter(index => index !== -1)
        };
      }
      
      return hexCopy;
    });

    return {
      name: subsector.name,
      columns: subsector.columns,
      rows: subsector.rows,
      sectorHexes: serializedHexes
    };
  }

  private deserializeSubsectorData(item: any): SubsectorData {
    const subsector = this.deserializeSubsector(item.subsector);
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      lastAccessed: new Date(item.lastAccessed),
      subsector,
      generationOptions: this.inferGenerationOptions(item, subsector)
    };
  }

  /**
   * Reconstructs a Subsector object from stored data
   */
  private deserializeSubsector(data: any): Subsector {
    const columns = Number.isInteger(data?.columns) && data.columns > 0
      ? data.columns
      : LEGACY_COLUMNS;
    const rows = Number.isInteger(data?.rows) && data.rows > 0
      ? data.rows
      : LEGACY_ROWS;
    const hexTypeIds = Array.isArray(data?.sectorHexes)
      ? data.sectorHexes.map((hexData: any, index: number) => {
          if (hexData?.cellTypeId) {
            return hexData.cellTypeId;
          }
          if (hexData?.onMap === false) {
            return OFF_MAP_TYPE_ID;
          }
          return STANDARD_CELL_TYPE_ID;
        })
      : undefined;
    const subsector = new Subsector(data?.name ?? 'Unnamed Subsector', columns, rows, hexTypeIds);
    
    if (data.sectorHexes && Array.isArray(data.sectorHexes)) {
      for (let i = 0; i < data.sectorHexes.length && i < subsector.sectorHexes.length; i++) {
        const hexData = data.sectorHexes[i];
        if (hexData.world) {
          const worldData = { ...hexData.world };
          delete worldData.spaceLanes;
          subsector.sectorHexes[i].world = World.fromData(worldData);
        }
        if (hexData.worldGenerationChanceModifier !== undefined) {
          subsector.sectorHexes[i].worldGenerationChanceModifier = hexData.worldGenerationChanceModifier;
        }
        if (hexData.hasGasGiant !== undefined) {
          subsector.sectorHexes[i].hasGasGiant = hexData.hasGasGiant;
        }
        if (hexData.onMap !== undefined) {
          subsector.sectorHexes[i].onMap = hexData.onMap !== false;
        }
        if (hexData.cellTypeId) {
          subsector.sectorHexes[i].cellTypeId = hexData.cellTypeId;
          subsector.sectorHexes[i].onMap = hexData.cellTypeId !== OFF_MAP_TYPE_ID;
        }
      }
      
      this.rebuildSpaceLanes(subsector, data.sectorHexes);
    }
    
    return subsector;
  }

  private inferGenerationOptions(item: any, subsector: Subsector): GenerationOptions {
    if (item.generationOptions) {
      return normalizeGenerationOptions({
        ...item.generationOptions,
        columns: item.generationOptions.columns ?? subsector.columns,
        rows: item.generationOptions.rows ?? subsector.rows
      });
    }

    const hexTypeIds = subsector.sectorHexes.map(hex =>
      hex.onMap === false ? OFF_MAP_TYPE_ID : (hex.cellTypeId || STANDARD_CELL_TYPE_ID)
    );
    const hasBalkanStates = subsector.sectorHexes.some(hex => !!hex.world?.balkanStates?.length);
    return normalizeGenerationOptions({
      columns: subsector.columns,
      rows: subsector.rows,
      cellTypes: [{
        id: STANDARD_CELL_TYPE_ID,
        name: 'Standard',
        color: '#667eea',
        occurrence: 4
      }],
      hexTypeIds,
      psionicsEnabled: true,
      autoRollBalkanization: hasBalkanStates
    });
  }

  /**
   * Rebuilds space lane connections from stored data
   */
  private rebuildSpaceLanes(subsector: Subsector, storedHexes: any[]): void {
    for (let i = 0; i < storedHexes.length && i < subsector.sectorHexes.length; i++) {
      const hexData = storedHexes[i];
      const currentHex = subsector.sectorHexes[i];
      
      if (hexData.world && hexData.world.spaceLanes && currentHex.world) {
        currentHex.world.spaceLanes = [];
        
        for (const connectionData of hexData.world.spaceLanes) {
          if (typeof connectionData === 'number') {
            const connectedHex = subsector.sectorHexes[connectionData];
            if (connectedHex && connectedHex.world) {
              currentHex.world.spaceLanes.push(connectedHex);
            }
          }
        }
      }
    }
  }

  /**
   * Clears all stored subsectors (for development/testing)
   */
  clearAllSubsectors(): void {
    this.subsectorsSubject.next([]);
    this.currentSubsectorSubject.next(null);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Subsector } from '../models/subsector';
import { SubsectorGenerator } from '../features/worldgen/subsectorgenerator';

export interface SubsectorData {
  id: string;
  name: string;
  subsector: Subsector;
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

  constructor() {
    this.loadSubsectors();
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
  createNewSubsector(name?: string): SubsectorData {
    const id = this.generateSubsectorId();
    const generator = new SubsectorGenerator();
    
    // Initialize and generate the subsector
    generator.initializeSubsector();
    generator.generateWorlds();
    generator.generateSpaceLanes();
    
    if (!generator.subsector) {
      throw new Error('Failed to generate subsector');
    }

    // Set the name if provided, otherwise use default
    if (name && name.trim()) {
      generator.subsector.name = name.trim();
    } else {
      generator.subsector.name = `Subsector ${id}`;
    }

    const subsectorData: SubsectorData = {
      id,
      name: generator.subsector.name,
      subsector: generator.subsector,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    // Save to storage
    this.saveSubsector(subsectorData);
    
    // Update current subsector
    this.currentSubsectorSubject.next(subsectorData);

    return subsectorData;
  }

  /**
   * Retrieves a subsector by its ID
   */
  getSubsector(id: string): SubsectorData | null {
    const subsectors = this.subsectorsSubject.value;
    const subsector = subsectors.find(s => s.id === id);
    
    if (subsector) {
      // Update last accessed time
      subsector.lastAccessed = new Date();
      this.saveSubsector(subsector);
      this.currentSubsectorSubject.next(subsector);
    }
    
    return subsector || null;
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
      
      // If this was the current subsector, clear it
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
        // Convert date strings back to Date objects
        const subsectors = data.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          lastAccessed: new Date(item.lastAccessed),
          subsector: this.deserializeSubsector(item.subsector)
        }));
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
      // Create a serializable copy without circular references
      const serializableSubsectors = subsectors.map(subsectorData => ({
        ...subsectorData,
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
    const serializedHexes = subsector.sectorHexes.map((hex, index) => {
      const hexCopy: any = {
        worldGenerationChanceModifier: hex.worldGenerationChanceModifier
      };
      
      if (hex.world) {
        hexCopy.world = {
          ...hex.world,
          // Convert space lane hex references to indices to avoid circular references
          spaceLanes: hex.world.spaceLanes.map(connectedHex => 
            subsector.sectorHexes.indexOf(connectedHex)
          ).filter(index => index !== -1) // Remove invalid references
        };
      }
      
      return hexCopy;
    });

    return {
      name: subsector.name,
      sectorHexes: serializedHexes
    };
  }

  /**
   * Reconstructs a Subsector object from stored data
   */
  private deserializeSubsector(data: any): Subsector {
    const subsector = new Subsector(data.name);
    
    // The constructor already creates the sectorHexes array, we need to restore the data
    if (data.sectorHexes && Array.isArray(data.sectorHexes)) {
      for (let i = 0; i < data.sectorHexes.length && i < subsector.sectorHexes.length; i++) {
        const hexData = data.sectorHexes[i];
        if (hexData.world) {
          // Restore the world data but exclude circular space lane references
          const worldData = { ...hexData.world };
          // Remove space lanes to avoid circular references - they'll be rebuilt on display
          delete worldData.spaceLanes;
          subsector.sectorHexes[i].world = worldData;
        }
        if (hexData.worldGenerationChanceModifier !== undefined) {
          subsector.sectorHexes[i].worldGenerationChanceModifier = hexData.worldGenerationChanceModifier;
        }
      }
      
      // Rebuild space lane connections after all worlds are loaded
      this.rebuildSpaceLanes(subsector, data.sectorHexes);
    }
    
    return subsector;
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
        
        // Rebuild connections based on stored indices
        for (const connectionData of hexData.world.spaceLanes) {
          if (typeof connectionData === 'number') {
            // If stored as index
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

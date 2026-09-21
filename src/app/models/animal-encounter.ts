export type TerrainGroup = 'land' | 'sea' | 'special';
export type AnimalCategory = 'Herbivore' | 'Omnivore' | 'Carnivore' | 'Scavenger';
export type AttributeCode = 'F' | 'S' | 'A' | 'T';

export interface TerrainDefinition {
  name: string;
  equivalent: string;
  typeDm: number;
  sizeDm: number;
  group: TerrainGroup;
  attributeColumn: 'Beach' | 'Marsh' | 'River' | 'Sea' | 'Swamp' | 'Other';
}

export interface EncounterColumnSlot {
  die: number;
  code: 'S' | 'O' | 'H' | 'C' | 'E';
  category: 'Scavenger' | 'Omnivore' | 'Herbivore' | 'Carnivore' | 'Event';
}

export interface AnimalTypeEntry {
  type: string;
  qty: string;
}

export interface AnimalTypeRow {
  die: number;
  Herbivore: AnimalTypeEntry;
  Omnivore: AnimalTypeEntry;
  Carnivore: AnimalTypeEntry;
  Scavenger: AnimalTypeEntry;
}

export interface AttributeResult {
  code: AttributeCode | null;
  sizeDm: number | null;
}

export interface SizeWeaponRow {
  die: number;
  sizePlus6: boolean;
  weightKg: number | null;
  hits: string | null;
  wounds: string | null;
  weapons: string;
  armorPlus6: boolean;
  armor: string | null;
}

export interface CharacteristicRow {
  category: AnimalCategory;
  type: string;
  toAttack: string;
  toFlee: string;
  speed: string;
}

export interface AnimalDefinition {
  kind: 'Category' | 'Type';
  name: string;
  definition: string;
  examples: string | null;
  mechanics: string | null;
}

export interface WeaponDamage {
  dice: number;
  plus: number;
  poison?: boolean;
}

export interface CatalogEvent {
  id: string;
  name: string;
  kind: string;
  summary: string;
  mechanics: string;
  rangeConditions?: string | null;
  restrictions?: string | null;
  source?: string;
  terrains?: string[] | null;
  atmoMax?: number;
  hydroMin?: number;
  sizeMin?: number;
  linkCarnivore?: boolean;
}

export interface AnimalEncounterCatalog {
  source: string;
  terrains: TerrainDefinition[];
  encounterColumn: EncounterColumnSlot[];
  animalTypes: AnimalTypeRow[];
  attributes: Record<string, Record<string, AttributeResult>>;
  attributeDms: {
    size9plus: number;
    size4or5: number;
    size3minus: number;
    atmo8plus: number;
    atmo5minus: number;
  };
  sizeDms: {
    planetSize8plus: number;
    planetSize4minus: number;
  };
  weaponryDms: Record<string, number>;
  armorDms: Record<string, number>;
  sizes: SizeWeaponRow[];
  characteristics: CharacteristicRow[];
  definitions: AnimalDefinition[];
  weaponDamage: Record<string, WeaponDamage>;
  attributeLabels: Record<string, string>;
  bookEvents: CatalogEvent[];
  customEvents: CatalogEvent[];
  flavor: {
    tints: Record<string, string[]>;
    analogs: Record<string, { default: string[]; sea?: string[] }>;
  };
}

export interface AnimalEncounterRow {
  die: number;
  kind: 'animal' | 'event';
  quantity?: string;
  name?: string;
  type?: string;
  category?: AnimalCategory;
  attribute?: string | null;
  weightKg?: number;
  hits?: string;
  armor?: string;
  wounds?: string;
  weapons?: string;
  characteristics?: string;
  specialNotes?: string;
  eventName?: string;
  eventText?: string;
  eventMechanics?: string;
}

export interface TerrainEncounterTable {
  terrain: string;
  equivalent: string;
  group: TerrainGroup;
  format: '2d';
  typeDm: number;
  sizeDm: number;
  rows: AnimalEncounterRow[];
}

export interface WorldEncounterState {
  ecosystemSummary: string;
  allEcosystems: boolean;
  terrains: TerrainEncounterTable[];
  psionicAssaulters?: AnimalEncounterRow;
}

export function isHabitableForAnimals(atmosphereKey: number): boolean {
  return atmosphereKey >= 2 && atmosphereKey <= 9;
}

import { World } from '../../models/world';
import {
  AnimalEncounterCatalog,
  CatalogEvent,
  TerrainDefinition
} from '../../models/animal-encounter';

export interface EcosystemProfile {
  terrains: TerrainDefinition[];
  events: CatalogEvent[];
  summary: string;
  allEcosystems: boolean;
}

const WATER_TERRAINS = new Set([
  'Surface', 'Shallows', 'Depths', 'Bottom', 'Sea Cave', 'Sargasso',
  'Beach', 'River', 'Swamp', 'Marsh'
]);

export function profileEcosystem(
  world: World,
  catalog: AnimalEncounterCatalog,
  allEcosystems: boolean,
  psionicsEnabled: boolean
): EcosystemProfile {
  const terrains = allEcosystems
    ? [...catalog.terrains]
    : selectTerrains(world, catalog.terrains);
  const events = collectEvents(world, catalog, psionicsEnabled);
  return {
    terrains,
    events,
    summary: allEcosystems
      ? 'All Book 3 terrains generated (ecosystem profiler bypassed).'
      : summarize(world, terrains),
    allEcosystems
  };
}

export function eventsForTerrain(events: CatalogEvent[], terrain: string): CatalogEvent[] {
  const matching = events.filter(event => {
    if (!event.terrains || event.terrains.length === 0) {
      return true;
    }
    return event.terrains.includes(terrain);
  });
  return matching.length > 0 ? matching : events.filter(event => event.id === 'local-hazard' || !event.terrains);
}

function selectTerrains(world: World, all: TerrainDefinition[]): TerrainDefinition[] {
  const scored = all
    .map(terrain => ({ terrain, score: scoreTerrain(world, terrain) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.terrain.name.localeCompare(b.terrain.name));

  const picked = scored.slice(0, 8).map(entry => entry.terrain);
  if (picked.length >= 4) {
    return sortByCatalogOrder(picked, all);
  }

  const extras = all
    .filter(terrain => !picked.includes(terrain) && scoreTerrain(world, terrain) >= 0)
    .sort((a, b) => scoreTerrain(world, b) - scoreTerrain(world, a));
  for (const terrain of extras) {
    picked.push(terrain);
    if (picked.length >= 4) {
      break;
    }
  }
  if (picked.length === 0) {
    const fallback = world.planetHydrographics.key >= 10
      ? all.find(t => t.name === 'Surface')
      : all.find(t => t.name === 'Clear');
    if (fallback) {
      picked.push(fallback);
    }
  }
  return sortByCatalogOrder(picked, all);
}

function sortByCatalogOrder(picked: TerrainDefinition[], all: TerrainDefinition[]): TerrainDefinition[] {
  const order = new Map(all.map((terrain, index) => [terrain.name, index]));
  return [...picked].sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0));
}

function scoreTerrain(world: World, terrain: TerrainDefinition): number {
  const size = world.planetSize.key;
  const atmo = world.planetAtmosphere.key;
  const hydro = world.planetHydrographics.key;
  const pop = world.planetPopulation.key;
  const tl = world.planetTechLevel;

  if (hydro >= 10 && terrain.group !== 'sea') {
    return -100;
  }
  if (hydro === 0 && WATER_TERRAINS.has(terrain.name)) {
    return -100;
  }
  if (size === 0 && terrain.group === 'land' && terrain.name !== 'Crater') {
    return -100;
  }

  let score = 0;
  switch (terrain.name) {
    case 'Clear':
      if (hydro < 10 && size > 0) score += 8;
      if (hydro >= 2 && hydro <= 8 && atmo >= 4 && atmo <= 9) score += 4;
      break;
    case 'Prairie':
      if (hydro >= 2 && hydro <= 8 && atmo >= 4 && atmo <= 9) score += 10;
      if (world.isAgriculturalWorld()) score += 6;
      break;
    case 'Desert':
      if (hydro <= 3) score += 12;
      if (world.isPoorWorld()) score += 4;
      break;
    case 'Forest':
      if (hydro >= 4 && hydro <= 8 && atmo >= 5 && atmo <= 9) score += 10;
      break;
    case 'Jungle':
      if (hydro >= 6 && atmo >= 6) score += 8;
      if (atmo >= 8) score += 4;
      break;
    case 'Swamp':
      if (hydro >= 6 && atmo >= 6) score += 7;
      if (atmo >= 8) score += 3;
      break;
    case 'Marsh':
      if (hydro >= 4 && atmo >= 6) score += 6;
      break;
    case 'River':
      if (hydro >= 1 && hydro <= 9) score += 9;
      break;
    case 'Beach':
      if (hydro >= 1 && hydro <= 9) score += 8;
      break;
    case 'Rough':
      if (size >= 5) score += 7;
      break;
    case 'Mountain':
      if (size >= 5) score += 8;
      if (size >= 8) score += 2;
      break;
    case 'Broken':
      if (size >= 4 && hydro <= 3) score += 8;
      break;
    case 'Chasm':
      if (size >= 4 && hydro <= 3) score += 5;
      if (size >= 8) score += 2;
      break;
    case 'Cave':
      if (size >= 2) score += 4;
      break;
    case 'Crater':
      if (size <= 4) score += 8;
      break;
    case 'Ruins':
      if (pop >= 6) score += 7;
      else if (pop >= 1 && tl >= 8) score += 6;
      if (world.isIndustrialWorld()) score += 2;
      break;
    case 'Surface':
      if (hydro >= 1) score += 9;
      if (hydro >= 10) score += 6;
      break;
    case 'Shallows':
      if (hydro >= 2) score += 8;
      break;
    case 'Depths':
      if (hydro >= 6) score += 7;
      break;
    case 'Bottom':
      if (hydro >= 6) score += 6;
      break;
    case 'Sargasso':
      if (hydro >= 7 && atmo >= 5) score += 5;
      break;
    case 'Sea Cave':
      if (hydro >= 4 && size >= 3) score += 4;
      break;
    default:
      break;
  }
  return score;
}

function collectEvents(world: World, catalog: AnimalEncounterCatalog, psionicsEnabled: boolean): CatalogEvent[] {
  const events: CatalogEvent[] = [];
  for (const event of catalog.bookEvents) {
    if (event.kind === 'example custom event' || event.id.includes('howling')) {
      continue;
    }
    if (event.name === 'Meteor Shower') {
      if (world.planetAtmosphere.key === 0 || world.planetSize.key === 0) {
        events.push({ ...event, terrains: null });
      }
      continue;
    }
    if (event.name === 'Psionic Assaulters') {
      if (psionicsEnabled && world.isPsionicsPermitted()) {
        events.push({
          ...event,
          terrains: null
        });
      }
      continue;
    }
    if (event.name === 'Storm') {
      if (world.planetAtmosphere.key >= 8 || world.planetHydrographics.key >= 6) {
        events.push({ ...event, terrains: null });
      }
      continue;
    }
    if (event.name === 'Seismic Quake') {
      events.push({
        ...event,
        terrains: world.planetSize.key >= 8 ? null : ['Mountain', 'Chasm']
      });
      continue;
    }
    if (event.name === 'Ravines and Precipices') {
      events.push({
        ...event,
        terrains: ['Mountain', 'Broken', 'Chasm', 'Rough']
      });
      continue;
    }
    if (event.name === 'Chameleon') {
      events.push({
        ...event,
        terrains: ['Forest', 'Jungle', 'Swamp']
      });
      continue;
    }
  }

  for (const event of catalog.customEvents) {
    if (event.atmoMax != null && world.planetAtmosphere.key > event.atmoMax) {
      continue;
    }
    if (event.hydroMin != null && world.planetHydrographics.key < event.hydroMin) {
      continue;
    }
    if (event.sizeMin != null && world.planetSize.key < event.sizeMin) {
      continue;
    }
    events.push(event);
  }
  return events;
}

function summarize(world: World, terrains: TerrainDefinition[]): string {
  const names = terrains.map(terrain => terrain.name.toLowerCase()).join(', ');
  return `${world.planetAtmosphere.label.toLowerCase()} air, ${world.planetHydrographics.label.toLowerCase()} hydro → ${names}`;
}

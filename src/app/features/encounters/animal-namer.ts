import { World } from '../../models/world';
import { AnimalEncounterCatalog, TerrainDefinition } from '../../models/animal-encounter';
import { DiceSource } from '../../shared/dice-utils';

const SEA_GROUPS = new Set(['sea']);

export function nameAnimal(
  world: World,
  catalog: AnimalEncounterCatalog,
  terrain: TerrainDefinition,
  typeName: string,
  attributeLabel: string | null,
  dice: DiceSource
): string {
  const analog = pickAnalog(catalog, terrain, typeName, dice);
  const tint = pickTint(world, catalog, dice);
  const parts = [attributeLabel, tint, analog, typeName.toLowerCase()].filter(Boolean) as string[];
  const raw = parts.join(' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function pickAnalog(
  catalog: AnimalEncounterCatalog,
  terrain: TerrainDefinition,
  typeName: string,
  dice: DiceSource
): string | null {
  const table = catalog.flavor.analogs[typeName];
  if (!table) {
    return null;
  }
  const sea = SEA_GROUPS.has(terrain.group) || terrain.name === 'Beach';
  const list = sea && table.sea && table.sea.length > 0 ? table.sea : table.default;
  if (!list.length) {
    return null;
  }
  return list[dice.d6() % list.length];
}

function pickTint(world: World, catalog: AnimalEncounterCatalog, dice: DiceSource): string | null {
  if (dice.d6() < 4) {
    return null;
  }
  let key: string | null = null;
  if (world.isTaintedAtmosphere()) {
    key = 'tainted';
  } else if (world.planetAtmosphere.key >= 8) {
    key = 'dense';
  } else if (world.planetAtmosphere.key <= 5) {
    key = 'thin';
  }
  if (!key) {
    return null;
  }
  const list = catalog.flavor.tints[key];
  if (!list?.length) {
    return null;
  }
  return list[dice.d6() % list.length];
}

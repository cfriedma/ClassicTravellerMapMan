import { World } from '../../models/world';
import {
  AnimalCategory,
  AnimalEncounterCatalog,
  AnimalEncounterRow,
  AnimalTypeRow,
  AttributeCode,
  CatalogEvent,
  SizeWeaponRow,
  TerrainDefinition,
  TerrainEncounterTable,
  WorldEncounterState
} from '../../models/animal-encounter';
import { DiceSource, defaultDice } from '../../shared/dice-utils';
import { eventsForTerrain, profileEcosystem } from './ecosystem-profiler';
import { nameAnimal } from './animal-namer';

const CATEGORY_BY_CODE: Record<string, AnimalCategory> = {
  H: 'Herbivore',
  O: 'Omnivore',
  C: 'Carnivore',
  S: 'Scavenger'
};

export function generateWorldEncounters(
  world: World,
  catalog: AnimalEncounterCatalog,
  allEcosystems: boolean,
  psionicsEnabled: boolean,
  dice: DiceSource = defaultDice
): WorldEncounterState {
  const profile = profileEcosystem(world, catalog, allEcosystems, psionicsEnabled);
  const psionicAssaulters = profile.events.some(event => event.name === 'Psionic Assaulters')
    ? generatePsionicAssaulters(world, catalog, profile.terrains[0], dice)
    : undefined;
  return {
    ecosystemSummary: profile.summary,
    allEcosystems: profile.allEcosystems,
    terrains: profile.terrains.map(terrain =>
      generateTerrainTable(world, catalog, terrain, profile.events, dice, psionicAssaulters)
    ),
    psionicAssaulters
  };
}

export function generatePsionicAssaulters(
  world: World,
  catalog: AnimalEncounterCatalog,
  terrain: TerrainDefinition | undefined,
  dice: DiceSource = defaultDice
): AnimalEncounterRow {
  const fallback = terrain ?? catalog.terrains[0];
  const row = generateAnimalRow(world, catalog, fallback, 'Carnivore', 0, dice);
  const notes = [
    'Always surprise; automatic attack.',
    'Unshielded: unconscious and 2D+6 hits.',
    'Shielded: fight using these stats (psionics rules).',
    row.specialNotes
  ].filter(Boolean);
  return {
    ...row,
    quantity: '1D',
    name: prefixPsionic(row.name),
    specialNotes: notes.join(' ')
  };
}

function prefixPsionic(name: string | undefined): string {
  const base = name?.trim() || 'carnivore';
  if (/^psionic\b/i.test(base)) {
    return base;
  }
  return `Psionic ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

function generateTerrainTable(
  world: World,
  catalog: AnimalEncounterCatalog,
  terrain: TerrainDefinition,
  worldEvents: CatalogEvent[],
  dice: DiceSource,
  psionicAssaulters?: AnimalEncounterRow
): TerrainEncounterTable {
  const rows: AnimalEncounterRow[] = [];
  for (const slot of catalog.encounterColumn) {
    if (slot.code === 'E') {
      rows.push({ die: slot.die, kind: 'event' });
      continue;
    }
    rows.push(generateAnimalRow(world, catalog, terrain, CATEGORY_BY_CODE[slot.code], slot.die, dice));
  }
  fillEventRows(rows, eventsForTerrain(worldEvents, terrain.name), dice, psionicAssaulters);
  return {
    terrain: terrain.name,
    equivalent: terrain.equivalent,
    group: terrain.group,
    format: '2d',
    typeDm: terrain.typeDm,
    sizeDm: terrain.sizeDm,
    rows
  };
}

function generateAnimalRow(
  world: World,
  catalog: AnimalEncounterCatalog,
  terrain: TerrainDefinition,
  category: AnimalCategory,
  die: number,
  dice: DiceSource
): AnimalEncounterRow {
  const typeRow = lookupTypeRow(catalog.animalTypes, twoD(dice) + terrain.typeDm);
  const typeEntry = typeRow[category];
  const quantity = formatQuantity(typeEntry.qty);
  const attribute = rollAttribute(world, catalog, terrain, dice);
  const isFlyer = attribute.code === 'F';
  const isTriphibian = attribute.code === 'T';

  let sizeDm = 0;
  if (isFlyer) {
    sizeDm = attribute.sizeDm ?? 0;
  } else {
    sizeDm = terrain.sizeDm + (attribute.sizeDm ?? 0);
    if (world.planetSize.key >= 8) {
      sizeDm += catalog.sizeDms.planetSize8plus;
    } else if (world.planetSize.key <= 4) {
      sizeDm += catalog.sizeDms.planetSize4minus;
    }
  }

  const sizeRow = rollSizeRow(catalog, sizeDm, dice);
  const weaponRow = rollWeaponRow(catalog, catalog.weaponryDms[category] ?? 0, dice);
  let armorLabel: string | null = 'none';
  if (isFlyer || isTriphibian) {
    armorLabel = 'none';
  } else {
    armorLabel = rollArmor(catalog, catalog.armorDms[category] ?? 0, dice) ?? 'none';
  }

  const weightKg = sizeRow.weightKg ?? 1;
  const hits = rollHits(sizeRow.hits ?? '1D/0', dice);
  const weapons = formatWeapons(catalog, weaponRow.weapons);
  const isFilter = typeEntry.type === 'Filter';
  const wounds = formatWounds(sizeRow.wounds, isFilter);

  const chars = rollCharacteristics(catalog, category, typeEntry.type, dice);
  const attributeLabel = attribute.code ? catalog.attributeLabels[attribute.code] : null;
  const name = nameAnimal(world, catalog, terrain, typeEntry.type, attributeLabel, dice);
  const notes: string[] = [];
  if (isFilter) {
    notes.push('Filter: automatic 1D wounds per 50 kg or less; ignore wound alteration.');
  }
  if (weapons.toLowerCase().includes('stinger')) {
    notes.push('Poison weapon.');
  }
  if (chars.specialNotes) {
    notes.push(chars.specialNotes);
  }

  return {
    die,
    kind: 'animal',
    quantity,
    name,
    type: typeEntry.type,
    category,
    attribute: attributeLabel,
    weightKg,
    hits,
    armor: armorLabel,
    wounds,
    weapons,
    characteristics: chars.code,
    specialNotes: notes.length ? notes.join(' ') : undefined
  };
}

function fillEventRows(
  rows: AnimalEncounterRow[],
  events: CatalogEvent[],
  dice: DiceSource,
  psionicAssaulters?: AnimalEncounterRow
): void {
  const carnivore = rows.find(row => row.kind === 'animal' && row.category === 'Carnivore');
  const pool = events.length > 0 ? events : [{
    id: 'local-hazard',
    name: 'Local Hazard',
    kind: 'geographic',
    summary: 'An unexpected local danger delays the party.',
    mechanics: 'The referee describes a hazard appropriate to this terrain.'
  }];
  const used = new Set<string>();
  for (const row of rows) {
    if (row.kind !== 'event') {
      continue;
    }
    const unused = pool.filter(event => !used.has(event.id));
    const pickFrom = unused.length > 0 ? unused : pool;
    const event = pickFrom[dice.d6() % pickFrom.length];
    used.add(event.id);
    let text = event.summary;
    if (event.linkCarnivore && carnivore) {
      text = `Out of sight, animals (die roll ${carnivore.die}) are heard howling continuously.`;
    }
    row.eventName = event.name;
    row.eventText = `Event — ${event.name}. ${text}`;
    row.eventMechanics = event.mechanics;
    if (event.name === 'Psionic Assaulters' && psionicAssaulters) {
      row.quantity = psionicAssaulters.quantity;
      row.name = psionicAssaulters.name;
      row.type = psionicAssaulters.type;
      row.category = psionicAssaulters.category;
      row.attribute = psionicAssaulters.attribute;
      row.weightKg = psionicAssaulters.weightKg;
      row.hits = psionicAssaulters.hits;
      row.armor = psionicAssaulters.armor;
      row.wounds = psionicAssaulters.wounds;
      row.weapons = psionicAssaulters.weapons;
      row.characteristics = psionicAssaulters.characteristics;
      row.specialNotes = psionicAssaulters.specialNotes;
    }
  }
}

function lookupTypeRow(rows: AnimalTypeRow[], roll: number): AnimalTypeRow {
  const die = clamp(roll, 0, 13);
  return rows.find(row => row.die === die) ?? rows[0];
}

function rollAttribute(
  world: World,
  catalog: AnimalEncounterCatalog,
  terrain: TerrainDefinition,
  dice: DiceSource
): { code: AttributeCode | null; sizeDm: number | null } {
  let dm = 0;
  const size = world.planetSize.key;
  const atmo = world.planetAtmosphere.key;
  if (size >= 9) dm += catalog.attributeDms.size9plus;
  else if (size === 4 || size === 5) dm += catalog.attributeDms.size4or5;
  else if (size <= 3) dm += catalog.attributeDms.size3minus;
  if (atmo >= 8) dm += catalog.attributeDms.atmo8plus;
  else if (atmo <= 5) dm += catalog.attributeDms.atmo5minus;
  const die = clamp(twoD(dice) + dm, 2, 12);
  const byDie = catalog.attributes[String(die)];
  const result = byDie?.[terrain.attributeColumn] ?? byDie?.['Other'] ?? { code: null, sizeDm: null };
  return { code: result.code, sizeDm: result.sizeDm };
}

function rollSizeRow(catalog: AnimalEncounterCatalog, dm: number, dice: DiceSource): SizeWeaponRow {
  const die = rollPlus6(dm, dice, value => catalog.sizes.find(row => row.die === value)?.sizePlus6 === true);
  const row = catalog.sizes.find(entry => entry.die === die && !entry.sizePlus6);
  return row ?? catalog.sizes.find(entry => entry.die === 7)!;
}

function rollWeaponRow(catalog: AnimalEncounterCatalog, dm: number, dice: DiceSource): SizeWeaponRow {
  const die = clamp(twoD(dice) + dm, 1, 20);
  return catalog.sizes.find(entry => entry.die === die) ?? catalog.sizes.find(entry => entry.die === 7)!;
}

function rollArmor(catalog: AnimalEncounterCatalog, dm: number, dice: DiceSource): string | null {
  const die = rollPlus6(dm, dice, value => catalog.sizes.find(row => row.die === value)?.armorPlus6 === true);
  return catalog.sizes.find(entry => entry.die === die)?.armor ?? null;
}

function rollPlus6(dm: number, dice: DiceSource, isPlus6: (die: number) => boolean): number {
  let roll = clamp(twoD(dice) + dm, 1, 20);
  if (!isPlus6(roll)) {
    return roll;
  }
  roll = clamp(twoD(dice) + dm + 6, 1, 20);
  if (!isPlus6(roll)) {
    return roll;
  }
  do {
    roll = clamp(twoD(dice) + dm, 1, 20);
  } while (isPlus6(roll));
  return roll;
}

function rollHits(formula: string, dice: DiceSource): string {
  const [first, second] = formula.split('/');
  const unconscious = rollHitPart(first, dice);
  const additional = rollHitPart(second, dice);
  return `${unconscious}/${unconscious + additional}`;
}

function rollHitPart(part: string | undefined, dice: DiceSource): number {
  if (!part || part.trim() === '0') {
    return 0;
  }
  const match = part.trim().match(/^(\d+)D$/i);
  if (!match) {
    return 0;
  }
  return rollDiceCount(Number(match[1]), dice);
}

function formatWounds(alteration: string | null, isFilter: boolean): string {
  if (isFilter) {
    return '—';
  }
  const text = (alteration ?? '').trim();
  if (!text) {
    return '—';
  }
  const mult = text.match(/^x(\d+)$/i);
  if (mult) {
    return `×${mult[1]}`;
  }
  const extra = text.match(/^([+-])(\d+)D$/i);
  if (extra) {
    return `${extra[1]}${extra[2]}D`;
  }
  return text;
}

function formatWeapons(catalog: AnimalEncounterCatalog, text: string): string {
  const keys = Object.keys(catalog.weaponDamage).sort((a, b) => b.length - a.length);
  return text.split(/\s+and\s+/i).map(part => {
    const original = part.trim();
    if (!original || /\(\d+D\)/i.test(original)) {
      return original;
    }
    const lookup = original.replace(/^as\s+/i, '').replace(/\+\d+$/i, '').trim().toLowerCase();
    const key = keys.find(name => lookup === name || lookup.startsWith(name));
    const dmg = key ? catalog.weaponDamage[key] : undefined;
    if (!dmg) {
      return original;
    }
    return `${original} (${dmg.dice}D)`;
  }).join(' and ');
}

function rollCharacteristics(
  catalog: AnimalEncounterCatalog,
  category: AnimalCategory,
  typeName: string,
  dice: DiceSource
): { code: string; specialNotes?: string } {
  const row = catalog.characteristics.find(entry =>
    entry.category === category && entry.type.toLowerCase() === typeName.toLowerCase()
  );
  if (!row) {
    return { code: 'A6 F6 S1' };
  }
  const attack = resolveChar(row.toAttack, dice, false);
  const flee = resolveChar(row.toFlee, dice, false);
  const speed = resolveChar(row.speed, dice, true);
  const notes: string[] = [];
  if (attack.special) notes.push(`Attack: ${attack.special}.`);
  if (flee.special) notes.push(`Flee: ${flee.special}.`);
  const a = `A${attack.special ? 0 : attack.value}`;
  const f = `F${flee.special ? 0 : flee.value}`;
  const s = `S${speed.value}`;
  const code = category === 'Herbivore' ? `${f} ${a} ${s}` : `${a} ${f} ${s}`;
  return { code, specialNotes: notes.length ? notes.join(' ') : undefined };
}

function resolveChar(
  formula: string,
  dice: DiceSource,
  isSpeed: boolean
): { value: number; special?: string } {
  if (/^if\s+/i.test(formula.trim())) {
    const phrase = formula.split('(')[0].trim();
    return { value: 0, special: phrase };
  }
  const match = formula.match(/1D\s*([+-])\s*(\d+)/i);
  const minMatch = formula.match(/minimum\s+(\d+)/i);
  const mod = match ? Number(match[2]) * (match[1] === '-' ? -1 : 1) : 0;
  let value = dice.d6() + mod;
  if (minMatch) {
    value = Math.max(Number(minMatch[1]), value);
  } else if (isSpeed) {
    value = Math.max(0, value);
  } else {
    value = Math.max(1, Math.min(12, value));
  }
  return { value };
}

function formatQuantity(qty: string): string {
  const trimmed = (qty || '1').trim();
  if (!trimmed || trimmed === '1') {
    return '1';
  }
  return trimmed.replace(/\s+/g, '');
}

function twoD(dice: DiceSource): number {
  return dice.d6() + dice.d6();
}

function rollDiceCount(count: number, dice: DiceSource): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += dice.d6();
  }
  return total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

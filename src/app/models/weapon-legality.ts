/**
 * Classic Traveller Book 3 weapon prohibitions.
 * A weapon illegal at law N is also illegal at every higher law level.
 */
export const WEAPON_ILLEGAL_FROM_LAW: Record<string, number> = {
  // Law 1: undetectable body pistols, explosives, and poison gas.
  // Ordinary body pistols are legal until law 5; only modified undetectable versions are banned at 1.

  // Law 2: portable energy weapons
  'Laser Carbine': 2,
  'LC Power Pack': 2,
  'Laser Carbine Recharge': 2,
  'Laser Rifle': 2,
  'LR Power Pack': 2,
  'Laser Rifle Recharge': 2,

  // Law 3: military weapons (automatic rifles; not SMGs)
  'Automatic Rifle': 3,
  'Automatic Rifle Magazine (loaded)': 3,
  'Automatic Rifle Belt (100 rounds)': 3,

  // Law 4: light assault weapons
  'Submachinegun': 4,
  'Submachinegun Magazine (loaded)': 4,

  // Law 5: personal concealable firearms
  'Body Pistol': 5,
  'Body Pistol Magazine (loaded)': 5,
  'Automatic Pistol': 5,
  'Automatic Pistol Magazine (loaded)': 5,
  'Revolver': 5,
  'Revolver Cartridges (six)': 5,
  'Muzzle-loading Pistol': 5,
  'Percussion Revolver': 5,

  // Law 6: most remaining firearms except shotguns
  'Carbine': 6,
  'Carbine Magazine (loaded)': 6,
  'Rifle': 6,
  'Rifle Magazine (loaded)': 6,
  'Hand Cannon': 6,
  'Flintlock Musket': 6,
  'Percussion Rifle': 6,

  // Law 7: shotguns
  'Shotgun': 7,
  'Shotgun Magazine (loaded)': 7,

  // Law 8: long blades except daggers
  'Blade': 8,
  'Foil': 8,
  'Cutlass': 8,
  'Sword': 8,
  'Broadsword': 8,
  'Bayonet': 8,
  'Spear': 8,
  'Halberd': 8,
  'Pike': 8,

  // Law 9: any remaining weapons outside the home
  'Dagger': 9,
  'Cudgel': 9,
  'Club (brawling / found)': 9
};

export function getItemIllegalFromLawLevel(item: { name: string; illegalFromLawLevel?: number | null }): number | null {
  if (item.illegalFromLawLevel != null) {
    return item.illegalFromLawLevel;
  }
  return WEAPON_ILLEGAL_FROM_LAW[item.name] ?? null;
}

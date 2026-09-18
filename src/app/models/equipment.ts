export interface EquipmentItem {
    name: string;
    category: string;
    subcategory: string | null;
    price: number | string | null;
    currency: string;
    tl: number | null;
    weight: number | string | null;
    weightUnit: string | null;
    notes: string | null;
    tradeGoodTag: string | null;
    tradeDie: string | null;
    tradeEntry: string | null;
    availabilityThrow: number | null;
    isPsiDrug: boolean;
    illegalFromLawLevel?: number | null;
    illegalPrice?: number | string | null;
}

export interface EquipmentCatalogData {
    items: EquipmentItem[];
}

export const EQUIPMENT_CATEGORY_ORDER: { id: string; label: string }[] = [
    { id: 'personal_equipment', label: 'Personal Equipment' },
    { id: 'personal_devices', label: 'Personal Devices' },
    { id: 'vision_aids', label: 'Vision Aids' },
    { id: 'tools', label: 'Tools' },
    { id: 'shelters', label: 'Shelters' },
    { id: 'food_and_overhead', label: 'Food & Overhead' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'ammunition', label: 'Ammunition' },
    { id: 'armor', label: 'Armor' },
    { id: 'drugs', label: 'Drugs' },
    { id: 'ship_equipment', label: 'Ship Equipment' }
];

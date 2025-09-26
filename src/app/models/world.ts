import { SectorHex } from "./sectorhex";
// Define interfaces for properties with both key and label
export interface PlanetProperty {
    key: number;
    label: string;
}

export class World {
    starportType: StarportType;
    hasNavalBase: boolean;
    hasScoutBase: boolean;
    planetSize: PlanetProperty;
    planetAtmosphere: PlanetProperty;
    planetHydrographics: PlanetProperty;
    planetPopulation: PlanetProperty;
    planetGovernment: PlanetProperty;
    planetLawLevel: PlanetProperty;
    planetTechLevel: number;
    drugLegality: boolean;
    hasPsionicInstitute: boolean;

    spaceLanes: SectorHex[];

    constructor(
        starportType: StarportType,
        hasNavalBase: boolean,
        hasScoutBase: boolean,
        planetSize: PlanetProperty,
        planetAtmosphere: PlanetProperty,
        planetHydrographics: PlanetProperty,
        planetPopulation: PlanetProperty,
        planetGovernment: PlanetProperty,
        planetLawLevel: PlanetProperty,
        planetTechLevel: number,
        drugLegality: boolean,
        hasPsionicInstitute: boolean
    ) {
        this.starportType = starportType;
        this.hasNavalBase = hasNavalBase;
        this.hasScoutBase = hasScoutBase;
        this.planetSize = planetSize;
        this.planetAtmosphere = planetAtmosphere;
        this.planetHydrographics = planetHydrographics;
        this.planetPopulation = planetPopulation;
        this.planetGovernment = planetGovernment;
        this.planetLawLevel = planetLawLevel;
        this.planetTechLevel = planetTechLevel;
        this.drugLegality = drugLegality;
        this.hasPsionicInstitute = hasPsionicInstitute;
        this.spaceLanes = [];
    }

    isAgriculturalWorld(): boolean {
        return this.planetAtmosphere.key >= 4 && this.planetAtmosphere.key <= 9 && 
               this.planetHydrographics.key >= 4 && this.planetHydrographics.key <= 8 && 
               this.planetPopulation.key >= 5 && this.planetPopulation.key <= 7;
    }
    isNonAgriculturalWorld(): boolean {
        return this.planetAtmosphere.key <= 3 &&
               this.planetHydrographics.key <= 3 &&
               this.planetPopulation.key >=6;
    }
    isIndustrialWorld(): boolean {
        return [0, 1, 2, 4, 7, 9].includes(this.planetAtmosphere.key) &&
               this.planetPopulation.key >= 9;
    }
    isNonIndustrialWorld(): boolean {
        return this.planetPopulation.key < 6;
    }
    isRichWorld(): boolean {
        return this.planetGovernment.key >=4 && this.planetGovernment.key <= 9 &&
               [6, 8].includes(this.planetAtmosphere.key) &&
               this.planetPopulation.key >= 6 && this.planetPopulation.key <= 8;
    }
    isPoorWorld(): boolean {
        return this.planetAtmosphere.key >= 2 && this.planetAtmosphere.key <= 5 &&
               this.planetHydrographics.key <= 3;
    }
}


export enum StarportType {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
    E = "E",
    X = "X",
}
const PlanetSizeLabels: { [key: number]: string } = {
    0: "Asteroid/Planetoid Complex",
    1: "1000 miles diameter",
    2: "2000 miles diameter",
    3: "3000 miles diameter",
    4: "4000 miles diameter",
    5: "5000 miles diameter",
    6: "6000 miles diameter",
    7: "7000 miles diameter",
    8: "8000 miles diameter",
    9: "9000 miles diameter",
    10: "10000 miles diameter",
    11: "11000 miles diameter",
    12: "12000 miles diameter",
};

export function createPlanetSize(key: number): PlanetProperty {
    return {
        key: key,
        label: PlanetSizeLabels[key] || "Unknown"
    };
}
const PlanetAtmosphereLabels: { [key: number]: string } = {
    0: "No Atmosphere",
    1: "Trace",
    2: "Very Thin, Tainted",
    3: "Very Thin",
    4: "Thin, Tainted",
    5: "Thin",
    6: "Standard",
    7: "Standard, Tainted",
    8: "Dense",
    9: "Dense, Tainted",
    10: "Exotic",
    11: "Corrosive",
    12: "Insidious",
};

export function createPlanetAtmosphere(key: number): PlanetProperty {
    return {
        key: key,
        label: PlanetAtmosphereLabels[key] || "Unknown"
    };
}
const PlanetHydrographicsLabels: { [key: number]: string } = {
    0: "No free standing water",
    1: "10%",
    2: "20%",
    3: "30%",
    4: "40%",
    5: "50%",
    6: "60%",
    7: "70%",
    8: "80%",
    9: "90%",
    10: "All water. No land masses",
};

export function createPlanetHydrographics(key: number): PlanetProperty {
    return {
        key: key,
        label: PlanetHydrographicsLabels[key] || "Unknown"
    };
}

const PlanetPopulationLabels: { [key: number]: string } = {
    0: "0. No inhabitants",
    1: "10",
    2: "100",
    3: "1,000",
    4: "10,000",
    5: "100,000",
    6: "1,000,000",
    7: "10,000,000",
    8: "100,000,000",
    9: "1,000,000,000",
    10: "10,000,000,000",
};

export function createPlanetPopulation(key: number): PlanetProperty {
    return {
        key: key,
        label: PlanetPopulationLabels[key] || "Unknown"
    };
}
const PlanetGovernmentLabels: { [key: number]: string } = {
    0: "No government structure. In many cases, family bonds will predominate.",
    1: "Company/Corperation. Ruling functions are assumed by a company managerial elite, and most citizens will be company employees and their descendants.",
    2: "Participating Democracy. Ruling function decisions are reached by the advice and consent of the citizenry directly.",
    3: "Self-Perpetuating Oligarchy. Ruling functions are performed by a restricted minority, with little to no input from the mass of the citizenry.",
    4: "Representitive Democracy. Ruling functions are performed by elected representatives.",
    5: "Feudal Technocracy. Ruling functions are performed by specific individuals for persons who agree to be ruled by them. Relationshiops are based on the performance of technical activities which are mutually benificial.",
    6: "Captive Government. Ruling functions are performed by an imposed leadership answerable to an outside group. A colony or conquered area.",
    7: "Balkenization. No central ruling authority exists. Law level refers to government nearest the starport.",
    8: "Civil Service Bureaucracy. Ruling functions are performed by government selecting individuals selected for their expertise.",
    9: "Impersonal Bureaucracy. Ruling functions are performed by agencies that have become insulated from governed citizens.",
    10: "Charismatic Dictatorship. Ruling functions are performed by agencies directed by a single leader who enjoys the overwhelming confidence of the citizens.",
    11: "Non-Charismatic Dictatorship. A previous charasmatic dictator has be replaced by a leader through the normal channels.",
    12: "Charismatic Oligarchy.Ruling functions are performed by a select group of members of an organization or class which enjoy the overwhelming confidence of the citizenry.",
    13: "Religious Dictatorship. Ruling functions are performed by a religious organization without regard to the specific individual needs of the citizenry.",
};

export function createPlanetGovernment(key: number): PlanetProperty {
    return {
        key: key,
        label: PlanetGovernmentLabels[key] || "Unknown"
    };
}
const PlanetLawLevelLabels: { [key: number]: string } = {
    0: "No laws affecting weapons posession or ownership.",
    1: "Certain weapons are prohibited specificially 1) body pistols which are undetectable by standard detectors, 2) exposive weapons such as bombs or grenades, and 3) poison gas.",
    2: "Portable energy weapons, such as laser rifiles and carbines are prophibited. Ship's gunnery not effected.",
    3: "Weapons of a strict military nature (such as machine guns or automatic rifles, al though not submachine guns) are prohibited.",
    4: "Light assult weapons (such as submachine guns) are prohibited.",
    5: "Personal concealable firearms (such as pistols or revolvers) are prohibited.",
    6: "Most firearms (all except shotguns) are prohibited. The carrying of any type of weapon openly is discouraged.",
    7: "Shotguns are prohibited.",
    8: "Long bladed weapons (all bladed weapons except daggers) are strictly controlled. Open posession in public is prohibited. Ownership is, however, not restricted.",
    9: "Posession of any weapon outside of one's home is prohibited.",
};

export function createPlanetLawLevel(key: number): PlanetProperty {
    return {
        key: key,
        label: PlanetLawLevelLabels[key] || "Unknown"
    };
}


// Example usage:
// const exampleWorld = new World(
//     StarportType.B,
//     true,  // hasNavalBase
//     false, // hasScoutBase
//     createPlanetSize(7),           // 7000 miles diameter
//     createPlanetAtmosphere(6),     // Standard atmosphere
//     createPlanetHydrographics(5),  // 50% water
//     createPlanetPopulation(6),     // 1,000,000 people
//     createPlanetGovernment(4),     // Representative Democracy
//     createPlanetLawLevel(3),       // Military weapons prohibited
//     8,     // Tech Level 8
//     true,  // drugs are legal
//     false  // no psionic institute
// );
// 
// console.log(exampleWorld.isAgriculturalWorld()); // true - meets agricultural criteria
// console.log(exampleWorld.planetAtmosphere.label); // "Standard"
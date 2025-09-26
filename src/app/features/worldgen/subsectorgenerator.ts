import { SectorHex } from "src/app/models/sectorhex";
import { Subsector } from "src/app/models/subsector";
import { World, StarportType, PlanetProperty, createPlanetSize, createPlanetAtmosphere, createPlanetHydrographics, createPlanetPopulation, createPlanetGovernment, createPlanetLawLevel } from "src/app/models/world";
import { DiceUtils } from "src/app/shared/dice-utils";

export class SubsectorGenerator {
    subsector?: Subsector | null;
    constructor(subsector: Subsector | null = null) {
        this.subsector = subsector;
    }
    initializeSubsector()
    {
        this.subsector = new Subsector("Unnamed Subsector");
    }
    changeHexsWorldChance(locations: number[], modifier: number)
    {
        if (this.subsector === undefined || this.subsector === null) {
            throw new Error("Subsector not initialized");
        }
        for (let location of locations) {
            this.subsector.sectorHexes[location].worldGenerationChanceModifier += modifier;
        }
    }
    generateWorlds()
    {
        if (this.subsector === undefined || this.subsector === null) {
            throw new Error("Subsector not initialized");
        }
        for (let hex of this.subsector.sectorHexes) {
            if (DiceUtils.rollSingleDiceCheck(4, hex.worldGenerationChanceModifier)) {
                const starportRoll = DiceUtils.standardRoll();
                let starportType: StarportType = StarportType.X;
                let hasNavalBase: boolean = false;
                let hasScoutBase: boolean = false;
                let planetSize: PlanetProperty;
                let planetAtmosphere: PlanetProperty;
                let planetHydrographics: PlanetProperty;
                let planetPopulation: PlanetProperty;
                let planetGovernment: PlanetProperty;
                let planetLawLevel: PlanetProperty;
                switch (starportRoll) {
                    case 2:
                    case 3:
                    case 4: starportType = StarportType.A;
                    hasNavalBase = DiceUtils.rollStandardCheck(8);
                    hasScoutBase = DiceUtils.rollStandardCheck(10);
                     break;
                    case 5:
                    case 6: starportType = StarportType.B; 
                    hasNavalBase = DiceUtils.rollStandardCheck(8);
                    hasScoutBase = DiceUtils.rollStandardCheck(9);
                    break;
                    case 7:
                    case 8: starportType = StarportType.C;
                    hasNavalBase = false;
                    hasScoutBase = DiceUtils.rollStandardCheck(8);
                    break;
                    case 9: starportType = StarportType.D; 
                    hasNavalBase = false;
                    hasScoutBase = DiceUtils.rollStandardCheck(7);
                    break;
                    case 10: 
                    case 11: starportType = StarportType.E;
                    hasNavalBase = false;
                    hasScoutBase = false;
                    break;
                    case 12: starportType = StarportType.X;
                    hasNavalBase = false;
                    hasScoutBase = false;
                    break;
                }
                planetSize = createPlanetSize(Math.max(DiceUtils.standardRoll(-2), 0));
                if(planetSize.key === 0) {
                    planetAtmosphere = createPlanetAtmosphere(0);
                }
                else {
                    planetAtmosphere = createPlanetAtmosphere(Math.max(DiceUtils.standardRoll(planetSize.key - 7), 0));
                }
                if(planetAtmosphere.key === 0 || planetAtmosphere.key === 1) {
                    planetHydrographics = createPlanetHydrographics(0);
                }
                else {
                    let hydrographicsModifier = planetSize.key - 7;
                    if(planetAtmosphere.key === 0 || planetAtmosphere.key === 1 || planetAtmosphere.key > 9) {
                        hydrographicsModifier -= 4;
                    }
                    planetHydrographics = createPlanetHydrographics(Math.max(DiceUtils.standardRoll(hydrographicsModifier), 0));
                }
                planetPopulation = createPlanetPopulation(Math.max(DiceUtils.standardRoll(-2), 0));
                planetGovernment = createPlanetGovernment(Math.max(DiceUtils.standardRoll(planetPopulation.key - 7), 0));
                planetLawLevel = createPlanetLawLevel(Math.max(DiceUtils.standardRoll(planetGovernment.key - 7), 0));
                let techLevelModifier = 0;
                switch(starportType)
                {
                    case StarportType.A: techLevelModifier += 6; break;
                    case StarportType.B: techLevelModifier += 4; break;
                    case StarportType.C: techLevelModifier += 2; break;
                    case StarportType.D: 
                    case StarportType.E: break;
                    case StarportType.X: techLevelModifier -= 4; break;
                }
                switch(planetSize.key) 
                {
                    case 0: 
                    case 1: techLevelModifier += 2; break;
                    case 2:
                    case 3:
                    case 4: techLevelModifier += 1; break;
                    default: break;
                }
                switch(planetAtmosphere.key) 
                {
                    case 0:
                    case 1:
                    case 2:
                    case 3: techLevelModifier += 1; break;
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14: techLevelModifier += 1; break;
                    default: break;
                }
                techLevelModifier += Math.min(planetHydrographics.key - 8, 0);
                switch(planetPopulation.key) 
                {
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5: techLevelModifier += 1; break;
                    case 9: techLevelModifier += 2; break;
                    case 10: techLevelModifier += 4; break;
                    default: break;
                }
                switch(planetGovernment.key) 
                {
                    case 0: techLevelModifier += 1; break;
                    case 5: techLevelModifier += 1; break;
                    case 13: techLevelModifier -= 2; break;
                    default: break;
                }
                const planetTechLevel = Math.max(DiceUtils.standardRoll(techLevelModifier), 0);
                const drugLegality = DiceUtils.rollStandardCheck(planetLawLevel.key);
                let hasPsionicInstitute: boolean;
                if(planetPopulation.key > 9) {
                    hasPsionicInstitute = DiceUtils.rollStandardCheck(planetPopulation.key - 9, 11);
                }
                else {
                    hasPsionicInstitute = false;
                }
                const world = new World(starportType, hasNavalBase, hasScoutBase, planetSize, planetAtmosphere, planetHydrographics, planetPopulation, planetGovernment, planetLawLevel, planetTechLevel, drugLegality, hasPsionicInstitute);
                hex.world = world;
            }
        }
    }
    generateSpaceLanes() 
    {
        if (this.subsector === undefined || this.subsector === null) {
            throw new Error("Subsector not initialized");
        }
        let worldToNeighborsByJumpDistance: Map<World, SectorHex[][]> = new Map();
        let existingSpaceLanes: Set<string> = new Set(); // Track existing lanes to avoid duplicates
        
        // Build neighbor distance map
        for (let hex of this.subsector.sectorHexes) {
            if (hex.world !== null) {
                const neighborsByDistance = this.findNeighborsByDistance(hex, 4);
                worldToNeighborsByJumpDistance.set(hex.world, neighborsByDistance);
            }
        }
        
        // Generate space lanes by jump distance (1-4)
        for (let jumpDistance = 1; jumpDistance <= 4; jumpDistance++) {
            for (let hex of this.subsector.sectorHexes) {
                if (hex.world !== null) {
                    const hexIndex = this.subsector.sectorHexes.indexOf(hex);
                    const neighborsByDistance = worldToNeighborsByJumpDistance.get(hex.world)!;
                    const neighborsAtDistance = neighborsByDistance[jumpDistance - 1];
                    
                    for (let neighborHex of neighborsAtDistance) {
                        if (neighborHex.world !== null) {
                            const neighborIndex = this.subsector.sectorHexes.indexOf(neighborHex);
                            const laneKey = this.createSpaceLaneKey(hexIndex, neighborIndex);
                            
                            // Check if any route already exists (direct or indirect)
                            if (!this.routeExists(hex, neighborHex, existingSpaceLanes)) {
                                const probability = this.getSpaceLaneProbability(hex.world.starportType, neighborHex.world.starportType, jumpDistance);
                                
                                if (DiceUtils.rollSingleDiceCheck(probability)) {
                                    existingSpaceLanes.add(laneKey);
                                    // Store the space lane in both worlds
                                    hex.world.spaceLanes.push(neighborHex);
                                    neighborHex.world.spaceLanes.push(hex);
                                    console.log(`Space lane established: ${hex.world.starportType} to ${neighborHex.world.starportType} at Jump-${jumpDistance}`);
                                }
                            }
                        }
                    }
                }
            }
        }
        
    }

    private findNeighborsByDistance(startHex: SectorHex, maxDistance: number): SectorHex[][] {
        const result: SectorHex[][] = Array.from({ length: maxDistance }, () => []);
        const visited = new Set<SectorHex>();
        const queue: { hex: SectorHex, distance: number }[] = [{ hex: startHex, distance: 0 }];
        
        visited.add(startHex);
        
        while (queue.length > 0) {
            const { hex, distance } = queue.shift()!;
            
            if (distance >= maxDistance) continue;
            
            for (const neighbor of hex.neighbors) {
                if (neighbor !== null && !visited.has(neighbor)) {
                    visited.add(neighbor);
                    
                    // Only add hexes with worlds to our result
                    if (neighbor.world !== null) {
                        result[distance].push(neighbor);
                    }
                    
                    // Continue BFS for next distance level
                    queue.push({ hex: neighbor, distance: distance + 1 });
                }
            }
        }
        
        return result;
    }

    private createSpaceLaneKey(hexIndex1: number, hexIndex2: number): string {
        // Create a consistent key regardless of order to avoid duplicates
        return hexIndex1 < hexIndex2 ? `${hexIndex1}|${hexIndex2}` : `${hexIndex2}|${hexIndex1}`;
    }

    private routeExists(startHex: SectorHex, endHex: SectorHex, existingSpaceLanes: Set<string>): boolean {
        const startIndex = this.subsector!.sectorHexes.indexOf(startHex);
        const endIndex = this.subsector!.sectorHexes.indexOf(endHex);
        
        // Check for direct connection first
        const directKey = this.createSpaceLaneKey(startIndex, endIndex);
        if (existingSpaceLanes.has(directKey)) {
            return true;
        }

        // Check for indirect routes using BFS on existing space lanes
        const visited = new Set<SectorHex>();
        const queue: SectorHex[] = [startHex];
        visited.add(startHex);

        while (queue.length > 0) {
            const currentHex = queue.shift()!;
            
            // Check all space lanes connected to current hex
            if (currentHex.world) {
                for (const connectedHex of currentHex.world.spaceLanes) {
                    if (!visited.has(connectedHex)) {
                        if (connectedHex === endHex) {
                            return true; // Found indirect route
                        }
                        visited.add(connectedHex);
                        queue.push(connectedHex);
                    }
                }
            }
        }
        
        return false;
    }

    private getSpaceLaneProbability(starport1: StarportType, starport2: StarportType, jumpDistance: number): number {
        // Combined starport pair and jump distance probability matrix (target numbers for 1d6)
        // Format: 'StarportPair-JumpDistance': targetNumber
        const probabilityMatrix: { [key: string]: number } = {
            // Jump-1 routes
            'A-A-1': 1, 'A-B-1': 1, 'A-C-1': 1, 'A-D-1': 1, 'A-E-1': 2,
            'B-B-1': 1, 'B-C-1': 2, 'B-D-1': 3, 'B-E-1': 4,
            'C-C-1': 3, 'C-D-1': 4, 'C-E-1': 4,
            'D-D-1': 4, 'D-E-1': 5,
            'E-E-1': 6,
            
            // Jump-2 routes
            'A-A-2': 2, 'A-B-2': 3, 'A-C-2': 4, 'A-D-2': 5,
            'B-B-2': 3, 'B-C-2': 4, 'B-D-2': 6,
            'C-C-2': 6,
            
            // Jump-3 routes
            'A-A-3': 4, 'A-B-3': 4, 'A-C-3': 6,
            'B-B-3': 4, 'B-C-3': 6,
            
            // Jump-4 routes
            'A-A-4': 5, 'A-B-4': 5,
            'B-B-4': 6
        };
        
        // Create consistent key for lookup
        const key1 = StarportType[starport1];
        const key2 = StarportType[starport2];
        const pairKey = key1 <= key2 ? `${key1}-${key2}` : `${key2}-${key1}`;
        const fullKey = `${pairKey}-${jumpDistance}`;
        
        return probabilityMatrix[fullKey] || 7; // Default to impossible (7+ on 1d6)
    }
}
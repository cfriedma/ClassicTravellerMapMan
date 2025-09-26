import { World } from "./world";
export class SectorHex {
    neighbors: SectorHex[];
    world: World | null;
    hasGasGiant: boolean;
    worldGenerationChanceModifier: number;

    constructor() {
        this.neighbors = Array(6).fill(null);
        this.world = null;
        this.hasGasGiant = false;
        this.worldGenerationChanceModifier = 0;
    }
    setNeighbor(index: number, neighbor: SectorHex) {
        this.neighbors[index] = neighbor;
        neighbor.neighbors[(index + 3) % 6] = this; // Set the reverse neighbor on a hex grid
    }
}

export default SectorHex;
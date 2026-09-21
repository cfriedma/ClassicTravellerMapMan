import { World } from "./world";

export class SectorHex {
    neighbors: SectorHex[];
    world: World | null;
    hasGasGiant: boolean;
    worldGenerationChanceModifier: number;
    onMap: boolean;
    cellTypeId: string;

    constructor() {
        this.neighbors = Array(6).fill(null);
        this.world = null;
        this.hasGasGiant = false;
        this.worldGenerationChanceModifier = 0;
        this.onMap = true;
        this.cellTypeId = 'standard';
    }
    setNeighbor(index: number, neighbor: SectorHex) {
        this.neighbors[index] = neighbor;
        neighbor.neighbors[(index + 3) % 6] = this; // Set the reverse neighbor on a hex grid
    }
}

export default SectorHex;

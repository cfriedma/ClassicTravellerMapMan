import SectorHex from "./sectorhex";
export class Subsector {
    name: string;
    sectorHexes: SectorHex[];

    constructor(name: string) {
        this.name = name;
        this.sectorHexes = new Array(80);
        
        // First, create all hexes
        for (let i = 0; i < 80; i++) {
            this.sectorHexes[i] = new SectorHex();
        }
        
        // Then set up neighbors using proper hex grid logic
        // Since setNeighbor is symmetrical, only set each connection once
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 10; col++) {
                const index = row * 10 + col;
                const hex = this.sectorHexes[index];
                
                // For flat-top hexagons in offset coordinates:
                // Neighbor directions: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
                // Only set connections in forward directions to avoid duplicates
                
                // East (right) - only set if there's a hex to the right
                if (col < 9) {
                    hex.setNeighbor(0, this.sectorHexes[index + 1]);
                }
                
                // For odd rows (offset right)
                if (row % 2 === 1) {
                    // Southeast - only set downward connections
                    if (row < 7 && col < 9) {
                        hex.setNeighbor(5, this.sectorHexes[(row + 1) * 10 + col + 1]);
                    }
                    // Southwest - only set downward connections
                    if (row < 7) {
                        hex.setNeighbor(4, this.sectorHexes[(row + 1) * 10 + col]);
                    }
                } else {
                    // For even rows (not offset)
                    // Southeast - only set downward connections
                    if (row < 7) {
                        hex.setNeighbor(5, this.sectorHexes[(row + 1) * 10 + col]);
                    }
                    // Southwest - only set downward connections
                    if (row < 7 && col > 0) {
                        hex.setNeighbor(4, this.sectorHexes[(row + 1) * 10 + col - 1]);
                    }
                }
            }
        }
    }
}
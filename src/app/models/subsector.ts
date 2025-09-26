import SectorHex from "./sectorhex";
export class Subsector {
    name: string;
    sectorHexes: SectorHex[];

    constructor(name: string) {
        this.name = name;
        this.sectorHexes = new Array(80);
        for (let i = 0; i < 8; i++) {
            for(let j = 0; j < 10; j++) {
                let index = i * 10 + j;
                this.sectorHexes[index] = new SectorHex();
                if (j > 0) {
                    this.sectorHexes[index].setNeighbor(0, this.sectorHexes[index - 1]);
                }
                if(i % 2 === 1) {
                    if (i > 0) {
                        this.sectorHexes[index].setNeighbor(2, this.sectorHexes[index - 10]);
                    }
                    if(i > 0 && j > 0) {
                        this.sectorHexes[index].setNeighbor(1, this.sectorHexes[index - 11]);
                    }
                }
                else 
                {
                    if (i > 0) {
                        this.sectorHexes[index].setNeighbor(1, this.sectorHexes[index - 10]);
                    }
                    if(i > 0 && j < 9) {
                        this.sectorHexes[index].setNeighbor(2, this.sectorHexes[index - 9]);
                    }
                }
                
            }
        }
    }
}
import SectorHex from "./sectorhex";
import { CLASSIC_COLUMNS, CLASSIC_ROWS, OFF_MAP_TYPE_ID } from "./generation-options";
import { hexIndex } from "../shared/hex-grid";

export class Subsector {
    name: string;
    columns: number;
    rows: number;
    sectorHexes: SectorHex[];

    constructor(name: string, columns: number = CLASSIC_COLUMNS, rows: number = CLASSIC_ROWS, hexTypeIds?: string[]) {
        this.name = name;
        this.columns = columns;
        this.rows = rows;
        const count = columns * rows;
        this.sectorHexes = new Array(count);

        for (let i = 0; i < count; i++) {
            const hex = new SectorHex();
            const typeId = hexTypeIds?.[i];
            if (typeId) {
                hex.cellTypeId = typeId;
                hex.onMap = typeId !== OFF_MAP_TYPE_ID;
            }
            this.sectorHexes[i] = hex;
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const index = hexIndex(col, row, columns);
                const hex = this.sectorHexes[index];

                if (col < columns - 1) {
                    hex.setNeighbor(0, this.sectorHexes[index + 1]);
                }

                if (row % 2 === 1) {
                    if (row < rows - 1 && col < columns - 1) {
                        hex.setNeighbor(5, this.sectorHexes[hexIndex(col + 1, row + 1, columns)]);
                    }
                    if (row < rows - 1) {
                        hex.setNeighbor(4, this.sectorHexes[hexIndex(col, row + 1, columns)]);
                    }
                } else {
                    if (row < rows - 1) {
                        hex.setNeighbor(5, this.sectorHexes[hexIndex(col, row + 1, columns)]);
                    }
                    if (row < rows - 1 && col > 0) {
                        hex.setNeighbor(4, this.sectorHexes[hexIndex(col - 1, row + 1, columns)]);
                    }
                }
            }
        }
    }
}

/**
 * Tile represents a single numbered tile on the 2048 grid.
 * Tiles are immutable value carriers with unique IDs for animation tracking.
 */

let tileIdCounter = 0;

/**
 * Reset the tile ID counter. Used in testing to ensure deterministic IDs.
 */
export function resetTileIdCounter() {
  tileIdCounter = 0;
}

export class Tile {
  /**
   * @param {number} value - The tile's numeric value (2, 4, 8, ...)
   * @param {number} row - Row position on the grid
   * @param {number} col - Column position on the grid
   */
  constructor(value, row, col) {
    this.id = ++tileIdCounter;
    this.value = value;
    this.row = row;
    this.col = col;

    // Animation metadata — set by engine during move processing
    this.previousRow = null;
    this.previousCol = null;
    this.mergedFrom = null; // Array of two tiles that merged into this one
    this.isNew = false;
  }

  /**
   * Factory method for creating tiles.
   * @param {number} value
   * @param {number} row
   * @param {number} col
   * @returns {Tile}
   */
  static create(value, row, col) {
    return new Tile(value, row, col);
  }

  /**
   * Create a serializable snapshot of this tile.
   * @returns {{ value: number, row: number, col: number }}
   */
  serialize() {
    return {
      value: this.value,
      row: this.row,
      col: this.col,
    };
  }
}

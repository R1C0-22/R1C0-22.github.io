import { Tile } from './tile.js';

/**
 * Grid manages the 2D array of tiles.
 * Provides cell access, iteration, and availability queries.
 */
export class Grid {
  /**
   * @param {number} size - Grid dimension (e.g. 4 for 4x4)
   * @param {Array<Array<Tile|null>>} [cells] - Optional pre-built cells array
   */
  constructor(size, cells) {
    this.size = size;
    this.cells = cells || this.createEmptyCells();
  }

  /**
   * Build a size×size 2D array filled with null.
   * @returns {Array<Array<null>>}
   */
  createEmptyCells() {
    const cells = [];
    for (let row = 0; row < this.size; row++) {
      cells[row] = [];
      for (let col = 0; col < this.size; col++) {
        cells[row][col] = null;
      }
    }
    return cells;
  }

  /**
   * Get the tile at (row, col), or null if empty.
   * @param {number} row
   * @param {number} col
   * @returns {Tile|null}
   */
  getCell(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return undefined;
    }
    return this.cells[row][col];
  }

  /**
   * Place a tile at (row, col).
   * @param {number} row
   * @param {number} col
   * @param {Tile|null} tile
   */
  setCell(row, col, tile) {
    this.cells[row][col] = tile;
  }

  /**
   * Get all cells that have no tile.
   * @returns {Array<{row: number, col: number}>}
   */
  getAvailableCells() {
    const available = [];
    this.eachCell((row, col, tile) => {
      if (!tile) {
        available.push({ row, col });
      }
    });
    return available;
  }

  /**
   * Whether any cell is empty.
   * @returns {boolean}
   */
  hasAvailableCells() {
    return this.getAvailableCells().length > 0;
  }

  /**
   * Iterate over every cell, calling callback(row, col, tile).
   * @param {function(number, number, Tile|null): void} callback
   */
  eachCell(callback) {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        callback(row, col, this.cells[row][col]);
      }
    }
  }

  /**
   * Deep-clone the grid. Tiles are recreated as plain value copies.
   * @returns {Grid}
   */
  clone() {
    const clonedCells = [];
    for (let row = 0; row < this.size; row++) {
      clonedCells[row] = [];
      for (let col = 0; col < this.size; col++) {
        const tile = this.cells[row][col];
        clonedCells[row][col] = tile ? Tile.create(tile.value, row, col) : null;
      }
    }
    return new Grid(this.size, clonedCells);
  }

  /**
   * Serialize the grid to a plain object for persistence.
   * @returns {{ size: number, cells: Array }}
   */
  serialize() {
    const cellData = [];
    for (let row = 0; row < this.size; row++) {
      cellData[row] = [];
      for (let col = 0; col < this.size; col++) {
        const tile = this.cells[row][col];
        cellData[row][col] = tile ? tile.serialize() : null;
      }
    }
    return { size: this.size, cells: cellData };
  }

  /**
   * Restore a grid from serialized data.
   * @param {{ size: number, cells: Array }} data
   * @returns {Grid}
   */
  static deserialize(data) {
    const cells = [];
    for (let row = 0; row < data.size; row++) {
      cells[row] = [];
      for (let col = 0; col < data.size; col++) {
        const cellData = data.cells[row][col];
        cells[row][col] = cellData
          ? Tile.create(cellData.value, cellData.row, cellData.col)
          : null;
      }
    }
    return new Grid(data.size, cells);
  }
}

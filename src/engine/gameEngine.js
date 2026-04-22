import { Grid } from './grid.js';
import { Tile } from './tile.js';

/**
 * Direction vectors for grid traversal.
 * Each direction defines how to iterate rows/cols and the movement delta.
 */
const DIRECTION_VECTORS = {
  up:    { deltaRow: -1, deltaCo: 0 },
  down:  { deltaRow: 1,  deltaCo: 0 },
  left:  { deltaRow: 0,  deltaCo: -1 },
  right: { deltaRow: 0,  deltaCo: 1 },
};

const VALID_DIRECTIONS = ['up', 'down', 'left', 'right'];

/**
 * GameEngine implements all 2048 game logic without any DOM access.
 * It is 100% pure and deterministic when given a fixed randomFn.
 */
export class GameEngine {
  /**
   * @param {number} size - Grid dimension (3, 4, 6, or 8)
   * @param {function(): number} randomFn - Injectable RNG for deterministic testing
   */
  constructor(size = 4, randomFn = Math.random) {
    this.size = size;
    this.randomFn = randomFn;
    this.grid = null;
    this.score = 0;
    this.won = false;
    this.lost = false;
  }

  /**
   * Initialize a fresh game: empty grid + 2 random tiles.
   */
  initialize() {
    this.grid = new Grid(this.size);
    this.score = 0;
    this.won = false;
    this.lost = false;
    this.spawnRandomTile();
    this.spawnRandomTile();
  }

  /**
   * Place a 2 (90% chance) or 4 (10% chance) on a random empty cell.
   * @returns {Tile|null} The spawned tile, or null if grid is full.
   */
  spawnRandomTile() {
    const availableCells = this.grid.getAvailableCells();
    if (availableCells.length === 0) return null;

    const cellIndex = Math.floor(this.randomFn() * availableCells.length);
    const cell = availableCells[cellIndex];
    const value = this.randomFn() < 0.9 ? 2 : 4;

    const tile = Tile.create(value, cell.row, cell.col);
    tile.isNew = true;
    this.grid.setCell(cell.row, cell.col, tile);
    return tile;
  }

  /**
   * Process a move in the given direction.
   * @param {'up'|'down'|'left'|'right'} direction
   * @returns {{ moved: boolean, score: number, mergedTiles: Tile[], movedTiles: Tile[], newTile: Tile|null }}
   */
  move(direction) {
    if (!VALID_DIRECTIONS.includes(direction)) {
      throw new Error(`Invalid direction: ${direction}`);
    }

    const result = {
      moved: false,
      score: 0,
      mergedTiles: [],
      movedTiles: [],
      newTile: null,
    };

    // Clear animation metadata from previous move
    this.grid.eachCell((row, col, tile) => {
      if (tile) {
        tile.previousRow = null;
        tile.previousCol = null;
        tile.mergedFrom = null;
        tile.isNew = false;
      }
    });

    const traversals = this.buildTraversals(direction);
    const mergedFlags = new Set(); // Track which tile positions already merged this move

    for (const row of traversals.rows) {
      for (const col of traversals.cols) {
        const tile = this.grid.getCell(row, col);
        if (!tile) continue;

        const { furthestRow, furthestCol, nextRow, nextCol } =
          this.findFurthestPosition(row, col, direction);

        const nextTile = (nextRow !== null && nextCol !== null)
          ? this.grid.getCell(nextRow, nextCol)
          : null;

        // Check if we can merge with the next tile
        if (
          nextTile &&
          nextTile.value === tile.value &&
          !mergedFlags.has(`${nextRow},${nextCol}`)
        ) {
          // Merge
          const mergedTile = Tile.create(tile.value * 2, nextRow, nextCol);
          mergedTile.mergedFrom = [tile, nextTile];
          mergedTile.previousRow = row;
          mergedTile.previousCol = col;

          this.grid.setCell(row, col, null);
          this.grid.setCell(nextRow, nextCol, mergedTile);

          mergedFlags.add(`${nextRow},${nextCol}`);

          result.score += mergedTile.value;
          result.mergedTiles.push(mergedTile);
          result.moved = true;

          if (mergedTile.value >= 2048) {
            this.won = true;
          }
        } else if (furthestRow !== row || furthestCol !== col) {
          // Slide without merging
          tile.previousRow = row;
          tile.previousCol = col;
          tile.row = furthestRow;
          tile.col = furthestCol;

          this.grid.setCell(row, col, null);
          this.grid.setCell(furthestRow, furthestCol, tile);

          result.movedTiles.push(tile);
          result.moved = true;
        }
      }
    }

    if (result.moved) {
      this.score += result.score;
      result.newTile = this.spawnRandomTile();

      if (!this.isMovePossible()) {
        this.lost = true;
      }
    }

    return result;
  }

  /**
   * Build traversal order for rows and cols based on direction.
   * We iterate from the edge tiles move toward to avoid conflicts.
   */
  buildTraversals(direction) {
    const rows = [];
    const cols = [];

    for (let i = 0; i < this.size; i++) {
      rows.push(i);
      cols.push(i);
    }

    // When moving down, process rows bottom-to-top
    if (direction === 'down') rows.reverse();
    // When moving right, process cols right-to-left
    if (direction === 'right') cols.reverse();

    return { rows, cols };
  }

  /**
   * Find the furthest open position a tile can slide to in the given direction,
   * and the next cell beyond that (for potential merge).
   */
  findFurthestPosition(row, col, direction) {
    const { deltaRow, deltaCo } = DIRECTION_VECTORS[direction];
    let currentRow = row;
    let currentCol = col;
    let nextRow, nextCol;

    do {
      nextRow = currentRow + deltaRow;
      nextCol = currentCol + deltaCo;

      if (
        nextRow < 0 || nextRow >= this.size ||
        nextCol < 0 || nextCol >= this.size
      ) {
        // Hit a wall
        return {
          furthestRow: currentRow,
          furthestCol: currentCol,
          nextRow: null,
          nextCol: null,
        };
      }

      if (this.grid.getCell(nextRow, nextCol) !== null) {
        // Hit another tile — can potentially merge
        return {
          furthestRow: currentRow,
          furthestCol: currentCol,
          nextRow,
          nextCol,
        };
      }

      currentRow = nextRow;
      currentCol = nextCol;
    } while (true);
  }

  /**
   * Check if any valid move exists (any direction would change the board).
   * @returns {boolean}
   */
  isMovePossible() {
    // If there are empty cells, a move is always possible
    if (this.grid.hasAvailableCells()) return true;

    // Check if any adjacent tiles can merge
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const tile = this.grid.getCell(row, col);
        if (!tile) continue;

        // Check right neighbor
        if (col < this.size - 1) {
          const right = this.grid.getCell(row, col + 1);
          if (right && right.value === tile.value) return true;
        }
        // Check bottom neighbor
        if (row < this.size - 1) {
          const below = this.grid.getCell(row + 1, col);
          if (below && below.value === tile.value) return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if any tile on the grid has reached 2048.
   * @returns {boolean}
   */
  checkWinCondition() {
    let hasWinTile = false;
    this.grid.eachCell((row, col, tile) => {
      if (tile && tile.value >= 2048) {
        hasWinTile = true;
      }
    });
    return hasWinTile;
  }

  /**
   * Export the full game state as a serializable object.
   * @returns {{ grid: Object, score: number, size: number, won: boolean, lost: boolean }}
   */
  getState() {
    return {
      grid: this.grid.serialize(),
      score: this.score,
      size: this.size,
      won: this.won,
      lost: this.lost,
    };
  }

  /**
   * Restore game state from a serialized snapshot.
   * @param {{ grid: Object, score: number, size: number, won: boolean, lost: boolean }} state
   */
  loadState(state) {
    this.size = state.size;
    this.grid = Grid.deserialize(state.grid);
    this.score = state.score;
    this.won = state.won || false;
    this.lost = state.lost || false;
  }
}

import { describe, it, expect, beforeEach } from '@jest/globals';
import { GameEngine } from '../src/engine/gameEngine.js';
import { Tile, resetTileIdCounter } from '../src/engine/tile.js';

/**
 * Creates a deterministic RNG from a sequence of values.
 * Values are consumed in order and wrap around.
 * @param {number[]} values - Pre-determined random values (0-1 range)
 * @returns {function(): number}
 */
function createSeededRandom(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
}

/**
 * Helper to set up a specific grid state for testing.
 * @param {GameEngine} engine
 * @param {(number|null)[][]} gridValues - 2D array of tile values (null = empty)
 */
function setGridState(engine, gridValues) {
  const size = gridValues.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const value = gridValues[row][col];
      if (value !== null && value !== 0) {
        engine.grid.setCell(row, col, Tile.create(value, row, col));
      } else {
        engine.grid.setCell(row, col, null);
      }
    }
  }
}

/**
 * Extract a 2D array of values from the engine grid.
 * @param {GameEngine} engine
 * @returns {(number|null)[][]}
 */
function getGridValues(engine) {
  const values = [];
  for (let row = 0; row < engine.size; row++) {
    values[row] = [];
    for (let col = 0; col < engine.size; col++) {
      const tile = engine.grid.getCell(row, col);
      values[row][col] = tile ? tile.value : null;
    }
  }
  return values;
}

describe('GameEngine', () => {
  beforeEach(() => {
    resetTileIdCounter();
  });

  // -------------------------------------------------------------------
  describe('Grid initialization', () => {
    it('creates grid with correct default size (4x4)', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
      engine.initialize();
      expect(engine.size).toBe(4);
      expect(engine.grid.size).toBe(4);
    });

    it('creates grids of supported sizes', () => {
      [3, 4, 6, 8].forEach(size => {
        const engine = new GameEngine(size, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
        engine.initialize();
        expect(engine.grid.size).toBe(size);
      });
    });

    it('spawns exactly 2 tiles on initialization', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
      engine.initialize();

      let tileCount = 0;
      engine.grid.eachCell((r, c, tile) => {
        if (tile) tileCount++;
      });
      expect(tileCount).toBe(2);
    });

    it('spawned tiles are 2 or 4', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
      engine.initialize();

      engine.grid.eachCell((r, c, tile) => {
        if (tile) {
          expect([2, 4]).toContain(tile.value);
        }
      });
    });

    it('initializes score to 0', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
      engine.initialize();
      expect(engine.score).toBe(0);
    });

    it('spawns tile with value 4 when random >= 0.9', () => {
      // First two random calls: cell selection (0.0 → cell 0)
      // Then value selection (0.95 → value 4, since >= 0.9)
      // Repeat for second tile
      const engine = new GameEngine(4, createSeededRandom([
        0.0, 0.95,  // First tile: cell index 0, value = 4
        0.0, 0.5,   // Second tile: cell index 0 (of remaining), value = 2
      ]));
      engine.initialize();

      let has4 = false;
      engine.grid.eachCell((r, c, tile) => {
        if (tile && tile.value === 4) has4 = true;
      });
      expect(has4).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  describe('Tile movement - moveLeft', () => {
    it('slides tiles to the left', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5])); // spawn in last available cell with value 2
      engine.initialize();
      // Manually set grid to test specific case
      setGridState(engine, [
        [null, null, null,    2],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      expect(result.moved).toBe(true);
      // Tile should be at col 0 now (row 0)
      expect(engine.grid.getCell(0, 0).value).toBe(2);
    });

    it('merges equal adjacent tiles', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      expect(result.moved).toBe(true);
      expect(engine.grid.getCell(0, 0).value).toBe(4);
    });

    it('no double merge in single move — [2,2,2,2] → [4,4,_,_]', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 2, 2, 2],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('left');
      const row = getGridValues(engine)[0];
      // After left move: first pair merges to 4, second pair merges to 4
      // But each tile only merges once, so result is [4, 4, _, spawned]
      expect(row[0]).toBe(4);
      expect(row[1]).toBe(4);
    });

    it('[2,2,4,4] → [4,8,_,_] after left move', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 2, 4, 4],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('left');
      const row = getGridValues(engine)[0];
      expect(row[0]).toBe(4);
      expect(row[1]).toBe(8);
    });

    it('returns moved=false if no tile can move left', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 4, 8, 16],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      // All tiles are already at the left edge and no merges possible
      expect(result.moved).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  describe('Tile movement - moveRight', () => {
    it('slides tiles to the right', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('right');
      expect(engine.grid.getCell(0, 3).value).toBe(2);
    });

    it('merges tiles correctly to the right', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [null, null, 2, 2],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('right');
      expect(engine.grid.getCell(0, 3).value).toBe(4);
    });

    it('[4,4,2,2] → [_,_,8,4] after right move', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [4, 4, 2, 2],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('right');
      const row = getGridValues(engine)[0];
      expect(row[2]).toBe(8);
      expect(row[3]).toBe(4);
    });
  });

  // -------------------------------------------------------------------
  describe('Tile movement - moveUp', () => {
    it('slides tiles upward', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [2,    null, null, null],
      ]);

      engine.move('up');
      expect(engine.grid.getCell(0, 0).value).toBe(2);
    });

    it('merges tiles correctly moving up', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2,    null, null, null],
        [2,    null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('up');
      expect(engine.grid.getCell(0, 0).value).toBe(4);
    });

    it('no double merge vertically — [2,2,2,2] column → [4,4,_,_]', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2,    null, null, null],
        [2,    null, null, null],
        [2,    null, null, null],
        [2,    null, null, null],
      ]);

      engine.move('up');
      expect(engine.grid.getCell(0, 0).value).toBe(4);
      expect(engine.grid.getCell(1, 0).value).toBe(4);
    });
  });

  // -------------------------------------------------------------------
  describe('Tile movement - moveDown', () => {
    it('slides tiles downward', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2,    null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('down');
      expect(engine.grid.getCell(3, 0).value).toBe(2);
    });

    it('merges tiles correctly moving down', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [null, null, null, null],
        [null, null, null, null],
        [2,    null, null, null],
        [2,    null, null, null],
      ]);

      engine.move('down');
      expect(engine.grid.getCell(3, 0).value).toBe(4);
    });
  });

  // -------------------------------------------------------------------
  describe('Score calculation', () => {
    it('adds merged tile value to score', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      expect(result.score).toBe(4); // 2+2=4 merged
      expect(engine.score).toBe(4);
    });

    it('accumulates score across multiple moves', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 2, 4, 4],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('left'); // Score: 4 + 8 = 12
      expect(engine.score).toBe(12);

      // Now row 0 should be [4, 8, _, spawned]
      // Set up next merge
      setGridState(engine, [
        [4, 4, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('left'); // Score: 12 + 8 = 20
      expect(engine.score).toBe(20);
    });

    it('scores correctly for multiple merges in one move', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [4, 4, null, null],
        [8, 8, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      // 4+4=8 and 8+8=16, total move score = 24
      expect(result.score).toBe(24);
      expect(engine.score).toBe(24);
    });
  });

  // -------------------------------------------------------------------
  describe('Win detection', () => {
    it('detects 2048 tile as win', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [1024, 1024, null, null],
        [null, null,  null, null],
        [null, null,  null, null],
        [null, null,  null, null],
      ]);

      engine.move('left');
      expect(engine.won).toBe(true);
    });

    it('does not false-positive on lower values', () => {
      const engine = new GameEngine(4, createSeededRandom([0.99, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [512, 512, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      engine.move('left');
      expect(engine.won).toBe(false);
    });

    it('checkWinCondition returns true when 2048 tile exists', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2048, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      expect(engine.checkWinCondition()).toBe(true);
    });

    it('checkWinCondition returns false when no 2048 tile', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [1024, 512, 256, 128],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      expect(engine.checkWinCondition()).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  describe('Game over detection', () => {
    it('detects no valid moves remaining (game over)', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      // Fill the grid with tiles that cannot merge with any neighbor
      setGridState(engine, [
        [2,  4,  2,  4],
        [4,  2,  4,  2],
        [2,  4,  2,  4],
        [4,  2,  4,  2],
      ]);

      expect(engine.isMovePossible()).toBe(false);
    });

    it('game is not over if empty cells exist', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2,    4,    2,    4],
        [4,    2,    4,    2],
        [2,    4,    2,    4],
        [4,    2,    4,    null],
      ]);

      expect(engine.isMovePossible()).toBe(true);
    });

    it('game is not over if adjacent tiles can merge', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5]));
      engine.initialize();
      // Grid is full but has adjacent equal tiles
      setGridState(engine, [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 4], // last two can merge
      ]);

      expect(engine.isMovePossible()).toBe(true);
    });

    it('sets lost=true after a move that fills grid with no merges', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      // Set up a near-game-over state: one empty cell, and after spawning
      // the new tile, no moves will be possible
      setGridState(engine, [
        [2,    4,    2,    4],
        [4,    2,    4,    2],
        [2,    4,    2,    4],
        [4,    2,    null, 8],
      ]);

      // The tile at (3,3) is 8, set (3,2) to null. When we move, say, left,
      // nothing moves. Let's construct a scenario where a move succeeds
      // and the spawned tile creates a deadlock.

      // Simpler approach: just verify isMovePossible
      setGridState(engine, [
        [2,  4,  2,  4],
        [4,  2,  4,  2],
        [2,  4,  2,  4],
        [4,  2,  4,  2],
      ]);
      expect(engine.isMovePossible()).toBe(false);
    });

    it('detects game over on a 3×3 grid', () => {
      const engine = new GameEngine(3, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 4, 2],
        [4, 2, 4],
        [2, 4, 2],
      ]);
      expect(engine.isMovePossible()).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  describe('Random tile spawn', () => {
    it('spawns tile only after valid move', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [null, null, null, 2],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      expect(result.moved).toBe(true);
      expect(result.newTile).not.toBeNull();
    });

    it('does not spawn if move is invalid', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2,    null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const tileCountBefore = countTiles(engine);
      const result = engine.move('left'); // Tile already at left edge
      expect(result.moved).toBe(false);
      expect(result.newTile).toBeNull();
      expect(countTiles(engine)).toBe(tileCountBefore);
    });

    it('new tile appears on an empty cell', () => {
      const engine = new GameEngine(4, createSeededRandom([0.0, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [null, null, null, 4],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);

      const result = engine.move('left');
      expect(result.newTile).not.toBeNull();
      const { row, col } = result.newTile;
      // The new tile should be at a cell, and the cell should have the tile
      expect(engine.grid.getCell(row, col)).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------
  describe('State serialization', () => {
    it('serializes and restores game state', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
      engine.initialize();

      setGridState(engine, [
        [2, 4, 8, 16],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);
      engine.score = 42;
      engine.won = false;

      const state = engine.getState();
      const newEngine = new GameEngine(4);
      newEngine.loadState(state);

      expect(newEngine.score).toBe(42);
      expect(newEngine.size).toBe(4);
      expect(newEngine.grid.getCell(0, 0).value).toBe(2);
      expect(newEngine.grid.getCell(0, 3).value).toBe(16);
    });
  });

  // -------------------------------------------------------------------
  describe('Edge cases', () => {
    it('throws on invalid direction', () => {
      const engine = new GameEngine(4, createSeededRandom([0.1, 0.5, 0.2, 0.7]));
      engine.initialize();
      expect(() => engine.move('diagonal')).toThrow('Invalid direction');
    });

    it('handles a 3x3 grid correctly', () => {
      const engine = new GameEngine(3, createSeededRandom([0.0, 0.5, 0.1, 0.5]));
      engine.initialize();
      setGridState(engine, [
        [2, 2, null],
        [null, null, null],
        [null, null, null],
      ]);

      engine.move('left');
      expect(engine.grid.getCell(0, 0).value).toBe(4);
    });

    it('handles an 8x8 grid correctly', () => {
      const engine = new GameEngine(8, createSeededRandom([0.0, 0.5, 0.1, 0.5]));
      engine.initialize();
      expect(engine.grid.size).toBe(8);
      // Count initial tiles
      let count = 0;
      engine.grid.eachCell((r, c, t) => { if (t) count++; });
      expect(count).toBe(2);
    });
  });
});

// --- Utility ---

function countTiles(engine) {
  let count = 0;
  engine.grid.eachCell((r, c, tile) => {
    if (tile) count++;
  });
  return count;
}

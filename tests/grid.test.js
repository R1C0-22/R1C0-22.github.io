import { describe, it, expect, beforeEach } from '@jest/globals';
import { Grid } from '../src/engine/grid.js';
import { Tile } from '../src/engine/tile.js';
import { resetTileIdCounter } from '../src/engine/tile.js';

describe('Grid', () => {
  beforeEach(() => {
    resetTileIdCounter();
  });

  describe('Construction', () => {
    it('creates a grid of the correct size', () => {
      const grid = new Grid(4);
      expect(grid.size).toBe(4);
      expect(grid.cells.length).toBe(4);
      grid.cells.forEach(row => {
        expect(row.length).toBe(4);
      });
    });

    it('creates grids of different sizes', () => {
      [3, 4, 6, 8].forEach(size => {
        const grid = new Grid(size);
        expect(grid.size).toBe(size);
        expect(grid.cells.length).toBe(size);
        grid.cells.forEach(row => expect(row.length).toBe(size));
      });
    });

    it('initializes all cells to null', () => {
      const grid = new Grid(4);
      grid.eachCell((row, col, tile) => {
        expect(tile).toBeNull();
      });
    });
  });

  describe('Cell access', () => {
    it('sets and gets a cell', () => {
      const grid = new Grid(4);
      const tile = Tile.create(2, 1, 2);
      grid.setCell(1, 2, tile);
      expect(grid.getCell(1, 2)).toBe(tile);
      expect(grid.getCell(1, 2).value).toBe(2);
    });

    it('returns undefined for out-of-bounds access', () => {
      const grid = new Grid(4);
      expect(grid.getCell(-1, 0)).toBeUndefined();
      expect(grid.getCell(0, -1)).toBeUndefined();
      expect(grid.getCell(4, 0)).toBeUndefined();
      expect(grid.getCell(0, 4)).toBeUndefined();
    });

    it('returns null for empty cells', () => {
      const grid = new Grid(4);
      expect(grid.getCell(0, 0)).toBeNull();
    });
  });

  describe('Available cells', () => {
    it('reports all cells as available on empty grid', () => {
      const grid = new Grid(4);
      expect(grid.getAvailableCells().length).toBe(16);
    });

    it('excludes occupied cells', () => {
      const grid = new Grid(4);
      grid.setCell(0, 0, Tile.create(2, 0, 0));
      grid.setCell(1, 1, Tile.create(4, 1, 1));
      expect(grid.getAvailableCells().length).toBe(14);
    });

    it('reports no available cells when grid is full', () => {
      const grid = new Grid(3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.setCell(r, c, Tile.create(2, r, c));
        }
      }
      expect(grid.hasAvailableCells()).toBe(false);
    });

    it('hasAvailableCells returns true for partially filled grid', () => {
      const grid = new Grid(4);
      grid.setCell(0, 0, Tile.create(2, 0, 0));
      expect(grid.hasAvailableCells()).toBe(true);
    });
  });

  describe('Iteration', () => {
    it('eachCell visits every cell', () => {
      const grid = new Grid(3);
      let count = 0;
      grid.eachCell(() => count++);
      expect(count).toBe(9);
    });

    it('eachCell provides correct row, col, tile', () => {
      const grid = new Grid(2);
      const tile = Tile.create(8, 0, 1);
      grid.setCell(0, 1, tile);

      const visited = [];
      grid.eachCell((row, col, t) => {
        visited.push({ row, col, tile: t });
      });

      expect(visited.length).toBe(4);
      expect(visited[1].row).toBe(0);
      expect(visited[1].col).toBe(1);
      expect(visited[1].tile).toBe(tile);
    });
  });

  describe('Clone', () => {
    it('creates a deep copy', () => {
      const grid = new Grid(4);
      grid.setCell(0, 0, Tile.create(2, 0, 0));
      grid.setCell(2, 3, Tile.create(4, 2, 3));

      const clone = grid.clone();

      expect(clone.size).toBe(grid.size);
      expect(clone.getCell(0, 0).value).toBe(2);
      expect(clone.getCell(2, 3).value).toBe(4);

      // Modifying clone should not affect original
      clone.setCell(0, 0, null);
      expect(grid.getCell(0, 0).value).toBe(2);
    });
  });

  describe('Serialization', () => {
    it('serializes and deserializes correctly', () => {
      const grid = new Grid(4);
      grid.setCell(0, 0, Tile.create(2, 0, 0));
      grid.setCell(3, 3, Tile.create(16, 3, 3));

      const serialized = grid.serialize();
      const restored = Grid.deserialize(serialized);

      expect(restored.size).toBe(4);
      expect(restored.getCell(0, 0).value).toBe(2);
      expect(restored.getCell(3, 3).value).toBe(16);
      expect(restored.getCell(1, 1)).toBeNull();
    });
  });
});

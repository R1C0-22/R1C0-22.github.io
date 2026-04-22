import { Modal } from './components/modal.js';
import { Header } from './components/header.js';

/**
 * Tile color palette mapping value → CSS class suffix.
 * Higher values get more intense/distinct colors.
 */
const TILE_CLASSES = {
  2: 'tile-2',
  4: 'tile-4',
  8: 'tile-8',
  16: 'tile-16',
  32: 'tile-32',
  64: 'tile-64',
  128: 'tile-128',
  256: 'tile-256',
  512: 'tile-512',
  1024: 'tile-1024',
  2048: 'tile-2048',
};

const ANIMATION_DURATION = 150; // ms — matches CSS transition duration

/**
 * Renderer handles all DOM construction and updates for the 2048 game.
 * It receives pure data and translates it into visual representation.
 */
export class Renderer {
  /**
   * @param {HTMLElement} containerElement - The #app root element
   * @param {{ onRestart: function, onGridSizeChange: function(number) }} callbacks
   */
  constructor(containerElement, callbacks) {
    this.container = containerElement;
    this.callbacks = callbacks;
    this.tileElements = new Map(); // tile.id → DOM element

    this.build();
  }

  /** Build the top-level DOM structure. */
  build() {
    this.container.innerHTML = '';

    // Header
    this.header = new Header(this.container, {
      onRestart: this.callbacks.onRestart,
      onGridSizeChange: this.callbacks.onGridSizeChange,
    });

    // Grid wrapper
    this.gridWrapper = document.createElement('div');
    this.gridWrapper.className = 'grid-wrapper';
    this.gridWrapper.id = 'grid-wrapper';

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'grid-container';
    this.gridContainer.id = 'grid-container';

    // Background cells (static)
    this.gridBackground = document.createElement('div');
    this.gridBackground.className = 'grid-background';
    this.gridBackground.id = 'grid-background';

    // Tile layer (animated)
    this.tileLayer = document.createElement('div');
    this.tileLayer.className = 'tile-layer';
    this.tileLayer.id = 'tile-layer';

    this.gridContainer.appendChild(this.gridBackground);
    this.gridContainer.appendChild(this.tileLayer);
    this.gridWrapper.appendChild(this.gridContainer);
    this.container.appendChild(this.gridWrapper);

    // Modal
    this.modal = new Modal(this.gridWrapper);
  }

  /**
   * Set up the grid background cells and CSS grid sizing.
   * @param {number} size - Grid dimension
   */
  setupGrid(size) {
    this.currentSize = size;
    this.gridBackground.innerHTML = '';
    this.tileLayer.innerHTML = '';
    this.tileElements.clear();

    // Set CSS custom property for grid size
    this.gridContainer.style.setProperty('--grid-size', size);
    this.gridContainer.setAttribute('data-size', size);

    // Create background cells
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        this.gridBackground.appendChild(cell);
      }
    }

    // Update header grid size buttons
    this.header.updateActiveSize(size);
  }

  /**
   * Render the full grid state. Called after each move.
   * Uses tile IDs to track and animate individual tiles.
   * @param {import('../engine/grid.js').Grid} grid
   * @returns {Promise<void>} Resolves after animation completes
   */
  async renderGrid(grid) {
    const existingIds = new Set();
    const animationsNeeded = [];

    grid.eachCell((row, col, tile) => {
      if (!tile) return;
      existingIds.add(tile.id);

      let tileEl = this.tileElements.get(tile.id);

      if (tile.mergedFrom) {
        // This is a newly merged tile — remove the two source tiles,
        // create new element at merge position
        tile.mergedFrom.forEach(sourceTile => {
          const sourceEl = this.tileElements.get(sourceTile.id);
          if (sourceEl) {
            // Animate source to merge position before removing
            this.positionTile(sourceEl, row, col);
            const el = sourceEl;
            setTimeout(() => el.remove(), ANIMATION_DURATION);
            this.tileElements.delete(sourceTile.id);
          }
        });

        // Create the merged tile after the slide animation
        animationsNeeded.push(() => {
          tileEl = this.createTileElement(tile);
          tileEl.classList.add('tile-merged');
          this.positionTile(tileEl, row, col);
          this.tileLayer.appendChild(tileEl);
          this.tileElements.set(tile.id, tileEl);
        });

      } else if (!tileEl) {
        // New tile (spawned) — create with appear animation
        tileEl = this.createTileElement(tile);
        tileEl.classList.add('tile-new');
        this.positionTile(tileEl, row, col);
        this.tileLayer.appendChild(tileEl);
        this.tileElements.set(tile.id, tileEl);

      } else {
        // Existing tile — slide to new position
        this.updateTileElement(tileEl, tile);
        this.positionTile(tileEl, row, col);
      }
    });

    // Remove tiles no longer on the grid
    for (const [id, el] of this.tileElements) {
      if (!existingIds.has(id)) {
        el.remove();
        this.tileElements.delete(id);
      }
    }

    // Wait for slide animations, then add merged tiles
    if (animationsNeeded.length > 0) {
      await this.waitForAnimation();
      animationsNeeded.forEach(fn => fn());
    }

    // Wait for appear/merge animations
    await this.waitForAnimation();

    // Clean up animation classes
    this.tileLayer.querySelectorAll('.tile-new, .tile-merged').forEach(el => {
      el.classList.remove('tile-new', 'tile-merged');
    });

    return;
  }

  /**
   * Create a new tile DOM element.
   * @param {import('../engine/tile.js').Tile} tile
   * @returns {HTMLElement}
   */
  createTileElement(tile) {
    const el = document.createElement('div');
    el.className = `tile ${this.getTileClass(tile.value)}`;
    el.dataset.tileId = tile.id;

    const inner = document.createElement('div');
    inner.className = 'tile-inner';
    inner.textContent = tile.value;
    el.appendChild(inner);

    return el;
  }

  /**
   * Update an existing tile element's value and class.
   * @param {HTMLElement} el
   * @param {import('../engine/tile.js').Tile} tile
   */
  updateTileElement(el, tile) {
    // Update class
    el.className = `tile ${this.getTileClass(tile.value)}`;
    el.querySelector('.tile-inner').textContent = tile.value;
  }

  /**
   * Position a tile element on the grid using CSS custom properties.
   * @param {HTMLElement} el
   * @param {number} row
   * @param {number} col
   */
  positionTile(el, row, col) {
    el.style.setProperty('--tile-row', row);
    el.style.setProperty('--tile-col', col);
  }

  /**
   * Get the CSS class for a tile value.
   * @param {number} value
   * @returns {string}
   */
  getTileClass(value) {
    return TILE_CLASSES[value] || 'tile-super';
  }

  /**
   * Update the score display.
   * @param {number} score
   * @param {number} bestScore
   */
  renderScore(score, bestScore) {
    this.header.updateScores(score, bestScore);
  }

  /**
   * Show the win or game over modal.
   * @param {'win'|'gameover'} type
   * @param {{ score: number, onContinue?: function, onRestart: function }} data
   */
  showModal(type, data) {
    this.modal.show(type, data);
  }

  /** Hide any visible modal. */
  hideModal() {
    this.modal.hide();
  }

  /**
   * Get the grid wrapper element (used by InputController for drag events).
   * @returns {HTMLElement}
   */
  getGridElement() {
    return this.gridWrapper;
  }

  /**
   * Wait for CSS animations/transitions to complete.
   * @returns {Promise<void>}
   */
  waitForAnimation() {
    return new Promise(resolve => {
      setTimeout(resolve, ANIMATION_DURATION);
    });
  }
}

import { GameEngine } from './engine/gameEngine.js';
import { StateManager } from './state/stateManager.js';
import { Renderer } from './ui/renderer.js';
import { InputController } from './input/inputController.js';

/**
 * Main application orchestrator.
 * Wires together Engine, State, Renderer, and Input modules.
 */
class Game2048 {
  constructor() {
    this.engine = null;
    this.stateManager = new StateManager();
    this.renderer = null;
    this.inputController = null;
    this.isAnimating = false;

    this.initialize();
  }

  /** Set up the game and attempt to restore a saved session. */
  initialize() {
    const appContainer = document.getElementById('app');

    this.renderer = new Renderer(appContainer, {
      onRestart: () => this.restart(),
      onGridSizeChange: (size) => this.changeGridSize(size),
    });

    const savedState = this.stateManager.loadGameState();
    if (savedState) {
      this.restoreFromSave(savedState);
    } else {
      this.startNewGame(this.stateManager.getState().gridSize);
    }

    // Attach input to the grid area
    const gridElement = this.renderer.getGridElement();
    this.inputController = new InputController(gridElement, (direction) => {
      this.handleMove(direction);
    });
  }

  /**
   * Start a fresh game with the given grid size.
   * @param {number} size
   */
  startNewGame(size) {
    this.engine = new GameEngine(size);
    this.engine.initialize();

    this.stateManager.resetState(size);
    this.renderer.setupGrid(size);

    this.syncStateAndRender();
  }

  /**
   * Restore game from a saved state.
   * @param {Object} savedData
   */
  restoreFromSave(savedData) {
    const { engineState, gameStatus, hasWon } = savedData;

    this.engine = new GameEngine(engineState.size);
    this.engine.loadState(engineState);

    this.stateManager.setState({
      gridSize: engineState.size,
      score: engineState.score,
      gameStatus,
      hasWon: hasWon || false,
    });

    this.renderer.setupGrid(engineState.size);
    this.syncStateAndRender();

    // Re-show modal if game was in a terminal state
    if (gameStatus === 'lost') {
      this.renderer.showModal('gameover', {
        score: engineState.score,
        onRestart: () => this.restart(),
      });
    }
  }

  /**
   * Handle a directional move from the input controller.
   * @param {'up'|'down'|'left'|'right'} direction
   */
  async handleMove(direction) {
    if (this.isAnimating) return;

    const state = this.stateManager.getState();
    if (state.gameStatus === 'lost') return;
    // Allow moves if won but continuing
    if (state.gameStatus === 'won' && !state.hasWon) return;

    this.isAnimating = true;
    if (this.inputController) this.inputController.lock();

    const result = this.engine.move(direction);

    if (result.moved) {
      // Update state
      this.stateManager.setState({ score: this.engine.score });

      // Render with animations
      await this.renderer.renderGrid(this.engine.grid);

      // Check win condition (only show once)
      if (this.engine.won && !this.stateManager.getState().hasWon) {
        this.stateManager.setState({ gameStatus: 'won' });
        this.renderer.showModal('win', {
          score: this.engine.score,
          onContinue: () => {
            this.stateManager.setState({ hasWon: true, gameStatus: 'playing' });
            this.persistState();
          },
          onRestart: () => this.restart(),
        });
      }

      // Check loss condition
      if (this.engine.lost) {
        this.stateManager.setState({ gameStatus: 'lost' });
        this.renderer.showModal('gameover', {
          score: this.engine.score,
          onRestart: () => this.restart(),
        });
      }

      // Update score display
      const currentState = this.stateManager.getState();
      this.renderer.renderScore(currentState.score, currentState.bestScore);

      // Persist after each move
      this.persistState();
    }

    this.isAnimating = false;
    if (this.inputController) this.inputController.unlock();
  }

  /** Restart game with current grid size. */
  restart() {
    this.renderer.hideModal();
    this.startNewGame(this.stateManager.getState().gridSize);
  }

  /**
   * Change grid size and start a new game.
   * @param {number} size
   */
  changeGridSize(size) {
    this.renderer.hideModal();
    this.startNewGame(size);
  }

  /** Sync state manager with engine and render current state. */
  syncStateAndRender() {
    const state = this.stateManager.getState();
    this.renderer.renderScore(state.score, state.bestScore);
    this.renderer.renderGrid(this.engine.grid);
    this.persistState();
  }

  /** Save current game state to localStorage. */
  persistState() {
    this.stateManager.saveGameState(this.engine.getState());
  }
}

// Boot the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game2048();
});

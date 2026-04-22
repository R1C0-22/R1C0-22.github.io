/**
 * StateManager handles centralized game state and persistence via localStorage.
 * Implements an observer pattern so the UI can react to state changes.
 */

const STORAGE_KEY_BEST_SCORE = '2048-best-score';
const STORAGE_KEY_GAME_STATE = '2048-game-state';

export class StateManager {
  constructor() {
    this.state = {
      grid: null,
      score: 0,
      bestScore: 0,
      gameStatus: 'playing', // 'playing' | 'won' | 'lost'
      gridSize: 4,
      hasWon: false, // Tracks if player dismissed the win modal to continue
    };

    this.listeners = [];
    this.loadBestScore();
  }

  /**
   * Get a shallow copy of the current state.
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Merge partial updates into the state and notify listeners.
   * @param {Object} partial - Properties to update
   */
  setState(partial) {
    this.state = { ...this.state, ...partial };

    // Auto-update best score
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      this.saveBestScore();
    }

    this.notifyListeners();
  }

  /**
   * Register a listener to be called on state changes.
   * @param {function(Object): void} listener
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** Notify all subscribed listeners with a copy of the current state. */
  notifyListeners() {
    const stateCopy = this.getState();
    this.listeners.forEach(listener => listener(stateCopy));
  }

  /**
   * Reset state for a new game at the given grid size.
   * @param {number} gridSize
   */
  resetState(gridSize) {
    this.state = {
      ...this.state,
      grid: null,
      score: 0,
      gameStatus: 'playing',
      gridSize,
      hasWon: false,
    };
    this.clearSavedGameState();
    this.notifyListeners();
  }

  // --- localStorage persistence ---

  saveBestScore() {
    try {
      localStorage.setItem(STORAGE_KEY_BEST_SCORE, String(this.state.bestScore));
    } catch {
      // localStorage may be unavailable (private browsing, etc.)
    }
  }

  loadBestScore() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BEST_SCORE);
      if (stored !== null) {
        this.state.bestScore = parseInt(stored, 10) || 0;
      }
    } catch {
      // Fail silently
    }
  }

  /**
   * Persist the full game state for session recovery.
   * @param {Object} engineState - Serialized state from GameEngine.getState()
   */
  saveGameState(engineState) {
    try {
      const data = {
        engineState,
        bestScore: this.state.bestScore,
        gameStatus: this.state.gameStatus,
        hasWon: this.state.hasWon,
      };
      localStorage.setItem(STORAGE_KEY_GAME_STATE, JSON.stringify(data));
    } catch {
      // Fail silently
    }
  }

  /**
   * Load a previously saved game state.
   * @returns {Object|null} The saved state, or null if none exists.
   */
  loadGameState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GAME_STATE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Clear saved game state from localStorage. */
  clearSavedGameState() {
    try {
      localStorage.removeItem(STORAGE_KEY_GAME_STATE);
    } catch {
      // Fail silently
    }
  }
}

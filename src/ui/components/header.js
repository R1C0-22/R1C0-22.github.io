/**
 * Header component containing title, scores, grid size selector, and restart button.
 */

const SUPPORTED_GRID_SIZES = [3, 4, 6, 8];

export class Header {
  /**
   * @param {HTMLElement} container - Parent element to append header to
   * @param {{ onRestart: function, onGridSizeChange: function(number) }} callbacks
   */
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.elements = {};
    this.build();
  }

  /** Build the header DOM structure. */
  build() {
    const header = document.createElement('div');
    header.className = 'game-header';
    header.id = 'game-header';

    // Title section
    const titleSection = document.createElement('div');
    titleSection.className = 'header-title-section';

    const title = document.createElement('h1');
    title.className = 'game-title';
    title.id = 'game-title';
    title.textContent = '2048';

    const subtitle = document.createElement('p');
    subtitle.className = 'game-subtitle';
    subtitle.textContent = 'Join the tiles, get to 2048!';

    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);

    // Scores section (top-right)
    const scoresSection = document.createElement('div');
    scoresSection.className = 'header-scores-section';

    const scoreBox = this.createScoreBox('SCORE', 'current-score', '0');
    const bestScoreBox = this.createScoreBox('BEST', 'best-score', '0');

    scoresSection.appendChild(scoreBox);
    scoresSection.appendChild(bestScoreBox);

    // Controls section
    const controlsSection = document.createElement('div');
    controlsSection.className = 'header-controls';

    // Grid size selector
    const sizeSelector = document.createElement('div');
    sizeSelector.className = 'size-selector';
    sizeSelector.id = 'size-selector';

    const sizeLabel = document.createElement('span');
    sizeLabel.className = 'size-label';
    sizeLabel.textContent = 'Grid:';
    sizeSelector.appendChild(sizeLabel);

    SUPPORTED_GRID_SIZES.forEach(size => {
      const button = document.createElement('button');
      button.className = 'size-btn';
      button.id = `size-btn-${size}`;
      button.textContent = `${size}×${size}`;
      button.dataset.size = size;
      button.addEventListener('click', () => {
        this.callbacks.onGridSizeChange(size);
      });
      sizeSelector.appendChild(button);
    });

    // Restart button
    const restartButton = document.createElement('button');
    restartButton.className = 'restart-btn';
    restartButton.id = 'restart-btn';
    restartButton.textContent = '↻ New Game';
    restartButton.addEventListener('click', () => {
      this.callbacks.onRestart();
    });

    controlsSection.appendChild(sizeSelector);
    controlsSection.appendChild(restartButton);

    // Top row: title + scores
    const topRow = document.createElement('div');
    topRow.className = 'header-top-row';
    topRow.appendChild(titleSection);
    topRow.appendChild(scoresSection);

    header.appendChild(topRow);
    header.appendChild(controlsSection);
    this.container.appendChild(header);

    this.elements.header = header;
  }

  /**
   * Create a score display box.
   * @param {string} label
   * @param {string} id
   * @param {string} initialValue
   * @returns {HTMLElement}
   */
  createScoreBox(label, id, initialValue) {
    const box = document.createElement('div');
    box.className = 'score-box';

    const labelEl = document.createElement('div');
    labelEl.className = 'score-box-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'score-box-value';
    valueEl.id = id;
    valueEl.textContent = initialValue;

    this.elements[id] = valueEl;

    box.appendChild(labelEl);
    box.appendChild(valueEl);
    return box;
  }

  /**
   * Update displayed score values.
   * @param {number} score
   * @param {number} bestScore
   */
  updateScores(score, bestScore) {
    this.elements['current-score'].textContent = score;
    this.elements['best-score'].textContent = bestScore;
  }

  /**
   * Update the active state of grid size buttons.
   * @param {number} activeSize
   */
  updateActiveSize(activeSize) {
    const buttons = this.container.querySelectorAll('.size-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.size) === activeSize);
    });
  }
}

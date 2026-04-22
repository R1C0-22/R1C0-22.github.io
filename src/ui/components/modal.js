/**
 * Modal component for Win and Game Over overlays.
 * Creates and manages modal DOM elements independently.
 */
export class Modal {
  /**
   * @param {HTMLElement} container - Parent element to append the modal to
   */
  constructor(container) {
    this.container = container;
    this.overlay = null;
    this.build();
  }

  /** Build the modal DOM structure. */
  build() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.id = 'game-modal-overlay';

    this.content = document.createElement('div');
    this.content.className = 'modal-content';

    this.title = document.createElement('h2');
    this.title.className = 'modal-title';
    this.title.id = 'modal-title';

    this.message = document.createElement('p');
    this.message.className = 'modal-message';
    this.message.id = 'modal-message';

    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'modal-buttons';

    this.content.appendChild(this.title);
    this.content.appendChild(this.message);
    this.content.appendChild(this.buttonContainer);
    this.overlay.appendChild(this.content);
    this.container.appendChild(this.overlay);
  }

  /**
   * Show the modal with the given configuration.
   * @param {'win'|'gameover'} type
   * @param {{ onContinue?: function, onRestart: function, score: number }} callbacks
   */
  show(type, callbacks) {
    this.buttonContainer.innerHTML = '';

    if (type === 'win') {
      this.title.textContent = '🎉 You Win!';
      this.message.textContent = `You reached 2048! Score: ${callbacks.score}`;
      this.overlay.classList.add('active', 'modal-win');
      this.overlay.classList.remove('modal-gameover');

      const continueButton = this.createButton('Keep Going', 'modal-btn-continue', () => {
        this.hide();
        if (callbacks.onContinue) callbacks.onContinue();
      });

      const restartButton = this.createButton('New Game', 'modal-btn-restart', () => {
        this.hide();
        callbacks.onRestart();
      });

      this.buttonContainer.appendChild(continueButton);
      this.buttonContainer.appendChild(restartButton);
    } else {
      this.title.textContent = 'Game Over';
      this.message.textContent = `Final Score: ${callbacks.score}`;
      this.overlay.classList.add('active', 'modal-gameover');
      this.overlay.classList.remove('modal-win');

      const restartButton = this.createButton('Try Again', 'modal-btn-restart', () => {
        this.hide();
        callbacks.onRestart();
      });

      this.buttonContainer.appendChild(restartButton);
    }
  }

  /** Hide the modal. */
  hide() {
    this.overlay.classList.remove('active', 'modal-win', 'modal-gameover');
  }

  /**
   * Create a styled button element.
   * @param {string} text
   * @param {string} id
   * @param {function} onClick
   * @returns {HTMLButtonElement}
   */
  createButton(text, id, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'modal-btn';
    button.id = id;
    button.addEventListener('click', onClick);
    return button;
  }
}

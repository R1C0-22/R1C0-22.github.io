/**
 * InputController handles keyboard and mouse/touch drag input.
 * Translates raw input events into directional move callbacks.
 * Supports locking during animations to prevent input flooding.
 */

const DRAG_THRESHOLD = 30; // Minimum drag distance in pixels to register a swipe

export class InputController {
  /**
   * @param {HTMLElement} element - The game container element for mouse/touch events
   * @param {function(string): void} onMove - Callback invoked with direction string
   */
  constructor(element, onMove) {
    this.element = element;
    this.onMove = onMove;
    this.locked = false;

    // Drag state
    this.dragStartX = null;
    this.dragStartY = null;
    this.isDragging = false;

    // Bound handlers for cleanup
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);

    this.attachListeners();
  }

  /** Attach all event listeners. */
  attachListeners() {
    document.addEventListener('keydown', this.boundKeyHandler);
    this.element.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
    this.element.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.element.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    this.element.addEventListener('touchmove', this.boundTouchMove, { passive: false });
  }

  /** Remove all event listeners. */
  destroy() {
    document.removeEventListener('keydown', this.boundKeyHandler);
    this.element.removeEventListener('mousedown', this.boundMouseDown);
    document.removeEventListener('mouseup', this.boundMouseUp);
    this.element.removeEventListener('touchstart', this.boundTouchStart);
    this.element.removeEventListener('touchend', this.boundTouchEnd);
    this.element.removeEventListener('touchmove', this.boundTouchMove);
  }

  /** Prevent input from being processed (during animations). */
  lock() {
    this.locked = true;
  }

  /** Re-enable input processing. */
  unlock() {
    this.locked = false;
  }

  /**
   * Handle keyboard arrow key presses.
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (this.locked) return;

    const keyDirectionMap = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };

    const direction = keyDirectionMap[event.key];
    if (direction) {
      event.preventDefault();
      this.onMove(direction);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  handleMouseDown(event) {
    if (this.locked) return;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.isDragging = true;
  }

  /**
   * @param {MouseEvent} event
   */
  handleMouseUp(event) {
    if (!this.isDragging || this.locked) {
      this.isDragging = false;
      return;
    }
    this.isDragging = false;
    this.processDragEnd(event.clientX, event.clientY);
  }

  /**
   * @param {TouchEvent} event
   */
  handleTouchStart(event) {
    if (this.locked) return;
    if (event.touches.length !== 1) return;
    event.preventDefault();
    this.dragStartX = event.touches[0].clientX;
    this.dragStartY = event.touches[0].clientY;
    this.isDragging = true;
  }

  /**
   * Prevent scrolling while dragging on the game area.
   * @param {TouchEvent} event
   */
  handleTouchMove(event) {
    if (this.isDragging) {
      event.preventDefault();
    }
  }

  /**
   * @param {TouchEvent} event
   */
  handleTouchEnd(event) {
    if (!this.isDragging || this.locked) {
      this.isDragging = false;
      return;
    }
    this.isDragging = false;
    const touch = event.changedTouches[0];
    this.processDragEnd(touch.clientX, touch.clientY);
  }

  /**
   * Convert drag vector into a cardinal direction and fire the move callback.
   * @param {number} endX
   * @param {number} endY
   */
  processDragEnd(endX, endY) {
    const deltaX = endX - this.dragStartX;
    const deltaY = endY - this.dragStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Must exceed minimum threshold
    if (Math.max(absDeltaX, absDeltaY) < DRAG_THRESHOLD) return;

    let direction;
    if (absDeltaX > absDeltaY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    this.onMove(direction);
  }
}

import { observe } from "selector-observer";

export default class DomObserver {
  #selector;
  #observer = null;

  constructor(selector) {
    this.#selector = selector;
  }

  get isObserving() {
    return this.#observer !== null;
  }

  start(onAddElement, onRemoveElement, onInitializeElement) {
    if (this.isObserving) {
      return;
    }

    this.#observer = observe(this.#selector, {
      add: onAddElement,
      remove: onRemoveElement,
      initialize: onInitializeElement,
    });
  }

  stop() {
    if (!this.isObserving) {
      return;
    }

    this.#observer.abort();
    this.#observer = null;
  }
}

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

  start(onAddElement, onRemoveElement) {
    if (this.isObserving) {
      return;
    }

    this.#observer = observe(this.#selector, {
      add: onAddElement,
      remove: onRemoveElement,
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

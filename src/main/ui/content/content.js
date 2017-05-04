import {emit} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";


// ------------------------------------------------
// ---- CONTENT CORE ----------------
// ------------------------

export default (function Content () {
  // Create UI element.
  const element = createElement('div');

  const updateElement = (event) => {
    const root = event.target.closest('div[data-type=content] > div[data-type]');
    root && element.dispatchEvent(emit('update.element', { ref: root }));
  }

  element.addEventListener('blur', updateElement, true);

  // Replace old content with new one.
  const set = (content) => {
    content.classList.add('content');
    if (!element.firstElementChild) element.appendChild(content);
    else element.replaceChild(content, element.firstElementChild);
    // Dispatch update event.
    element.dispatchEvent(emit('changed'));
  };

  // Get Content pure content
  const pull = () => element.firstElementChild;

  // Public API.
  return { element, set, pull };
}());

import {emit, date} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./outliner.scss');

// Component scaffold
const scaffold = `
  div.cnxb-outliner >
    h4 > "Outline"
    @list
`;


// ------------------------------------------------
// ---- OUTLINER CORE ----------------
// ------------------------

export default (function Outliner () {

  // UI references.
  const refs = { list: createElement('div') }

  // Create UI element.
  const element = template(refs, scaffold);

  // Run user action.
  const detectAction = (event) => {
    const link = event.target.dataset.link;
    link && element.dispatchEvent(emit('scroll.content', { id: link }));
  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  // Update outliner UI.
  const update = (contentElement) => {
    refs.list.innerHTML = "";
    Array.from(contentElement.firstElementChild.children).forEach((child) => {
      const text = child.textContent.slice(0, 40);
      refs.list.appendChild(createElement(`div.cnxb-outliner-item[data-link="${child.id}"]`, text));
    });
  };

  // Update single element.
  const updateElement = (section) => {
    const item = element.querySelector(`div.cnxb-outliner-item[data-link="${section.id}"]`);
    if (!item) return;
    item.innerHTML = section.textContent.slice(0, 40);
  };

  // Public API.
  return { element, update, updateElement };
}());

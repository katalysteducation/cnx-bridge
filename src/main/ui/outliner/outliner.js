import {emit, date, Memo} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./outliner.scss');

// Component scaffold
const scaffold = `
  div.cnxb-outliner >
    h4 > "Outline"
    div.cnxb-empty > "Outliner is still in develop"
`;


// ------------------------------------------------
// ---- OUTLINER CORE ----------------
// ------------------------

export default (function History () {
  // Create UI element.
  const element = template(scaffold);

  // Run user action.
  const detectAction = (event) => {

  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  // Public API.
  return { element };
}());

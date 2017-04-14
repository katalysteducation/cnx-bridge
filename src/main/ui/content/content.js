import {emit, arrayToObject} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";


// ------------------------------------------------
// ---- CONTENT CORE ----------------
// ------------------------

export default (function Content () {
  // Create UI element.
  const element = createElement('div.content');

  // Replace old content with new one.
  const append = (content) => {
    content.classList.add('content');    
    element.parentNode.replaceChild(content, element);
  };

  // Public API.
  return { element, append };
}());

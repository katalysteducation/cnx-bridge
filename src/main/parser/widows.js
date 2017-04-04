import {uid} from "../../utilities/tools";
import {createElement} from "../../utilities/travrs";

// ---- WIDOWS HELPERS ----------------

// Check if node is not empty one.
const isNotEmpty = (node) =>  !!((node.textContent.trim().length > 0) || (node.tagName && node.tagName === 'BR'));


// --------------------------------------------
// ---- WIDOWS EXPORT ----------------
// ------------------------

// Walk through the Editable tree assigning paths and wraps widowed-text with editable wrapper.
// If 'labels' set to true, then fn. will add labels for the elements.
export default function findWidows (node, labels = false, path = '') {
  // Ensude parent have ID. !!Except <tbody> & <tgroup> ID in this el. braks Legacy Edit-In-Place display.
  if (!node.id && node.dataset.type !== 'tbody' && node.dataset.type !== 'tgroup') node.id = uid();

  // Go through all children.
  Array.from(node.childNodes).forEach(child => {
    // Target only ediatbles.
    if (child.tagName === 'P' && child.isContentEditable) {
      // Assiggn origin path.

      // Wrap widowed text with quote-wrapper container.
      if (node.children.length > 1) {
        const wrappWidow = createElement(`div[data-type="quote" type="wrapp" display="inline"]`);
        wrappWidow.id = uid();
        child.dataset.path = path.slice(0,-1) + '.quote';
        child.dataset.pid = wrappWidow.id;
        node.insertBefore(wrappWidow, child);
        wrappWidow.appendChild(child);
      }
      else {
        child.dataset.path = path.slice(0,-1);
        child.dataset.pid = node.id;
      }
    }

    // If element is <DIV> dig deeper into the structure.
    else if (child.tagName === 'DIV') {
      findWidows(child, labels, path + child.dataset.type + '.');

      if (labels) console.log('Add label');
    }
  });
};

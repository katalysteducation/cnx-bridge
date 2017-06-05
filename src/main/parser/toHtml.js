import modifiers from "./modifiers";
import {createElement} from "../../utilities/travrs";
import {copyAttrs, uid} from "../../utilities/tools";

// ---- Helpers ----------------

const isInline = (node) => inliners.some(selector => node.matches && node.matches(selector));
const isTextNode = (node) => node.nodeName === '#text';
const isOnlyChild = (node) => node.parentNode.children.length === 1;
// Detect <terms> displayes as block elements
const isBlockTerm = (term) =>
  !term.previousSibling && term.nextSibling && term.nextSibling.tagName ||
  !term.nextSibling && term.previousSibling && term.previousSibling.tagName ||
  term.previousSibling && term.previousSibling.tagName === 'term' && term.nextSibling && term.nextSibling.tagName === 'term';

// Make <DIV> clone of passed XML node. If deep === true make a deep copy.
const cloneElement = (node, deep = false) => {
  if (!node) return;
  else if (node.tagName) {
    const clone = createElement(`div[data-type="${node.tagName}"]`);
    copyAttrs(node, clone);
    if (deep) clone.innerHTML = node.innerHTML;
    return clone;
  }
};

// Create new Editable container.
const newEditable = (content) => createElement('p[data-target="editable" contenteditable="true"]');

// Wrap Editable container with quote-wrapper.
const wrapp = (editable) => {
  const id = uid();
  const div = createElement(`div[id="${id}" data-type="quote" type="wrapp" display="inline"]`);
  editable.dataset.pid = id;
  div.appendChild(editable);
  return div;
};

// ---- TOHTML Core ----------------

// Define inline node selectors.
const inliners = ['math', 'quote[type=comment]', 'img', 'newline', 'emphasis', 'term[inline=true]', 'sub', 'sup', 'footnote', 'reference'];

// Convert XML tree into HTML Editable tree.
const convert = (node, parent, modifier) => {
  node = node.firstChild;
  let editable = newEditable();

  // Iterate through all child nodes.
  while(node) {

    // Modifi node if required.
    let current = modifier(node);

    // Allow to skip nodes if current === undefined.
    if (current && !current.skipNode) {
      // Clone text & inline elements.
      if (isInline(current) || isTextNode(current)) {
        editable.appendChild(current.cloneNode(true));
      }
      // For block elements.
      else {
        // If editable has children append it to the parent a go further.
        if (editable.hasChildNodes()) {
          parent.appendChild(wrapp(editable));
          editable = newEditable();
        }
        // Clone deep element.
        // console.log(current); // Debug.
        const clone = cloneElement(current);
        parent.appendChild(clone);
        // Go deeper.
        convert(current, clone, modifier);
      }
      // Go to next sibling node.
      node = current.nextSibling;
    }
    else if (current.skipNode) {
      // Make deep clone of the current node.
      const clone = cloneElement(current, true);
      parent.appendChild(clone);
      // Go to next sibling node.
      node = current.nextSibling;
    }
    // When node was skipped.
    else node = node.nextSibling;
  }

  // Append editables.
  if (editable.hasChildNodes()) {
    // Ensude parent have ID. !!Except <tbody> & <tgroup> ID in this el. braks Legacy Edit-In-Place display.
    if (!parent.id && parent.dataset.type !== 'tbody' && parent.dataset.type !== 'tgroup') parent.id = uid();
    // Append new editable.
    if (!parent.hasChildNodes()) {
      editable.dataset.pid = parent.id;
      parent.appendChild(editable);
    }
    // Wrap editable in wrapper-quote if it is not only element.
    else parent.appendChild(wrapp(editable));
  }

  // Return result node.
  return parent;
};


// --------------------------------------------
// ---- TO HTML ----------------
// ------------------------

export default function toHtml (cnxml) {

  cnxml = cnxml
    // Remove newline chatacters.
    .replace(/\n/g, '')
    // Remove multiple spaces.
    .replace(/  +/g, ' ')
    // Remove spaces netween tags.
    .replace(/(>\s+?<)/g, '><')
    // Remove MathML namespace.
    .replace(/<(\/?)m:|\s*xmlns(:m)?\s*="[\s\S\w]+?"/g, (match, slash) => ~match.indexOf('<') ? ('<' + slash) : '');

  // Instantiate XML parser.
  const parser = new DOMParser();
  const xml = parser.parseFromString(cnxml, "application/xml");

  // Detect inline <term>s. In some cases e.g. <deffinition> , <seeaslo>, etc. <terms>
  // are used more like a block element and they are part of an internal strucctre.
  // Those cases need to be distinguish from regular inline applications.
  Array.from(xml.querySelectorAll('term')).forEach(term => !isBlockTerm(term) && term.setAttribute('inline', true));
  // Remove all empty labels.
  Array.from(xml.querySelectorAll('label')).forEach(label => label.childNodes.length === 0 && label.parentNode.removeChild(label));

  // Convret XML to DOM & return HTML Editable Tree Structure.
  return convert(xml, createElement('div'), modifiers);
};

import {copyAttrs, uid} from "../../utilities/tools";
import {createElement} from "../../utilities/travrs";

// ---- Helpers ----------------

const isInline = (node) => inliners.some(selector => node.matches && node.matches(selector));
const isTextNode = (node) => node.nodeName === '#text' && node.data.trim().length > 0;
const isOnlyChild = (node) => node.parentNode.children.length === 1;
// Detect <terms> displayes as block elements
const isBlockTerm = (term) =>
  !term.previousSibling && term.nextSibling && term.nextSibling.tagName ||
  !term.nextSibling && term.previousSibling && term.previousSibling.tagName ||
  term.previousSibling.tagName === 'term' && term.nextSibling.tagName === 'term';

const cloneElement = (node) => {
  if (!node) return;
  else if (node.tagName) {
    const clone = createElement('div');
    clone.dataset.type = node.tagName;
    copyAttrs(node, clone);
    return clone;
  }
};

const newEditable = (content) => {
  const editable = createElement('p');
  editable.dataset.target = 'editable';
  editable.setAttribute('contenteditable', true);
  return editable;
};

const wrapp = (editable) => {
  const div = createElement('div');
  const id = uid();
  div.id = id;
  div.dataset.type = 'quote';
  div.setAttribute('type', 'wrapp');
  div.setAttribute('display', 'inline');
  div.appendChild(editable);
  editable.dataset.pid = id;
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
    if (current) {
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
        const clone = cloneElement(current);
        parent.appendChild(clone);
        // Go deeper.
        convert(current, clone, modifier);
      }
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

// ---- Modifiers ------------------

// Custom parsing methods for the differend types of elements.
// NOTE: If modifier returns 'null' OR 'undefined' then the node is removed/skipped.
const modifiers = (node) => {

  // Chenge <link>s into <reference> elements.
  if (node.tagName === 'link') {
    const reference = createElement('reference', node.innerHTML.length > 0 ? node.innerHTML : node.getAttribute('target-id'));
    copyAttrs(node, reference);
    node.parentNode.replaceChild(reference, node);
    return reference;
  }

  // Chenge <image>s into <img> elements.
  if (node.tagName === 'image') {
    const img = createElement('img');
    copyAttrs(node, img);
    node.parentNode.replaceChild(img, node);
    return img;
  }

  // Remove empty labels.
  if (node.tagName === 'label' && node.textContent.length === 0) return;

  // Default return (do not modify element).
  return node;
};

// --------------------------------------------
// ---- TO HTML ----------------
// ------------------------

export default function toHtml (cnxml) {

  cnxml = cnxml
    // Remove retuns chatacters and multiple spaces.
    .replace(/(\n)|(\s{2,})/g,'')
    // Remove MathML namespace.
    .replace(/<(\/?)m:|\s*xmlns(:m)?\s*="[\s\S\w]+?"/g, (match, slash) => ~match.indexOf('<') ? ('<' + slash) : '');

  // Instantiate XML parser.
  const parser = new DOMParser();
  const xml = parser.parseFromString(cnxml, "application/xml");

  // Detect inline <term>s. In some cases e.g. <deffinition> , <seeaslo>, etc. <terms>
  // are used more like a block element and they are part of an internal strucctre.
  // Those cases need to be distinguish from regular inline applications.
  Array.from(xml.querySelectorAll('term')).forEach(term => !isBlockTerm(term) && term.setAttribute('inline', true));

  // Convret XML to DOM & return HTML Editable Tree Structure.
  return convert(xml, createElement('div'), modifiers);
};

import {createElement} from "../../utilities/travrs";
import {moveNodes, copyAttrs} from "../../utilities/tools";

// ---- Modifiers ------------------

// Custom parsing methods for the different types of elements.
// NOTE: If modifier returns 'null' OR 'undefined' then the node is REMOVED.
// NOTE: If node has property `skipNode` set to 'true' it'll force the parser
//       to skip this node from deep parsing and clone its content as it is.
// NOTE: If node has property `disableNode` set to 'true' it'll set contenteditable
//       of parent editable node to 'false'.

export default function modifiers (node) {

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
    img.disableNode = true;
    return img;
  }

  // Remove comments.
  if (node.nodeType === 8) return;

  // Skip Equations.
  if (node.tagName === 'equation') {
    node.skipNode = true;
    node.appendChild(moveNodes(node, createElement('p[data-target="editable"]')));
    return node;
  }

  // Default return (do not modify element).
  return node;
};

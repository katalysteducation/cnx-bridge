import {diffHTML} from "./jsdiff";
import {createElement} from "../../utilities/travrs";
import {moveNodes, wrapElement, b64EncodeUnicode} from "../../utilities/tools";


// ---- DIFF-NODES HELPERS ----------------

// Convert array od HTMLElements to object with 'pid' as a key;
const domToMap = (array) =>
  array.reduce((result, element, index) => {
    const id = element.dataset.pid;
    // element.dataset.order = index;
    result[id] = element;
    return result;
  }, {});

// Compare two array and return 'same', 'added' and 'removed' elements.
const arrayCompare = (arrayA, arrayB) => {
  const added = arrayB.filter(el => !~arrayA.indexOf(el));
  const removed =arrayA.filter(el => !~arrayB.indexOf(el));
  const same = arrayA.concat(arrayB).filter(el => !~added.indexOf(el) && !~removed.indexOf(el));
  return { same, added, removed };
};

// Move node from one tree to another acording to provided 'path'.
const tansferNode = (node, path) => {
  const [element, index] = path.pop();
  const currentNode = node.children[index];

  // If current node is different than current path element paste the element in this place.
  if (currentNode && currentNode.id !== element.id) {
    currentNode.parentNode.insertBefore(element.cloneNode(true), currentNode);
  }
  // If node was removed replace it with it instance if somehow existi in the tree.
  else if (path.length === 1 && currentNode.id === element.id && !currentNode.isEqualNode(element))
    currentNode.parentNode.replaceChild(element.cloneNode(true), currentNode);
  // Else search deeper.
  else if (path.length > 0)
    tansferNode(currentNode, path);
};

// Add removed nodes to
const addRemoved = (node, container) => {
  const path = [];
  const del = createElement('del[data-select="true" data-skip-merge="true"]');
  moveNodes(node, del);
  node.appendChild(del);

  // Collect elements up to the root node.
  while (node.id !== 'root') {
    path.push([node, Array.from(node.parentNode.children).indexOf(node)]);
    node = node.parentNode;
  }
  tansferNode(container, path);
};

// Distinguish MathJax MATH from other nodes.
const getNodeContent = (node) => {
  let content = node.outerHTML;
  if (node.matches('span.cnxb-math'))
    content = node.querySelector('script').textContent;
  return content;
};

// Replace inline nodes with base64Hash.
const hashNode = (hashTable) => (node) => {
  const content = getNodeContent(node);
  const key = `%#${b64EncodeUnicode(content)}#%`;
  const marker = document.createTextNode(key);
  const parent = node.parentNode;
  if (!hashTable[key]) hashTable[key] = content;
  parent.insertBefore(marker, node);
  parent.removeChild(node);
};


// --------------------------------------------
// ---- DIFF-NODES CORE ------------
// ------------------------

export default function diffNodes (oldSectionA, sectionB) {

    // Get copy to not destron oryginal.
    const sectionA = oldSectionA.cloneNode(true);
    // Set breakpoint id.
    sectionA.id = 'root';

    // Create storage for inline nodes/math.
    const complexNodes = {};
    const hash = hashNode(complexNodes);

    // Get all editable nodes from both versions.
    const editablesA = domToMap(Array.from(sectionA.querySelectorAll('p[data-target=editable]')));
    const editablesB = domToMap(Array.from(sectionB.querySelectorAll('p[data-target=editable]')));

    // Get element ids diff -> less computing than parsing tree.
    const { same, added, removed } = arrayCompare(Object.keys(editablesA), Object.keys(editablesB));

    // console.log(same, added, removed ); // Debug.

    // Create output tree.
    const output = sectionB.cloneNode(true);
    const outputIds = domToMap(Array.from(output.querySelectorAll('p[data-target=editable]')));

    // Compare same nodes.
    same.forEach(id => {
      // Pull out non-text nodes and replace them with ID markers.
      Array.from(editablesA[id].children).forEach(hash);
      Array.from(editablesB[id].children).forEach(hash);
      // Replace hashes with nodes.
      outputIds[id].innerHTML = diffHTML(editablesA[id].innerHTML, editablesB[id].innerHTML).replace(/%#([\w\S\s]+?)#%/g, (match) => complexNodes[match]);
    });

    // Handle added & remnoved nodes.
    added.forEach(id => {
      // wrapElement(outputIds[id], 'ins', { "data-skip-merge" : true })
      const ins = createElement('ins[data-select="true" data-skip-merge="true"]');
      moveNodes(outputIds[id], ins);
      outputIds[id].appendChild(ins);
    });

    removed.forEach(id => addRemoved(editablesA[id], output));

    // Return new Editable tree.
    return output;
  };

import {unique} from "shorthash";
import diff_match_patch from "./dmp";
import {moveNodes} from "../../utilities/tools";
import {createElement} from "../../utilities/travrs";


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
  const del = createElement('del[data-select="true" contenteditable="false"]');
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
  if (node.matches('span.cnxb-math')) content = node.querySelector('script').textContent;
  return content;
};

// Replace inline nodes with base64Hash.
const hashNode = (hashTable) => (node) => {
  const content = getNodeContent(node);
  const key = `${unique(content)}`;
  const marker = document.createTextNode(key);
  const parent = node.parentNode;
  if (!hashTable[key]) hashTable[key] = content;
  parent.insertBefore(marker, node);
  parent.removeChild(node);
};

// Clean container from comments.
const cleanCopy = (container, removeComments = false) => {
  const clone = container.cloneNode(true);
  removeComments
    ? Array.from(clone.querySelectorAll('quote[type=comment]')).forEach(comment => comment.outerHTML = comment.innerHTML)
    : Array.from(clone.querySelectorAll('quote[type=comment]')).forEach(comment => comment.outerHTML = `!#${comment.id}#!${comment.innerHTML}`);
  return clone;
};


// Create comparator instance.
const dmp = new diff_match_patch();


// --------------------------------------------
// ---- DIFF-NODES CORE ------------
// ------------------------

export default function diffNodes (oldSectionA, newSectionB) {

  if (!oldSectionA instanceof HTMLElement || !newSectionB instanceof HTMLElement) throw "diff(A,B) params need to be HTMLElements";

  // Get copy to not destron oryginal.
  const sectionA = cleanCopy(oldSectionA, true);
  const sectionB = cleanCopy(newSectionB);

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

    // Compare contents.
    const diff = dmp.main(editablesA[id].innerHTML, editablesB[id].innerHTML);

    // Apply Semantic Cleanup.
    dmp.cleanupSemantic(diff);

    // Compile diffed HTML.
    outputIds[id].innerHTML = Object.keys(complexNodes)
      // Compare contents (dmp) + restore 'complexNodes'.
      .reduce((html, key) => html.replace(key, complexNodes[key]), dmp.html(diff))
      // Replace commnet ids with commnet-markers <cm/>
      .replace(/!#([A-Za-z0-9-_\.]+?)#!/g, (a, match) => `<cm data-cid="${match}"></cm>`);
  });

  // Handle added nodes.
  added.forEach(id => {
    const ins = createElement('ins[data-select="true" contenteditable="false"]');
    moveNodes(outputIds[id], ins);
    outputIds[id].appendChild(ins);
  });

  // Handle remnoved nodes.
  removed.forEach(id => addRemoved(editablesA[id], output));

  // Return new Editable tree.
  return output.firstElementChild;
};

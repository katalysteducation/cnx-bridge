import {getNodesOut} from "../../utilities/tools";

// ---- MERGE TOOLS ----------------

// Allow to merge two dom elements if they are siblings with the same type.
/*
export const mergeSameSiblings = (list) =>
  list.reduce((result, node) => {
    const index = result.length - 1;
    // Skip different siblings elements & those with 'data-skip-merge' attribute
    if (result[index] && !result[index].dataset.skipMerge && node.tagName === result[index].tagName && result[index] === node.previousSibling) {
      result[index].innerHTML += node.innerHTML;
      node.parentNode.removeChild(node);
    }
    else {
      result.push(node);
    }

    return result;
  },[]);
*/

// Chek if node is onlu child.
const isOnlyChild = (node) => !node.nextElementSibling && !node.prevElementSibling;

// Determine if nod can be removed.
const isNodeToRemove = (node) => node.childNodes.length === 0 || node.tagName === 'DEL' || node.tagName === 'INS';

// Remove tree branch.
const removeFromTree = (node) => {
  const parent = node.parentNode;
  if (parent && isNodeToRemove(node)) {
    parent.removeChild(node);
    removeFromTree(parent);
  }
};

// Reject changes in node.
export const rejectChange = (node) => {
  if (node.tagName === "INS")
    isNodeToRemove(node) ? removeFromTree(node) : node.parentNode.removeChild(node);
  else if (node.tagName === "DEL") {
    getNodesOut(node);
    node.parentNode.removeChild(node);
  }
};

// Accept changes in node.
export const acceptChange = (node) => {
  if (node.tagName === "DEL")
    isNodeToRemove(node) ? removeFromTree(node) : node.parentNode.removeChild(node);
  else if (node.tagName === "INS") {
    getNodesOut(node);
    node.parentNode.removeChild(node);
  }
};

// Reject all changes in diffs array (only if diff atteched to the DOM tree).
export const rejectAllChanges = (diffs) => {
  diffs && diffs.forEach(diff => diff.parentNode && rejectChange(diff));
}

// Accept all changes in diffs array.
export const acceptAllChanges = (diffs) => {
  diffs && diffs.forEach(diff => diff.parentNode && acceptChange(diff));
}

import {cutString} from "../../utilities/tools";
import {acceptChange, rejectChange, acceptAllChanges, rejectAllChanges} from "./merge";

// --------------------------------------------
// ---- DIFF-COMMENTS CORE ------------
// ------------------------

/* Comments helpers for diff module. */


// Create new comment model from comment HTML element.
const commentModel = (comments) => (comment) => {
  // Creare model.
  const model = {
    id: comment.id,
    ct: comment.innerHTML,
    len: comment.innerHTML.length,
    start: comment.parentNode.innerHTML.indexOf(comment.outerHTML)
  };
  // Add comment model if it doesn't exist.
  !comments.has(comment.id) && comments.set(comment.id, model);
  // Return model just in case.
  return model;
};

// Get comment from the container.
export const commentsToModel = (container) => {
  const comments = new Map();
  const newModel = commentModel(comments);
  // Apply newest comments.
  Array.from(container.querySelectorAll('quote[type=comment]')).forEach(newModel);
  // Merged list of comments.
  return comments;
};

// Restore comments from the newest version.
const markersToComments = (output, comments) => {
  Array.from(output.querySelectorAll('cm')).reverse().forEach(cm => {
    const model = comments.get(cm.dataset.cid);
    const html = output.innerHTML;
    const outer = cm.outerHTML;
    const cutStart = html.indexOf(cm.outerHTML) + outer.length;
    const cutEnd = cutStart + model.len;
    const content = html.substring(cutStart, cutStart + model.len);
    output.innerHTML = cutString(html, cutStart, cutEnd).replace(outer, `<quote type="comment" display="inline" id="${model.id}">${content}</quote> `);
  });
};

// Detect only those diff tags which have one comment-marker.
const onlyCommnetsLeft = (content) =>
  content.every(diff => diff.childNodes.length === 1 && diff.firstChild.tagName && diff.firstChild.tagName === 'CM');


// ---- Api Methods ----------------

// Clean container from comments.
export const cleanCopy = (container, removeComments = false) => {
  const clone = container.cloneNode(true);
  removeComments
    ? Array.from(clone.querySelectorAll('quote[type=comment]')).forEach(comment => comment.outerHTML = comment.innerHTML)
    : Array.from(clone.querySelectorAll('quote[type=comment]')).forEach(comment => comment.outerHTML = `!#${comment.id}#!${comment.innerHTML}`);
  return clone;
};


// Restore comments from 'commentsContainer' in 'outputContainer'.
// export const restoreComments = (outputContainer, commentsContainer) => {
//   // Grab all diff tags.
//   const allDiffs = Array.from(outputContainer.querySelectorAll('del, ins'));
//   // If no container.
//   if (allDiffs.length === 0) markersToComments(outputContainer, commentsContainer);
//   // Else if no diffs text with content, only thoser with cm inside.
//   else if (onlyCommnetsLeft(allDiffs))
//     confirm("There are some comments related to this content. Would you like to keep them?") === true
//       // Restore comments.
//       ? (acceptAllChanges(allDiffs), markersToComments(outputContainer, commentsContainer))
//       // Discard comments.
//       : rejectAllChanges(allDiffs);
//   // If there are still diffs with text content.
//   else alert("Żeby sfinalizowac trzeba rozwiązac wszystkie konflikty w sekcji: Diff");
// };


/**
 * HOF fn. which return fn. can be called each time diff tag is removed from the 'container'. This allow to
 * check whether merge operation have ended, and then restore commnets. It should be instantiated fore each
 * time new Content is set.
 *
 * @param  {HTMLElement} container Element that contains diff tags: <del>, <ins>.
 * @param  {Object}      model     Comments model with all data about comment & its positioning.
 * @return {function}              Function that can be call to check if all conflicts were resolved.
 */
export const watchMerge = (container, model) => {
  let diffs = Array.from(container.querySelectorAll('del, ins'));
  return () => {
    // Remove detached diffs.
    diffs = diffs.filter(diff => diff.parentNode);
    // If no container.
    if (diffs.length === 0) markersToComments(container, model);
    // Else if no diffs text with content, only thoser with cm inside.
    else if (onlyCommnetsLeft(diffs))
      confirm("There are some comments related to this content. Would you like to keep them?") === true
        // Restore comments.
        ? (acceptAllChanges(diffs), markersToComments(container, model))
        // Discard comments.
        : rejectAllChanges(diffs);
    // If there are still diffs with text content - do nothing.
  };
};
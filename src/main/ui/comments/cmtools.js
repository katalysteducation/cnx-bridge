import {createElement} from "../../../utilities/travrs";
import {cutString, mergeTextNodes} from "../../../utilities/tools";

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
export const markersToComments = (output, comments) => {
  Array.from(output.querySelectorAll('cm')).reverse().forEach(cm => {
    const model = comments.get(cm.id);
    const range = document.createRange();
    const quote = createElement(`quote[type="comment" display="inline" id="${model.id}"]`);
    range.setStartAfter(cm);
    if (cm.nextSibling.textContent.length <= model.len) mergeTextNodes(cm.nextSibling);
    range.setEnd(cm.nextSibling, model.len);
    range.surroundContents(quote);
    cm.parentNode.removeChild(cm);
  });
};

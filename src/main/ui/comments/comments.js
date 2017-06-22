import {commentEl, responseEl} from "./templates";
import {commentsToModel, markersToComments} from "./cmtools";
import {template, createElement} from "../../../utilities/travrs";
import {emit, date, Memo, arrayCompare} from "../../../utilities/tools";
require('./comments.scss');

// Component scaffold
const scaffold = `
  div.cnxb-comments >
    h4 > "Comments"
`;

// ------------------------------------------------
// ---- COMMENTS CORE ----------------
// ------------------------

export default (function Comments () {
  // const element = createElement('div.cnxb-comments');
  const element = template(scaffold);
  const commentsList = new Map();
  const userData = {};
  let commentsModel;

  // Create empty placeholder.
  let empty = element.appendChild(createElement('div.cnxb-empty', 'No comments for this revision'));
  element.appendChild(empty);

  /**
   * Add/Remove 'active' class to selected/deselected element.
   * @type {Memo}
   */
  const active = new Memo((current, active) => {
    if (active) active.classList.remove('active');
    if (active !== current) {
      active = current;
      active.classList.add('active');
    }
    else {
      active.classList.remove('active');
      active = undefined;
    }
    return active;
  });

  const append = (comment) => {
    if (empty.parentNode) element.removeChild(empty);
    element.appendChild(comment);
    return comment;
  };


  /**
   * Run action according to user's choice.
   * @param  {Event}  event Click event.
   */
  const detectAction = (event) => {
    const {response, cancel, close, scroll} = event.target.dataset;

    // Close comment and remove it from display.
    if (close) {
      const comment = event.target.closest('div.cnxb-comment');
      setTimeout(() => {
        comment.classList.add('remove');
        element.dispatchEvent(emit('remove', { id: close }));
        setTimeout(() => {
          commentsList.delete(close);
          element.removeChild(comment);
          if (commentsList.size === 0) element.appendChild(empty);
        }, 300);
      }, 500);
      return;
    }

    // Send event for scrolling content to the comment position & select active comment.
    else if (scroll) {
      element.dispatchEvent(emit('scroll.content', { id: scroll }));
      select(scroll);
    }

    // Add new response.
    if (response) {
      const input = event.target.parentNode.firstElementChild;
      // Quit if no input data.
      if (input.value.length === 0) return;
      // Create comment data.
      const data = {
        ...userData,
        date:date(true),
        note: input.value
      };
      input.value = '';
      commentsList.get(response).model.responses.push(data);
      element.querySelector(`div[data-comment-id="${response}"] div.cnxb-comment-responses`).appendChild(responseEl(data));
    }
    // Clear input.
    else if (cancel) {
      event.target.parentNode.firstElementChild.value = '';
    }
  };

  // Set event listener.
  element.addEventListener('click', detectAction);


  // ---- API METHODS ----------------

  /**
   * Set user's data required to populate comment DB schema.
   * @param  {String} user   User name.
   * @param  {String} avatar User selected color.
   */
  const user = ({user, avatar}) => {
    userData.user = user;
    userData.avatar = avatar;
  };


  /**
   * Add new comment to the current scope.
   * @param {String} id      Commnet ID.
   * @param {String} content Commnet's content.
   */
  const add = (id, content) => {
    const model = {
      id,
      ...userData,
      responses: [],
      note: content,
      date: date(true)
    };
    if (commentsList.has(id)) throw "Duplicated comment ID";
    commentsList.set(id, { model, ref: append(commentEl(model)) });
  };


  /**
   * Get list of commnets for current scope, matches Bridge Archive DB structure.
   * @return {Array} List of comments.
   */
  const pull = () =>
    Array.from(commentsList.values()).map(comment => comment.model);


  /**
   * Select Coment by its ID, and set it active.
   * @param  {String} id   Comment ID.
   * @return {HTMLElement} Reference to the comment node.
   */
  const select = (id) => {
    const comment = element.querySelector(`div[data-comment-id="${id}"]`);
    if (!comment) return;
    active(comment);
    return comment;
  };


  /**
   * Set commnet for current revision.
   * @param {Array} comments List of comment in revision.
   * @return {Map}           Map with comments in current scope.
   */
  const set = (comments) => {
    commentsList.clear();
    element.innerHTML = '';
    // Display empty placeholder.
    if (comments.length === 0) element.appendChild(empty);
    // Update current scope's commentsList.
    return comments.reduce((result, comment) => {
      !commentsList.has(comment.id) && result.set(comment.id, { model: comment, ref: append(commentEl(comment)) });      
      return result;
    }, commentsList);
  };


  /**
   * Create searching function to detect which Comments from 'contentElement' are available in last revisoin.
   * @param  {HTMLElement} contentElement Content element
   * @return {function}   Function that takes all revisoins, slice latest and detect commnets.
   */
  const find = (contentElement) => (revisoins) => {
    if (!Array.isArray(revisoins)) revisoins = [revisoins];
    // Get last revision.
    const lastRevision = revisoins.slice(0,1)[0];
    // Exit if no revision.
    if (!lastRevision) return;
    // Detect comments in content.
    const ids = Array.from(contentElement.querySelectorAll('quote[type=comment]')).map((comment) => comment.id);
    // Repalce only existing comments.
    set(lastRevision.comments.filter((comment) => ~ids.indexOf(comment.id)));
  };

  /**
   * Check if comments in 'container' matches those in 'commentsList' and remove missmatches.
   * @param  {HTMLElement} container Reference to the element with comments.
   */
  const unify = (container) => {
    const {added, removed} = arrayCompare (
      Array.from(commentsList.keys()),
      Array.from(container.querySelectorAll('quote[type=comment]')).map(comment => comment.id)
    );

    // IDs missing in content -> remove from the 'commentsList'.
    removed.forEach(id => {
      const comment = commentsList.get(id);
      comment.ref.parentNode.removeChild(comment.ref);
      commentsList.delete(id);
    });

    // IDs missing in comments -> remove from the 'container'.
    added.forEach(id => {
      const ref = container.querySelector(`quote[id="${id}"]`);
      ref.parentNode.removeChild(ref);
    });
  };

  /**
   * Restotres comments after merge operation.
   * @param  {HTMLElement} container Containert where comments shpuld be restored.
   */
  const restore = (container) => (markersToComments(container, commentsModel), unify(container));


  /**
   * Create commnets model for the source DOM tree.
   * @param  {HTMLElement} container Reference to the element containing commnets tags (quote[type=comment]).
   */
  const model = (container) => commentsModel = commentsToModel(container);


  // Pubic API.
  return {
    // Reference to the UI element.
    element,
    // Set user's data.
    user,
    // Display only those commnets that match current content.
    find,
    // Set comments for current revision.
    set,
    // Add new commnet to current scope.
    add,
    // Get all commnets from current scope.
    pull,
    // Find and set 'active' class to the comment with given ID.
    select,
    // Restore commenst after merge.
    restore,
    // Create commnets model for current content.
    model,
    // Compare Content coments with 'commentsModel' and remove missmatches.
    unify
  };
}());

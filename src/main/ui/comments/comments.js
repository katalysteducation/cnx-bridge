import {commentEl, responseEl} from "./templates";
import {emit, date, Memo} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
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

  // Create empty placeholder.
  let empty = element.appendChild(createElement('div.cnxb-empty', 'No comments for this revision'));
  element.appendChild(empty);

  // Active elements' toggler.
  const active = new Memo((current, active) => {
    if (active) active.classList.remove('active');
    active = current;
    active.classList.add('active');
    return active;
  });

  const append = (comment) => {
    if (empty.parentNode) element.removeChild(empty);
    element.appendChild(comment);
    return comment;
  };

  // Detect user's action.
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

  // Set user data.
  const user = ({user, avatar}) => {
    userData.user = user;
    userData.avatar = avatar;
  };

  // Add new comment.
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

  // Get all comments.
  const pull = () => Array.from(commentsList.values()).map(comment => comment.model);

  // Select Coment by its id, and set it active.
  const select = (id) =>
    active(element.querySelector(`div[data-comment-id="${id}"]`));

  // Add comment from list to the display.
  const fill = (list = []) => {
    const final = list.reduce((result, comment) => {
      if (!commentsList.has(comment.id)) result.set(comment.id, { model: comment, ref: append(commentEl(comment)) });
      return result;
    }, commentsList);    
    if (list.length === 0) element.appendChild(empty);
    return final;
  }

  // Remove comments presents on the 'list'.
  const remove = (list) => {
    list.forEach(id => {
      const comment = commentsList.get(id);
      if (comment) {
        comment.parentNode.removeChild(comment.ref);
        commentsList.delete(id);
      }
    });
  };

  // Replace existing comments with new list.
  const replace = (list) => {
    commentsList.clear();
    element.innerHTML = '';
    return fill(list);
  };

  // Pubic API.
  return { element, user, add, pull, fill, remove, replace, select };
}());

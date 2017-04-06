import {commentEl, responseEl} from "./comment";
import {emit, date, Memo} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./comments.scss');


export default (function Comments () {
  const element = createElement('div.cnxb-comments');
  const commentsList = new Map();
  const userData = {};

  // Active elements' toggler.
  const active = new Memo((current, active) => {
    if (active) active.classList.remove('active');
    active = current;
    active.classList.add('active');
    return active;
  });

  // Detect user's action.
  const detectAction = (event) => {
    const {response, cancel, close} = event.target.dataset;

    // Close comment and remove it from display.
    if (close) {
      const comment = event.target.closest('div.cnxb-comment');
      setTimeout(() => {
        comment.classList.add('remove');
        element.dispatchEvent(emit('remove', {id: close}));
        setTimeout(() => {
          commentsList.delete(close);
          element.removeChild(comment);
        }, 300);
      }, 500);
      return;
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
      commentsList.get(response).responses.push(data);
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
     const data = {
        id,
        ...userData,
        note: content,
        responses: [],
        date: date(true),
      };
    if (commentsList.has(id)) throw "Duplicated comment ID";
    commentsList.set(id, data);
    element.appendChild(commentEl(data));
  };

  // Get all comments.
  const pull = () => Array.from(commentsList.values());

  // Select Coment by its id, and set it active.
  const select = (id) =>
    active(element.querySelector(`div[data-comment-id="${id}"]`));

  // Fill commnets from current revision.
  const fill = (list) =>
    list.reduce((result, comment) => {
      result.set(comment.id, comment);
      element.appendChild(commentEl(comment));
      return result;
    }, commentsList);

  // Pubic API.
  return { element, user, add, pull, fill, select };
}());

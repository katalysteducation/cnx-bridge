import {emit} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./messenger.scss');

// Message template.
const newMessage = (id, type, message, acceptName, cancelName) => {
  const accept = acceptName ? `button.accept[data-accept="${id}"] > "${acceptName}"` : '';
  const cancel = cancelName ? `button.accept[data-cancel="${id}"] > "${cancelName}"` : '';
  return `
  div#${id}.cnxb__messenger-panel.${type}${(message.length < 34) ? '.short' : ''}
    div.cnxb__messenger-icon
      i.material-icons > "info_outline"
    div.cnxb__messenger-content
      div.cnxb__messenger-message > "${message}"
      div.cnxb__messenger-buttons
        ${accept}
        ${cancel}
`;};


// ------------------------------------------------
// ---- MESSENGER CORE ----------------
// ------------------------


// Messages manager.
// USAGE:
// Messenger[.info, .warn, .success, .error]('Message String', callback(accepted), 'Accept', 'Cancel');
// NOTE:
// In order to get access to the callback function you need to specify second argument as a callback function
// with at least third argument which is the name of the ACCEPT button. Fourth argument is the name of the
// CENCEL button. Callback function will be called with accept argument set to TRUE or FALSE depends on clicked button.
export default (function Messenger () {
  // Create UI element.
  const element = createElement('div.cnxb__messenger');

  // Messages counter.
  let counter = 0;

  // Callbacks container.
  const callbacks = new Map();

  // Detect user action.
  const detectAction = (event) => {
    const {accept, cancel} = event.target.dataset;
    if (!accept && !cancel) return;
    const id = accept || cancel;
    callbacks.get(id)(!!accept);
    callbacks.delete(id);
    hide(event.target.closest('#' + id), 0);
  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // Hide single message.
  const hide = (message, delay = 3000) => {
    setTimeout(() => {
      message.classList.remove('show');
      setTimeout(() => {
        // element.removeChild(message);
        // message = null;
      }, 500)
    }, delay);
    return true;
  };

  // Show single message.
  const show = (type) => (message, callback, acceptName, cancelName) => {
    const id = ('cnxb-msg-' + counter++);
    let brick = template(newMessage(id, type, message, acceptName, cancelName));

    // Append new message to the UI element.
    if(element.firstElementChild) element.insertBefore(brick, element.firstElementChild);
    else element.appendChild(brick);

    // Delay for the animation enter - forces aniation when element is added to the page.
    setTimeout(() => {
      brick.classList.add('show');
      // If no buttons display message for 3s.
      if (!acceptName && !cancelName) hide(brick);
      // Register callback.
      else if (callback && !callbacks.has(id)) callbacks.set(id, callback);
    }, 50);
  };

  // ---- API METHODS ----------------

  const info = show('info');
  const warn = show('warn');
  const error = show('error');
  const success = show('success');

  // Public API.
  return { element, info, warn, error, success };
}());

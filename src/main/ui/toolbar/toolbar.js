import {emit, humanizeDate} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";

require('./toolbar.scss');

const scaffold = `
  div.cnxb-toolbar >
    @label
    @buttons`;

const buttonScaffols = `
  div.cnxb-merge-btns >
    button.accept[title="Accept all changes" data-action="accept"] > "Accept All"
    button.reject[title="Reject all changes" data-action="reject"] > "Reject All"`;

// ------------------------------------------------
// ---- TOOLBAR CORE ----------------
// ------------------------

export default (function Toolbar () {

  // Toolbox API.
  const API = {};

  // UI References.
  const refs = {
    label: createElement('div.cnxb-toolbar-prompter', 'Legacy content'),
    buttons: template(buttonScaffols)
  };

  // Create UI element.
  const element = template(refs, scaffold);
  API.element = element;

  // Detect click action.
  const clickHandle = (event) => {
    const {action} = event.target.dataset;
    action && element.dispatchEvent(emit('revision', { action }));
  };

  // Set Toolbar label.
  API.label = (title, ctv, cpv) => {
    const part1 = `<span>${title}</span>`;
    const part2 = ctv ? ` <span class="cnxb-label" title="Content version">${humanizeDate(ctv)}</span>` : '';
    const part3 = cpv ? ` ⇌ <span class="cnxb-label" title="Compare verion">${humanizeDate(cpv)}</span>` : '';
    refs.label.innerHTML = part1 + part2 + part3;
    return API;
  };

  // Show/Hide Revision toolbar.
  API.revision = (flag = true) => {
    flag ? refs.buttons.classList.add('active') : refs.buttons.classList.remove('active');
    return API;
  };

  // Add listeners.
  element.addEventListener('click', clickHandle);

  // Public API.
  return API;
}());

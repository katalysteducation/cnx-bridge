import { emit } from "../../../utilities/tools";
import { template, createElement } from "../../../utilities/travrs";

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

  const refs = {
    label: createElement('div.cnxb-toolbar-prompter', 'Legacy content'),
    buttons: template(buttonScaffols)
  };

  const element = template(refs, scaffold);

  const clickHandle = (event) => {
    const {action} = event.target.dataset;
    action && element.dispatchEvent(emit('revision', { action }));
  };

  const revision = (flag = true) => {
    flag ? refs.buttons.classList.add('active') : refs.buttons.classList.remove('active')
  };

  const label = (html) => {
    refs.label.innerHTML = html;
  };

  element.addEventListener('click', clickHandle);

  return { element, revision, label };
}());

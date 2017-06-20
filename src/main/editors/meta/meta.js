import { elFromString, uid } from "../../../utilities/tools";
import { template, createElement } from "../../../utilities/travrs";

require('./meta.scss');

// Editor template.
const scaffold = `
  div.cnxb-meta-editor >
    div.cnxb-meta-editor-content >
      @header
      @content
      div.cnxb-meta-editor-buttons >
        button.accept[data-save="true"] > "Save"
        button[data-close="true"] > "Cancel"
`;


// ---- META EDITOR MAIN ----------------
//
export default (function MetaEditor (pubsub) {

  // UI References.
  const refs = {
    header: createElement('h3.cnxb-meta-editor-header', "Meta description"),
    content: createElement('textarea.cnxb-meta-editor-input')
  };

  // Global state.
  const state = { target: undefined };

  const getTarget = (element) =>
    element.matches('img') ? element.closest('div[data-type=media]') : element.closest('div[data-type=table]');

  const setMetaTag = (target, value) =>
    target.matches('div[data-type=media]') ? target.setAttribute('alt', value) : target.matches('div[data-type=table]') ? target.setAttribute('summary', value) : undefined;

  const getMetaTag = (target) =>
    target.matches('div[data-type=media]') ? target.getAttribute('alt') : target.matches('div[data-type=table]') ? target.getAttribute('summary') : undefined;

  // Handle user actions.
  const detectAction = ({target}) => {
    if (target.dataset.close) {
      element.classList.remove('show');
      state.target = null;
    }
    else if (target.dataset.save) {
      setMetaTag(state.target, refs.content.value);
      element.classList.remove('show');
    }
  };

  // UI Root element.
  const element = template(refs, scaffold);
  element.addEventListener('click', detectAction);

  // Open editoior.
  const open = (target) => {
    element.classList.add('show');
    state.target = getTarget(target);
    refs.content.value = getMetaTag(state.target);
  };

  return { element, open };
})();

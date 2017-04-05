import { getNodesOut } from "../../../utilities/tools";
import { accepChange, rejectChange } from "../../diff/merge";
import { template, createElement } from "../../../utilities/travrs";
require('./mergeeditor.scss');

const scaffold = `
  div.cnxb-ieditor >
    button.cnxb-merge-editor__accept[title="Accept change" data-action="accept"]
      i.material-icons > "check"
    button.cnxb-merge-editor__accept[title="Reject change" data-action="reject"]
      i.material-icons > "close"
`;


export default function MergeEditor (pubsub) {

  // Reference to selected Math element.
  let _target;

  // Detect user action.
  const detectAction = (event) => {
    const {action} = event.target.dataset;
    // Fail if no data.
    if (!action || !_target) return;
    // Run selected action.
    action === 'accept' ? accepChange(_target) : rejectChange(_target);
    // Dismiss popup.
    pubsub.publish('editor.dismiss');
  };

  // Main UI element.
  const element = template(scaffold);
  // Attach cick event.
  element.addEventListener('click', detectAction);

  // API Method.
  const select = (element, range, target) => {
    _target = target;
  };

  // Publi API.
  return { element, select };
};

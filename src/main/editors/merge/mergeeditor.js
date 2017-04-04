import { getNodesOut } from "../../../utilities/tools";
import { accepChange, rejectChange } from "../../diff/merge.js";
import { template, createElement } from "../../../utilities/travrs";
require('./mergeeditor.scss');

const scaffold = `
  div.cnxb-ieditor >
    button.cnxb-merge-editor__accept[title="Accept change" data-action="accept"]
      i.material-icons > "check"
    button.cnxb-merge-editor__accept[title="Reject change" data-action="reject"]
      i.material-icons > "close"
`;


export default function MergeEditor () {
  
  // Reference to selected Math element.
  let _target;

  // Detect user action.
  const detectAction = (event) => {
    const {action} = event.target.dataset;
    if (!action || !_target) return;

    if (action === 'accept') accepChange(_target);
    else if (action === 'reject') rejectChange(_target);
  };


  // UI Root element.
  const element = template(scaffold);
  element.addEventListener('click', detectAction);

  // API Method.
  const select = (element, range, target) => {
    _target = target;
  };

  return { element, select };
};

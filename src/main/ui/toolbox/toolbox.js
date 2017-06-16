import {emit} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";

// Panels scaffold.
const scaffold = `
  div >
    button.active[title="Outliner" data-action="content" data-index="0"]
      i.material-icons > "reorder"
    button[title="Revision" data-action="revision" data-index="1"]
      i.material-icons > "remove_red_eye"
    button[title="History" data-action="history" data-index="2"]
      i.material-icons > "history"
    button[title="Comments" data-action="refs" data-index="3"]
      i.material-icons > "chat"
    button[title="Metadata" data-action="refs" data-index="4"]
      i.material-icons > "code"
`;

// ------------------------------------------------
// ---- TOOLBOX CORE ----------------
// ------------------------

export default (function Toolbox (...panels) {
  const element = template(scaffold);
  let active = element.querySelector('button');

  // Handle menu actions.
  const clickHandle = (event) => {
    if (event.target === active) return;

    const {action, index} = event.target.dataset;
    if (event.target.dataset.action) {
      if (active) active.classList.remove('active');
      active = event.target;
      active.classList.add('active');
      element.dispatchEvent(emit('switch-tab', { tab: action, index: index }));
    }
  };

  // Hide buttons with given IDs.
  const disableIndex = (...ids) => {
    Array.from(element.querySelectorAll('button')).forEach(button => {
      if (~ids.indexOf(parseInt(button.dataset.index))) button.style.display = 'none';
    });
  };

  // Add click listener.
  element.addEventListener('click', clickHandle);

  // Public API.
  return { element, disableIndex }
}());

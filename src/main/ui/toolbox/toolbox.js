import { emit } from "../../../utilities/tools";
import { template, createElement } from "../../../utilities/travrs";

/*
div >
  button.active[title="Content" data-action="content" data-index="0"]
    i.material-icons > "reorder"
  button[title="Index" data-action="index" data-index="1"]
    i.material-icons > "assignment"
  button[title="References" data-action="refs" data-index="3"]
      i.material-icons > "navigation"
  button[title="Lates Review" data-action="commnets" data-index="5"]
    i.material-icons > "rate_review"
  button[title="Comments" data-action="refs" data-index="3"]
    i.material-icons > "chat"
  button[title="Reviews History" data-action="history" data-index="4"]
    i.material-icons > "history"
*/

const scaffold = `
  div >
    button[title="Lates Revision" data-action="revision" data-index="1"]
      i.material-icons > "rate_review"
`;

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
  const disable = (...ids) => {
    Array.from(element.querySelectorAll('button')).forEach(button => {
      if (~ids.indexOf(parseInt(button.dataset.index))) button.classList.add('disable');
    });
  };

  // Add click listener.
  element.addEventListener('click', clickHandle);

  // Public API.
  return { element, disable }
}());

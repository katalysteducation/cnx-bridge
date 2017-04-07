import { emit } from "../../../utilities/tools";
import { template, createElement } from "../../../utilities/travrs";

require('./toolbar.scss');

const scaffold = `
  div.cnxb-toolbar >
    @label
`;

/*
const scaffold = `
  div.cnxb-toolbar >
    button.cnxb-toolbar__btn[title="Accept change" data-action="accept"] > "Accept"
    button.cnxb-toolbar__btn[title="Reject change"] data-action="reject" > "Reject"
    button.cnxb-toolbar__btn[title="Accept all changes" data-action="accept" data-repeat="true"] > "Accept All"
    button.cnxb-toolbar__btn[title="Reject all changes" data-action="reject" data-repeat="true"] > "Reject All"
`;
*/
//     button.cnxb-toolbar__btn.comments[title="Toggle comments" data-action="comments"] > "Comments"

export default (function Toolbar () {
  let active;
  const refs = { label: createElement('div.cnxb-info-label', 'Legacy content') };
  const element = template(refs, scaffold);

  const clickHandle = (event) => {
    const {action, repeat} = event.target.dataset;
    action && element.dispatchEvent(emit('action', {action, repeat}));
  };

  const toggle = (flag = true) => {
    flag ? element.classList.add('active') : element.classList.remove('active')
  };

  const label = (text) => {
    refs.label.innerHTML = text;
  };

  element.addEventListener('click', clickHandle);

  return { element, toggle, label };
}());

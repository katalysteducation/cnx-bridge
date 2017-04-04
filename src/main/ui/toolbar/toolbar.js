import { emit } from "../../../utilities/tools";
import { template } from "../../../utilities/travrs";

require('./toolbar.scss');

const scaffold = `
  div.cnxb-toolbar >
    button.cnxb-toolbar__btn[title="Accept change" data-action="accept"] > "Accept"
    button.cnxb-toolbar__btn[title="Reject change"] data-action="reject" > "Reject"
    button.cnxb-toolbar__btn[title="Accept all changes" data-action="accept" data-repeat="true"] > "Accept All"
    button.cnxb-toolbar__btn[title="Reject all changes" data-action="reject" data-repeat="true"] > "Reject All"
`;
//     button.cnxb-toolbar__btn.comments[title="Toggle comments" data-action="comments"] > "Comments"

export default (function Toolbar () {
  let active;
  const element = template(scaffold);

  const clickHandle = (event) => {
    const {action, repeat} = event.target.dataset;
    action && element.dispatchEvent(emit('action', {action, repeat}));
  };

  const toggle = (flag = true) => {
    flag ? element.classList.add('active') : element.classList.remove('active')
  };

  element.addEventListener('click', clickHandle);

  return { element, toggle };
}());

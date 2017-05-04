import Clipboard from "Clipboard";
import { template, createElement } from "../../../utilities/travrs";

require('./matheditor.scss');

const scaffold = `
  div.cnxb-ieditor >
    @input
    @copy >
      i.material-icons > "content_copy"
    button.cnxb-math-editor__accept[title="Update equation" data-action="accept"]
      i.material-icons > "check"
`;


export default function MathEditor (proxyInput) {

  // Reference to selected Math element.
  let equation;

  // UI references.
  const refs = {
    input: createElement('input[placecholder="Type LaTeX Here..."]'),
    copy: createElement('button.cnxb-math-editor__copy[title="Copy MathML"]')
  };

  // Initialize clipboard.
  const clipboard = new Clipboard(refs.copy, {
    text(trigger) {
      refs.input.value = 'Copied to clipboard';
      return equation.querySelector('script').textContent;
    }
  });

  // Update equation
  const updateEquation = (event) => {
    const {action} = event.target.dataset;
    if (action && action === 'accept') {
      proxyInput.value = refs.input.value;
      proxyInput.dataset.mathId = equation.dataset.mathId;
    }
  };

  // UI Root element.
  const element = template(refs, scaffold);
  element.addEventListener('click', updateEquation);

  // API Method.
  const select = (element, range) => equation = element;

  const dismiss = () => pubsub.publish('editor.dismiss');

  return { element, select, dismiss };
};

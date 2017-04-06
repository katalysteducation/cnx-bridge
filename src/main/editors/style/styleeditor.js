import style from "./apply";
import { elFromString, kedID } from "../../../utilities/tools";
import { template, createElement } from "../../../utilities/travrs";

require('./styleeditor.scss');

// Editor template.
const scaffold = `
  div.cnxb-ieditor.cnxb-style-editor >
    @styles
    @comment
`;

// const styleScaffold =`
//   div.active.cnxb-style-editor__styles >
//     button.cnxb-math-editor__accept[title="Bold text" data-action="bold"]
//       i.material-icons > "format_bold"
//     button.cnxb-math-editor__accept[title="Italic text" data-action="italic"]
//       i.material-icons > "format_italic"
//     button.cnxb-math-editor__accept[title="Term" data-action="term"]
//       i.material-icons > "star_border"
// `;


// button.cnxb-math-editor__accept[title="Reference" data-action="ref"]
//   i.material-icons > "swap_calls"

const styleScaffold =`
  div.active.cnxb-style-editor__styles >
    button.cnxb-math-editor__accept[title="Bold text" data-action="bold"]
      i.material-icons > "format_bold"
    button.cnxb-math-editor__accept[title="Italic text" data-action="italic"]
      i.material-icons > "format_italic"
    button.cnxb-math-editor__accept[title="Term" data-action="term"]
      i.material-icons > "star_border"
    button.cnxb-math-editor__accept[title="Add comment" data-action="comment"]
      i.material-icons > "forum"
    p.cnxb-style-editor__comment[contenteditable="true"]
`;


const comnentsScaffold = `
  div.cnxb-style-editor__comment >
    button.cnxb-math-editor__accept[title="Cancel comment" data-action="cancel"]
      i.material-icons > "close"
    button.cnxb-math-editor__accept[title="Save comment" data-action="save"]
      i.material-icons > "check"
    @input
`;

// ---- STYLE EDITOR MAIN ----------------

export default function StyleEditor (pubsub) {

  // Globals.
  let state = {
    range: undefined,
    action: undefined,
    parent: undefined,
    content: undefined
  };

  // UI references.
  const crefs = {
    input: createElement('p[contenteditable="true"]')
  };

  const refs = {
    styles: template(styleScaffold),
    comment: template(crefs, comnentsScaffold)
  };

  // Supported inline styles.
  const types = ['term', 'emphasis', 'ref', 'quote'];

  // Toglle Panels.
  const activateStylePanel = (flag) => {
    if (flag) {
      refs.styles.classList.add('active');
      refs.comment.classList.remove('active');
    }
    else {
      refs.styles.classList.remove('active');
      refs.comment.classList.add('active');
    }
  };

  // Avilable style actions.
  const actions = {
    ref: style('ref', types, pubsub),
    term: style('term', types, pubsub),
    bold: style('emphasis[effect="bold"]', types, pubsub),
    italic: style('emphasis[effect="italic"]', types, pubsub),
    commentStyle: style('quote', types, pubsub),

    comment (state) {
      activateStylePanel(refs.comment.classList.contains('active'));
      return { ...actions.commentStyle(state, 'comment') };
    },

    save (state) {
      // Publish message.
      pubsub.publish('add.comment', {
        ref: state.parent,
        parent: state.parent.parentNode,
        content: crefs.input.textContent
      });
      return state;
    },

    cancel (state) {
      pubsub.publish('editor.dismiss');
      return actions[state.action](state, state.action);
    }
  };

  // Update equation
  const detectAction = (event) => {
    const name = event.target.dataset.action;
    if (!name) return;
    const action = actions[name];
    if (action) state = action(state, name);
  };

  // UI Root element.
  const element = template(refs, scaffold);
  element.addEventListener('click', detectAction);

  // API Method.
  const select = (content, range) => {

    // If previous comment was empty remove comment selection,
    // else Clear comment input for new entry.
    if (state.action === 'comment' && crefs.input.textContent.length === 0)
      state = actions[state.action](state, state.action);
    else if (crefs.input.textContent.length > 0)
      crefs.input.textContent = '';

    // Activate Style Panel & set current state;
    activateStylePanel(true);
    state = {
      range,
      content,
      action: undefined,
      parent: range.commonAncestorContainer.parentNode
    };
  };

  return { element, select };
};

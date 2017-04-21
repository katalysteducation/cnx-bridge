import { createElement } from "../../../utilities/travrs";

// Transform 'travrs' selectio into the 'querySelector'.
const normalize = (selector) => selector.replace(/\[[\s\S\w]+?\]/g, (match) => match.replace(/"\s/g,'"]['));

// Styles update generator.
export default function style (selector, types, pubsub) {
  return (state, action) => {
    let _parent;
    // Has valid wrapper.
    if (state.parent && !!~types.indexOf(state.parent.tagName.toLowerCase())) {
      if (state.parent.matches(normalize(selector))) {
        // console.log('Remove style');
        state.parent.outerHTML = state.parent.innerHTML;
        pubsub.publish('editor.dismiss');
      }
      else {
        // console.log('Replace styles');
        _parent = createElement(selector, state.parent.innerHTML);
        state.parent.parentNode.insertBefore(_parent, state.parent)
        state.parent.parentNode.removeChild(state.parent);
        state.range.selectNodeContents(_parent);
      }
    }
    // No wrapper - apply style.
    else if (state.content) {
      // console.log('Apply styles');
      _parent = createElement(selector);
      state.range.surroundContents(_parent);
    }
    return { range: state.range, parent: _parent, action: action };
  };
};

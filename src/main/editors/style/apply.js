import { createElement } from "../../../utilities/travrs";

// Styles update generator.
export default function style (selector, types, pubsub) {
  return (state, action) => {
    let _parent;
    // Has valid wrapper.
    if (state.parent && !!~types.indexOf(state.parent.tagName.toLowerCase())) {
      if (state.parent.matches(selector)) {
        // console.log('Remove style');
        state.parent.outerHTML = state.parent.innerHTML;
        //
        // // Publish message.
        // pubsub.publish('editor.update', {
        //   action,
        //   type: 'remove',
        //   ref: undefined,
        //   parent: state.parent.parentNode,
        //   content: state.parent.innerHTML,
        // });
      }
      else {
        // console.log('Replace styles');
        _parent = createElement(selector, state.parent.innerHTML);
        state.parent.parentNode.insertBefore(_parent, state.parent)
        state.parent.parentNode.removeChild(state.parent);
        state.range.selectNodeContents(_parent);
        //
        // // Publish message.
        // pubsub.publish('editor.update', {
        //   action,
        //   ref: _parent,
        //   type: 'replace',
        //   content: _parent.innerHTML,
        //   parent: _parent.parentNode,
        // });
      }
    }
    // No wrapper - apply style.
    else if (state.content) {
      // console.log('Apply styles');
      _parent = createElement(selector);
      state.range.surroundContents(_parent);
      //
      // // Publish message.
      // pubsub.publish('editor.update', {
      //   action,
      //   type: 'new',
      //   ref: _parent,
      //   content: _parent.innerHTML,
      //   parent: _parent.parentNode,
      // });
    }
    return { range: state.range, parent: _parent, action: action };
  };
};


// Get <content> tag from CNXML.
export const getContent = (cnxml) => cnxml
  // Ectract content markup.
  .slice(cnxml.indexOf('<content>'), cnxml.indexOf('<\/content>') + 10)
  // Remove <?cnx.?> tags.
  .replace(/<\?cnx([\s\S\w]+?)\?>/g, '');


// Get <metadata> tag from CNXML.
export const getMetadata = (cnxml) =>
  cnxml.slice(cnxml.indexOf('<metadata'), cnxml.indexOf('<\/metadata>') + 11);


// Get <?cnx.?> tag from CNXML content.
export const getClasses = (cnxml) => {
  const result = [];
  cnxml.replace(/<\?cnx[\s\S\w]+?\?>/g, (match) => result.push(match));
  return result.join('');
};


// Extrac CNXML metadata leaving only content
export const stripMetadata = (cnxml) =>
  cnxml.slice(cnxml.indexOf('<content>') + 9, cnxml.indexOf('<\/content>'));


// Cut from string from start to end index.
export const cutString = (str, cutStart, cutEnd) =>
  str.substring(0, cutStart) + str.substring(cutEnd + 1);


// Inject SCRIPT tag into webpage.
export const injectScript = (name, isExternal, callback) => {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  let onLoad = (event) => {
    script.removeEventListener('load', onLoad);
    callback();
  }
  if (typeof isExternal === 'function') {
    callback = isExternal;
    isExternal = false;
  }
  if (callback) {
    script.addEventListener('load', onLoad);
  }
  script.setAttribute('src', isExternal ? name : chrome.extension.getURL(name));
  document.head.appendChild(script);
};

// Inject STYLE tag into webpage.
export const injectStyle = (url) => {
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', url);
  document.head.appendChild(link);
};

// ---- Helps with event delegation --------------------
// USAGE:
// let destroy = eventDelegate('button.one', 'click', (event) => {}, element);
// destroy(); At the end it'll remove the listener.
export const eventDelegate = (selector, event, callback, context = document) => {
  let id = selector + '_' + event;
  if (!context.__EventDelegates__) context.__EventDelegates__ = {};
  if (context.__EventDelegates__[id]) throw new Error (`Current context already have an eventListener for a selector: "${selector}" for "${event}" event.`);
  // Handle match selector.
  let handle = (event) => {
    let found;
    if (found = event.target.closest(selector)) {
      callback.call(found, event);
    }
  };
  // Remmember refeerence for detach action.
  context.__EventDelegates__[id] = handle;
  // Add Event listener.
  context.addEventListener(event, handle);
  // Return destory handle.
  return () => {
    context.removeEventListener(event, handle);
    context.__EventDelegates__[id] = undefined;
    handle = undefined;
  };
};


// Selects whole word even if only one letter is selected.
const selectWord = () => {
  const selection = window.getSelection();
  const inlineStyles = ['term', 'emphasis', 'quote'];

  if (!selection.isCollapsed && !inlineStyles.some(el => selection.anchorNode.parentNode.matches(el))){
    // Detect if selection is backwards
    const range = document.createRange();
    range.setStart(selection.anchorNode, selection.anchorOffset);
    range.setEnd(selection.focusNode, selection.focusOffset);
    // range.collapsed === true then it is backwards.
    const direction = range.collapsed ? ['backward', 'forward'] : ['forward', 'backward'];
    range.detach();

    // modify() works on the focus of the selection.
    const endNode = selection.focusNode;
    const endOffset = selection.focusOffset;
    selection.collapse(selection.anchorNode, selection.anchorOffset);

    // Extend selection.
    selection.modify("move", direction[0], "character");
    selection.modify("move", direction[1], "word");
    selection.extend(endNode, endOffset);
    selection.modify("extend", direction[1], "character");
    selection.modify("extend", direction[0], "word");
  }
};

// Extend current selection to wrap around whole words.
// It also provides a threshold to prevent double click to select more than one word.
export const selectWholeWords = ((select,threshold) => {
  let last, deferTimer;
  return () => {
    const now = +new Date;
    if (last && now < last + threshold) {
      clearTimeout(deferTimer);
      deferTimer = setTimeout(() => last = now, threshold);
    } else {
      last = now;
      select();
    }
  }
})(selectWord, 250);


// Create CNXBridge unique ID from date.
export const uid = () =>
  'cnxb-' + ((+new Date) + Math.random()* 100).toString(32);


// Genrate 32bit integer from given string.
export const hash32 = (s) => {
  let h = 0, strlen = s.length, i, c;
  if ( strlen === 0 ) return h;
  for (i = 0; i < strlen; i++) {
    c = s.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h |= 0; // Convert to 32bit integer
  }
  return h;
};


// Shorthand for creating DOM events.
export const emit = (name, detail) =>
  new CustomEvent(name, { detail, bubbles: true });


// Return current date in user friendly format.
export const date = (dateA, operator, dateB) => {
  const dateNow = (withTime = false) => {
    const date = new Date();
    const time = ' ' + ("0" + date.getHours()).slice(-2) + ':' + ("0" + date.getMinutes()).slice(-2) + ':' + ("0" + date.getSeconds()).slice(-2);
    const simple = date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + date.getDate()).slice(-2);
    return withTime ? simple + time : simple;
  };

  const compareDates = (dateA, operator, dateB) => {
    const _dateA = new Date(dateA);
    const _dateB = new Date(dateB);

    return operator === '>' ?
      _dateA.getTime() > _dateB.getTime():
      operator === '==' ?
      _dateA.getTime() == _dateB.getTime():
      operator === '<' ?
      _dateA.getTime() < _dateB.getTime():
      undefined;
  };
  return typeof dateA === 'string' ? compareDates(dateA, operator, dateB) : dateNow(dateA);
};


// List of Polish months in proper form.
const miesiace = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'paździerika', 'lsitopada', 'grudnia'];
// List of months in English.
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Chagne date to more human-readable format.
export const humanizeDate = (timestamp) => {
  const [date, time] = timestamp.split(' ');
  const reversed = date.split('-').reverse();
  return reversed[0] + ' ' + months[parseInt(reversed[1])] + ' ' + reversed[2] + ' at ' + time;
};


// Encode Base 64
export const b64EncodeUnicode = (str) =>
  btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
    String.fromCharCode('0x' + p1)
  ));


// Decode Base 64
export const b64DecodeUnicode = (str) =>
  decodeURIComponent(Array.prototype.map.call(atob(str), (c) =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));


// Ceate dom element from string.
export const elFromString = (source) =>
  document.createRange().createContextualFragment(source);


// Copy arributes 'from' one element 'to' another.
export const copyAttrs = (from, to) =>
  Array.from(from.attributes).forEach(attr => to.setAttribute(attr.name, attr.value));


// Convert element attributes to object.
export const attrsToObject = (element) =>
  Array.from(element.attributes).reduce((meta, attr) => {
    meta[attr.name] = attr.value;
    return meta;
  }, {});


// Convert value into Object.
export const valueToObject = (value) =>
  typeof value === 'string' ? JSON.parse(value) : value;


// Compare two arrays & return compare object.
export const arrayCompare = (arrayA, arrayB) => {
  return {
    added: arrayB.filter(el => !~arrayA.indexOf(el)),
    removed: arrayA.filter(el => !~arrayB.indexOf(el))
  };
};


// Swap arrays elements at given indexes.
export const swapItems = (array, indexA, indexB) => {
  let buffer = array[indexA];
  array[indexA] = array[indexB];
  array[indexB] = buffer;
};


// Modifier function with memory.
export const Memo = (modifier, previous) => {
  if (typeof modifier !== 'function') throw "Modifier need to be a function.";
  return (current) => {
    //NOTE: To memoize previous value you need to return it from the 'modifier'.
    previous = modifier(current, previous);
    return previous;
  }
};

// Wrap 'elements' with HTMLElement of given 'type' with provided 'attrs'.
// EXAMPLE: wrapElement(node, 'del', { "data-skip-merge" : true });
export const wrapElement = (elements, type, attrs) => {
  if (!Array.isArray(elements)) elements = [elements];
  const parent = elements[0].parentNode;

  if (parent) {
    const wrapper = document.createElement(type);
    parent.insertBefore(wrapper, elements[0]);
    elements.forEach(node => wrapper.appendChild(node));
    attrs && Object.keys(attrs).forEach(name => wrapper.setAttribute(name, attrs[name]));
    return wrapper;
  }
};

// Move nodes 'from' node 'to' node.
export const moveNodes = (from, to) => {
  while(from.childNodes.length > 0) to.appendChild(from.firstChild);
  return to;
};

// Applies children nodes from 'current' before 'current'.
export const getNodesOut = (current) => {
  const parent = current.parentNode;
  let next, node = current.firstChild;
  while (node) {
    next = node.nextSibling;
    parent.insertBefore(node, current);
    node = next;
  }
};

// Crop Out 'node' from its parent. Spltiting parentNode where tehe 'node' aprears.
const cropOutNode = (node) => {
  const range = document.createRange();
  const parent = node.parentNode;
  range.setStartBefore(parent.firstChild);
  range.setEndBefore(node);
  range.surroundContents(parent.cloneNode());
  range.setStartAfter(node);
  range.setEndAfter(parent.lastChild);
  range.surroundContents(parent.cloneNode());
  getNodesOut(parent);
  parent.parentNode.removeChild(parent);
};

// Filter Comment Markers from 'content'. VERSION-2.
// export const pullAllDiffs = (content) => {
//   Array.from(content.querySelectorAll('cm')).forEach(cm => {
//     if (cm.parentNode.firstChild === cm) {
//       // Trim content to remove remaining spaces at the end.
//       cm.parentNode.outerHTML = cm.parentNode.innerHTML.trim();
//     }
//     else if (cm.parentNode.tagName === "DEL" || cm.parentNode.tagName === "INS") {
//       cropOutNode(cm);
//       // Trim trailing begining space left after comments is crop out.
//       cm.nextElementSibling.firstChild.textContent = cm.nextElementSibling.firstChild.textContent.substring(1);
//     }
//   });
//   return Array.from(content.querySelectorAll('del, ins'));
// }

// Filter Comment Markers from 'content'. VERSION-1.
export const pullAllDiffs = (content) =>
  Array.from(content.querySelectorAll('del, ins')).filter(diff => {
    if (!diff.firstChild.tagName || !diff.firstChild.tagName === "CM") return true;
    // Trim content to remove remaining spaces at the end.
    diff.outerHTML = diff.innerHTML.trim();
    return false;
  });

// Merge sibling text nodes.
export const mergeTextNodes = (node) => {
  let result = node.textContent;
  let next = node.nextSibling;
  let memo;
  while (next && next.nodeType === 3) {
    result += next.textContent;
    memo = next.nextSibling;
    next.parentNode.removeChild(next);
    next = memo;
  }
  node.textContent = result;
};

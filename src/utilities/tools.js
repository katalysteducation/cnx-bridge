
// Get <content> tag from CNXML.
export const getContent = (cnxml) =>
  cnxml.slice(cnxml.indexOf('<content>'), cnxml.indexOf('<\/content>') + 10);

// Get <metadata> tag from CNXML.
export const getMetadata = (cnxml) =>
  cnxml.slice(cnxml.indexOf('<metadata'), cnxml.indexOf('<\/metadata>') + 11);


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


// ---- Swap arrays elements ---------------------------
export const swapItems = (array, indexA, indexB) => {
  let buffer = array[indexA];
  array[indexA] = array[indexB];
  array[indexB] = buffer;
};


// ---- Create CNXBridge unique ID from date -----------------
export const uid = () => {
  return 'cnxb-' + ((+new Date) + Math.random()* 100).toString(32);
};


// ---- Shorthand for creating DOM events ------------
export const emit = (name, detail) => {
  return new CustomEvent(name, { detail, bubbles: true });
};


// ---- Return current date in user friendly format --
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


// Allows to apply children nodes from 'current' before 'current'.
export const getNodesOut = (current) => {
  const parent = current.parentNode;
  let next, node = current.firstChild;
  while (node) {
    next = node.nextSibling;
    parent.insertBefore(node, current);
    node = next;
  }
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


// CNXML Update function.
export const updateCnxmlContent = (cnxml) => (content) =>
  cnxml.slice(0, cnxml.indexOf('<content>') + 9)
  + content +
  cnxml.slice(cnxml.indexOf('<\/content>', cnxml.lenght))
  .replace(/\n/gm, '');


// Extrac CNXML metadata leaving only content
export const stripMetadata = (cnxml) =>
  cnxml.slice(cnxml.indexOf('<content>') + 9, cnxml.indexOf('<\/content>'));

// Ceate dom element from string.
export const elFromString = (source) =>
  document.createRange().createContextualFragment(source);


// Convert element attributes to object.
export const attrsToObject = (element) =>
  Array.from(element.attributes).reduce((meta, attr) => {
    meta[attr.name] = attr.value;
    return meta;
  }, {});


// If content contains attributes strip them out and leave only the values.
// return object with pairs -> { modelName : value }.
export const contentToValues = (content) => {
  const model = JSON.parse(content);
  return Object.keys(model).reduce((result, name) => {
     result[name] = (model[name].value ? model[name].value : model[name]);
     return result;
   }, {});
};

// Convert string values to Objects.
export const strToObject = (value) =>
  typeof value === 'string' ? JSON.parse(value) : value;


// Convert array to object assigning elemtnt to name from element[key].
export const arrayToObject = (array, key) =>
  array.reduce((result, element) => {
    result[element[key]] = element;
    return result;
  }, {});

// Convert component-state object to diff-object.
export const stateToDiffs = (state) =>
  Object.keys(state).reduce((result, name) => {
    result[name] = state[name].value
    return result;
  }, {});

// Compare two arrays.
export const arrayCompare = (arrayA, arrayB) => {
  return {
    added: arrayB.filter(el => !~arrayA.indexOf(el)),
    removed: arrayA.filter(el => !~arrayB.indexOf(el))
  };
};


export const revisionToObject = (revision) => {
  return {
    ...revision,
    comments: JSON.parse(revision.comments),
    content: revision.content.map(element => {
      return { ...element, state: JSON.parse(element.state)};
    })
  };
};


// Move nodes 'from' node 'to' node.
export const moveNodes = (from, to) => {
  while(from.childNodes.length > 0) to.appendChild(from.firstChild);
};

// Modifier function with memory.
export const Memo = (modifier, previous) => {
  if (typeof modifier !== 'function') throw "Modifier need to be a function.";
  return (current) => {
    const result = modifier(current, previous);
    previous = current;
    return result;
  }
};

export const copyAttrs = (from, to) =>
  Array.from(from.attributes).forEach(attr => to.setAttribute(attr.name, attr.value));

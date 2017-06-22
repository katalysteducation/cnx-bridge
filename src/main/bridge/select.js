// Finds only one selected element. It coul be eaither
// #text node or first HTMLElement.
const findSelectedElement = (buffer) => (rangeContent) => {
  let found;
  buffer.innerHTML = '';
  buffer.appendChild(rangeContent);
  const selsected = Array.from(buffer.childNodes);

  if (selsected.length === 1)
    found = selsected[0];
  else if (selsected.length > 1)
    selsected.some(el => (el instanceof HTMLElement && (found = el)));

  return found;
};


// Find editor in 'editors' list nased on its selector-key.
const findEditor = (editors) => {
  const selectors = Object.keys(editors);
  return (element, selector) => {
    if (!element) return;
    (element.nodeType === 3) ? selector = '#text' : selectors.some(key => (element.matches(key) && (selector = key)));
    return editors[selector];
  }
};

// Stop default event behaviour.
const blockDefault = (event) => {
  event.stopPropagation();
  event.preventDefault();
};

// Create inlineToolbox elelemt and apply new editor if porvided
// and set its position.
const inlineToolbox = (root) => {
  const it = document.createElement('div');
  it.className = 'cnxb-inline-toolbox';
  // Add toolbox wrapper.
  root.appendChild(it);
  // Block actions inside editor frame.
  it.addEventListener('mouseup', blockDefault);
  // Return call function.
  return (editor, coords) => {

    // Hide InlineToolbox & quit.
    if (!editor || !editor.element) return it.classList.remove('active');

    // Clean container & append new editor if required.
    if (it.firstChild && it.firstChild !== editor.element) {
      it.removeChild(it.firstChild);
      it.appendChild(editor.element);
    }
    else if (!it.firstChild) {
      it.appendChild(editor.element);
    }

    // Show InlineToolbox.
    it.classList.add('active');

    // Set InlineToolbox position.
    it.style.top = coords.bottom + 20 + 'px';
    it.style.left = (coords.left + coords.width) - (coords.width/2 + it.offsetWidth/2) + 'px';

    return editor;
  };
};


// ------------------------------------------------
// ---- SELECT CORE ----------------
// ------------------------

/** DESCRIPTION:
 * Allow to select proper editor from avialbles 'editors' list
 * based on selector-key e.g.:
 *   const editors = {
 *    "span.editable": TextEditor()
 *   };
 * When editor is found it will be appended to the 'root' element
 * and centered according to selection center.
 *
 * Select activates when length of selected text is > 0 or
 * if element have 'data-select' attribute.
**/
export default function Select (root, editors) {

  // Set HOF selectors (run once).
  const select = findSelectedElement(document.createElement('div'));
  const selectEditor = findEditor(editors);
  const runEditor = inlineToolbox(root);

  // Reference to the Select toolbox wrapper.
  const element = root.querySelector('.cnxb-inline-toolbox');

  // Select proper editor and set it's coordinates.
  const onContentSelected = (event) => {

    // Get selection.
    const selection = window.getSelection();
    const range = selection.anchorNode ? selection.getRangeAt(0) : new Range();
    const selectionText = range.toString();

    // If selection contain end-sapce (double-click on word in Widnows) remove it from selection.
    if (/\s/.test(selectionText.slice(-1))) selection.modify('extend', 'backward', 'character');

    // If selection is on node with 'data-select' attribute. Select whole node.
    if (event.target.dataset && event.target.dataset.select) range.selectNode(event.target);

    // Get rectangle around selection.
    const coords = range.getBoundingClientRect();
    const content = select(range.cloneContents());
    const editor = selectEditor(content);
    const display = runEditor(editor, coords);

    // Call the editor if exist. -> Return promise if you need to do some work after editor is open.
    return new Promise((resolve) => {
      if (!display) return;
      // Call 'select' method that is REQUIRED for the inlineEditors. -> display.select(content, range, elementReference);
      display.select(content, range, event.target.dataset && event.target.dataset.select ? event.target : undefined);
      // Resolve promise with internal data.
      resolve({ editor, content, range, coords });
    });
  };

  // Hide InlineToolbox.
  const dismiss = () => runEditor();

  // Public API.
  return { onContentSelected, dismiss, element };
};

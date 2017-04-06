// Finds only one selected element. It coul be eaither
// #text node or first HTMLElement.
const findSelectedElement = (buffer) => (rengeContent) => {
  let found;
  buffer.innerHTML = '';
  buffer.appendChild(rengeContent);
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

// Create inlineToolbox elelemt and apply new editor if porvided
// and set its position.
const inlineToolbox = (root) => {
  const it = document.createElement('div');
  it.className = 'cnxb__inlineToolbox';
  root.appendChild(it);

  // Block actions inside editor frame.
  it.addEventListener('mouseup', (event) => {
    event.stopPropagation();
    event.preventDefault();
  })

  return (editor, coords) => {

    // Hide InlineToolbox.
    if (!editor || !editor.element) {
      it.classList.remove('active');
      return;
    }

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

  // Select proper editor and set it's coordinates.
  const contentSelected = (event) => {

    // Get selection.
    const selection = window.getSelection();
    const range = selection.anchorNode ? selection.getRangeAt(0) : new Range();

    // Bail if no selection.
    if (event.target.dataset.select) range.selectNode(event.target);

    // Get rectangle around selection.
    const coords = range.getBoundingClientRect();
    const content = select(range.cloneContents());
    const editor = selectEditor(content);
    const display = runEditor(editor, coords);

    // Execute.
    display && display.select(content, range, event.target.dataset.select ? event.target : undefined);
  };

  // Hide InlineToolbox.
  const dismiss = () => runEditor();

  // Public API.
  return { contentSelected, dismiss };
};

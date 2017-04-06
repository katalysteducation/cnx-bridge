// Bridge Core.
import Select from "./select";
import Storage from "./storage";

// UI Compoenents.
import Panels from "../ui/panels";
import Toolbar from "../ui/toolbar";
import Toolbox from "../ui/toolbox";
import Comments from "../ui/comments";
import pscroll from "perfect-scrollbar";

// Editors.
import MathEditor from "../editors/math";
import StyleEditor from "../editors/style";
import MergeEditor from "../editors/merge";

// Utilities.
import diff from "../diff";
import PubSub from "../../utilities/pubsub";
import {toHTML, toCNXML, findWidows} from "../parser";
import {uid, date, getNodesOut} from "../../utilities/tools";
import {template, createElement} from "../../utilities/travrs";
import {mergeSameSiblings, rejectAllChanges} from "../diff/merge";

require('../styles/bridge.scss');

const scaffold = `
  section#cnxb.cnxb >
    div.cnxb__navigator >
      nav.cnxb__toolbox
        @toolbox
      div.cnxb__outliner
        @outliner
    div.cnxb__workspace >
      nav.cnxb__toolbar
        @toolbar
      div.cnxb__content >
        @content
    @proxy
`;


// FIXME: Implement this as component.
const Content = {
  element : createElement('div.content', "Content here")
}

// FIXME: Implement this as component.
const Revision = {
  element : createElement('div', createElement('button.revbtn[data-compare="true"]', 'Compare versions'))
}

// FIXME: Implement this as component.
const Messenger = {
  log (message) { console.log(message)}
}

// ------------------------------------------------
// ---- BRIDGE CORE ----------------
// ------------------------


// Manages the communication and wires up the app.
// Collects events from UI-Components and channel them to proper addressee.
export default function Bridge (root) {

  // Main comunication hub.
  const pubsub = new PubSub();

  // UI's panels switcher.
  const contentPanels = Panels(Content.element);
  const outlinerPanels = Panels(Revision.element, Comments.element);

  // Tools DOM references (travrs' refs).
  const tools = {
    // Left-hand side menu.
    toolbox: Toolbox.element,
    outliner: outlinerPanels.view,

    // Workspace.
    toolbar: Toolbar.element,
    content: contentPanels.view,

    // Hidden input -> MathJax connection.
    proxy: createElement('input#InputProxy[type="hidden", data-math-id="true"]')
  };

  // Bridge Global State.
  const BridgeState = {
    // Extract current content from the legacy promise.
    current: Storage.legacy().content,

    // Describe HTML selectors for inline editors.
    editors: {
      // 'selector' : editorInstance(),
      'span[data-select="math"]': new MathEditor(tools.proxy),
      'del, ins': new MergeEditor(pubsub),
      '#text': new StyleEditor(pubsub)
    }
  };


  // Set select tool. Set root to 'Content.element.parentNode'
  // to not interfere with reorder functionality.
  const select = new Select(Content.element.parentNode, BridgeState.editors);


  // ---- MAIN UI COMPONENT ------------

  const BridgeUI = template(tools, scaffold);
  root.appendChild(BridgeUI);

  let diffs;

  // ---- EVENT HANDLES ----------------

  const keyboardHandles = (event) => {
    // Alt + u -> Show Curretn Configuration.
    if (event.altKey && event.key === 'u')
      Storage.config.then(console.log);

    // Alt + c -> Show all coments.
    if (event.altKey && event.key === 'c')
      console.log(JSON.stringify({comments: Comments.pull()}));

    // Alt + q -> Clear module: 2357341580.
    if (event.altKey && event.key === 'q')
      Storage.clearModule(2357341580).then(console.log);

    // Alt + x -> Show current CNXML.
    if (event.altKey && event.key === 'x') {
      rejectAllChanges(diffs);
      console.log(toCNXML(Content.element));
    }

  };

  const compareVerions = (event) => {
    // Do not comare if other button than compare was clicked OR if prev. comaratino not ended.
    if (!event.target.dataset.compare || Content.element.querySelector('del, ins')) return;
    compare(Storage.restore());
    tools.proxy.dataset.reRender = true;
  }


  // ---- ELEMENTS HANDLES ----------------

  // Append new content.
  const appendContent = (content) => {
    Content.element.innerHTML = toHTML(content)
    findWidows(Content.element);
  };

  // Compare current Legacy version with previous revision.
  const initialComparisons = ([content, latest]) => {
    latest && Content.diff(arrayToObject(latest.content, 'cnx_id'));
    return latest;
  }

  // FIXME: This is an old implememntation. Need update + add blocking edition when diffing.
  const selectEditable = (event) => {
    const editable = event.target.closest('p[contenteditable=true]');
    const allow = ['DEL', 'INS', 'COMMENT'];
    // Allow selecting only ediitable containers. Except with MergeEditor.
    if ((editable) || ~allow.indexOf(event.target.tagName)) select.contentSelected(event);
    else select.dismiss();
  };


  // Compare oldCNXML DOM sttucture with current one.
  const compare = (oldCNXML) => {
    const diffA = createElement('div', toHTML(oldCNXML));
    const diffB = createElement('div', Content.element.innerHTML);
    findWidows(diffA);

    Content.element.innerHTML = '';
    Array.from(diff(diffA, diffB).children).forEach(element => {
      Content.element.appendChild(element);
    })

    // Merge siblings & get only diffs children.
    diffs = mergeSameSiblings(Array.from(Content.element.querySelectorAll('del, ins')));
  };

  const switchOutlinerPanels = (event) => {
    const {tab, index} = event.detail;
    outlinerPanels.select(index);
  };


  const scroll = (event) => {
    outlinerPanels.view.scrollTop = event.detail.top - 10;
    pscroll.update(outlinerPanels.view);
  };

  // Detect clicked element.
  const detectElement = (event) => {
    // Detect click on Comment node;
    if (event.target.matches('quote[type=comment]')) {
      const comment = Comments.select(event.target.id);
      outlinerPanels.view.scrollTop = comment.offsetTop - 10;
      pscroll.update(outlinerPanels.view);
    }
  };

  // Remove comment from content.
  const removeComment = (event) => {
    if (event.detail.id) {
      const commnet = document.getElementById(event.detail.id);
      commnet ? commnet.outerHTML = commnet.innerHTML : Messenger.log('Commen does not exist in content');
    }
  };

  // ---- PUBSUB HANDLES -------------------

  const addNewComment = ({ref, content}) => {
    const id = uid();
    ref.id = id;
    ref.setAttribute('type', 'comment');
    ref.setAttribute('display', 'inline');
    ref.setAttribute('contenteditable', false);

    Comments.add(id, content);
  }

  // ---- FIRST RUN ------------------------

  const firstRun = ([latest]) => {
    Comments.fill(latest.comments);
  };


  // ---- Initialize -----------------------

  // Setup event listeners & communication channels.
  const Initialize = (cnxml) => new Promise(resolve => {

    // Content listeners.
    Content.element.addEventListener('click', detectElement);
    Content.element.addEventListener('mouseup', selectEditable);

    // Revision listeners.
    Revision.element.addEventListener('click', compareVerions);

    // Toolbox listeners.
    Toolbox.element.addEventListener('switch-tab', switchOutlinerPanels);

    // Comments listeners.
    Comments.element.addEventListener('scroll-to', scroll);
    Comments.element.addEventListener('remove', removeComment);

    // Keyboard listeners.
    root.addEventListener('keyup', keyboardHandles);

    // Set scrollbars from PerfectScroll lib.
    pscroll.initialize(contentPanels.view, { suppressScrollX: true });
    pscroll.initialize(outlinerPanels.view, { suppressScrollX: true });

    // PubSub listeners.
    pubsub.subscribe('add.comment', addNewComment);
    pubsub.subscribe('editor.dismiss', select.dismiss);

    // Finish.
    resolve(cnxml);
  });


  // ---- API METHODS ----------------

  const toggle = () => {
    root.classList.toggle('passive');
    BridgeUI.classList.toggle('active');
  };

  // Restroe recent saved module from LocalStorage.
  const recover = () => {
    // Render restored version.
    appendContent(Storage.restore());
    // Rerender Math.
    tools.proxy.dataset.reRender = true;
  };

  // Save content to the BAD & Legacy.
  const save = () => {
    // Reject diffs markers from CNXML.
    rejectAllChanges(diffs);
    // Convert current content to CNXML.
    const cnxmlContent = toCNXML(Content.element);
    // Save data.
    Storage
      .saveRevision(cnxmlContent, Comments.pull())
      .then(success => Storage.saveCnxml(cnxmlContent));
  };

  // Reload data in Bridge's workspace.
  const reload = () => {
    // Aplpy new content.
    appendContent(Storage.legacy().content);
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
    // Open Bridge UI if closed.
    if (!root.classList.contains('passive')) toggle();
  }

  // ---------------------------------
  // ---- STAR UP THE APP ------------
  // ---------------------------------

  Promise.all([
    // If have access to Archive fetch latest & compare verions.
    Storage.latest,
    // Initialzie commnets.
    Storage.config.then(Comments.user),
    // Initialzie app.
    Initialize(BridgeState.current).then(appendContent)
  ])
  .then(firstRun)
  .catch(console.warn);

  // Public API.
  return { save, toggle, recover, reload };
};

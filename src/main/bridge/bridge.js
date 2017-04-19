// Bridge Core.
import Select from "./select";
import Storage from "./storage";

// UI Compoenents.
import Panels from "../ui/panels";
import History from "../ui/history";
import Content from "../ui/content";
import Toolbar from "../ui/toolbar";
import Toolbox from "../ui/toolbox";
import Comments from "../ui/comments";
import Revision from "../ui/revision";
import pscroll from "perfect-scrollbar";

// Editors.
import MathEditor from "../editors/math";
import StyleEditor from "../editors/style";
import MergeEditor from "../editors/merge";

// Utilities.
import diff from "../diff";
import {toHTML, toCNXML} from "../parser";
import PubSub from "../../utilities/pubsub";
import {template, createElement} from "../../utilities/travrs";
import {mergeSameSiblings, rejectAllChanges} from "../diff/merge";
import {uid, date, getNodesOut, Memo} from "../../utilities/tools";

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
  const outlinerPanels = Panels(Revision.element, Comments.element, History.element);

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
  const select = new Select(contentPanels.view, BridgeState.editors);


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
      Storage.clearModule(9655866818).then(console.log);
      // Storage.clearModule(2357341580).then(console.log);

    // Alt + x -> Show current CNXML.
    if (event.altKey && event.key === 'x') {
      rejectAllChanges(diffs);
      console.log(toCNXML(Content.element));
    }

  };


  // ---- ELEMENTS HANDLES ----------------

  // Append new content.
  const appendContent = (content) => {
    // Create content editable structure.
    // FIXME: Shalow nesting!
    Content.element.innerHTML = toHTML(content).firstElementChild.innerHTML;
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };


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
    const diffA = toHTML(oldCNXML).querySelector('div[data-type=content]');
    const diffB = createElement('div', Content.element.innerHTML);

    Content.element.innerHTML = '';
    Array.from(diff(diffA, diffB).children).forEach(element => {
      Content.element.appendChild(element);
    })

    // Merge siblings & get only diffs children.
    diffs = mergeSameSiblings(Array.from(Content.element.querySelectorAll('del, ins')));

    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };

  const switchOutlinerPanels = (event) => {
    const {tab, index} = event.detail;
    outlinerPanels.select(index);
  };


  // Detect clicked element.
  const detectElement = (event) => {
    // Detect click on Comment node;
    if (event.target.matches('quote[type=comment]')) {
      const comment = Comments.select(event.target.id);
      activeComment(event.target);
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

  const activeComment = new Memo((current, active) => {
    if (active) active.classList.remove('active');
    active = current;
    active.classList.add('active');
    return active;
  });

  const scrollCommentInContent = (event) => {
    if (event.detail.id) {
      const comment = document.getElementById(event.detail.id);
      if (comment) {
        activeComment(comment);
        contentPanels.view.scrollTop = comment.parentNode.offsetTop + comment.offsetTop;
        pscroll.update(contentPanels.view);
      }
      else Messenger.log('cipr');
    }
  };

  const compareRevision = (event) => {
    const {revision} = event.detail;
    // Quit if there is no 'revision' OR if prev. comaratino not ended.
    if (!revision || Content.element.querySelector('del, ins')) return;
    // Compare revision with current content.
    compare(revision.content);
    // Append comment from diff version
    Comments.fill(revision.comments);
  };

  // Display selected revision.
  const displayRevision = (event) => {
    const {revision, label} = event.detail;
    if (revision) {
      Toolbar.label(`Revision ${label}`);
      appendContent(revision.content);
      Comments.replace(revision.comments);
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
  };

  // Checkd if comments were removed from the Content, and if its true remove them from the Comments panel.
  const checkComments = ({ids}) => {
    if (ids.length > 0) Comments.remove(ids.filter(id => !document.getElementById(id)));
  };

  // ---- FIRST RUN ------------------------

  const initialCompare = ([latest]) => {
    // Quit if not latest revision.
    if (!latest) return;
    // Add coments for current revision.
    Comments.fill(latest.comments);
    // Compare with latest version.
    compare(latest.content);
  };


  // ---- Initialize -----------------------

  // Setup event listeners & communication channels.
  const Initialize = (cnxml) => new Promise(resolve => {

    // Content listeners.
    Content.element.addEventListener('click', detectElement);
    Content.element.addEventListener('mouseup', selectEditable);

    // Toolbox listeners.
    Toolbox.element.addEventListener('switch-tab', switchOutlinerPanels);

    // Revision listeners.
    Revision.element.addEventListener('display', displayRevision);
    Revision.element.addEventListener('compare', compareRevision);

    // Comments listeners.
    Comments.element.addEventListener('remove', removeComment);
    Comments.element.addEventListener('scroll.content', scrollCommentInContent);

    // History listeners.
    History.element.addEventListener('display', displayRevision);
    History.element.addEventListener('compare', compareRevision);

    // Keyboard listeners.
    root.addEventListener('keyup', keyboardHandles);

    // Set scrollbars from PerfectScroll lib.
    pscroll.initialize(contentPanels.view, { suppressScrollX: true });
    pscroll.initialize(outlinerPanels.view, { suppressScrollX: true });

    // PubSub listeners.
    pubsub.subscribe('editor.unwrap', checkComments);
    pubsub.subscribe('editor.comment', addNewComment);
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
    const restoreModule = Storage.restore();
    appendContent(restoreModule.content);
    Comments.replace(restoreModule.comments);
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
      .then(success => Storage.saveCnxml(cnxmlContent, Storage.legacy().classes));
  };

  // Reload data in Bridge's workspace.
  const reload = () => {
    // Aplpy new content.
    appendContent(Storage.legacy().content);
    // Clear coments.
    Comments.replace();
    // Open Bridge UI if closed.
    if (!root.classList.contains('passive')) toggle();
  }

  // ---------------------------------
  // ---- STAR UP THE APP ------------
  // ---------------------------------

  Promise.all([
    // If have access to Archive fetch latest & compare verions.
    Storage.latest.then(Revision.fill),
    // Initialzie commnets.
    Storage.config.then(Comments.user),
    // Initialzie app.
    Initialize(BridgeState.current).then(appendContent)
  ])
  .then(initialCompare)
  .catch(console.warn);


  // Add history antries.
  Storage.history.then(History.fill);

  // Public API.
  return { save, toggle, recover, reload };
};

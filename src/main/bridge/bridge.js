// Bridge Core.
import Select from "./select";
import Storage from "./storage";

// UI Compoenents.
import Panels from "../ui/panels";
import History from "../ui/history";
import Content from "../ui/content";
import Toolbar from "../ui/toolbar";
import Toolbox from "../ui/toolbox";
import Outliner from "../ui/outliner";
import Comments from "../ui/comments";
import Revision from "../ui/revision";
import Messenger from "../ui/messenger";
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
import {uid, date, getNodesOut, Memo, humanizeDate} from "../../utilities/tools";
import {mergeSameSiblings, rejectAllChanges, acceptAllChanges} from "../diff/merge";

require('../styles/bridge.scss');

const scaffold = `
  section#cnxb.cnxb >
    div.cnxb__navigator >
      nav.cnxb__toolbox
        @toolbox
      div.cnxb__outliner
        @outliner
      @messages
    div.cnxb__workspace >
      nav.cnxb__toolbar
        @toolbar
      div.cnxb__content >
        @content
    @proxy
`;


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
  const outlinerPanels = Panels(Outliner.element, Revision.element, History.element, Comments.element);

  // Tools DOM references (travrs' refs).
  const tools = {
    // Left-hand side menu.
    toolbox: Toolbox.element,
    outliner: outlinerPanels.view,
    messages: Messenger.element,
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
      'span[data-select="math"]': new MathEditor(tools.proxy),
      'del, ins': new MergeEditor(pubsub),
      '#text': new StyleEditor(pubsub)
    },
    // Open Options Hook.
    optionsHook: undefined,
    // Recent displayed revisoin date.
    recentRevDate: undefined
  };


  // Set select tool. Set root to 'Content.element.parentNode'
  // to not interfere with reorder functionality.
  const select = new Select(contentPanels.view, BridgeState.editors);


  // ---- MAIN UI COMPONENT ------------

  const BridgeUI = template(tools, scaffold);
  root.appendChild(BridgeUI);

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
      rejectAllChanges(Array.from(Content.element.querySelectorAll('del, ins')));
      console.log(toCNXML(Content.element));
    }

    // Alt + m -> Show test messahe
    if (event.altKey && event.key === 'm') {
      Messenger.info('You are trying to compare the same versions')
    }
  };


  // ---- HELPERS -------------------------

  const isResolved = () => !Content.element.querySelector('del, ins');

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
    const editable = event.target.closest('p[data-target=editable]');
    const allow = ['DEL', 'INS', 'COMMENT'];
    // Allow selecting only ediitable containers. Except with MergeEditor.
    if ((editable) || ~allow.indexOf(event.target.tagName)) select.contentSelected(event);
    else select.dismiss();
  };

  // Compare 'newVersion' of DOM with the 'oldVersion'.
  // NOTE: Without flag 'silet' set to TRUE newVersion will be override by the copmaration.
  const compare = (newVersion) => (oldVersion, silent = false) => {
    const content = silent ? newVersion.cloneNode(true) : newVersion;
    const diffA = toHTML(oldVersion).querySelector('div[data-type=content]');
    const diffB = createElement('div', content.innerHTML);
    // Clear content.
    content.innerHTML = '';
    // Append diffs.
    Array.from(diff(diffA, diffB).children).forEach(element => content.appendChild(element));
    // Merge siblings & get only diffs children.
    mergeSameSiblings(Array.from(newVersion.querySelectorAll('del, ins')));
    // Diff element reference.
    return content;
  };

  // Compare input tree with 'Content.element'.
  const compareWithContent = compare(Content.element);

  // Switch Outliner Panels wthen Toolbox btn clicked.
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
      commnet ? commnet.outerHTML = commnet.innerHTML : Messenger.warn('Comment does not exist in content');
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
    }
  };


  // ---- REVISIONS HANDLES ----------------

  const toolbarRevisionHandeler = ({detail}) => {
    if (!detail || !detail.action) return;
    const diffs = Array.from(Content.element.querySelectorAll('del, ins'));
    detail.action === 'reject' ? rejectAllChanges(diffs) : acceptAllChanges(diffs);
  };

  // Display selected revision.
  const displayRevision = (event) => {
    const {revision, label, date} = event.detail;
    if (revision) {
      BridgeState.recentRevDate = date;
      Toolbar.revision(false);
      Toolbar.label(`<span>${label}</span> <span class="cnxb-label">${date}</span>`);
      appendContent(revision.content);
      Comments.replace(revision.comments);
    }
  };

  // Compare two revisions.
  const compareRevision = (event) => {
    const {revision, label, date} = event.detail;

    // Quit if there is no 'revision' OR if prev. comaration not ended.
    if (!revision || !isResolved()) {
      Messenger.info('You neet to resolve all conflict to run another DIFF operation');
      return;
    }
    else if (BridgeState.recentRevDate === date) {
      Messenger.info('You are try to comapre the same revisoin');
      return;
    }
    // Show revisoin buttons.
    Toolbar.revision(true);
    // Set Toolbar label.
    Toolbar.label(`<span>${label}</span> <span class="cnxb-label" title="Content version">${BridgeState.recentRevDate}</span> ⇌ <span class="cnxb-label" title="Compare verion">${date}</span>`);
    // Compare revision with current content.
    compareWithContent(revision.content);
    // Append comment from diff version
    Comments.fill(revision.comments);
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };


  // Replcae Content with diffed revision.
  const replaceRevision = (event) => {
    const {revision, label, date} = event.detail;
    // Continue function.
    const continueReplacing = (accepted) => {
      if (!accepted) return;
      // Hide revisoin buttons.
      Toolbar.revision(true);
      // Set Toolbar label.
      Toolbar.label(`<span>${label}</span> <span class="cnxb-label">${date}</span>`);
      // Replace content.
      Content.element.innerHTML = revision.innerHTML;
      // Re-render Math.
      tools.proxy.dataset.reRender = true;
    };

    // Checkd if replace dosn't override Current Draft?
    if (~Toolbar.element.textContent.indexOf('Current Draft'))
      Messenger.warn('This action will override your Current Draft', continueReplacing, 'Continue', 'Abort');
    else continueReplacing(true);
  };

  // Show Options panel.
  const showOptionsPanel = (accepted) => {
    if (accepted && BridgeState.optionsHook) BridgeState.optionsHook();
  };

  // ---- PUBSUB HANDLES -------------------

  const setCurrentDraft = () => {
    Toolbar.label(`<span>Current Draft</span>`);
    BridgeState.recentRevDate = 'Current Draft';
    // Save local copy.
    Storage.saveDraft({
      content: toCNXML(Content.element),
      comments: Comments.pull()
    });
  };

  const addNewComment = ({ref, content}) => {
    const id = uid();
    ref.id = id;
    Comments.add(id, content);
  };

  const onConflictResolve = ({ids}) => {
    // Checkd if comments were removed from the Content, and if its true remove them from the Comments panel.
    if (ids.length > 0) Comments.remove(ids.filter(id => !document.getElementById(id)));
    // Check if there more diffs in current content.
    if (isResolved()) setCurrentDraft();
  };

  // ---- FIRST RUN ------------------------

  const manageRevisions = (revisions) => {
    History.apply(revisions);
    const latest = Revision.setup(revisions, compareWithContent);
    // Add comments from latest revisoin.
    if (latest) {
      Comments.fill(latest.comments);
      BridgeState.recentRevDate = humanizeDate(latest.date);
    }
  };


  // Take proper action according to the occured error.
  const detectStartupErrors = (data) => {
    // Unidentified error.
    if (!data.error) console.warn(data);
    // When no connection with Bridge Archive Database.
    else if (data.type === 'archive-connection-error') {
      // Disable comments mode in inline StyleEditor.
      BridgeState.editors['#text'].disableComments();
      // Disable toolbar archive tools.
      Toolbox.disableIndex(1, 2, 3);
      // Display warning message.
      Messenger.warn('You are not connected to the Bridge Archive Database. Making revisions will not be possible.', showOptionsPanel, 'CONNECT', 'CANCEL');
    }
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
    Revision.element.addEventListener('replace', replaceRevision);

    // Revision listeners.
    Toolbar.element.addEventListener('revision', toolbarRevisionHandeler);

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
    pubsub.subscribe('editor.comment', addNewComment);
    pubsub.subscribe('editor.dismiss', select.dismiss);
    pubsub.subscribe('editor.unwrap', onConflictResolve);

    // Finish.
    resolve(cnxml);
  });


  // ---- API METHODS ----------------

  // Show/ Hide CNX-Bridge UI.
  const toggle = () => {
    root.classList.toggle('passive');
    BridgeUI.classList.toggle('active');
  };

  // Restroe recent saved content data from LocalStorage.
  const recover = () => {
    const {date, comments, content} = Storage.restore();
    appendContent(content);
    Comments.replace(comments);
    Toolbar.label(`<span>Recovered </span> <span class="cnxb-label">${humanizeDate(date)}</span>`);
  };

  // Save content to the BAD & Legacy.
  const save = () => {
    // Reject diffs markers from CNXML.
    rejectAllChanges(Array.from(Content.element.querySelectorAll('del, ins')));
    // Convert current content to CNXML.
    const cnxmlContent = toCNXML(Content.element);
    // Save data.
    Storage.saveRevision(cnxmlContent, Comments.pull()).then(success => Storage.saveCnxml(cnxmlContent, Storage.legacy().classes));
    // Notify user.
    Messenger.info('Saving in progress. Waiting for the Legacy...');
  };

  // Save current document draft.
  const draft = () => {
    if (!isResolved()) {
      Messenger.info('You neet to resolve all conflict to save Current Draft');
      return;
    }
    setCurrentDraft();
    Messenger.success('Current Draft was saved');
  };

  // Reload data in Bridge's workspace.
  const reload = () => {
    // Aplpy new content.
    appendContent(Storage.legacy().content);
    // Clear coments.
    Comments.replace();
    // Ser toolbar label.
    Toolbar.label(`<span>Legacy Content</span>`);
    // Open Bridge UI if closed.
    if (!root.classList.contains('passive')) toggle();
  }

  // Add hook to call options panel.
  const showOptions = (callback) => BridgeState.optionsHook = callback;

  // ---------------------------------
  // ---- STAR UP THE APP ------------
  // ---------------------------------

  // If have access to the Archive, fetch latest & compare verions.
  // Storage.latest.then(checkRevisions),
  Promise.all([
    // Initialzie commnets.
    Storage.config.then(Comments.user),
    // Initialzie app.
    Initialize(BridgeState.current).then(appendContent)
  ])
  .catch(detectStartupErrors);

  // Add history entries.
  Storage.history.then(manageRevisions);

  // Public API.
  return { save, draft, toggle, recover, reload, showOptions };
};

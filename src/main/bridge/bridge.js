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
import {uid, date, getNodesOut, Memo} from "../../utilities/tools";
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
  const state = {
    // Describe HTML selectors for inline editors.
    editors: {
      'span[data-select="math"]': new MathEditor(tools.proxy),
      'del, ins': new MergeEditor(pubsub),
      '#text': new StyleEditor(pubsub)
    },
    // Open Options Hook.
    optionsHook: undefined,
    // Recent displayed revisoin date.
    displayRevisionDate: undefined
  };


  // ---- MAIN UI COMPONENT ------------

  const BridgeUI = template(tools, scaffold);
  root.appendChild(BridgeUI);


  // ---- HELPERS -------------------------

  // Check if Content.element contains any diff markers.
  const isResolved = () => !Content.element.querySelector('del, ins');

  // Set & save Current Draft.
  const setCurrentDraft = () => {
    Toolbar.label('Current Draft');
    state.displayRevisionDate = 'Current Draft';
    Storage.saveDraft({ content: toCNXML(Content.element), comments: Comments.pull() });
  };


  // ---- EVENT HANDLES ----------------

  const keyboardHandles = (event) => {
    // Alt + u -> Show Curretn Configuration.
    if (event.altKey && event.key === 'u')
      Storage.config.then(console.log);

    // Alt + c -> Show all coments.
    if (event.altKey && event.key === 'c')
      console.log(JSON.stringify({comments: Comments.pull()}));

    // Alt + q -> Clear current module.
    if (event.altKey && event.key === 'q')
      Storage.clearModule().then(console.log);

    // Alt + x -> Show current CNXML.
    if (event.altKey && event.key === 'x') {
      mergeAssistant('reject');
      console.log(toCNXML(Content.element));
    }

    // Alt + m -> Show test messahe
    if (event.altKey && event.key === 'm') {
      Messenger.info('You are trying to compare the same versions')
    }
  };


  // ---- INLINE SELECTION ----------------

  // Set select tool. Set root to 'Content.element.parentNode'
  // to not interfere with reorder functionality.
  const select = new Select(contentPanels.view, state.editors);

  // Filter what can be selected by Inine Edutors.
  const selectEditable = (event) => {
    const editable = event.target.closest('p[data-target=editable][contenteditable=true]');
    // Allow for selecting: Ediitable containers, Diff markesr & Math wrappers.
    if ((editable) || event.target.matches('del, ins, span[data-select=math]')) select.contentSelected(event);
    else select.dismiss();
  };


  // ---- COMPARATION HANDLES -------------

  // Compare 'newVersion' of DOM with the 'oldVersion'.
  // NOTE: HOF function without flag 'silet' set to TRUE will override the newVersion tree with the copmaration result.
  const compare = (newVersion) => (oldVersion, silent = false) => {
    const content = silent ? newVersion.cloneNode(true) : newVersion;
    const diffA = toHTML(oldVersion).querySelector('div[data-type=content]');
    const diffB = createElement('div', content.innerHTML);
    // Clear content.
    content.innerHTML = '';
    // Append diffs.
    Array.from(diff(diffA, diffB).children).forEach(element => content.appendChild(element));
    // Merge siblings & get only diffs children.
    mergeSameSiblings(Array.from(content.querySelectorAll('del, ins')));
    // Diff element reference.
    return content;
  };

  // Compare 'Content.element' tree with 'compareWithContent(input)' tree.
  const compareWithContent = compare(Content.element);


  // ---- GENERAL HANDLES -----------------

  // Switch Outliner Panels wthen Toolbox btn clicked.
  const switchOutlinerPanels = ({detail}) => outlinerPanels.select(detail.index);

  // Detect clicked element.
  const detectElement = (event) => {
    // Detect click on Comment node;
    if (event.target.matches('quote[type=comment]')) {
      const comment = Comments.select(event.target.id);
      if (comment) {
        activeComment(event.target);
        outlinerPanels.view.scrollTop = comment.offsetTop - 10;
        pscroll.update(outlinerPanels.view);
      }
    }
  };


  // ---- COMMENTS HANDLES -----------------

  // Toggle .active class on selected comment.
  const activeComment = new Memo((current, active) => {
    if (active) active.classList.remove('active');
    if (active !== current) {
      active = current;
      active.classList.add('active');
    }
    else {
      active.classList.remove('active');
      active = undefined;
    }
    return active;
  });

  // Merge comments from compared revisions and leave only the most recent ones.
  const mergeComments = (contentRevComs, compareRevComs) => {
    const ids = contentRevComs.map((comment) => comment.id);
    const comments = contentRevComs.concat(compareRevComs.filter((comment) => ~!ids.indexOf(comment.id)));
    Comments.replace(comments);
  };

  // Scroll Content to show selected Comment.
  const scrollCommentInContent = ({detail}) => {
    let comment;
    if (detail.id && (comment = document.getElementById(detail.id))) {
      activeComment(comment);
      contentPanels.view.scrollTop = comment.parentNode.offsetTop + comment.offsetTop;
      pscroll.update(contentPanels.view);
    }
  };

  // Remove Comment from Content.
  const removeComment = ({detail}) => {
    if (detail.id) {
      const commnet = document.getElementById(detail.id);
      commnet ? commnet.outerHTML = commnet.innerHTML : Messenger.error('Comment does not exist in content');
    }
  };

  // Add new Comment to the Content.
  const addNewComment = ({ref, content}) => {
    const id = uid();
    ref.id = id;
    Comments.add(id, content);
  };


  // ---- REVISIONS HANDLES ----------------

  // Allows to accept OR reject all changes in the Content at once.
  const mergeAssistant = (value) => {
    let action;
    // Detect action.
    if (typeof value === 'string') action = value;
    else if (value.detail) action = value.detail.action;
    // Get all diff markers from Content.
    const diffs = Array.from(Content.element.querySelectorAll('del, ins'));
    // Execute action.
    if (action === 'reject') rejectAllChanges(diffs)
    else if (action === 'accept') acceptAllChanges(diffs);
    else return;
    // Update Comments.
    Comments.find(Content.element)({comments: Comments.pull()});
    Toolbar.revision(false);
    setCurrentDraft();
  };

  // Fires when MergeEditor 'unwrap's diff marker.
  const onConflictResolve = ({ids}) => {
    // Checkd if comments were removed from the Content, and if its true remove them from the Comments panel.
    if (ids.length > 0) Comments.remove(ids.filter(id => !document.getElementById(id)));
    // Check if there more diffs in current content.
    if (isResolved()) setCurrentDraft();
  };

  // Apply passed revision (rev-object) into the Content.
  const displayRevision = ({detail}) => {
    const {revision, label, date} = detail;
    if (!revision) return;
    // Set current Display Revision Date.
    state.displayRevisionDate = date;
    // Append new content.
    appendContent(revision);
    // Replace ald comments to those from current revision.
    Comments.replace(revision.comments);
    // Set Toolbar label & hide revision buttons.
    Toolbar.label(label, date).revision(false);
  };

  // Replcae Content with provided revision (DOM Tree).
  const replaceContent = ({detail}) => {
    const {revision, label, date} = detail;
    const revReference = History.revision(date);

    // Continue function.
    const continueReplacing = (accepted) => {
      if (!accepted) return;
      // Set Toolbar label & hide revisoin buttons.
      Toolbar.label(label, date).revision(true);
      // show comments from currently display revision.
      revReference && Comments.replace(revReference.comments);
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

  // Compare two revisions.
  const compareRevision = ({detail}) => {
    const {revision, label, date} = detail;

    // Quit if there is no 'revision' OR if prev. comaration not ended.
    if (!revision || !isResolved()) return Messenger.info('You neet to resolve all conflicts to run another DIFF operation');
    else if (state.displayRevisionDate === date) return Messenger.info('You are trying to compare the same versions');

    // Set Toolbar label & show revisoin buttons.
    Toolbar.label(label, state.displayRevisionDate, date).revision(true);
    // Compare revision with current content.
    compareWithContent(revision.content);
    // Merge comments from new and old version.
    mergeComments(revision.comments, Comments.pull());
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };


  // ---- FIRST RUN ------------------------

  // Take proper action according to the occured error.
  const detectStartupErrors = (data) => {
    // Unidentified error.
    if (!data.error) console.warn(data);
    // When no connection with Bridge Archive Database.
    else if (data.type === 'archive-connection-error') {
      // Disable comments mode in inline StyleEditor.
      state.editors['#text'].disableComments();
      // Disable toolbar archive tools.
      Toolbox.disableIndex(1, 2, 3);
      // Display warning message.
      Messenger.warn('You are not connected to the Bridge Archive Database. Making revisions will not be possible.', (accepted) => accepted && state.optionsHook && state.optionsHook(), 'CONNECT', 'CANCEL');
    }
  };

  // If the revisions exist, distribute them to the History & the Revision panel.
  const manageRevisions = (revisions) => {
    // Activate Revision panel & check if Legacy is synhronized with BAD?
    const insync = !!Revision.setup(revisions, compareWithContent);
    // Activate History panel & get last saved revision.
    const lastRevision = History.apply(revisions);
    // If History contains any element ans is synhronized with BAD.
    if (insync && lastRevision) {
      // Add comments existing in the Content and last revisoin.
      Comments.find(Content.element)(lastRevision);
      // Set date of last revisoin.
      state.displayRevisionDate = lastRevision.date;
    }
  };

  // Append new content.
  const appendContent = ({content}) => {
    // Create content editable structure. // FIXME: Force shalow nesting!
    Content.element.innerHTML = toHTML(content).firstElementChild.innerHTML;
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };


  // ---- COMMUNICATION -----------------------

  // Setup event listeners & communication channels.
  const setupListeners = () => {

    // Keyboard listeners.
    root.addEventListener('keyup', keyboardHandles);

    // Content listeners.
    Content.element.addEventListener('click', detectElement);
    Content.element.addEventListener('mouseup', selectEditable);

    // Toolbox listeners.
    Toolbox.element.addEventListener('switch-tab', switchOutlinerPanels);

    // Revision listeners.
    Revision.element.addEventListener('display', displayRevision);
    Revision.element.addEventListener('replace', replaceContent);

    // Revision listeners.
    Toolbar.element.addEventListener('revision', mergeAssistant);

    // Comments listeners.
    Comments.element.addEventListener('remove', removeComment);
    Comments.element.addEventListener('scroll.content', scrollCommentInContent);

    // History listeners.
    History.element.addEventListener('display', displayRevision);
    History.element.addEventListener('compare', compareRevision);

    // Set scrollbars from PerfectScroll lib.
    pscroll.initialize(contentPanels.view, { suppressScrollX: true });
    pscroll.initialize(outlinerPanels.view, { suppressScrollX: true });

    // PubSub listeners.
    pubsub.subscribe('editor.comment', addNewComment);
    pubsub.subscribe('editor.dismiss', select.dismiss);
    pubsub.subscribe('editor.unwrap', onConflictResolve);
  };


  // ---- API METHODS -------------------------

  // Show/Hide CNX-Bridge UI.
  const toggle = () => {
    // Removes scrollbas from document.body
    root.classList.toggle('passive');
    // Show/Hide UI panel.
    BridgeUI.classList.toggle('active');
  };

  // Restroe recent saved content from LocalStorage.
  const recover = () => {
    const {date, comments, content} = Storage.restore();
    // Apply resotrd content & commets.
    appendContent({content});
    Comments.replace(comments);
    // Set Toolbar label.
    Toolbar.label('Recovered', date);
  };

  // Save content to the BAD & Legacy.
  const save = () => {
    // Check for diffs markers in CNXML.
    if (!isResolved()) return Messenger.error('You neet to resolve all conflict in order to save a module');
    // Convert current content to CNXML.
    const cnxmlContent = toCNXML(Content.element);
    // Save data to the BAD & the Legacy.
    Storage.saveRevision(cnxmlContent, Comments.pull()).then(success => Storage.saveCnxml(cnxmlContent, Storage.legacy().classes));
    // Notify user.
    Messenger.info('Saving in progress. Wait for Legacy to reload...');
  };

  // Save current document draft.
  const saveDraft = () => {
    // Save Current Draft & set it as current revision.
    const continueSaving = (accepted) => {
      if (!accepted) return;
      mergeAssistant('reject');
      setCurrentDraft();
      Messenger.success('Current Draft was saved');
    };
    // Check for diffs markers in CNXML.
    Messenger.warn('You have some unresolved conflicts. If you do not resolve them they will be discarded', continueSaving, 'Continue', 'Resolve' );
  };

  // Reload data in Bridge's workspace.
  const reload = () => {
    // Aplpy new content.
    Storage.legacy().then(appendContent);
    // Try to match Comments from last revision with loaded content.
    Storage.history.then(Comments.find(Content.element))
    // Set Toolbar label.
    Toolbar.label('Legacy Content');
    // Open Bridge UI if closed.
    if (!root.classList.contains('passive')) toggle();
  }

  // Add hook to call options panel.
  const showOptions = (callback) => state.optionsHook = callback;

  // ---------------------------------
  // ---- START-UP THE APP -----------
  // ---------------------------------

  // Synchronize.
  Promise.all([
    // Provide User data for Comments panel.
    Storage.config.then(Comments.user),
    // Setup event & communication listeners.
    Storage.legacy().then(appendContent).then(setupListeners),
    // Get history entries.
    Storage.history.then(manageRevisions)
  ])
  // Handle startup errors.
  .catch(detectStartupErrors);


  // ---- PUBLIC API --------------------------

  return { save, toggle, recover, reload, saveDraft, showOptions };
};

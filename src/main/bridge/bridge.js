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
import {watchMerge, commentsToModel} from "../diff/cmtools";
import {template, createElement} from "../../utilities/travrs";
import {rejectAllChanges, acceptAllChanges} from "../diff/merge";
import {uid, date, getNodesOut, Memo} from "../../utilities/tools";

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
    // Current comments watch function.
    watchMerge: undefined,
    // Recent displayed revisoin date.
    displayRevisionDate: undefined
  };

  // ---------------------------------------
  // ---- MAIN UI COMPONENT ----------------
  // ---------------------------------------

  const BridgeUI = template(tools, scaffold);
  root.appendChild(BridgeUI);


  // ---------------------------------------
  // ---- HELPERS -------------------------
  // ---------------------------------------

  // Check if Content.element contains any diff markers.
  const isResolved = () => !Content.element.querySelector('del, ins');

  // Set & save Current Draft.
  const setCurrentDraft = () => {
    Toolbar.label('Current Draft');
    state.displayRevisionDate = 'Current Draft';
    Storage.saveDraft({ content: toCNXML(Content.pull()), comments: Comments.pull() });
  };


  // ---------------------------------------
  // ---- EVENT HANDLES --------------------
  // ---------------------------------------

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
      console.log(toCNXML(Content.pull()));
    }

    // Alt + m -> Show test messahe
    if (event.altKey && event.key === 'm') {
      Messenger.info('You are trying to compare the same versions')
    }
  };

  // ---------------------------------------
  // ---- INLINE SELECTION -----------------
  // ---------------------------------------

  // Set select tool. Set root to 'Content.element.parentNode'
  // to not interfere with reorder functionality.
  const select = new Select(contentPanels.view, state.editors);

  // FIXME:
  // const onInlineEditorOpen = ({editor, coords}) => {
  //
  //   const detectScroll = (event) => {
  //     editor.dismiss();
  //     contentPanels.view.removeEventListener('scroll', detectScroll);
  //   };
  //
  //   contentPanels.view.addEventListener('scroll', detectScroll);
  //
  //   if (window.innerHeight - coords.bottom < 120) {
  //     contentPanels.view.scrollTop = contentPanels.view.scrollTop + 120;
  //     pscroll.update(contentPanels.view);
  //     select.element.style.top = coords.bottom - 100 + 'px';
  //   }
  //
  // };

  // Filter what can be selected by Inine Edutors.
  const selectEditable = (event) => {
    const editable = event.target.closest('p[data-target=editable][contenteditable=true]');
    // Allow for selecting: Ediitable containers, Diff markesr & Math wrappers.
    if ((editable) || event.target.matches('del, ins, span[data-select=math]')) select.onContentSelected(event)//.then(onInlineEditorOpen);
    else select.dismiss();
  };


  // ---------------------------------------
  // ---- GENERAL HANDLES -----------------
  // ---------------------------------------

  // Switch Outliner Panels wthen Toolbox btn clicked.
  const switchOutlinerPanels = ({detail}) => outlinerPanels.select(detail.index);

  // Scroll Content to show selected Section.
  const scrollContent = ({detail}) => {
    let section;
    if (detail.id && (section = document.querySelector(`div[id=${detail.id}][data-type]`))) {
      contentPanels.view.scrollTop = section.offsetTop - 10;
      pscroll.update(contentPanels.view);
    }
  };

  // Fires when content has changed.
  const onContentChanged = (event) => Outliner.update(Content.pull());

  // Fires when content has changed.
  const onElementUpdate = ({detail}) => Outliner.updateElement(detail.ref);

  // Detect clicked element inside editable element.
  const detectElement = (event) => {
    // Detect click on Comment node;
    if (event.target.matches('quote[type=comment]')) {
      const comment = Comments.select(event.target.id);
      if (comment) {
        // Select comment in the Content and the Comments panel.
        activeComment(event.target);
        outlinerPanels.view.scrollTop = comment.offsetTop - 10;
        pscroll.update(outlinerPanels.view);
      } else {
        // Notify user & unwrap comment.
        Messenger.error('Selected comment does not exist in the archive. It will be removed fro the content');
        event.target.outerHTML = event.target.innerHTML;
      }
    }
  };

  // ---------------------------------------
  // ---- COMMENTS HANDLES -----------------
  // ---------------------------------------

  /**
   * Toggle '.active' class on selected comment.
   * @type {Memo}
   */
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
  // const mergeComments = (contentRevComs, compareRevComs) => {
  //   const ids = contentRevComs.map((comment) => comment.id);
  //   const comments = contentRevComs.concat(compareRevComs.filter((comment) => ~!ids.indexOf(comment.id)));
  //   Comments.set(comments);
  // };

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


  // ---------------------------------------
  // ---- REVISIONS HANDLES ----------------
  // ---------------------------------------

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

  // Fires when MergeEditor unwraps diff marker.
  const onConflictResolve = ({ids}) => {
    state.watchMerge && state.watchMerge();

    // Checkd if comments were removed from the Content, and if its true remove them from the Comments panel.
    // if (ids.length > 0) Comments.remove(ids.filter(id => !document.getElementById(id)));
    // Check if there more diffs in current content.
    // if (isResolved()) setCurrentDraft();
  };

  /**
   * Apply passed revision-object into the Content.
   * @param  {Object} detail Event.detail object caries {revision, label, date} for the revision to be replacement for
   *                         current content. In this case 'revision' is a Revision-Object.
   */
  const displayRevision = ({detail}) => {
    const {revision, label, date} = detail;
    if (!revision) return;
    // Set current Display Revision Date.
    state.displayRevisionDate = date;
    // Append new content.
    appendContent(revision);
    // Set comments from current revision.
    Comments.set(revision.comments);
    // Set Toolbar label & hide revision buttons.
    Toolbar.label(label, date).revision(false);
  };

  /**
   * Replcae Content with provided revision DOM Tree.
   * @param  {Object} detail  Event.detail object caries {revision, label, date} for the revision to be replacement for
   *                          current content. In this case 'revision' is HTMLElement containing already diffed version.
   * @return {undefined}      Message.warn-ing is called when replace acction overrides 'Current Draft'. In other case
   *                          content is replaced.
   */
  const replaceContent = ({detail}) => {
    const {revision, label, date} = detail;
    const revReference = History.revision(date) || {comments:[]};

    // Continuation function.
    const continueReplacing = (accepted) => {
      if (!accepted) return;
      // Set Toolbar label & hide revisoin buttons.
      Toolbar.label(label, date).revision(true);
      // Set comments for selected revision.
      Comments.set(revReference.comments);
      // Replace content.
      Content.set(revision);
      // Re-render Math.
      tools.proxy.dataset.reRender = true;
    };

    // Checkd if replace doesn't override Current Draft?
    return (~Toolbar.element.textContent.indexOf('Current Draft'))
      ? Messenger.warn('This action will override your Current Draft', continueReplacing, 'Continue', 'Abort')
      : continueReplacing(true);
  };

  /**
   * Compares two revisions.
   * @param  {Object} detail Event.detail object caries {revision, label, date} for the revision to be compared with
   *                         current content. In this case 'revision' is a Revision-Object.
   */
  const compareRevision = ({detail}) => {
    const {revision, label, date} = detail;

    // Quit if there is no 'revision' OR if prev. comaration not ended.
    if (!revision || !isResolved()) return Messenger.info('You neet to resolve all conflicts to run another DIFF operation');
    else if (state.displayRevisionDate === date) return Messenger.info('You are trying to compare the same versions');

    // Create commnets model for current content, before it is override by the diff content.
    const commnetsModel = commentsToModel(Content.element);
    // Set Toolbar label & show revisoin buttons.
    Toolbar.label(label, state.displayRevisionDate, date).revision(true);
    // Compare revision (old content) with current (new) content.
    Content.set(diff(toHTML(revision.content), Content.element));
    // Set diffing-ends watcher to determine when restore commnets.
    state.watchMerge = watchMerge(Content.element, commnetsModel);
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };

  // ---------------------------------------
  // ---- FIRST RUN ------------------------
  // ---------------------------------------

  /**
   * Take proper action according to the occured error.
   * @param  {Object} data Error object.
   */
  const detectStartupErrors = (data) => {
    // On unidentified error.
    if (!data.error) console.warn(data);
    // Else when no connection with the Bridge Archive.
    else if (data.type === 'archive-connection-error') {
      // Disable comments-mode in inline-style editor.
      state.editors['#text'].disableComments();
      // Disable Archive related buttons in Toolbar.
      Toolbox.disableIndex(1, 2, 3);
      // Display warning message.
      Messenger.warn(
        'You are not connected to the Bridge Archive Database. Making revisions will not be possible.',
        (accepted) => accepted && state.optionsHook && state.optionsHook(),
        'CONNECT',
        'CANCEL'
      );
    }
  };

  /**
   * Manages revisions if they exist. It distribute them to the History & the Revision panel.
   * @param  {Object} revisions Object containing all revisions from Bridge Archive.
   */
  const manageRevisions = (revisions) => {
    // Activate Revision panel & check if Legacy is synhronized with the Bridge Archive?
    const insync = Revision.setup(revisions, Content.element);
    // Activate History panel & get last saved revision.
    const lastRevision = History.set(revisions);
    // History exist & it is synhronized with the Bridge Archive.
    if (insync && lastRevision) {
      // Match comments existing in the Content container and in the last revisoin.
      Comments.find(Content.element)(lastRevision);
      // Set date of last revisoin.
      state.displayRevisionDate = lastRevision.date;
    }
  };

  /**
   * Transform CNXML into HTML and append it to the Content container, updating Outliner in the same time.
   * @param  {String} content CNXML markup as a string.
   */
  const appendContent = ({content}) => {
    // Create content editable structure.
    Content.set(toHTML(content).firstElementChild);
    // Update outliner.
    Outliner.update(Content.pull());
    // Re-render Math.
    tools.proxy.dataset.reRender = true;
  };


  // ---------------------------------
  // ---- COMMUNICATION --------------
  // ---------------------------------

  /**
   * Setup event listeners & communication channels.
   */
  const setupListeners = () => {

    // Keyboard listeners.
    root.addEventListener('keyup', keyboardHandles);

    // Content listeners.
    Content.element.addEventListener('click', detectElement);
    Content.element.addEventListener('mouseup', selectEditable);
    Content.element.addEventListener('changed', onContentChanged);
    Content.element.addEventListener('update.element', onElementUpdate);

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

    // Outliner listeners.
    Outliner.element.addEventListener('scroll.content', scrollContent);

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

  // ---------------------------------
  // ---- API METHODS ----------------
  // ---------------------------------

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
    Comments.set(comments);
    // Set Toolbar label.
    Toolbar.label('Recovered', date);
  };

  // Save content to the BAD & Legacy.
  const save = () => {
    // Check for diffs markers in CNXML.
    if (!isResolved()) return Messenger.error('You neet to resolve all conflict in order to save a module');
    // Convert current content to CNXML.
    const cnxmlContent = toCNXML(Content.pull());
    // Save data to the BAD & the Legacy.
    Storage.saveRevision(cnxmlContent, Comments.pull()).then(Storage.legacy).then(({classes}) => Storage.saveCnxml(cnxmlContent, classes));
    // Notify user.
    Messenger.success('Saving in progress. Wait for Legacy to reload...');
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
    return !isResolved()
      ? Messenger.warn('You have some unresolved conflicts. If you do not resolve them they will be discarded', continueSaving, 'Continue', 'Resolve')
      : continueSaving(true);
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


  // ---------------------------------
  // ---- PUBLIC API -----------------
  // ---------------------------------

  return { save, toggle, recover, reload, saveDraft, showOptions };
};

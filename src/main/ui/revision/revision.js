import diff from "../../diff";
import {toHTML} from "../../parser";
import {commentsToModel} from "../comments/cmtools";
import {emit, humanizeDate} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./revision.scss');

// Component scaffold
const scaffold = `
  div.cnxb-revisions >
    h4 > "Revision"
    @message
`;

// Add Revision Entry.
const revisionEntry = (date) =>`
  div.cnxb-revisions-check[data-action="diff"] >
    div.header > "Show latest changes"
    div.date > "${humanizeDate(date)}"
`;

// Add Revision Error.
const revisionError =`
  div >
    div.cnxb-revisions-error
      div.header > "Unsynchronized version"
      div.info > "Current content version in Legacy is different than the latest revision in Bridge's Archive. You need to resolve some conflicts in order to continue."
    div.cnxb-revisions-buttons
      button.accept-btn[data-action="resolve"] > "Resolve"
      button.warning-btn[data-action="cancel"] > "Cancel"
      button.error-btn[data-action="restore"] > "Restore"
`;

// Add Revision Warning.
const revisionWarning =`
  div.cnxb-revisions-warning
    div.header > "Unsynchronized version"
    div.info > "This revision is still unsynchronized. You need to save module in order to finish syncing process."
`;


// ------------------------------------------------
// ---- REVISON CORE ----------------
// ------------------------

export default (function Revision () {

  // UI dynamic references.
  const refs = { message : createElement('div.cnxb-revisions-message') };

  // Create UI element.
  const element = template(refs, scaffold);

  // Revision storage.
  const storage = {
    // Date of latest revisoin.
    latestDate: undefined,
    // Diffi from latest version & current content.
    latestChanges: undefined,
    // Last saved revision in Bridge Archive.
    currentVersion: undefined,
    // Diffi from unsync. version & current content.
    silentRevision: undefined
  };

  // Error command list.
  const commands = ['resolve', 'cancel', 'restore'];

  /**
   * Run action according to user choice.
   * @param  {Event}  event Click event on UI element.
   */
  const detectAction = (event) => {
    const action = event.target.dataset.action;

    // Handle resolve issue.
    if (action && ~commands.indexOf(action)) {

      // Replace current content with the diff-ied version of unsynchronized content.
      if (action === 'resolve')
        element.dispatchEvent(emit('replace', { revision: storage.silentRevision, label: 'Unsynchronized revision'}));

      // Replace Content with last version stored in Bridge Archive.
      else if (action === 'restore')
        element.dispatchEvent(emit('display', { revision: storage.currentVersion, label: 'Restored revision', date: storage.currentVersion.date }));

      // Display Warning message in any case.
      refs.message.replaceChild(template(revisionWarning), refs.message.firstElementChild);
    }

    // Replace current content with the diff-ied version of latest changes.
    else if (action === 'diff')
      element.dispatchEvent(emit('replace', { revision: storage.latestChanges, label: 'Latest changes', date: storage.latestDate }));
  };

  // Add listeners.
  element.addEventListener('click', detectAction);


  // ---- API METHODS ----------------

  /**
   * Set Revision panel to proper state.
   * @param  {Object}   revisions          Collection of all revisoins in Bridge Archive.
   * @param  {HTMLElement} currentContent  Reference to currently displayed content.
   * @return {Boolean}                     isSynchronized flag.
   */
  const setup = (revisions, currentContent) => {
    const revisionsLength = revisions.length;
    const latest = revisionsLength > 1 ? revisions[revisionsLength - 2] : undefined;

    // Set latest saved version (the current one).
    storage.currentVersion = revisions.slice(-1)[0];

    // Check if content in Baridge Archive is synchronized with content in the Legacy.
    if (storage.currentVersion) {
      storage.silentRevision = diff(toHTML(storage.currentVersion.content), currentContent);
      // If conflicts were detected then display Error panel & exit.
      if (!!storage.silentRevision.querySelector('del, ins'))
        return !refs.message.appendChild(template(revisionError));
    }

    // Message for no-revisions.
    if (!latest) {
      element.appendChild(createElement('div.cnxb-empty', 'No revisions for this module'));
    }
    // Button for recent changes
    else {
      storage.latestDate = latest.date;
      storage.latestChanges = diff(toHTML(latest.content), currentContent);
      element.appendChild(template(revisionEntry(latest.date)));
    }
    // Return latest revision.
    return !!latest;
  };

  // Public API.
  return { element, setup };
}());

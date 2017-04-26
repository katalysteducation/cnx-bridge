import Messenger from "../messenger";
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
      button.accept[data-action="resolve"] > "Resolve"
      button.warning[data-action="cancel"] > "Cancel"
      button.error[data-action="restore"] > "Restore"
`;

// Add Revision Warning.
const revisionWarning =`
  div.cnxb-revisions-warning
    div.header > "Unsynchronized version"
    div.info > "This revision is still unsynchronized. You need to save changes in order to finish syncing process."
`;


// ------------------------------------------------
// ---- REVISON CORE ----------------
// ------------------------

export default (function Revision () {

  // UI dynamic references.
  const refs = { message : createElement('div.cnxb-revisions-message')};

  // Create UI element.
  const element = template(refs, scaffold);

  // Latest revision.
  const storage = {
    latestDate: undefined,
    latestChanges: undefined,
    currentVersion: undefined,
    silentRevision: undefined,
  };

  // Error command list.
  const commands = ['resolve', 'cancel', 'restore'];

  // Run user action.
  const detectAction = (event) => {
    const action = event.target.dataset.action;

    // Handle resolve issue.
    if (action && ~commands.indexOf(action)) {

      // Notify Bridge to replace Content.
      if (action === 'resolve')
        element.dispatchEvent(emit('replace', { revision: storage.silentRevision, label: 'Unsynchronized revision'}));

      // Replace content with most recent version in BAD.
      else if (action === 'restore')
        element.dispatchEvent(emit('display', { revision: storage.currentVersion, label: 'Restored revision from', date: humanizeDate(storage.currentVersion.date) }));

      // Display Warning message in any case.
      refs.message.replaceChild(template(revisionWarning), refs.message.firstElementChild);
    }

    // Compare current version with previous revision.
    else if (action === 'diff')
      element.dispatchEvent(emit('replace', { revision: storage.latestChanges, label: 'Latest changes', date: humanizeDate(storage.latestDate) }));
  };


  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  // Setup revision panel.
  const setup = (revisions, comparator) => {
    const revisionsLength = revisions.length;
    const latest = revisionsLength > 1 ? revisions[revisionsLength - 2] : undefined;

    // Set latest saved version (the current one).
    storage.currentVersion = revisions.slice(-1)[0];

    // Check if Baridge's Archive is synchronized with the Legacy.
    if (storage.currentVersion) {
      storage.silentRevision = comparator(storage.currentVersion.content, true);
      // Detectc conflicts.
      if (!!storage.silentRevision.querySelector('del, ins')) {
        refs.message.appendChild(template(revisionError));
        return storage.currentVersion;
      }
    }

    // Message for no-revisions.
    if (!latest) {
      element.appendChild(createElement('div.cnxb-empty', 'No revisions for this module'));
    }
    // Button for recent changes
    else {
      storage.latestDate = latest.date;
      storage.latestChanges = comparator(latest.content, true);
      element.appendChild(template(revisionEntry(latest.date)));
    }
    // Return latest revision.
    return latest;
  };

  // Public API.
  return { element, setup };
}());

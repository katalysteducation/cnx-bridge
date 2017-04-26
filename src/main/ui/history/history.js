import {emit, humanizeDate} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./history.scss');

// Component scaffold
const scaffold = `
  div.cnxb-history >
    h4 > "History"
`;

const revisionItem = (id, date, user, avatar) =>`
  div.cnxb-history-item[title="Show this revision" data-version="${date}"] >
    div.cnxb-history-header > "${humanizeDate(date)}"
    div.cnxb-history-user >
      span.avatar[style="background-color:${avatar};"]
      span.name[style="color:${avatar};"] > "${user}"
    button.cnxb-history-diff[title="Diff with this revision" data-version="${date}" data-diff="true"]
      i.material-icons > "compare_arrows"`;

// ------------------------------------------------
// ---- HISTORY CORE ----------------
// ------------------------

export default (function History () {

  // Create UI element.
  const element = template(scaffold);

  // Storege of all revision.
  const storage = {};

  // Section scaffold references.
  const sections = {};

  // Run user action.
  const detectAction = (event) => {
    const {version, diff} = event.target.dataset;
    if (!version) return;
    element.dispatchEvent(emit(diff ? 'compare' : 'display', { revision: storage[version], label: 'Revision', date: humanizeDate(version) }));
  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  // Apply history entries.
  const apply = (revisions) => {
    // Set empty placeholder if no data.
    if (!revisions || revisions.length === 0) {
      element.appendChild(createElement('div.cnxb-empty', 'No archive data for this module'));
      return;
    }
    // Create responses scaffold.
    const rlength = revisions.length;
    const revsTemplate = revisions.reverse().reduce((result, revision, index) => {
      storage[revision.date] = revision;
      return result += revisionItem(rlength - index, revision.date, revision.user, revision.avatar);
    }, 'div');



    // Append UI.
    element.appendChild(template(revsTemplate));
  };

  // Public API.
  return { element, apply };
}());

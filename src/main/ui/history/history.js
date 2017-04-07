import {emit, arrayToObject} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./history.scss');

const scaffold = `
  div.cnxb-history__sections >
    @revisions
`;

const revisionItem = (id, date, user, avatar) =>`
  div.cnxb-history__item[data-version="${date}"] >
    div.cnxb-history__avatar[style="background-color:${avatar};"]
    div.cnxb-history__content >
      h4.cnxb-history__header > "Revision ${id}"
      p.cnxb-history__subtitle > "${date} / ${user}"
      span.cnxb-history__diff[data-version="${date}" data-diff="true"] > "DIFF"`;

// ------------------------------------------------
// ---- HISTORY CORE ----------------
// ------------------------

export default (function History () {
  // Create UI element.
  const element = createElement('div.cnxb-history');

  // Storege of all revision.
  const storage = {};

  // Section scaffold references.
  const sections = {};

  // Run user action.
  const detectAction = (event) => {
    const {version, diff} = event.target.dataset;
    if (!version) return;
    element.dispatchEvent(emit(diff ? 'compare' : 'display', { revision: storage[version], label: version }));
  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  // Append history entries.
  const fill = (revisions) => {
    // Set empty placeholder if no data.
    if (!revisions || revisions.length === 0) {
      element.appendChild(createElement('div.cnxb-empty', 'No archive data for this module'));
      return;
    }
    // Create responses scaffold.
    const rlength = revisions.length;
    const revsTemplate = revisions.reduce((result, revision, index) => {
      storage[revision.date] = revision;
      return result += revisionItem(rlength - index, revision.date, revision.user, revision.avatar);
    }, 'div');

    // Add revisions.
    sections.revisions = template(revsTemplate);

    // Append UI.
    element.appendChild(template(sections, scaffold));
  };

  // Public API.
  return { element, fill };
}());

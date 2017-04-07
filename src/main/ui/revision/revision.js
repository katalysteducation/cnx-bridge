import {emit} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./revision.scss');

const scaffold = ({date, user, avatar}) =>`
  div.cnxb-revisions__sections >
    div.cnxb-revisions__item[data-version="${date}"] >
      div.cnxb-revisions__avatar[style="background-color:${avatar};"]
      div.cnxb-revisions__content >
        h4.cnxb-revisions__header > "Latest Revision"
        p.cnxb-revisions__subtitle > "${date} / ${user}"
        span.cnxb-revisions__diff[data-version="${date}" data-diff="true"] > "DIFF"
`;

// ------------------------------------------------
// ---- REVISON CORE ----------------
// ------------------------

export default (function Revision () {
  // Create UI element.
  const element = createElement('div.cnxb-revisions');

  // Latest revision.
  const latest = {};

  // Run user action.
  const detectAction = (event) => {
    const {version, diff} = event.target.dataset;
    if (!version) return;
    element.dispatchEvent(emit(diff ? 'compare' : 'display', { revision: latest[version], label: 'Latest ' + version }));
  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  // Append revision to the display.
  const fill = (revision) => {
    // Set empty placeholder if no data.
    if (!revision) {
      element.appendChild(createElement('div.cnxb-empty', 'No revisions for this module'));
      return;
    }
    // Set latest revision.
    latest[revision.date] = revision;
    // Append UI.
    element.appendChild(template(scaffold(revision)));
  };

  // Public API.
  return { element, fill };
}());

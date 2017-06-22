import {emit, humanizeDate, Memo} from "../../../utilities/tools";
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

  // Revision storege.
  const storage = {};

  // Section scaffold references.
  const sections = {};

  /**
   * Set active class to selected element.
   * @type {Memo}
   */
  const active = new Memo((current, active) => {
    if (!current.matches('.cnxb-history-item')) return active;
    if (active) active.classList.remove('active');
    current.classList.add('active');
    return current;
  });

  /**
   * Run action according to user's choice.
   * @param  {Event}  event Click event.
   */
  const detectAction = (event) => {
    const {version, diff} = event.target.dataset;
    active(event.target);
    if (!version) return;
    element.dispatchEvent(emit(diff ? 'compare' : 'display', { revision: storage[version], label: 'Revision', date: version }));
  };

  // Add listeners.
  element.addEventListener('click', detectAction);

  // ---- API METHODS ----------------

  /**
   * Populate history entries.
   * @param  {Object} revisions Collection of all revisions in Bridge Archive.
   * @return {Object}           The newest revision.
   */
  const set = (revisions) => {
    // Set empty placeholder if no data & exit.
    if (!revisions || revisions.length === 0) return element.appendChild(createElement('div.cnxb-empty', 'No archive data for this module'));

    // Create responses scaffold.
    const rlength = revisions.length;
    const revsTemplate = revisions.reverse().reduce((result, revision, index) => {
      storage[revision.date] = revision;
      return result += revisionItem(rlength - index, revision.date, revision.user, revision.avatar);
    }, 'div');

    // Append UI.
    element.appendChild(template(revsTemplate));

    // Return newest element.
    return revisions.slice(0,1)[0];
  };

  /**
   * Return revision object by date.
   * @param  {String} date Stringified date of the revision.
   * @return {Object}      Revision object.
   */
  const revision = (date) => storage[date];

  // Public API.
  return { element, set, revision };
}());

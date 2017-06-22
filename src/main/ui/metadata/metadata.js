import {emit} from "../../../utilities/tools";
import {template, createElement} from "../../../utilities/travrs";
require('./metadata.scss');


// Component scaffold
const scaffold = `
  div.cnxb-metadata >
    h4 > "Metadata"
    form#meta-form >
      div.cnxb-metadata-head > "Module Description"
      div.cnxb-metadata-body >
        div.cnxb-metadata-entry >
          label > "Title"
          input[type="text" name="title"]
        div.cnxb-metadata-entry >
          label > "Abstract"
          textarea[name="abstract"]
      div.cnxb-metadata-head > "Content Specifics"
      div.cnxb-metadata-body >
        div.cnxb-metadata-entry >
          label > "Keywords"
          textarea.keywords[name="keywords"]
        div.cnxb-metadata-entry >
          p >
            input[type="checkbox" name="Arts"]
            span > "Arts"
          p >
            input[type="checkbox" name="Mathematics and Statistics"]
            span > "Mathematics and Statistics"
          p >
            input[type="checkbox" name="Business"]
            span > "Business"
          p >
            input[type="checkbox" name="Science and Technology"]
            span > "Science and Technology"
          p >
            input[type="checkbox" name="Humanities"]
            span > "Humanities"
          p >
            input[type="checkbox" name="Social Sciences"]
            span > "Social Sciences"
      div.cnxb-metadata-head > "User Information"
      div.cnxb-metadata-body >
        div.cnxb-metadata-entry >
          label > "Firstname"
          input[type="text" name="firstname"]
        div.cnxb-metadata-entry >
          label > "Surname"
          input[type="text" name="surname"]
        div.cnxb-metadata-entry >
          label > "Fullname"
          input[type="text" name="fullname"]
        div.cnxb-metadata-entry >
          label > "Email"
          input[type="text" name="email"]
      div.cnxb-metadata-head > "Roles"
      div.cnxb-metadata-body >
        div.cnxb-metadata-entry >
          label > "Authors"
          input[type="text" name="author"]
        div.cnxb-metadata-entry >
          label > "Maintainers"
          input[type="text" name="maintainer"]
        div.cnxb-metadata-entry >
          label > "Copyright Holders"
          input[type="text" name="licensor"]
        div.cnxb-metadata-entry >
          label > "Editors"
          input[type="text" name="editor"]
        div.cnxb-metadata-entry >
          label > "Translators"
          input[type="text" name="translator"]
`;


// ------------------------------------------------
// ---- METADATA CORE ----------------
// ------------------------

export default (function Metadata () {

  // Global state.
  const state = { meta :undefined };

  // Create UI element.
  const element = template(scaffold);

  // Get form data
  const metaForm = element.querySelector('#meta-form');

  // Dtecte user action.
  const detectAction = ({target}) => {
    if (target.matches('.cnxb-metadata-head'))
      target.nextElementSibling.classList.toggle('open');
  };

  // Metadata elements.
  // const direct = ['title','abstract', 'firstname', 'surname', 'fullname', 'email'];
  // Roles elements.
  const rolesNames = ['author', 'maintainer', 'licensor', 'editor', 'translator'];

  // Set module metadata.
  const set = (meta) => {

    // Check for namespace.
    if (!~meta.indexOf('xmlns:md')) meta = meta.replace('<metadata', '<metadata xmlns:md="http://cnx.rice.edu/mdml"');

    // Create XML parser.
    const parser = new DOMParser();
    const mdom = parser.parseFromString(meta, "application/xml");

    // Set global state.
    state.meta = mdom;

    // Keywords.
    metaForm.elements['keywords'].value = Array.from(mdom.querySelectorAll('keyword')).reduce((result, keyword) => result += (keyword.innerHTML + '\n'), '');

    // Direct matches.
    Array.from(metaForm.elements).forEach(entry => {
      const matchingEntry = mdom.querySelector(entry.name);
      if (matchingEntry) entry.value = matchingEntry.innerHTML;
    });

    // Roles.
    Array.from(mdom.querySelectorAll('role')).forEach(role => {
      const matchingRole = metaForm.elements[role.getAttribute('type')];
      if (matchingRole) matchingRole.value = role.innerHTML;
    });

    // Subjects.
    Array.from(mdom.querySelectorAll('subject')).forEach(subject => {
      const matchingSub = metaForm.elements[subject.innerHTML];
      if (matchingSub) matchingSub.checked = true;
    });
  };

  // Get module metadata.
  const get = () => {

    // XML Serializer.
    const serializer = new XMLSerializer();

    // Get references.
    let roles = state.meta.querySelector('roles');
    let keywords = state.meta.querySelector('keywordlist');
    let subjects = state.meta.querySelector('subjectlist');

    if (!roles) {
      roles = createElement('md:roles');
      state.meta.firstChild.appendChild(roles);
    }

    if (!keywords) {
      keywords = createElement('md:keywordlist');
      state.meta.firstChild.appendChild(keywords);
    }

    if (!subjects) {
      subjects = createElement('md:subjectlist');
      state.meta.firstChild.appendChild(subjects);
    }

    // Pre-save cleanup.
    roles.innerHTML = '' ;
    keywords.innerHTML = '';
    subjects.innerHTML = '';

    // Populate valuse.
    Array.from(metaForm.elements).forEach(entry => {
      // Add keywords.
      if (entry.name === 'keywords') {
        entry.value.split('\n').forEach(word => word.length > 0 && keywords.appendChild(createElement('md:keyword', word)));
      }
      // Add roles.
      else if (~rolesNames.indexOf(entry.name) && entry.value.length > 0) {
        roles.appendChild(createElement(`md:role[type="${entry.name}"]`, entry.value))
      }
      // Add subjects.
      else if (entry.type === 'checkbox' && entry.checked) {
        subjects.appendChild(createElement('md:subject', entry.name));
      }
      // Add anything else.
      else {
        const matchingEntry = state.meta.querySelector(entry.name);
        if (matchingEntry) matchingEntry.innerHTML = entry.value;
      }
    });

    return serializer.serializeToString(state.meta).replace(/xmlns="http:\/\/www.w3.org\/1999\/xhtml"/g, '');
  };

  // Set Event Handler.
  element.addEventListener('click', detectAction);

  // Public API.
  return { element, set, get };
}());

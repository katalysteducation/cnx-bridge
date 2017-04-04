import inlineRules from "./inliners";


// ---- TO HTML HELPERS ----------------

// Rules container for the individual tag parsing logic.
const inliner = inlineRules();

// ---- Replacers ----------------

// Convert matched text into editable paragraph.
const extractEditables = (a, match) =>
  match.length > 0 ? `><p data-target="editable" contenteditable="true">${match}</p><` : '><';

// Restore inline elements from 'inlineStore'.
const restoreInlines = (storage) => (a, match) => storage[match];

// Handle self-closing tags -> make them
const selfClosingTags = (match) => {
  // If tah is self-closed.
  if (match[match.length - 2] === '/') {
    // Get tag name.
    const tag = match.slice(1, match.length - 2).split(' ')[0];
    // If <link/> (special case)
    if (tag === 'link') return `${match.slice(0, match.length - 2)}>Reference</${tag}>`;
    // Else if <label/> (special case)
    else if (tag === 'label') return '';
    // TODO: Investigate whether this is still necessary or not?
    // else if (tag === 'newline') return '<br>';
    // Standard cases.
    else return `${match.slice(0, match.length - 2)}></${tag}>`;
  }
  return match;
};

// Convert CNXML tags into DIVs with CNXML tag name assigned to 'data-type' attribute.
// This replacer will also preserve all CNXML attributes.
// It also skip tags passed as '...skip' arguments.
const cnxmlToDiv = (...skip) => {
  // Do not change those tags into: div[data-type].
  const inlineTags = skip.concat(skip.map(tag => '/' + tag));
  return (match) => {
    const tag = match.slice(1, match.indexOf(' '));
    // Skip inline tags.
    if (~inlineTags.indexOf(tag)) return match;
    // Replace match with <DIV>s.
    return ~match.indexOf('<\/') ? '</div>' : `<div data-type="${tag}"${match.slice(match.indexOf(' '), match.length)}`;
  };
};

// Convert CNXML to DIVs, and skip: 'br', 'ref', 'ref/' tags.
const convertToDivs = cnxmlToDiv('br', 'ref', 'ref/');

// Find cnxml tags according to the keys in 'rules' object and call proper parsing fn. when match is foud.
const extractInline = (cnxml, rules) => {
  // Match tag paris without self-closing tag.
  const phrese = Object.keys(rules).reduce((result, key) => result += `<${key}[^>]*>(.*?)</${key}>|`, '');
  const regex = new RegExp(phrese.slice(0,-1),"gm");
  return cnxml.replace(regex, (matched, content) => {
    const tag = matched.slice(matched.lastIndexOf('/') + 1, matched.length - 1);
    return rules[tag](matched, content);
  });
};


// --------------------------------------------
// ---- TO HTML EXPORT ----------------
// ------------------------

// Convert CNXML to HTML Editable tree.
export default function toHTML (template) {
  const result = template
    // Replace self-closing tags. !! Except <newline/>
    .replace(/<(.|\n)*?>/g, selfClosingTags)
    // Replace quote-wrappers with <wrapp> element -> this allow to avoid parser's confusion with quote-comments.
    .replace(/<quote[\S\s\w]+?type="wrapp"[\S\s\w]+?<\/quote>/g, (value) => value.replace(/quote/g, 'wrapp'))
    // Replace MATHML open-tag / close-tag marker.
    .replace(/(<m:)|(<\/m:)/g, (match) => ~match.indexOf('/') ? '</' : '<')
    // Remove newlines.
    .replace(/\n/g, '')

  return extractInline(result, inliner.rules)
    // Convert cnxml to html equivalent.
    .replace(/<((.|\n)*?)>/g, convertToDivs)
    // Remove multiple spaces -> prepaer maarkup before extracting editable content.
    .replace(/\s{2,}/g, '')
    // Extract editable content.
    .replace(/>([\S\s\w]*?)</g, extractEditables)
    // Restore inline markup.
    .replace(/#%([\w\S\s\.]+?)%#/gm, restoreInlines(inliner.store))
    // Convert <newline> to <br>
    .replace(/<newline><\/newline>/g, '<br>');
};

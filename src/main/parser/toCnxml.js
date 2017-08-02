import {copyAttrs} from "../../utilities/tools";
import {createElement} from "../../utilities/travrs";

// ---- Helpers ----------------

// Find all Bridge-MathJax elements and extract MATHML markup.
const cleanMath = (source) => {
  Array.from(source.querySelectorAll('span.glass')).forEach(element => {
    const parent = element.parentNode;
    parent.insertBefore(document.createRange().createContextualFragment(element.querySelector('script').textContent), element);
    parent.removeChild(element);
  });
  return source;
};

// Create new 'x-tag' element from the Editable element.
const cloneXElement = (clone, node) => {
  // Clone only typeed and non-empty nodes.
  if (node.dataset.type) {
    const newChild = createElement('x-' + node.dataset.type);
    // Copy attrinytes, excluding 'data-type'.
    Array.from(node.attributes).forEach(attr => attr.name !== 'data-type' && newChild.setAttribute(attr.name, attr.value));
    // Appned x-tag.
    clone.appendChild(newChild);
  }
  // Get content form editable node.
  else clone.innerHTML = node.innerHTML
    // Replace break-lines with <newline>NL</newline> element.
    // For some reason if <newline></newline> does not have content it wraps around text near to it what breaks markup.
    // Also <br> can't be placed in Editable node in any correct form: <br/> OR <br></br> which also breaks the markup.
    .replace(/<br>/g, '<newline>NL</newline>');
};

// Walk through Editable Tree & create 'x-tags' structure, that can be easily trensforemd into CNXML.
const xClone = (node, clone) => {
  // Skip editables.
  if (node.tagName !== 'P') {
    Array.from(node.children).forEach((child, index) => {
      if (!clone.children[index]) cloneXElement(clone, child);
      if (child.firstChild) xClone(child, clone.children[index])
    });
  }
  // return root.
  return clone;
};

// ---- Transformations ----------------

// Chenge <reference>s into <link> elements.
const transformRefs = (node) => {
  // Detect Self-closed <link/>
  const link = createElement('link', (node.innerHTML !== node.getAttribute('target-id')) ? node.innerHTML : '');
  copyAttrs(node, link);
  node.parentNode.replaceChild(link, node);
};

// Remove attribute inline from <term>
const transformTerms = (node) => {
  const term = createElement('term', node.innerHTML);
  node.parentNode.replaceChild(term, node);
};

// Remove unnecesery attributes from <quote type="commnet">
const transformComments = (node) => {
  node.removeAttribute('contenteditable');
  node.removeAttribute('class');
};

// Add namespace for math elements.
const transformMath = (node) =>
  node.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');

// Remove bridge's quote wrappers.
const cleanup = (node) => node.outerHTML = node.innerHTML;

// --------------------------------------------
// ---- TO CNXML ----------------
// ------------------------

// Convert 'source' HTML tree into CNXML string.
export default function toCnxml (htmlNode, clean = false) {

  // Clone source HTML node.
  const sourceClone = cleanMath(htmlNode.cloneNode(true));

  // Create x-tag equivalents of CNXML. This will make easier
  // to translate CNXML elements that aren't compatible with HTML5
  const xml = xClone(sourceClone, createElement('x-content')).outerHTML
    // Remove 'x-' prefix at the end.
    .replace(/<x-|<\/x-/g, (x) => ~x.indexOf('<\/') ? '</' : '<')
    // Close <img> tags.
    .replace(/<img(.*?)>/g, (a, attrs) => `<image${attrs}/>`)
    // Remove all non-breaking sapces.
    .replace(/&nbsp;/g, ' ');

  // Instantiate XML barser & serializer.
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const cnxml = parser.parseFromString(xml, "application/xml");

  // Transform back some of the xml tags to be compatible with CNXML standard.
  Array.from(cnxml.querySelectorAll('quote[type=comment]')).forEach(transformComments);
  Array.from(cnxml.querySelectorAll('reference')).forEach(transformRefs);
  Array.from(cnxml.querySelectorAll('term')).forEach(transformTerms);
  Array.from(cnxml.querySelectorAll('math')).forEach(transformMath);

  // Clean content from bridge's wrappers.
  if (clean) Array.from(cnxml.querySelectorAll('quote[type=comment], quote[type=wrapp]')).forEach(cleanup);

  // Return final CNXML.
  return serializer.serializeToString(cnxml)
    // Remove unecesery xml namesapces form CNXML elements -> Leftovers from parsing & editing.
    .replace(/xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '')
    // Remove conetnt from <newline>NL</newline> tag.
    .replace(/<newline>NL<\/newline>/g, '<newline/>');
};

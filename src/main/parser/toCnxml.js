import {createElement} from "../../utilities/travrs";


// ---- TO CNXML HELPERS ----------------

// Find all Bridge-MathJax elements and extract MATHML markup.
const cleanMath = (source) => {
  Array.from(source.querySelectorAll('span.glass')).forEach(element => {
    const parent = element.parentNode;
    parent.insertBefore(
      document.createRange().createContextualFragment(
        element.querySelector('script')
          .textContent
          // Add MathML namespace
          .replace(/(\<m)|(\<\/m)/g, (match) => ~match.indexOf('/') ? '</m:m' : '<m:m')
      ),
      element
    );
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
  // Get content form editable & remove <div> elements wrapping <newline>s in Chrome.
  else clone.innerHTML = node.innerHTML.replace(/<div>|<\/div>/g, (match) => ~match.indexOf('/') ? ' ' : '');
};

// Walk through Editable Tree & create 'x-tags' structure, that can be easily trensforemd into CNXML.
const xClone = (node, clone) => {
  // Skip editables.
  if (node.tagName !== 'P') {
    Array.from(node.children).forEach((child, index) => {
      // console.log(node, child, clone);
      if (!clone.children[index]) cloneXElement(clone, child);
      if (child.firstChild) xClone(child, clone.children[index])
    });
  }
};

// ---- Replacers ----------------

// Replace <ref> tag with <link> tag.
const restoreReferences = (match, attrs, content) =>
  content === 'Reference' ? `<link${attrs}/>` : `<link${attrs}>${content}</link>`;


// --------------------------------------------
// ---- TO CNXML ----------------
// ------------------------

// Convert 'source' HTML tree into CNXML string.
export default function toCNXML (source) {

  const cnxml = createElement('x-section');
  const sourceClone = cleanMath(source.cloneNode(true));

  // Create x-tag equivalents of CNXML. This will make easier
  // to translate CNXML elements that aren't compatible with HTML5.
  xClone(sourceClone, cnxml);

  // Finalize. Trabslate x-tags to cnxml.
  return cnxml.innerHTML
    // Remove 'x-' prefix.
    .replace(/<x-|<\/x-/g, (x) => ~x.indexOf('<\/') ? '</' : '<')
    // Close <img> tags.
    .replace(/<img(.*?)>/g, (a, attrs) => `<image${attrs}/>`)
    // Restroe reference links.
    .replace(/<ref(.*?)>(.*?)<\/ref>/g, restoreReferences)
    // Replace <wrapp> tag with <quote> tah which can be stored in Legacy.
    // TODO: Mere it with the one below!
    .replace(/<wrapp|<\/wrapp>/g, (match) => ~match.indexOf('/') ? '</quote>' : '<quote')
    // Remove empty <quote> wrappers areound content. This may apear when inline tags like e.g. <term> are
    // used like block elements fore exampe in <definition>.
    .replace(/<quote>([\s\S\w]+?)<\/quote>/g, (a, match) => match)
    // Restore newline.
    .replace(/<br>/g, '<newline/>');
};

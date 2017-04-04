import { wrapElement } from "../../utilities/tools";

// Referecnes.
let equations, cnxb, inputProxy;

// Math buffer node.
const nodeBuffer = document.createElement('span');

// Pares Equations.
const renderMath = () => {

  // Get references.
  equations = MathJax.Hub.getAllJax(cnxb);

  // Render all math and apply click wrapper.
  equations.forEach(math => {
    const equation = document.getElementById(`${math.inputID}-Frame`);
    const parent = equation.parentNode;

    // MathJax generate 3 nodes per equation -> wrap them all in one.
    const wrapper = (parent.classList.contains('MJXc-display'))
      ? wrapElement([parent.previousSibling, parent, parent.nextSibling], 'div')
      : wrapElement([equation.previousSibling, equation, equation.nextSibling], 'span');

    wrapper.className = 'glass cnxb-math';
    wrapper.setAttribute('contenteditable', false);
    wrapper.dataset.select = 'math';
    wrapper.dataset.mathId = math.inputID;
  });


  // Re-render match no the page.
  const reRenderMath = () => {
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, renderMath]);
  };

  // Match mutaion type & run updateMath().
  const traceObserver = (mutations) =>
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-math-id'){
        updateMath(inputProxy.dataset.mathId, inputProxy.value);}
      if (mutation.attributeName === 'data-re-render')
        reRenderMath()
    });

  // Instantiate new observer to track inputProxy changes.
  const observer = new MutationObserver(traceObserver);

  // Update Jax with given @id with new @latex formula.
  const updateMath = (id, latex) => {
    let found;
    nodeBuffer.innerHTML = `$ ${latex} $`;
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, nodeBuffer]);
    const MJNodes = MathJax.Hub.getAllJax(nodeBuffer);

    if (MJNodes.length > 0 && equations.some(math => (math.inputID === id && (found = math))))
      found.Text(MJNodes[0].root.toMathML());
  };

  // Observer InputProxy changes to update right MathJax equation.
  observer.observe(inputProxy, {
    attributes: true,
  	childList: false,
  	characterData: false,
    attributeFilter: ['data-math-id', 'data-re-render']
  });
};

// Start when page loaded.
window.onload = function() {
  cnxb = document.getElementById('cnxb');
  inputProxy = document.getElementById('InputProxy');
  MathJax && MathJax.Hub ? MathJax.Hub.Queue(["Typeset", MathJax.Hub, renderMath]) : console.warn("MathJax not detected");
};

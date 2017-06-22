import { wrapElement } from "../../utilities/tools";

// Start when page loaded.
window.onload = function() {
  // Exit if no MathJax.
  if (!MathJax || !MathJax.Hub) return console.warn("MathJax not detected");

  // References.
  const cnxb = document.getElementById('cnxb');
  const inputProxy = document.getElementById('MathProxy');

  // Math buffer node.
  const nodeBuffer = document.createElement('span');

  // Equations references.
  let equations;

  // Pares Equations.
  const renderMath = () => {
    // Get references.
    equations = MathJax.Hub.getAllJax(cnxb);
    // Render all math and apply click wrapper.
    equations.forEach(math => {
      const equation = document.getElementById(`${math.inputID}-Frame`);
      // MathJax generate 3 nodes per equation -> wrap them all in one.
      if (!equation.parentNode.classList.contains('cnxb-math')) {
        const wrapper =  wrapElement([equation.previousSibling, equation, equation.nextSibling], 'span');
        wrapper.className = 'glass cnxb-math';
        wrapper.dataset.select = 'math';
        wrapper.dataset.mathId = math.inputID;
        wrapper.setAttribute('contenteditable', false);
      }
    });
  };

  // Update Jax with given @id with new @latex formula.
  const updateMath = (id, latex) => {
    let found;
    nodeBuffer.innerHTML = `$ ${latex} $`;
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, nodeBuffer]);
    const MJNodes = MathJax.Hub.getAllJax(nodeBuffer);
    if (MJNodes.length > 0 && equations.some(math => (math.inputID === id && (found = math))))
      found.Text(MJNodes[0].root.toMathML());
  };

  // Re-render match no the page.
  const reRenderMath = () => MathJax.Hub.Queue(["Typeset", MathJax.Hub, renderMath]);

  // Match mutaion type & run updateMath().
  const traceObserver = (mutations) =>
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-math-id')
        updateMath(inputProxy.dataset.mathId, inputProxy.value);
      else if (mutation.attributeName === 'data-re-render')
        reRenderMath();
    });

  // Instantiate new observer to track inputProxy changes.
  const observer = new MutationObserver(traceObserver);

  // Observer InputProxy changes to update right MathJax equation.
  observer.observe(inputProxy, {
    attributes: true,
  	childList: false,
    attributeFilter: ['data-math-id', 'data-re-render', 'value']
  });

  // Render math - First run.
  MathJax.Hub.Queue(["Typeset", MathJax.Hub, renderMath]);
};

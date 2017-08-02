
// ------------------------------------------------
// ---- BACKUP CORE ----------------
// ------------------------

// Bakup module for CNX-Bridge.
// Create copy of last working module in Legacy in case Bridge mess up with the module markup.
export default (function Backup() {

  const textarea = document.querySelector('#textarea');
  const saveButton = document.querySelector('#edit_form > input[type=submit]');
  const moduleId = (window.location.href.match(/-[0-9]{2}.([0-9]+)\//) || [,])[1];
  const hasErrors = document.querySelector('#cnx_validation_errors');

  // Alt + Ctrl + r -> Restore Content Backup Copy
  const keyboardHandles = ({altKey, ctrlKey, key}) => {
    if (altKey && ctrlKey && key === 'r') {
      if (textarea && saveButton && moduleId) {
        const backup = JSON.parse(localStorage.getItem('cnx-bridge-ct-backup') || false);
        if (!backup.content || backup.module !== moduleId) return alert('Backup copy does not exist!');
        else {
          textarea.value = backup.content;
          if (confirm('Restoring succeeded! Do you wanyt save the module now?')) saveButton.click();
        }
      }
      else return alert('Restoring cannot be performed. This is page is either not a Module or not in Full-source Editing mode.');
    }
  };

  // Keyboard listeners.
  document.addEventListener('keyup', keyboardHandles);

  // Save working copy.
  if (textarea && moduleId && !hasErrors) {
    localStorage.setItem('cnx-bridge-ct-backup', JSON.stringify({ module: moduleId, content: textarea.value }));
    console.log('Backup module: ' + moduleId);
  }
  else if (hasErrors) return console.warn('This module is broken - Restore its previous version by pressing: "Alt + Ctrl + r"');

})();

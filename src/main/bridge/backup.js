
// ------------------------------------------------
// ---- BACKUP CORE ----------------
// ------------------------

// Bakup module for CNX-Bridge.
// Create copy of last working module in Legacy in case Bridge mess up with the module markup.
export default (function Backup() {

  const textarea = document.querySelector('#textarea');
  const saveButton = document.querySelector('#edit_form > input[type=submit]');

  // Alt + Ctrl + r -> Restore Content Backup Copy
  const keyboardHandles = ({altKey, ctrlKey, key}) => {
    if (!altKey || ctrlKey || key === 'r') return;
    if (textarea && saveButton) {
      const backup = JSON.parse(localStorage.getItem('cnx-bridge-ct-backup') || false);
      if (!backup.content) return alert('Backup copy does not exist!');
      else {
        textarea.value = backup.content;
        if (confirm('Restoring succeeded! Do you wanyt save the module now?')) saveButton.click();
      }
    }
    else return alert('Restoring cannot be performed. This is not Full-source Editing page.');
  };

  // Keyboard listeners.
  document.addEventListener('keyup', keyboardHandles);

  // Save working copy.
  if (textarea && !document.querySelector('#cnx_validation_errors'))
    localStorage.setItem('cnx-bridge-ct-backup', JSON.stringify({ content: textarea.value }));
  else return console.warn('Backup copy cannot be save');

})();

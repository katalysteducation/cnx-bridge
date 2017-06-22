import client from "../../utilities/client";
import {getContent, getMetadata, getClasses, date} from "../../utilities/tools";

// Get module id from URL.
const getModuleId = () => {
  const match = window.location.href.match(/-[0-9]{2}.([0-9]+)\//);
  match && console.log('Module detected. ID: ', match[1]);
  return match ? match[1] : 9655866818; //2357341580; //58272;
};

// Create module if not exist.
const verifyModule = (user, avatar) => (response) => {
  // If response contains Error object with module-not-exist code (409)
  // then create requested module in archive and fetch it again.
  if (response.error && response.code === 409)
    return client.set.module({
      module_id: 0,
      avatar: avatar,
      user: user,
      date: date(true),
      module_cnx_id: response.module_id
    })
    .then(confirm => {
      if (confirm.msg !== 'OK') throw "Storage :: CNX-Bridge Was unable to create module. " + confirm.message;
      return true;
    })
    .then(
      success => client.get.module(response.module_id),
      fail => console.error(fail)
    );
  // In case of any other errors break.
  else if (response.error)
    throw "Storage :: Unexpected server error " +  response.error + '\n' + response.message;
  // If everything is OK, return regular server response.
  else
    return response;
};

// HOF converting Bridge Revision to Module-object & updating passed 'model'.
const addRevision = (currentModule, configuration) => (content, comments) =>
  Promise.all([currentModule, configuration])
    .then(([module, config]) => {
      module.revisions.push({
        revision_id: 0,
        date: date(true),
        user: config.user,
        comments: comments,
        content: content.replace(/"/g, '\"')
      });
      return { content, comments, module };
    });

// Try to reconnect.
const reconnect = (user, pin) => (response) => {
  // Remove old token.
  client.signout();
  // Authorize with old PIN na user.
  return client.authorize(user, pin)
  .then (token => {
    console.log('Reconnected...');
    chrome.storage.sync.set({ token: token });
  })
  .catch(error => console.warn('Storage :: Unable to reconnect:', error));
};

// Helper to recover after reconnection.
const retry = (response) =>
  response.module_id ? response : client.get.module(response);

// Load current CNXML version from Legacy #textarea.
const readCurrentCnxml = (root) => () => new Promise((resolve, reject) => {
  const textarea = root.querySelector('#textarea');
  const metadata = getMetadata(textarea ? textarea.value : '');
  const content = getContent(textarea ? textarea.value : '');
  const classes = getClasses(textarea ? textarea.value : '');
  resolve({ classes, content, metadata });
})

// Convert markup & save data in legacy.
const saveInLegacy = (content, classes = '', root) => new Promise((resolve, reject) => {
  const textarea = root.querySelector('#textarea');
  const button = root.querySelector('#edit_form > input[type=submit]');
  // Fail if no UI to hook up.
  if (!textarea || !button) reject('Storage :: There is no Legacy UI to hook up -- no textarea OR save button');
  // Populate textarea with new CNXML.
  textarea.value = textarea.value.replace(/<content>([\S\s\w]+)<\/content>/, content
    .replace('<content>', '<content>' + classes))
  // NOTE: !Metadata sveing is not supported by the full-source-editing -- DEAD-END!
  // .replace(/<metadata([\S\s\w]+)<\/metadata>/, metadata);
  // Start saving process in Legacy.
  button.click();
  // Finish.
  resolve(true);
});

// Save a backup copy of the cnxml content if it not contains any errors.
const createBackupCopy = (root) => new Promise((resolve) => {
  const textarea = root.querySelector('#textarea');
  if (textarea && !document.querySelector('#cnx_validation_errors')) {
    localStorage.setItem('cnx-bridge-ct-backup', JSON.stringify({ date: date(true), content: textarea.value }));
    resolve(true);
    return;
  }
  resolve(false);
});

// Load contant backup copy from localStorage.
const restoreBackupContent = (root) => () => new Promise((resolve, reject) => {
  const textarea = root.querySelector('#textarea');
  if (textarea) {
    const backup = JSON.parse(localStorage.getItem('cnx-bridge-ct-backup') || false);
    if (!backup.content) reject({error:true, message: "Backup copy does not exist."});
    else {
      textarea.value = backup.content;
      resolve({success:true});
    }
  }
  reject({error:true, message: "No #textarea element."});
});

// Fetch current configuration and convert it to the promise.
const getCurrentConfig = () => new Promise((resolve) =>
  chrome.storage.sync.get(({ user, avatar, token, pin, backend }) =>
    resolve({ user, avatar, token, pin, backend, status : ((!pin && !token) ? 'signed-out' : 'active') })
  ));

// Get Curent Module from Archive.
// If Bridge have access to backend and all required credentials, then test the connection against server close session.
const getCurrentModule = ({ user, status, token, pin, avatar }) => {
  // Fail if state is inactive.
  if (status !== 'active') throw { error: true, type: 'archive-connection-error', message: 'Storage :: No acces to Archive server.'};
  // Get module id.
  const id = getModuleId();
  // Sign request headers with authorization token.
  client.signin(token);
  // Test if Bridge can establish connection with archive.
  return client.get.test()
    // Reconnect if user not authorised.
    .catch(reconnect(user, pin))
    // Get mofule from the Archive.
    .then(resp => client.get.module(id))
    // If module does not exist create one and return it.
    .catch(verifyModule(user, avatar));
};


// ------------------------------------------------
// ---- STORAGE CORE ----------------
// ------------------------

// Data manager for CNX-Bridge.
export default (function Storage() {

  // Get data from chrome.stroege.
  const config = getCurrentConfig();

  // Get Curent Module from the BAD (Bridge Archive Database).
  const currentModule = config.then(getCurrentModule);

  // Get Legacy data from the #textarea.
  const legacy = readCurrentCnxml(document);

  // Get all previous revisions.
  const history = currentModule.then(module => module.revisions);

  // Create update fn. to update current model with the new revision.
  const updateCurrentModule = addRevision(currentModule, config);

  // Create a backup copy of the cnxml content if it not contains any errors.
  const backupContent = createBackupCopy(document);

  // Restore backup copy of last correct formatted content.
  const restoreContent = restoreBackupContent(document);

  // ---- API METHODS ----------------

  // Save current 'content' and 'comments' to the localStorage.
  // Optionaly pass 'module' instance so it can be pipe into the 'saveRevision' chain.
  const saveDraft = ({ content, comments, module }) => {
    localStorage.setItem('cnx-bridge-backup', JSON.stringify({ date: date(true), content, comments }));
    return module;
  };

  // Save current revision in legacy & Archive.
  const saveRevision = (revision, comments = {}) =>
    updateCurrentModule(revision, comments)
      // .then(saveLocalCopy)
      .then(saveDraft)
      .then(client.set.module)
      .catch(console.error);


  // Get latest saved CNXML from LocalStorage.
  const restore = () => {
    const backup = JSON.parse(localStorage.getItem('cnx-bridge-backup') || false);
    return backup ? {...backup} : undefined;
  }

  // Save data in Legacy System.
  const saveCnxml = (cnxml, classes) => saveInLegacy(cnxml, classes, document).catch(console.error);

  // Clear all revisions in module with given 'id'.
  const clearModule = (id) => {
    localStorage.removeItem('cnx-bridge-backup');
    return client.get.clear(id || getModuleId());
  };


  // Public API.
  return {
    // Getters.
    config,   // prop -> Promise: { user, avatar, token, pin, backend, status }
    legacy,   // func -> Promise: { content, metadata, classes }
    history,  // prop -> Promise: { module.revisions }
    restore,  // func -> Object:  { module }

    // Setters.
    saveDraft,    // ({content, comments, module}) -> Promise
    saveCnxml,    // (cnxml) -> Promise
    clearModule,  // (module-db-id) -> Promise
    saveRevision, // (content, comments) -> Promise

    // Backup methods.
    backupContent, // prop -> Promise:Boolean
    restoreContent // func -> Boolean
  };
}());

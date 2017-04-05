import client from "../../utilities/client";
import {getContent, getMetadata, date} from "../../utilities/tools";

// Get module id from URL.
const getModuleId = () => {
  const match = window.location.href.match(/-[0-9]{2}.([0-9]+)\//);
  match && console.log('Module detected. ID: ', match[1]);
  return match ? match[1] : 2357341580; //58272;
};

// Create module if not exist.
const verifyModule = (username, avatar) => (response) => {
  // If response contains Error object with module-not-exist code (409)
  // then create requested module in archive and fetch it again.
  if (response.error && response.code === 409)
    return client.set.module({
      module_id: 0,
      avatar: avatar,
      user: username,
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
        user: config.username,
        comments: JSON.stringify(comments),
        content: content.replace(/"/g, '\"')
      });
      return module;
    });

// Try to reconnect.
const reconnect = (username, pin) => (response) => {
  // Remove old token.
  client.signout();
  // Authorize with old PIN na username.
  return client.authorize(username, pin)
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
const readCurrentCnxml = (root) => () => {
  const textarea = root.querySelector('#textarea');
  return {
    content: getContent(textarea ? textarea.value : ''),
    metadata: getMetadata(textarea ? textarea.value : '')
  }
};


// Convert markup & save data in legacy.
const saveInLegacy = (content, root) => new Promise((resolve, reject) => {
  const textarea = root.querySelector('#textarea');
  const button = root.querySelector('#edit_form > input[type=submit]');
  // Fail if no UI to hook up.
  if (!textarea || !button) reject('Storage :: There is no Legacy UI to hook up -- no textarea OR save button');
  // Populate textarea with new CNXML.
  textarea.value = textarea.value.replace(/<content>([\S\s\w]+)<\/content>/, `<content>${content}</content>` )
  // .replace(/<metadata>([\S\s\w]+)<\/metadata>/, metadata.outerHTML );
  // Start saving process in Legacy.
  button.click();
  // Finish.
  resolve(true);
});

// Save local copy of current CNXML.
const saveLocalCopy = (module) => {
  const currentCnxml = module.revisions[module.revisions.length - 1].content;
  localStorage.setItem('cnx-bridge-backup', JSON.stringify({ date: date(true), cnxml: currentCnxml }));
  return module;
};

// Fetch current configuration and convert it to the promise.
const getCurrentConfig = () => new Promise((resolve) =>
  chrome.storage.sync.get(({ username, avatar, token, pin, backend }) =>
    resolve({ username, avatar, token, pin, backend, status : ((!pin && !token) ? 'signed-out' : 'active') })
  ));

// Get Curent Module from Archive.
// If Bridge have access to backend and all required credentials, then test the connection against server close session.
const getCurrentModule = ({ username, status, token, pin, avatar }) => {
  // Fail if state is inactive.
  if (status !== 'active') throw 'Storage :: No acces to Archive server.';
  // Get module id.
  const id = getModuleId();
  // Sign request headers with authorization token.
  client.signin(token);
  // Test if Bridge can establish connection with archive.
  return client.get.test()
    // Reconnect if user not authorised.
    .catch(reconnect(username, pin))
    // Get mofule from the Archive.
    .then(resp => client.get.module(id))
    // If module does not exist create one and return it.
    .catch(verifyModule(username, avatar));
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

  // Get all revisions without the latest -> the histroy data.
  const history = currentModule.then(module => module.revisions.slice(0,-1).reverse());

  // Get the latest revision for current module.
  const latest = currentModule.then(module => module.revisions.reverse()[module.revisions.length - 1]);

  // Create update fn. to update current model with the new revision.
  const updateCurrentModule = addRevision(currentModule, config);


  // ---- API METHODS ----------------

  // Save current revision in legacy & Archive.
  const saveRevision = (revision, comments = {}) =>
    updateCurrentModule(revision, comments)
      .then(saveLocalCopy)
      // .then(client.set.module)
      .catch(console.error);


  // Get latest saved CNXML from LocalStorage.
  const restore = () => {
    const backup = JSON.parse(localStorage.getItem('cnx-bridge-backup') || false);
    return backup ? backup.cnxml : undefined;
  }

  // Save data in Legacy System.
  const saveCnxml = (cnxml) => saveInLegacy(cnxml, document).catch(console.error);

  // Clear all revisions in module with given 'id'.
  const clearModule = (id) => client.get.clear(id);


  // Public API.
  return {
    // Getters.
    config,   // prop -> Promise: { username, avatar, token, pin, backend, status }
    legacy,   // func -> Promise: { content, metadata }
    latest,   // prop -> Promise: { module.revisions.last }
    history,  // prop -> Promise: { module.revisions - 1 }
    restore,  // func -> Object:  { module }

    // Setters.
    saveCnxml,    // (cnxml) -> Promise
    clearModule,  // (module-db-id) -> Promise
    saveRevision  // (content, comments) -> Promise
  };
}());
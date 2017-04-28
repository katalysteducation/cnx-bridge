import Bridge from "./bridge";
import connect from "../utilities/connect";
import { injectScript, injectStyle } from "../utilities/tools";

// Add Google Icons.
injectStyle('https://fonts.googleapis.com/icon?family=Material+Icons');

// Load External scripts for rendering Math.
injectScript('app/jax/jax.config.js');
injectScript('https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-MML-AM_CHTML', true);
injectScript('app/jax/jax.js');


// ---- Initialize UI --------------------

const bridge = new Bridge(document.body);

// ---- Open UI communication channel ----

const uiChannel = connect.open('bridge');
uiChannel.listen('recover', bridge.recover);
uiChannel.listen('toggle', bridge.toggle);
uiChannel.listen('reload', bridge.reload);
uiChannel.listen('save', bridge.save);
uiChannel.listen('draft', bridge.saveDraft);

// ---- Send resore date to menu ----
uiChannel.listen('rdate', () => {
  const backup = JSON.parse(localStorage.getItem('cnx-bridge-backup') || false);
  uiChannel.send('rdate', { date : backup ? backup.date : undefined })
});

// ---- Open Options Panel when Bridge request it ----
bridge.showOptions(() => uiChannel.send('options'));

// Send info to background.js that content is active.
chrome.runtime.sendMessage({ ready : true });

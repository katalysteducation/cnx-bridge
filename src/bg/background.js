// CNX Bridge Background.
import connect from "../utilities/connect";

// ---- MESSAGES ----------------

let bridgeTabId;

// Open connection listener.
connect.start();

// Long-lived Connections.
connect.pipe('menu', 'save').to('bridge');
connect.pipe('menu', 'draft').to('bridge');
connect.pipe('menu', 'toggle').to('bridge');
connect.pipe('menu', 'reload').to('bridge');
connect.pipe('menu', 'recover').to('bridge');

// Set bidirectional connection.
// TODO: Add 'duplex' method to connect lib.
// --> connect.duplex('menu', 'bridge', 'rdate');
connect.pipe('menu', 'rdate').to('bridge');
connect.pipe('bridge', 'rdate').to('menu');

// Show options panel when content-script demend it.
connect.listen('bridge','options', () => {
	chrome.runtime.openOptionsPage();
});

// Activete Popup Menu under CNX-Bridge icon.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// Allow only for one working CNX-Bridge instacne.
	if (!bridgeTabId) {
		bridgeTabId = sender.tab.id;
		chrome.pageAction.show(sender.tab.id);
	}
});

// Activate menu if current tab was reloaded.
chrome.tabs.onUpdated.addListener((id, {status}) => {
	if (status === 'complete') {
		bridgeTabId === id;
		chrome.pageAction.show(bridgeTabId);
	}
});

// When active tab is closed relaease bridgeTabId.
chrome.tabs.onRemoved.addListener((id, removed) => {
	if (bridgeTabId === id)
		bridgeTabId = undefined;
});

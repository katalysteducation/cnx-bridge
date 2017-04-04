import client from "../utilities/client";
require('./options.scss');

const usernameInput = document.getElementById('username');
const backendInput = document.getElementById('backend');
const avatarInput = document.getElementById('avatar');
const messages = document.getElementById('messages');
const connect = document.getElementById('connect');
const pinInput = document.getElementById('pin');
const color = document.getElementById('color');

const lockPanel = () => {
  connect.innerHTML = "Connected";
  usernameInput.disabled = true;
  avatarInput.disabled = false;
  pinInput.disabled = true;
  connect.disabled = true;
  messages.innerHTML = '';
};

const unlockPanel = () => {
  connect.innerHTML = "Save";
  usernameInput.disabled = false;
  avatarInput.disabled = false;
  pinInput.disabled = false;
  connect.disabled = false;
};

const errorHandle = (error) => {
  console.error(error);
  messages.innerHTML = 'Authorization error. Check your PIN and Username.'
};

const connectToArchive = (event) => {
  if (usernameInput.value.length > 0 && pinInput.value.length > 0)
    client.authorize(usernameInput.value, pinInput.value)
      .then(token => {
        chrome.storage.sync.set({
          token: token,
          pin: pinInput.value,
          avatar: avatarInput.value,
          backend: backendInput.value,
          username: usernameInput.value
        }, lockPanel);
      })
      .catch(errorHandle);
};

const diconnectBridge = (event) => {

  // Shift + D - Clear all data in chrome.storage.
  if (event.shiftKey && event.keyCode === 68) {
    chrome.storage.sync.clear();
    usernameInput.value = '';
    pinInput.value = '';
    client.signout();
    unlockPanel();
    messages.innerHTML = 'Disconnected by User';
  }

  // Shift + Q - Change token value in chrome.storage.
  // This simulate session timeout.
  if (event.shiftKey && event.keyCode === 81) {
    console.log('Disrupt token');
    chrome.storage.sync.set({ token: 'disrupted' });
  }
};


const loadOptions = () => {
  chrome.storage.sync.get(({ pin = '', username = '', avatar = '#666666', token}) => {
    usernameInput.value = username;
    avatarInput.value = avatar;
    pinInput.value = pin;
    color.style.background = avatar;

    if (!token) {
      connectToArchive();
    }
    else {
      client.signin(token);
      client.get.test().then(lockPanel).catch(errorHandle);
    }
  });
};

const updateColor = (event) => {
  color.style.background = event.target.value;
}

avatarInput.addEventListener('change', updateColor);
connect.addEventListener('click', connectToArchive);
document.addEventListener('keydown', diconnectBridge);
document.addEventListener('DOMContentLoaded', loadOptions);

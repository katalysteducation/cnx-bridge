import client from "../utilities/client";
require('./options.scss');

const backendInput = document.getElementById('backend');
const avatarInput = document.getElementById('avatar');
const messages = document.getElementById('messages');
const connect = document.getElementById('connect');
const userInput = document.getElementById('user');
const pinInput = document.getElementById('pin');
const color = document.getElementById('color');

const lockPanel = () => {
  connect.innerHTML = "Connected";
  messages.innerHTML = '';
  connect.disabled = true;
  pinInput.disabled = true;
  userInput.disabled = true;
  avatarInput.disabled = false;
};

const unlockPanel = () => {
  connect.innerHTML = "Save";
  connect.disabled = false;
  pinInput.disabled = false;
  userInput.disabled = false;
  avatarInput.disabled = false;
};

const errorHandle = (error) => {
  console.error(error);
  messages.innerHTML = 'Authorization error. Check your PIN and Username.'
};

const connectToArchive = (event) => {
  if (userInput.value.length > 0 && pinInput.value.length > 0)
    client.authorize(userInput.value, pinInput.value)
      .then(token => {
        chrome.storage.sync.set({
          token: token,
          pin: pinInput.value,
          user: userInput.value,
          avatar: avatarInput.value,
          backend: backendInput.value
        }, lockPanel);
      })
      .catch(errorHandle);
};

const diconnectBridge = (event) => {

  // Shift + D - Clear all data in chrome.storage.
  if (event.shiftKey && event.keyCode === 68) {
    chrome.storage.sync.clear();
    userInput.value = '';
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
  chrome.storage.sync.get(({ pin = '', user = '', avatar = '#666666', token}) => {
    pinInput.value = pin;
    userInput.value = user;
    avatarInput.value = avatar;
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

import connect from "../utilities/connect";
require('./menu.scss');

const initialize = () => {
  const saveBtn = document.getElementById('save');
  const draftBtn = document.getElementById('draft');
  const bridgeBtn = document.getElementById('bridge');
  const reloadBtn = document.getElementById('reload');
  const recoverBtn = document.getElementById('recover');
  const recoverDate = document.getElementById('recdate');


  // Set communication channel.
  const uiChannel = connect.open('menu');

  // Set recovery date.
  uiChannel.send('rdate');
  uiChannel.listen('rdate', ({ date }) => !date ? recoverBtn.disabled = true : recoverDate.innerHTML = date);

  // Bridge UI Toggle.
  bridgeBtn.addEventListener('click', (event) => {
    uiChannel.send('toggle');
  });

  // Seave module in Legacy
  saveBtn.addEventListener('click', (event) => {
    uiChannel.send('save');
  });

  // Save revision to archive.
  recoverBtn.addEventListener('click', (event) => {
    uiChannel.send('recover');
  });

  // Reload content in bridge workspace.
  reloadBtn.addEventListener('click', (event) => {
    uiChannel.send('reload');
  });

  // Save current document draft in localStorage.
  draftBtn.addEventListener('click', (event) => {    
    uiChannel.send('draft');
  });
};

// Run after document is loaded.
document.addEventListener("DOMContentLoaded", initialize);

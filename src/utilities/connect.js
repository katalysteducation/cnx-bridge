// Developer-friendly API over chrmoe.runtime Long-lived connections.
// by Wojciech Ludwin 2017 - ludekarts@gmail.com.
// version: 0.0.7

export default (function Connect () {

  function ProxyPort(port) {
    const actions = {};

    this.send = (address, payload) => port.postMessage({ address, payload });

    this.listen = (address, callback) => actions[address] = callback;

    port.onMessage.addListener((message) => {
      const action = actions[message.address];
      if (action) action(message.payload);
      else console.warn(`Connect::ProxyPort -> Command: "${message.address}" have no listeners.`);
    });

    return this;
  }

  // USE-IN: popup_script & content_script.
  const open = (channel) =>
    new ProxyPort(chrome.runtime.connect({name: channel}));

  const _ports = {};
  const _actions = {};

  // USE-IN: background.js
  const start = () => {
    chrome.runtime.onConnect.addListener((port) => {
      if (!_ports[port.name])
        _ports[port.name] = port; // Register new port.
      else if (_ports[port.name] !== port)
        _ports[port.name] = port   // Update port e.g. after disconect or page refersh.

      // Add lsitener for specific port.
      port.onMessage.addListener((message) => {
        const channel = _actions[port.name];
        if (!channel) return console.warn(`Connect::start() -> Channel: "${port.name}" have no listeners.`);

        const action = channel[message.address];
        if (action) action(message.payload);
        else console.warn(`Connect::start() -> Command: Address "${message.address}" does not exist.`);
      });
    });
  };


  // listen for message (action) in the channel.
  // USE-IN: background.js
  const listen = (channel, address, callback) => {
    if (!channel || !address || !callback) throw new Error("listen() method requires all attributes 'channel', 'address', 'callback'.");

    if (!_actions[channel]) _actions[channel] = {};
    _actions[channel][address] = callback;
  };

  // Shorthand for transfering messages from one listener (e.g. from content_script) to another (e.g. popup_script).
  // Example:
  //   connect.listen('ui', 'toggle', (state) => connect.send('bridgeUI', 'toggle', state));
  // Becomes:
  //   connect.pipe('ui', 'toggle').to('bridgeUI');
  // USE-IN: background.js
  const pipe = (fromChannel, fromAddress) => {
    return {
      to (toChannel, toAddress) {
        if (!toChannel && !toAddress) throw new Error(`Connect::pipe() -> Method to() requires at lest "channel" argument.`);

        listen(fromChannel, fromAddress, (value) => send(toChannel, toAddress || fromAddress, value))
      }
    }
  };

  // Shorthand for seting two-way commonication through the same channel.
  // USE-IN: background.js
  const duplex = (addressA, addressB, channel) => {
    if (!addressA || !addressB || !channel) throw new Error("duplex() method requires all attributes.");

    pipe(addressA, channel).to(addressB);
    pipe(addressB, channel).to(addressA);
  };

  // Send data to the channel.
  // USE-IN: background.js
  const send = (channel, address, payload) => {
    if (!channel || !address) throw new Error("send() method requires attributes 'channel' & 'address'.");

    const currentChannel = _ports[channel];
    if (currentChannel) currentChannel.postMessage({ address, payload });
    else console.warn(`Connect::send() -> Chennel: "${channel}" does not exist.`);
  };

  // Trash all old connections.
  // USE-IN: background.js
  const trash = () => {
    Object.keys(_ports).forEach(name => delete _ports[name]);
    Object.keys(_actions).forEach(name => delete _actions[name]);
  };

  // Public API.
  return { open, start, listen, send, pipe, duplex, trash };
}());

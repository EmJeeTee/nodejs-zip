"use strict";
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
// Import the necessary Electron components.
const contextBridge = require('electron').contextBridge;
const ipcRenderer = require('electron').ipcRenderer;



// White-listed channels.
const ipc = {
    'render': {
        // From render to main.
        'send': [
            'takeFile',
            'lookFolder'
            ],

        // From main to render.
        'receive': [
            'files',
            'lookFolder',
            'clear'
        ],

        // From render to main and back again.
        'sendReceive': [
            'get-options',
            'get-log-files'
        ],

        // For synchronous operations that block the renderer process (i.e page freezes)
        'sendSync': [
            'confirm',
            'prompt']
    }
};

// Exposed protected methods in the render process.
contextBridge.exposeInMainWorld(
    // Allowed 'ipcRenderer' methods.
    'peripheralAPI', {
        // From render to main.
        send: (channel, args) => {
            let validChannels = ipc.render.send;
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, args);
            }
        },
        sendSync: (channel, args) => {
            let validChannels = ipc.render.sendSync;
            if (validChannels.includes(channel)) {
                return ipcRenderer.sendSync(channel, args);
            }
        },

        // From main to render.
        receive: (channel, listener) => {
            let validChannels = ipc.render.receive;
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`.
                ipcRenderer.on(channel, (event, ...args) => listener(...args));
            }
        },

        // From render to main and back again.
        sendReceive: (channel, args) => {
            let validChannels = ipc.render.sendReceive;
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, args);
            }
        }
    }
);
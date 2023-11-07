// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

import { ipcRenderer } from "electron";

// const { ipcRenderer } = require('electron');

const scanButton = document.querySelector("#scanButton");

scanButton.addEventListener("click", () => {
  console.log("scanButton clicked");

  ipcRenderer.on("scan-reply", (event, arg) => {
    document.querySelector("#result").innerHTML = arg;
  });

  ipcRenderer.send("scan");
});

const barcodeButton = document.querySelector("#barcodeButton");

barcodeButton.addEventListener("click", () => {
  ipcRenderer.on("find-barcode-reply", (event, arg) => {
    document.querySelector("#result").innerHTML = arg;
  });

  ipcRenderer.send("find-barcode");
});

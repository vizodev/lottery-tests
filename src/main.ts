import { app, BrowserWindow } from "electron";
import * as path from "path";
import { ipcMain, dialog } from "electron";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { scanImageData } from "@undecaf/zbar-wasm";
import Tesseract from "node-tesseract-ocr";
import jimp from "jimp";
import { spawn } from "child_process";
import * as pyshell from "python-shell";

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: false,
      nodeIntegration: true,
    },
    width: 800,
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("scan", async (event, arg) => {
  console.log("scan");
  // Open file picker for images

  const result = await dialog.showOpenDialog({
    buttonLabel: "Select",
    title: "Select an image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png"] }],
  });

  if (result.canceled) {
    console.log("No folder selected");
    return;
  }

  extractBarcode(event, result.filePaths[0]);
  extractText(event, result.filePaths[0]);
});

ipcMain.on("find-barcode", async (event, arg) => {
  console.log("find-barcode");
  // Open file picker for images

  const result = await dialog.showOpenDialog({
    buttonLabel: "Select",
    title: "Select an image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png"] }],
  });

  if (result.canceled) {
    console.log("No folder selected");
    return;
  }

  findBarcode(event, result.filePaths[0]);
});

async function extractBarcode(event: any, path: string) {
  const img = await loadImage(path),
    canvas = createCanvas(img.width, img.height),
    ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height) as ImageData;
  const symbols = await scanImageData(imageData);

  console.log(symbols);

  console.log(symbols[0]?.typeName, symbols[0]?.decode());

  event.reply("scan-reply", symbols[0].decode());
}

async function extractText(event: any, path: string) {
  const sharpenImage = await jimp.read(path).then((image) => {
    return image
      .color([{ apply: "desaturate" as any, params: [90] }])
      .contrast(1)
      .write("img-opt.jpg");
  });

  const buffer = await sharpenImage.getBufferAsync(jimp.MIME_JPEG);

  await Tesseract.recognize(buffer, {
    lang: "eng",
  }).then((text) => {
    console.log(text);
  });
}

async function findBarcode(event: any, path: string) {
  const shell = new pyshell.PythonShell("find-barcode.py", {
    args: [path],
    mode: "json",
  });

  shell.on("message", (message) => {
    console.log(message);
    event.reply("find-barcode-reply", message);
  });

  shell.end(function (err,code,signal) {
    if (err) throw err;
    console.log('The exit code was: ' + code);
    console.log('The exit signal was: ' + signal);
    console.log('finished');
  });
}

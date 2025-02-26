'use strict'

import { app, protocol, BrowserWindow, ipcMain, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import * as remote from '@electron/remote/main'
import path from 'path'
import fs from 'fs'
const yaml = require('js-yaml')
import fetch from 'node-fetch'

const isDevelopment = process.env.NODE_ENV !== 'production'
const FASTAPI_URL = 'http://localhost:8000'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// Initialisez remote avant de créer la fenêtre
remote.initialize()

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  remote.enable(win.webContents)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// Ajoutez ceci après les imports
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Video Folder'
  })
  return result
})

ipcMain.handle('folder:getVideos', async (_, folderPath) => {
  if (!folderPath) {
    throw new Error('Le chemin du dossier est requis')
  }

  const files = fs.readdirSync(folderPath)
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv']
  
  return files
    .filter(file => videoExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => ({
      name: file,
      path: path.join(folderPath, file),
      hidden: false
    }))
})

ipcMain.handle('video:getThumbnail', async (_, videoPath) => {
  if (!videoPath) {
    throw new Error('Le chemin de la vidéo est requis')
  }
  // Retourner null temporairement au lieu de générer une miniature
  return null
})

ipcMain.handle('calibration:save', async (_, data) => {
  try {
    const { folderPath, filePath, data: calibrationData } = data
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }

    // Sauvegarder les données en YAML
    const yamlStr = yaml.dump(calibrationData)
    fs.writeFileSync(filePath, yamlStr, 'utf8')

    return { success: true }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    throw error
  }
})

// Ajouter le gestionnaire pour les requêtes FastAPI
ipcMain.handle('fastapi:request', async (_, { endpoint, method = 'GET', params = {} }) => {
  try {
    let url = `${FASTAPI_URL}${endpoint}`
    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams(params)
      url += `?${queryParams.toString()}`
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(params) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('FastAPI request error:', error)
    throw error
  }
})

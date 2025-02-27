'use strict'

import { app, protocol, BrowserWindow, ipcMain, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import * as remote from '@electron/remote/main'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
const yaml = require('js-yaml')

const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'app', 
    privileges: { 
      secure: true, 
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    } 
  }
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
      webSecurity: false, // Permettre le chargement de ressources locales
      preload: path.join(__dirname, 'preload.js')
    }
  })

  remote.enable(win.webContents)

  // Autoriser le chargement de fichiers locaux
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

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

  // Enregistrer le gestionnaire de protocole personnalisé
  protocol.registerFileProtocol('local', (request, callback) => {
    const filePath = request.url.replace('local://', '')
    try {
      return callback(filePath)
    } catch (error) {
      console.error(error)
      return callback(404)
    }
  })

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

// Gestionnaires IPC
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

ipcMain.handle('video:getFirstFrame', async (_, videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      if (!videoPath) {
        throw new Error('Le chemin de la vidéo est requis')
      }

      if (!fs.existsSync(videoPath)) {
        throw new Error(`Vidéo non trouvée: ${videoPath}`)
      }

      // Créer un dossier temporaire s'il n'existe pas
      const tempDir = path.join(app.getPath('temp'), 'video-frames')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Nom du fichier de sortie
      const outputPath = path.join(tempDir, `frame-${Date.now()}.jpg`)

      // Commande FFmpeg pour extraire la première frame
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        outputPath
      ])

      ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data}`)
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg process exited with code ${code}`))
          return
        }

        // Lire l'image et la convertir en base64
        const imageBuffer = fs.readFileSync(outputPath)
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

        // Supprimer le fichier temporaire
        fs.unlinkSync(outputPath)

        resolve({
          success: true,
          data: base64Image
        })
      })

      ffmpeg.on('error', (error) => {
        reject(error)
      })
    } catch (error) {
      reject(error)
    }
  })
})

ipcMain.handle('calibration:save', async (_, { videoPath, calibrationData }) => {
  try {
    // Créer le chemin du dossier calib
    const basePath = path.dirname(videoPath)
    const calibFolder = path.join(basePath, 'calib')
    
    // Créer le dossier s'il n'existe pas
    fs.mkdirSync(calibFolder, { recursive: true })
    
    // Créer le nom du fichier de calibration
    const videoName = path.basename(videoPath)
    const calibFilename = `${path.parse(videoName).name}_calibration.json`
    const calibFilepath = path.join(calibFolder, calibFilename)
    
    // Sauvegarder les données en JSON
    fs.writeFileSync(
      calibFilepath,
      JSON.stringify(calibrationData, null, 2),
      'utf8'
    )
    
    return {
      success: true,
      message: 'Calibration sauvegardée avec succès',
      filePath: calibFilepath
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    throw error
  }
})

ipcMain.handle('video:readFile', async (_, videoPath) => {
  try {
    if (!videoPath) {
      throw new Error('Le chemin de la vidéo est requis')
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Vidéo non trouvée: ${videoPath}`)
    }

    const videoBuffer = fs.readFileSync(videoPath)
    return videoBuffer
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier vidéo:', error)
    throw error
  }
})

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
    width: 1920,
    height: 1080,
    show: false, // Don't show the window until it's ready
    webPreferences: {
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false, // Allow loading local resources
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // win.setMenu(null)

  remote.enable(win.webContents)

  // Allow loading local files
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  // Maximize window before showing it
  win.maximize()
  
  // Show window once it's ready
  win.once('ready-to-show', () => {
    win.show()
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

  // Register custom protocol handler
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
    throw new Error('Folder path is required')
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
    throw new Error('Video path is required')
  }
  // Temporarily return null instead of generating thumbnail
  return null
})

ipcMain.handle('video:getFirstFrame', async (_, videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      if (!videoPath) {
        throw new Error('Video path is required')
      }

      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video not found: ${videoPath}`)
      }

      // Create temp directory if it doesn't exist
      const tempDir = path.join(app.getPath('temp'), 'video-frames')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Output filename
      const outputPath = path.join(tempDir, `frame-${Date.now()}.jpg`)

      // FFmpeg command to extract first frame
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

        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(outputPath)
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

        // Delete temp file
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

ipcMain.handle('calibration:save', async (_, { videoPath, calibrationData, outputFolder }) => {
  try {
    // Create calib folder path in the output directory
    const calibFolder = path.join(outputFolder, 'calib')
    
    // Create folder if it doesn't exist
    fs.mkdirSync(calibFolder, { recursive: true })
    
    // Create calibration filename
    const videoName = path.basename(videoPath)
    const calibFilename = `${path.parse(videoName).name}_calibration.json`
    const calibFilepath = path.join(calibFolder, calibFilename)
    
    // Save data as JSON
    fs.writeFileSync(
      calibFilepath,
      JSON.stringify(calibrationData, null, 2),
      'utf8'
    )
    
    return {
      success: true,
      message: 'Calibration saved successfully',
      filePath: calibFilepath
    }
  } catch (error) {
    console.error('Error saving calibration:', error)
    throw error
  }
})

ipcMain.handle('video:readFile', async (_, videoPath) => {
  try {
    if (!videoPath) {
      throw new Error('Video path is required')
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video not found: ${videoPath}`)
    }

    const videoBuffer = fs.readFileSync(videoPath)
    return videoBuffer
  } catch (error) {
    console.error('Error reading video file:', error)
    throw error
  }
})

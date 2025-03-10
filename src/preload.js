const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  openDirectory: async () => {
    try {
      return await ipcRenderer.invoke('dialog:openDirectory')
    } catch (error) {
      console.error('Error opening directory:', error)
      throw error
    }
  },
  getVideosFromFolder: async (folderPath) => {
    try {
      return await ipcRenderer.invoke('folder:getVideos', folderPath)
    } catch (error) {
      console.error('Error reading directory:', error)
      throw error
    }
  },
  readVideoFile: async (videoPath) => {
    try {
      const buffer = await ipcRenderer.invoke('video:readFile', videoPath)
      return buffer
    } catch (error) {
      console.error('Error reading video:', error)
      throw error
    }
  },
  getFirstFrame: async (videoPath) => {
    try {
      return await ipcRenderer.invoke('video:getFirstFrame', videoPath)
    } catch (error) {
      console.error('Error extracting frame:', error)
      throw error
    }
  },
  saveCalibration: async (videoPath, calibrationData, outputFolder) => {
    try {
      return await ipcRenderer.invoke('calibration:save', { videoPath, calibrationData, outputFolder })
    } catch (error) {
      console.error('Error saving calibration:', error)
      throw error
    }
  }
}) 
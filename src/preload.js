const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  openDirectory: async () => {
    try {
      return await ipcRenderer.invoke('dialog:openDirectory')
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du dossier:', error)
      throw error
    }
  },
  getVideosFromFolder: async (folderPath) => {
    try {
      return await ipcRenderer.invoke('folder:getVideos', folderPath)
    } catch (error) {
      console.error('Erreur lors de la lecture du dossier:', error)
      throw error
    }
  },
  readVideoFile: async (videoPath) => {
    try {
      const buffer = await ipcRenderer.invoke('video:readFile', videoPath)
      return buffer
    } catch (error) {
      console.error('Erreur lors de la lecture de la vidéo:', error)
      throw error
    }
  },
  getFirstFrame: async (videoPath) => {
    try {
      return await ipcRenderer.invoke('video:getFirstFrame', videoPath)
    } catch (error) {
      console.error('Erreur lors de l\'extraction de la frame:', error)
      throw error
    }
  },
  saveCalibration: async (videoPath, calibrationData) => {
    try {
      return await ipcRenderer.invoke('calibration:save', { videoPath, calibrationData })
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la calibration:', error)
      throw error
    }
  }
}) 
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
  getVideoThumbnail: async (videoPath) => {
    try {
      return await ipcRenderer.invoke('video:getThumbnail', videoPath)
    } catch (error) {
      console.error('Erreur lors de la génération de la miniature:', error)
      throw error
    }
  },
  getFirstFrame: async (videoPath) => {
    try {
      const response = await ipcRenderer.invoke('fastapi:request', {
        endpoint: '/video/first-frame',
        method: 'GET',
        params: { video_path: videoPath }
      });
      return response.data; // Retourne l'image en base64
    } catch (error) {
      console.error('Erreur lors de la récupération de la frame:', error);
      throw error;
    }
  },
  saveCalibration: async (data) => {
    try {
      return await ipcRenderer.invoke('calibration:save', data)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la calibration:', error)
      throw error
    }
  }
}) 
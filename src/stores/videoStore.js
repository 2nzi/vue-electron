import { defineStore } from 'pinia'

export const useVideoStore = defineStore('video', {
  state: () => ({
    videos: [],
    selectedVideo: null,
    defaultPath: 'C:\\Users\\antoi\\Documents\\Work_Learn\\Stage-Rennes\\RepositoryFootballVision\\SportDETR\\data\\football\\raw'
  }),
  
  actions: {
    setVideos(videos) {
      this.videos = videos
    },
    
    selectVideo(video) {
      this.selectedVideo = video
    },
    
    async loadVideosFromFolder(folderPath) {
      try {
        const videos = await window.electron.getVideosFromFolder(folderPath)
        this.videos = videos.map(video => ({
          name: video.name,
          path: video.path
        }))
        
        // Sélectionner automatiquement la première vidéo si elle existe
        if (this.videos.length > 0) {
          this.selectVideo(this.videos[0])
        }
        
        return this.videos
      } catch (error) {
        console.error('Error loading videos:', error)
        this.videos = []
        return []
      }
    }
  }
}) 
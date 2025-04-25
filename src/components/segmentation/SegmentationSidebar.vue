<template>
  <div class="segmentation-sidebar">
    <button class="select-folder-btn" @click="selectFolder">
      <span>Select Folder</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M7 13l5 5 5-5"/>
      </svg>
    </button>

    <div class="video-list" v-if="videoStore.videos.length">
      <div 
        v-for="video in videoStore.videos" 
        :key="video.path"
        class="video-item"
        :class="{ active: videoStore.selectedVideo?.path === video.path }"
        @click="selectVideo(video)"
      >
        {{ video.name }}
      </div>
    </div>
  </div>
</template>

<script>
import { useVideoStore } from '../../stores/videoStore'

export default {
  name: 'SegmentationSidebar',

  data() {
    const videoStore = useVideoStore()
    return {
      videoStore
    }
  },

  watch: {
    'videoStore.selectedVideo': {
      handler(newVideo) {
        console.log('Vidéo sélectionnée:', newVideo)
      },
      deep: true
    }
  },

  mounted() {
    // Charger le dossier par défaut au démarrage
    this.videoStore.loadVideosFromFolder(this.videoStore.defaultPath)
  },

  methods: {
    async selectFolder() {
      try {
        const result = await window.electron.openDirectory()
        if (result && !result.canceled) {
          const folderPath = result.filePaths[0]
          await this.videoStore.loadVideosFromFolder(folderPath)
        }
      } catch (error) {
        console.error('Error selecting folder:', error)
      }
    },

    selectVideo(video) {
      this.videoStore.setSelectedVideo(video)
      this.$emit('video-selected', video)
    }
  }
}
</script>

<style scoped>
.segmentation-sidebar {
  background: #363636;
  height: 100%;
  width: 200px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.select-folder-btn {
  background: #424242;
  border: none;
  border-radius: 8px;
  color: white;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 1rem;
  flex-shrink: 0;
}

.select-folder-btn:hover {
  background: #4a4a4a;
}

.video-list {
  height: 20vh;
  background: #424242;
  border-radius: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
}

/* Styles pour Firefox */
.video-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

/* Styles pour Chrome/Safari/Edge */
.video-list::-webkit-scrollbar {
  width: 4px;
}

.video-list::-webkit-scrollbar-track {
  background: transparent;
}

.video-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.video-item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  transition: background-color 0.2s;
}

.video-item:hover {
  background: #4a4a4a;
}

.video-item.active {
  background: #3a3a3a;
}
</style> 
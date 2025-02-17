<template>
  <div class="calibration">
    <!-- <div class="top-bar">
      <div class="menu-buttons">
        <button class="menu-btn">File</button>
        <button class="menu-btn">Edit</button>
        <button class="menu-btn">Help</button>
      </div>
    </div> -->

    <div class="main-content">
      <!-- Sidebar avec toggle -->
      <div class="sidebar" :class="{ 'sidebar-hidden': !showSidebar }">
        <div class="sidebar-header">
          <button @click="toggleSidebar" class="toggle-sidebar-btn">
            {{ showSidebar ? '←' : '→' }}
          </button>
        </div>
        <div class="video-list" v-if="showSidebar">
          <div v-for="video in videos" 
               :key="video.path"
               class="video-item"
               :class="{ 'selected': selectedVideo === video }"
               @click="selectVideo(video)">
            <span class="video-name">{{ video.name }}</span>
          </div>
        </div>
      </div>

      <!-- Zone principale -->
      <div class="content-area">
        <div class="metadata-section" v-if="selectedVideo">
          <h4>METADATA</h4>
          <div class="metadata-info">
            <p>nom: {{ selectedVideo.name }}</p>
            <p>session: nom_de_la_session</p>
            <p>création: {{ new Date().toLocaleDateString() }}</p>
          </div>
        </div>

        <div class="video-display">
          <div class="video-frame" 
               @wheel="handleZoom"
               @click="handleImageClick"
               ref="imageContainer">
            <div class="image-wrapper" :style="imageTransformStyle">
              <img v-if="thumbnail" 
                   :src="thumbnail" 
                   alt="Video frame"
                   @load="initializeImage"
                   ref="image"
                   class="video-image" />
              <div v-else class="loading">Chargement de la frame...</div>
              
              <!-- Points de calibration -->
              <div v-for="(point, index) in calibrationPoints" 
                   :key="index" 
                   class="calibration-point"
                   :style="{ left: `${point.x}px`, top: `${point.y}px` }">
              </div>
            </div>
          </div>
          <div class="field-container">
            <FootballField />
          </div>
        </div>

        <div class="shortkeys-section">
          <button class="shortkeys-btn">ShortKeys</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FootballField from '@/components/FootballField.vue'

export default {
  name: 'CalibrationView',
  components: {
    FootballField
  },
  props: {
    folderPath: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      videos: [],
      selectedVideo: null,
      thumbnail: null,
      showSidebar: true,
      scale: 1,
      minScale: 1,
      calibrationPoints: [],
      imageSize: { width: 0, height: 0 }
    }
  },
  computed: {
    imageTransformStyle() {
      return {
        transform: `scale(${this.scale})`,
        transformOrigin: 'center center'
      }
    }
  },
  async created() {
    if (this.folderPath) {
      await this.loadVideos()
    }
  },
  methods: {
    async loadVideos() {
      try {
        this.videos = await window.electron.getVideosFromFolder(this.folderPath)
        if (this.videos.length > 0) {
          await this.selectVideo(this.videos[0])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error)
      }
    },
    async selectVideo(video) {
      this.selectedVideo = video
      this.thumbnail = null
      try {
        const response = await fetch(`http://localhost:8000/video/first-frame?video_path=${encodeURIComponent(video.path)}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la frame');
        }
        const data = await response.json();
        this.thumbnail = data.data; // L'image en base64 qui sera affichée
      } catch (error) {
        console.error('Erreur lors du chargement de la première frame:', error);
        // Optionnel : ajouter un état d'erreur dans l'interface
        this.thumbnail = null;
      }
    },
    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },
    handleZoom(event) {
      if (event.ctrlKey) {
        event.preventDefault()
        const delta = event.deltaY > 0 ? -0.1 : 0.1
        // Ne jamais descendre en dessous du minScale qui assure la largeur minimale
        this.scale = Math.max(this.minScale, Math.min(3, this.scale + delta))
      }
    },
    
    handleImageClick(event) {
      const rect = event.target.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      this.calibrationPoints.push({
        x: x / this.scale,
        y: y / this.scale
      })
    },
    
    initializeImage(event) {
      this.imageSize = {
        width: event.target.naturalWidth,
        height: event.target.naturalHeight
      }
      
      const container = this.$refs.imageContainer
      if (container) {
        const containerWidth = container.clientWidth
        
        // S'assurer que l'image occupe au moins toute la largeur
        this.minScale = Math.max(1, containerWidth / this.imageSize.width)
        
        // Initialise l'échelle au minimum
        this.scale = this.minScale
      }
    }
  }
}
</script>

<style scoped>
.calibration {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  color: white;
}

.top-bar {
  background-color: #2a2a2a;
  padding: 0.5rem;
  border-bottom: 1px solid #3a3a3a;
}

.menu-buttons {
  display: flex;
  gap: 1rem;
}

.menu-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.menu-btn:hover {
  background-color: #3a3a3a;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background-color: #2a2a2a;
  transition: width 0.3s ease;
  border-right: 1px solid #3a3a3a;
}

.sidebar-hidden {
  width: 40px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #3a3a3a;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}

.video-list {
  overflow-y: auto;
}

.video-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #3a3a3a;
}

.video-item:hover {
  background-color: #3a3a3a;
}

.video-item.selected {
  background-color: #4a4a4a;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.metadata-section {
  margin-bottom: 1rem;
}

.video-display {
  flex: 1;
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.video-frame {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
  background-color: #2a2a2a;
}

.image-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  transition: transform 0.1s ease-out;
}

.video-image {
  width: 100%;
  object-fit: contain;
  display: block;
}

.calibration-point {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.field-container {
  flex: 1;
  background-color: #2a2a2a;
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  align-items: center;
}

.shortkeys-section {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
}

.shortkeys-btn {
  background-color: #3a3a3a;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.shortkeys-btn:hover {
  background-color: #4a4a4a;
}

.loading {
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 4px;
}
</style> 
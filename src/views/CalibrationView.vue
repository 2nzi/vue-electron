<template>
  <div class="calibration">
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
          <div class="video-frame-container">
            <div class="video-frame" 
                 ref="imageContainer"
                 :style="frameStyle"
                 @wheel.prevent="handleZoom"
                 @mousedown="handleMouseDown"
                 @mousemove="handleMouseMove"
                 @mouseup="stopPan"
                 @mouseleave="stopPan">
              <div class="image-container" :style="transformStyle">
                <img v-if="thumbnail" 
                     :src="thumbnail" 
                     alt="Video frame"
                     @load="initializeImage"
                     ref="image"
                     class="video-image" />
                <div v-for="(point, index) in calibrationPoints" 
                     :key="index"
                     class="calibration-point"
                     :style="{
                       left: `${point.x}px`,
                       top: `${point.y}px`
                     }">
                </div>
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
      aspectRatio: 1,
      imageSize: { width: 0, height: 0 },
      scale: 1,
      isPanning: false,
      panStart: { x: 0, y: 0 },
      translation: { x: 0, y: 0 },
      calibrationPoints: [],
      isMiddleMouseDown: false,
      lastMousePosition: { x: 0, y: 0 }
    }
  },
  computed: {
    frameStyle() {
      if (!this.aspectRatio) return {};
      
      const container = this.$refs.imageContainer?.parentElement;
      if (!container) return {};
      
      const parentWidth = container.clientWidth;
      const parentHeight = container.clientHeight;
      
      let width, height;
      
      if (parentWidth / parentHeight > this.aspectRatio) {
        height = parentHeight;
        width = height * this.aspectRatio;
      } else {
        width = parentWidth;
        height = width / this.aspectRatio;
      }
      
      return {
        width: `${width}px`,
        height: `${height}px`
      };
    },
    transformStyle() {
      return {
        transform: `translate(${this.translation.x}px, ${this.translation.y}px) scale(${this.scale})`,
        transformOrigin: '0 0'
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
        this.thumbnail = data.data;
      } catch (error) {
        console.error('Erreur lors du chargement de la première frame:', error);
        this.thumbnail = null;
      }
    },
    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },
    initializeImage(event) {
      const image = event.target;
      
      this.imageSize = {
        width: image.naturalWidth,
        height: image.naturalHeight
      };
      
      this.aspectRatio = this.imageSize.width / this.imageSize.height;
    },
    handleZoom(event) {
      const zoomFactor = 0.1;
      const delta = Math.sign(event.deltaY) * -1;
      const newScale = this.scale + delta * zoomFactor;
      
      // Limiter le zoom entre 1x et 5x
      const oldScale = this.scale;
      this.scale = Math.min(Math.max(newScale, 1), 15);
      
      // Si on revient à l'échelle 1, on réinitialise la translation
      if (this.scale === 1) {
        this.translation = { x: 0, y: 0 };
        return;
      }
      
      if (this.scale !== oldScale) {
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Point dans l'image originale que nous voulons garder sous la souris
        const pointX = (mouseX - this.translation.x) / oldScale;
        const pointY = (mouseY - this.translation.y) / oldScale;

        // Calculer la nouvelle translation pour maintenir le point sous la souris
        this.translation = {
          x: mouseX - (pointX * this.scale),
          y: mouseY - (pointY * this.scale)
        };

        // Logs pour debug
        console.log('--- Zoom Debug ---');
        console.log('Scale:', this.scale);
        console.log('Mouse position:', { mouseX, mouseY });
        console.log('Point in image:', { pointX, pointY });
        console.log('New translation:', this.translation);
      }
    },
    handleMouseDown(event) {
      // Molette de souris (button 1)
      if (event.button === 1) {
        event.preventDefault();
        this.isMiddleMouseDown = true;
        this.lastMousePosition = { x: event.clientX, y: event.clientY };
      } else if (event.button === 0) {
        // Clic gauche - ajout de point
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const pointX = (mouseX - this.translation.x) / this.scale;
        const pointY = (mouseY - this.translation.y) / this.scale;
        this.calibrationPoints.push({ x: pointX, y: pointY });
      }
    },
    handleMouseMove(event) {
      if (this.isMiddleMouseDown) {
        const deltaX = event.clientX - this.lastMousePosition.x;
        const deltaY = event.clientY - this.lastMousePosition.y;
        
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        
        // Calculer les limites de translation
        const scaledImageWidth = this.imageSize.width * this.scale;
        const scaledImageHeight = this.imageSize.height * this.scale;
        
        const minX = containerWidth - scaledImageWidth;
        const minY = containerHeight - scaledImageHeight;
        
        // Appliquer la translation avec les limites
        const newX = Math.min(0, Math.max(minX, this.translation.x + deltaX));
        const newY = Math.min(0, Math.max(minY, this.translation.y + deltaY));
        
        this.translation = { x: newX, y: newY };
        this.lastMousePosition = { x: event.clientX, y: event.clientY };
      }
    },
    handleMouseUp(event) {
      if (event.button === 1) {
        this.isMiddleMouseDown = false;
      }
    },
    stopPan() {
      this.isMiddleMouseDown = false;
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

.video-frame-container {
  flex: 2;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-frame {
  position: relative;
  background-color: #2a2a2a;
  overflow: hidden;
  cursor: default;
}

.video-frame:active {
  cursor: grab;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: transform 0.1s ease;
  will-change: transform;
}

.video-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.calibration-point {
  position: absolute;
  width: 3px;
  height: 3px;
  background-color: red;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.field-container {
  flex: 1;
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
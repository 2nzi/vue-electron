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
            <p>session: {{ selectedVideo.session || 'nom_de_la_session' }}</p>
            <p>création: {{ new Date().toLocaleDateString() }}</p>
          </div>
          <button 
            class="save-btn" 
            @click="saveCalibration"
            :disabled="Object.keys(calibrationPoints).length === 0">
            Sauvegarder la calibration
          </button>
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
                     :class="{ 'selected-point': selectedFieldPoint && Number(selectedFieldPoint.index) === Number(index) }"
                     :style="{
                       left: `${point.x}px`,
                       top: `${point.y}px`
                     }">
                </div>
              </div>
            </div>
          </div>
          <div class="field-container">
            <FootballField 
              ref="footballField"
              @point-selected="handleFieldPointSelected"
              :positionedPoints="calibrationPoints"
            />
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
      calibrationPoints: {},
      isMiddleMouseDown: false,
      lastMousePosition: { x: 0, y: 0 },
      selectedFieldPoint: null,
      panPosition: { x: 0, y: 0 },
      panSpeed: 10, // Vitesse de déplacement avec les touches (en pixels)
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
  mounted() {
    // Ajouter les écouteurs d'événements pour le clavier
    window.addEventListener('keydown', this.handleKeyDown);
    
    // Ajouter l'écouteur pour la molette
    if (this.$refs.imageContainer) {
      this.$refs.imageContainer.addEventListener('wheel', this.handleWheel, { passive: false });
    }
  },
  beforeUnmount() {
    // Nettoyer les écouteurs d'événements
    window.removeEventListener('keydown', this.handleKeyDown);
    
    if (this.$refs.imageContainer) {
      this.$refs.imageContainer.removeEventListener('wheel', this.handleWheel);
    }
  },
  methods: {
    async loadVideos() {
      try {
        this.videos = await window.electron.getVideosFromFolder(this.folderPath)
        if (this.videos.length > 0) {
          await this.selectVideo(this.videos[3])
          // await this.selectVideo(this.videos[0])
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

      }
    },
    handleFieldPointSelected(pointData) {
      console.log('Point sélectionné:', pointData.index);
      console.log('Points calibrés:', this.calibrationPoints);
      console.log('Point existe dans calibrationPoints:', pointData.index in this.calibrationPoints);
      this.selectedFieldPoint = pointData;
    },
    handleMouseDown(event) {
      if (event.button === 1) {
        event.preventDefault();
        this.isMiddleMouseDown = true;
        this.lastMousePosition = { x: event.clientX, y: event.clientY };
      } else if (event.button === 0 && this.selectedFieldPoint) {
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const pointX = (mouseX - this.translation.x) / this.scale;
        const pointY = (mouseY - this.translation.y) / this.scale;
        
        // S'assurer que l'index est traité comme un nombre
        const index = Number(this.selectedFieldPoint.index);
        this.calibrationPoints[index] = { x: pointX, y: pointY };
        
        // Désélectionner le point après l'avoir positionné
        this.selectedFieldPoint = null;
        this.$refs.footballField.selectedPointIndex = null;
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
    },
    async saveCalibration() {
      if (!this.selectedVideo) return;

      // Récupérer les keypoints depuis le FootballField
      const fieldKeypoints = this.$refs.footballField.keypoints;

      // Préparation des données de calibration
      const calibrationData = {
        metadata: {
          video_name: this.selectedVideo.name,
          video_path: this.selectedVideo.path,
          calibration_date: new Date().toISOString(),
          total_keypoints: fieldKeypoints.length,
          positioned_keypoints: Object.keys(this.calibrationPoints).length,
          image_size: this.imageSize
        },
        keypoints: {},
        field_dimensions: {
          width: 105,
          height: 68
        }
      };

      // Conversion des points en format plus lisible
      for (const [index, point] of Object.entries(this.calibrationPoints)) {
        calibrationData.keypoints[index] = {
          image_coordinates: {
            x: Math.round(point.x * 100) / 100,
            y: Math.round(point.y * 100) / 100
          },
          field_coordinates: {
            x: Math.round(fieldKeypoints[index][0] * 100) / 100,
            y: Math.round(fieldKeypoints[index][1] * 100) / 100
          }
        };
      }

      const requestData = {
        video_path: this.selectedVideo.path,
        calibration_data: calibrationData
      };

      console.log('Données envoyées:', requestData); // Pour déboguer

      try {
        // Appel à l'API Python
        const response = await fetch('http://localhost:8000/calibration/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur détaillée:', errorData); // Pour déboguer
          throw new Error(errorData.detail || 'Erreur lors de la sauvegarde');
        }

        const result = await response.json();
        
        if (result.success) {
          alert('Calibration sauvegardée avec succès !');
        } else {
          throw new Error(result.message || 'Erreur lors de la sauvegarde');
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde de la calibration');
      }
    },
    handleKeyDown(event) {
      // Empêcher le défilement par défaut de la page
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        
        switch(event.key) {
          case 'ArrowUp':
            this.panPosition.y += this.panSpeed;
            break;
          case 'ArrowDown':
            this.panPosition.y -= this.panSpeed;
            break;
          case 'ArrowLeft':
            this.panPosition.x += this.panSpeed;
            break;
          case 'ArrowRight':
            this.panPosition.x -= this.panSpeed;
            break;
        }
      }

      // Si la touche Delete est pressée et qu'un point est sélectionné
      if (event.key === 'Delete' && this.selectedFieldPoint) {
        // Supprimer le point des points calibrés
        if (this.selectedFieldPoint.index in this.calibrationPoints) {
          delete this.calibrationPoints[this.selectedFieldPoint.index];
          // Désélectionner le point
          this.selectedFieldPoint = null;
          this.$refs.footballField.selectedPointIndex = null;
        }
      }
    },
    handleWheel(event) {
      event.preventDefault();
      
      // Si la touche Ctrl est enfoncée, on gère le zoom
      if (event.ctrlKey) {
        // Gérer le zoom si vous avez cette fonctionnalité
        return;
      }
      
      // Sinon, on gère le pan (translation)
      if (event.shiftKey) {
        // Si Shift est enfoncé, on déplace horizontalement
        this.panPosition.x -= event.deltaY;
      } else {
        // Déplacement vertical par défaut
        this.panPosition.y -= event.deltaY;
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
  min-height: 0;
}

.video-frame-container {
  flex: 2;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 0;
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

.selected-point {
  background-color: yellow;
  width: 3px;
  height: 3px;
  box-shadow: 0 0 8px yellow, 0 0 14px yellow;
  animation: pulse 1s infinite;
  z-index: 100;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.7;
    box-shadow: 0 0 25px yellow, 0 0 40px yellow;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.field-container {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.field-container :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: contain;
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

.save-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.save-btn:hover {
  background-color: #45a049;
}

.save-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.image-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.image-container img {
  max-width: none;
  max-height: none;
  position: relative;
  transition: transform 0.05s ease-out;
}
</style> 
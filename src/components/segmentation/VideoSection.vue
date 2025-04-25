<template>
  <div class="video-section">
    <div class="video-tools">

      <button 
        class="tool-btn"
        :class="{ active: currentTool === 'arrow' }"
        @click="selectTool('arrow')"
        title="Selection Tool"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 3l7 19 2.051-7.179L19 13 3 3z"/>
        </svg>
      </button>
      
      <button 
        class="tool-btn"
        :class="{ active: currentTool === 'rectangle' }"
        @click="selectTool('rectangle')"
        title="Rectangle Tool"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      </button>
      
      <button 
        class="tool-btn"
        :class="{ active: currentTool === 'positive' }"
        @click="selectTool('positive')"
        title="Positive Point"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor">
          <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
          <line x1="7" y1="12" x2="17" y2="12" stroke="white" stroke-width="2"/>
          <line x1="12" y1="7" x2="12" y2="17" stroke="white" stroke-width="2"/>
        </svg>
      </button>

      <button 
        class="tool-btn"
        :class="{ active: currentTool === 'negative' }"
        @click="selectTool('negative')"
        title="Negative Point"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor">
          <circle cx="12" cy="12" r="10" fill="#f44336"/>
          <line x1="7" y1="12" x2="17" y2="12" stroke="white" stroke-width="2"/>
        </svg>
      </button>


    </div>
    <div class="video-container" ref="container">
      <v-stage
        ref="stage"
        :config="stageConfig"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
      >
        <v-layer ref="layer">
          <v-image
            :config="{
              image: imageElement,
              width: imageWidth,
              height: imageHeight,
              x: position.x,
              y: position.y,
            }"
          />
          
          <!-- Lignes de guidage -->
          <v-line
            v-if="mousePosition.x !== null && isInsideImage(mousePosition)"
            :config="{
              points: [
                position.x, mousePosition.y,
                position.x + imageWidth, mousePosition.y
              ],
              stroke: '#ffffff',
              strokeWidth: 1,
              dash: [5, 5],
              opacity: 0.5
            }"
          />
          <v-line
            v-if="mousePosition.y !== null && isInsideImage(mousePosition)"
            :config="{
              points: [
                mousePosition.x, position.y,
                mousePosition.x, position.y + imageHeight
              ],
              stroke: '#ffffff',
              strokeWidth: 1,
              dash: [5, 5],
              opacity: 0.5
            }"
          />
          
          <!-- Rectangle en cours de dessin -->
          <v-rect
            v-if="isDrawing && currentTool === 'rectangle'"
            :config="{
              x: rectangleStart.x,
              y: rectangleStart.y,
              width: rectangleSize.width,
              height: rectangleSize.height,
              stroke: '#4CAF50',
              strokeWidth: 2,
              dash: [5, 5],
              fill: 'rgba(76, 175, 80, 0.2)'
            }"
          />
          <!-- Rectangles sauvegardés -->
          <v-rect
            v-for="rect in rectangles"
            :key="rect.id"
            :config="{
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              stroke: '#4CAF50',
              strokeWidth: 2,
              fill: 'rgba(76, 175, 80, 0.2)'
            }"
          />
          <!-- Poignées de redimensionnement pour le rectangle sélectionné -->
          <template v-if="selectedId && currentTool === 'arrow'">
            <v-circle
              v-for="handle in getResizeHandles()"
              :key="handle.position"
              :config="{
                x: handle.x,
                y: handle.y,
                radius: 4,
                fill: 'white',
                stroke: '#4CAF50',
                strokeWidth: 1,
                draggable: true
              }"
              @dragmove="handleResize($event, handle.position)"
            />
          </template>
          <!-- Points existants -->
          <v-group
            v-for="point in points"
            :key="point.id"
            :config="{
              x: point.x,
              y: point.y
            }"
          >
            <v-circle
              :config="{
                radius: 5,
                fill: point.color,
                stroke: 'white',
                strokeWidth: 1
              }"
            />
            <v-line
              :config="{
                points: [-2, 0, 2, 0],
                stroke: 'white',
                strokeWidth: 1
              }"
            />
            <v-line
              v-if="point.type === 'positive'"
              :config="{
                points: [0, -2, 0, 2],
                stroke: 'white',
                strokeWidth: 1
              }"
            />
          </v-group>
        </v-layer>
      </v-stage>
    </div>

    <div class="validation-tools">
      <button 
        v-show="isPointingMode"
        class="tool-btn"
        @click="validatePoints"
        title="Validate Points"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      
      <button 
        v-show="isPointingMode"
        class="tool-btn"
        @click="cancelPoints"
        title="Cancel Points"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { useVideoStore } from '@/stores/videoStore'

export default {
  name: 'VideoSection',

  data() {
    return {
      imageElement: null,
      videoElement: null,
      currentFrame: null,
      imageWidth: 0,
      imageHeight: 0,
      position: { x: 0, y: 0 },
      points: [],
      stageConfig: {
        width: 0,
        height: 0
      },
      currentTool: 'arrow',
      isDrawing: false,
      rectangleStart: { x: 0, y: 0 },
      rectangleSize: { width: 0, height: 0 },
      rectangles: [],
      mousePosition: { x: null, y: null },
      selectedId: null,
      isDragging: false,
      dragStartPos: { x: 0, y: 0 },
      resizing: false,
      resizeTimeout: null,
    }
  },

  mounted() {
    // Initialiser l'élément image sans source par défaut
    this.imageElement = new Image()
    
    // Créer l'élément vidéo
    this.videoElement = document.createElement('video')
    this.videoElement.crossOrigin = 'anonymous'
    
    // Écouter les événements de la vidéo
    this.videoElement.addEventListener('loadedmetadata', this.handleVideoLoaded)
    
    // S'abonner aux changements de vidéo dans le store
    this.subscribeToVideoStore()
    
    window.addEventListener('resize', this.handleWindowResize)
    window.addEventListener('keydown', this.handleKeyDown)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleWindowResize)
    window.removeEventListener('keydown', this.handleKeyDown)
    
    if (this.videoElement) {
      this.videoElement.removeEventListener('loadedmetadata', this.handleVideoLoaded)
    }
  },

  computed: {
    isPointingMode() {
      return this.currentTool === 'positive' || this.currentTool === 'negative'
    }
  },

  methods: {
    subscribeToVideoStore() {
      // Utiliser le store vidéo pour obtenir la vidéo sélectionnée
      const videoStore = useVideoStore()
      
      // Observer les changements dans le store
      this.$watch(
        () => videoStore.selectedVideo,
        (newVideo) => {
          if (newVideo) {
            console.log('Nouvelle vidéo sélectionnée dans VideoSection:', newVideo)
            this.loadVideo(newVideo.path)
          }
        },
        { immediate: true }
      )
      
      // Observer les changements de temps dans la timeline
      this.$watch(
        () => videoStore.currentTime,
        (newTime) => {
          if (this.videoElement && newTime !== undefined) {
            console.log('Mise à jour du temps dans VideoSection:', newTime)
            this.updateCurrentFrame(newTime)
          }
        }
      )
      
      // Observer l'état de lecture (play/pause)
      this.$watch(
        () => videoStore.isPlaying,
        (isPlaying) => {
          console.log('État de lecture changé dans VideoSection:', isPlaying)
          if (isPlaying) {
            // Pas besoin de jouer la vidéo ici, nous capturons juste les frames
          } else {
            // Assurez-vous que la vidéo est bien à la position actuelle
            if (this.videoElement && videoStore.currentTime !== undefined) {
              this.updateCurrentFrame(videoStore.currentTime)
            }
          }
        }
      )
    },
    
    loadVideo(videoPath) {
      if (!videoPath) return
      
      this.videoElement.src = videoPath
      this.videoElement.load()
    },
    
    handleVideoLoaded() {
      console.log('Vidéo chargée, dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight)
      
      this.frameCanvas = document.createElement('canvas')
      this.frameContext = this.frameCanvas.getContext('2d')
      
      this.frameCanvas.width = this.videoElement.videoWidth
      this.frameCanvas.height = this.videoElement.videoHeight
      
      this.captureVideoFrame(0)
      
      this.initializeView()
    },
    
    updateCurrentFrame(time) {
      if (!this.videoElement || !this.frameContext) return
      
      console.log('Capture de frame à:', time)
      // Positionner la vidéo au temps spécifié
      this.videoElement.currentTime = time
      
      // Capturer la frame à ce moment
      this.captureVideoFrame(time)
    },
    
    async captureVideoFrame(time) {
      if (!this.videoElement || !this.frameContext) return
      
      // Positionner la vidéo au temps spécifié
      this.videoElement.currentTime = time
      
      // Attendre que la vidéo soit positionnée
      await new Promise(resolve => {
        const seekHandler = () => {
          // Dessiner la frame sur le canvas
          this.frameContext.drawImage(
            this.videoElement, 
            0, 0, 
            this.videoElement.videoWidth, 
            this.videoElement.videoHeight
          )
          
          // Convertir le canvas en image
          const frameUrl = this.frameCanvas.toDataURL('image/jpeg')
          
          // Créer une nouvelle image avec cette frame
          const frameImage = new Image()
          frameImage.onload = () => {
            this.currentFrame = frameImage
            this.imageElement = frameImage // Remplacer l'image par la frame actuelle
            this.updateDimensions()
            resolve()
          }
          frameImage.src = frameUrl
          
          // Supprimer l'écouteur après utilisation
          this.videoElement.removeEventListener('seeked', seekHandler)
        }
        
        this.videoElement.addEventListener('seeked', seekHandler, { once: true })
      })
    },

    initializeView() {
      this.$nextTick(() => {
        this.updateDimensions()
      })
    },

    handleWindowResize() {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        this.updateDimensions()
      }, 100)
    },

    updateDimensions() {
      const container = this.$refs.container
      if (!container || !this.imageElement) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      const img = this.currentFrame || this.imageElement
      
      const imageRatio = img.naturalWidth / img.naturalHeight

      let width = containerWidth
      let height = width / imageRatio

      if (height > containerHeight) {
        height = containerHeight
        width = height * imageRatio
      }

      this.stageConfig.width = containerWidth
      this.stageConfig.height = containerHeight
      this.imageWidth = width
      this.imageHeight = height

      this.position = {
        x: Math.floor((containerWidth - width) / 2),
        y: Math.floor((containerHeight - height) / 2)
      }
    },

    selectTool(tool) {
      this.currentTool = tool
    },

    handleMouseDown(e) {
      if (e.evt.button !== 0) return

      const stage = this.$refs.stage.getStage()
      const pointerPos = stage.getPointerPosition()

      if (!this.isInsideImage(pointerPos)) return

      if (this.currentTool === 'arrow' && this.selectedId) {
        const handles = this.getResizeHandles()
        const clickedHandle = handles.find(handle => {
          const dx = handle.x - pointerPos.x
          const dy = handle.y - pointerPos.y
          return Math.sqrt(dx * dx + dy * dy) <= 5
        })
        
        if (clickedHandle) {
          this.resizing = true
          return
        }
      }

      if (this.currentTool === 'arrow') {
        const clickedRect = this.rectangles.find(rect => 
          pointerPos.x >= rect.x && 
          pointerPos.x <= rect.x + rect.width &&
          pointerPos.y >= rect.y && 
          pointerPos.y <= rect.y + rect.height
        )
        
        if (clickedRect) {
          this.selectedId = clickedRect.id
          this.isDragging = true
          this.dragStartPos = pointerPos
          console.log('Selected rectangle:', this.selectedId)
          return
        }

        const clickedPoint = this.points.find(point => {
          const dx = point.x - pointerPos.x
          const dy = point.y - pointerPos.y
          return Math.sqrt(dx * dx + dy * dy) <= 5
        })

        if (clickedPoint) {
          this.selectedId = clickedPoint.id
          this.isDragging = true
          this.dragStartPos = pointerPos
          console.log('Selected point:', this.selectedId)
          return
        }

        this.selectedId = null
        this.isDragging = false
      }

      switch(this.currentTool) {
        case 'rectangle':
          this.isDrawing = true
          this.rectangleStart = {
            x: pointerPos.x,
            y: pointerPos.y
          }
          this.rectangleSize = { width: 0, height: 0 }
          break
        case 'positive':
          this.addPoint(pointerPos, 'positive')
          break
        case 'negative':
          this.addPoint(pointerPos, 'negative')
          break
      }
    },

    handleMouseMove() {
      const stage = this.$refs.stage.getStage()
      const pointerPos = stage.getPointerPosition()
      this.mousePosition = pointerPos

      if (this.isDragging && this.selectedId && this.currentTool === 'arrow') {
        const dx = pointerPos.x - this.dragStartPos.x
        const dy = pointerPos.y - this.dragStartPos.y

        const selectedRect = this.rectangles.find(r => r.id === this.selectedId)
        if (selectedRect) {
          selectedRect.x += dx
          selectedRect.y += dy
        }

        const selectedPoint = this.points.find(p => p.id === this.selectedId)
        if (selectedPoint) {
          selectedPoint.x += dx
          selectedPoint.y += dy
        }

        this.dragStartPos = pointerPos
        return
      }

      if (!this.isDrawing || this.currentTool !== 'rectangle') return

      this.rectangleSize = {
        width: pointerPos.x - this.rectangleStart.x,
        height: pointerPos.y - this.rectangleStart.y
      }
    },

    handleMouseUp() {
      if (this.resizing) {
        this.resizing = false
        return
      }

      if (this.isDragging) {
        this.isDragging = false
        return
      }

      if (!this.isDrawing || this.currentTool !== 'rectangle') return

      const relativeStart = {
        x: this.rectangleStart.x - this.position.x,
        y: this.rectangleStart.y - this.position.y
      }

      const imageOriginalWidth = this.imageElement.naturalWidth
      const imageOriginalHeight = this.imageElement.naturalHeight
      const scaleX = imageOriginalWidth / this.imageWidth
      const scaleY = imageOriginalHeight / this.imageHeight

      const originalRect = {
        x: Math.round(relativeStart.x * scaleX),
        y: Math.round(relativeStart.y * scaleY),
        width: Math.round(this.rectangleSize.width * scaleX),
        height: Math.round(this.rectangleSize.height * scaleY)
      }

      this.rectangles.push({
        id: Date.now(),
        x: this.rectangleStart.x,
        y: this.rectangleStart.y,
        width: this.rectangleSize.width,
        height: this.rectangleSize.height
      })

      console.log('Rectangle ajouté:', originalRect)

      this.isDrawing = false
      this.rectangleSize = { width: 0, height: 0 }
    },

    isInsideImage(point) {
      return point.x >= this.position.x && 
             point.x <= this.position.x + this.imageWidth &&
             point.y >= this.position.y && 
             point.y <= this.position.y + this.imageHeight
    },

    addPoint(pos, type) {
      const sourceElement = this.videoElement.videoWidth ? this.videoElement : this.imageElement
      const imageOriginalWidth = sourceElement.videoWidth || sourceElement.naturalWidth
      const imageOriginalHeight = sourceElement.videoHeight || sourceElement.naturalHeight
      const scaleX = imageOriginalWidth / this.imageWidth
      const scaleY = imageOriginalHeight / this.imageHeight

      const relativeX = pos.x - this.position.x
      const relativeY = pos.y - this.position.y

      const imageX = Math.round(relativeX * scaleX)
      const imageY = Math.round(relativeY * scaleY)

      this.points.push({
        id: Date.now(),
        x: pos.x,
        y: pos.y,
        type: type,
        color: type === 'positive' ? '#4CAF50' : '#f44336'
      })

      console.log('Point ajouté:', { x: imageX, y: imageY, type: type })
    },

    handleKeyDown(e) {
      if (e.key === 'Delete' && this.selectedId) {
        this.rectangles = this.rectangles.filter(rect => rect.id !== this.selectedId)
        this.points = this.points.filter(point => point.id !== this.selectedId)
        this.selectedId = null
        console.log('Element deleted:', this.selectedId)
      }
    },

    getResizeHandles() {
      const rect = this.rectangles.find(r => r.id === this.selectedId)
      if (!rect) return []

      return [
        { position: 'nw', x: rect.x, y: rect.y },
        { position: 'ne', x: rect.x + rect.width, y: rect.y },
        { position: 'se', x: rect.x + rect.width, y: rect.y + rect.height },
        { position: 'sw', x: rect.x, y: rect.y + rect.height },
        
        { position: 'n', x: rect.x + rect.width/2, y: rect.y },
        { position: 'e', x: rect.x + rect.width, y: rect.y + rect.height/2 },
        { position: 's', x: rect.x + rect.width/2, y: rect.y + rect.height },
        { position: 'w', x: rect.x, y: rect.y + rect.height/2 }
      ]
    },

    handleResize(e, position) {
      const rect = this.rectangles.find(r => r.id === this.selectedId)
      if (!rect) return

      const stage = this.$refs.stage.getStage()
      const pos = stage.getPointerPosition()

      const originalX = rect.x
      const originalY = rect.y
      const originalWidth = rect.width
      const originalHeight = rect.height
      let newWidth, newHeight

      switch (position) {
        case 'e':
          rect.width = Math.max(10, pos.x - rect.x)
          break
        case 'w':
          newWidth = originalWidth + (originalX - pos.x)
          if (newWidth >= 10) {
            rect.x = pos.x
            rect.width = newWidth
          }
          break
        case 'n':
          newHeight = originalHeight + (originalY - pos.y)
          if (newHeight >= 10) {
            rect.y = pos.y
            rect.height = newHeight
          }
          break
        case 's':
          rect.height = Math.max(10, pos.y - rect.y)
          break
        case 'nw':
          if (originalWidth + (originalX - pos.x) >= 10) {
            rect.x = pos.x
            rect.width = originalWidth + (originalX - pos.x)
          }
          if (originalHeight + (originalY - pos.y) >= 10) {
            rect.y = pos.y
            rect.height = originalHeight + (originalY - pos.y)
          }
          break
        case 'ne':
          rect.width = Math.max(10, pos.x - rect.x)
          if (originalHeight + (originalY - pos.y) >= 10) {
            rect.y = pos.y
            rect.height = originalHeight + (originalY - pos.y)
          }
          break
        case 'se':
          rect.width = Math.max(10, pos.x - rect.x)
          rect.height = Math.max(10, pos.y - rect.y)
          break
        case 'sw':
          if (originalWidth + (originalX - pos.x) >= 10) {
            rect.x = pos.x
            rect.width = originalWidth + (originalX - pos.x)
          }
          rect.height = Math.max(10, pos.y - rect.y)
          break
      }
    },

    validatePoints() {
      this.$emit('points-validated', this.points)
      this.points = []
      this.currentTool = 'arrow'
    },

    cancelPoints() {
      this.points = []
      this.currentTool = 'arrow'
    }
  },

  watch: {
    'stageConfig.width'() {
      this.$nextTick(() => {
        this.updateDimensions()
      })
    },
    'stageConfig.height'() {
      this.$nextTick(() => {
        this.updateDimensions()
      })
    }
  },
}
</script>

<style scoped>
.video-section {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 8px;
}

.video-tools {
  width: 50px;
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.video-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.video-container > * {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.tool-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #4a4a4a;
}

.tool-btn.active {
  background: #3a3a3a;
  color: white;
}

.tool-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.validation-tools {
  width: 50px;
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
}

.tool-btn:not(:disabled):hover {
  background: #4a4a4a;
}
</style> 
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
              image: videoElement,
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
import { useAnnotationStore } from '@/stores/annotationStore'

export default {
  name: 'VideoSection',

  props: {
    selectedObjectId: {
      type: String,
      default: null
    }
  },

  setup() {
    const videoStore = useVideoStore()
    const annotationStore = useAnnotationStore()
    
    return { videoStore, annotationStore }
  },

  data() {
    return {
      videoElement: null,
      imageWidth: 0,
      imageHeight: 0,
      position: { x: 0, y: 0 },
      stageConfig: {
        width: 0,
        height: 0
      },
      currentTool: 'arrow',
      isDrawing: false,
      rectangleStart: { x: 0, y: 0 },
      rectangleSize: { width: 0, height: 0 },
      mousePosition: { x: null, y: null },
      selectedId: null,
      isDragging: false,
      dragStartPos: { x: 0, y: 0 },
      resizing: false,
      resizeTimeout: null,
      animationId: null,
      currentFrameNumber: 0,
      localSelectedObjectId: this.selectedObjectId
    }
  },

  mounted() {
    // Créer l'élément vidéo
    this.videoElement = document.createElement('video')
    this.videoElement.crossOrigin = 'anonymous'
    this.videoElement.muted = true // Important pour l'autoplay dans certains navigateurs
    
    // Écouter les événements de la vidéo
    this.videoElement.addEventListener('loadedmetadata', this.handleVideoLoaded)
    
    // S'abonner aux changements de vidéo dans le store
    this.subscribeToVideoStore()
    
    window.addEventListener('resize', this.handleWindowResize)
    window.addEventListener('keydown', this.handleKeyDown)
    
    // Ajouter un écouteur d'événement pour la mise à jour de frame pendant la lecture
    this.videoElement.addEventListener('timeupdate', this.updateCurrentFrame)
    
    // Mettre à jour la frame initiale
    this.$nextTick(() => {
      this.updateCurrentFrame()
    })
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleWindowResize)
    window.removeEventListener('keydown', this.handleKeyDown)
    
    if (this.videoElement) {
      this.videoElement.removeEventListener('loadedmetadata', this.handleVideoLoaded)
      this.videoElement.pause()
    }
    
    this.stopAnimation()
    
    // Supprimer l'écouteur d'événement
    this.videoElement.removeEventListener('timeupdate', this.updateCurrentFrame)
  },

  computed: {
    isPointingMode() {
      return this.currentTool === 'positive' || this.currentTool === 'negative'
    },
    availableObjects() {
      return Object.values(this.annotationStore.objects)
    },
    hasSelectedObject() {
      return !!this.localSelectedObjectId
    },
    rectangles() {
      const frameAnnotations = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber) || []
      
      // Convertir les annotations en rectangles pour l'affichage
      return frameAnnotations
        .filter(annotation => annotation.type === 'rectangle')
        .map(annotation => {
          const object = this.annotationStore.objects[annotation.objectId]
          const color = object ? object.color : '#4CAF50'
          
          // Convertir les coordonnées originales en coordonnées d'affichage
          const displayX = this.position.x + (annotation.x / this.scaleX)
          const displayY = this.position.y + (annotation.y / this.scaleY)
          const displayWidth = annotation.width / this.scaleX
          const displayHeight = annotation.height / this.scaleY
          
          return {
            id: annotation.id,
            objectId: annotation.objectId,
            x: displayX,
            y: displayY,
            width: displayWidth,
            height: displayHeight,
            color: color
          }
        })
    },
    points() {
      const frameAnnotations = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber) || []
      
      // Convertir les annotations en points pour l'affichage
      return frameAnnotations
        .filter(annotation => annotation.type === 'point')
        .map(annotation => {
          const object = this.annotationStore.objects[annotation.objectId]
          const color = object ? object.color : (annotation.pointType === 'positive' ? '#4CAF50' : '#f44336')
          
          // Convertir les coordonnées originales en coordonnées d'affichage
          const displayX = this.position.x + (annotation.x / this.scaleX)
          const displayY = this.position.y + (annotation.y / this.scaleY)
          
          return {
            id: annotation.id,
            objectId: annotation.objectId,
            x: displayX,
            y: displayY,
            type: annotation.pointType,
            color: color
          }
        })
    },
    scaleX() {
      if (!this.videoElement || !this.imageWidth) return 1
      return this.videoElement.videoWidth / this.imageWidth
    },
    scaleY() {
      if (!this.videoElement || !this.imageHeight) return 1
      return this.videoElement.videoHeight / this.imageHeight
    }
  },

  methods: {
    subscribeToVideoStore() {
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
            // Seulement mettre à jour si la différence est significative
            if (Math.abs(this.videoElement.currentTime - newTime) > 0.1) {
              this.videoElement.currentTime = newTime
            }
          }
        }
      )
      
      // Observer l'état de lecture (play/pause)
      this.$watch(
        () => videoStore.isPlaying,
        (isPlaying) => {
          console.log('État de lecture changé dans VideoSection:', isPlaying)
          if (isPlaying) {
            this.playVideo()
          } else {
            this.pauseVideo()
          }
        }
      )
    },
    
    loadVideo(videoPath) {
      if (!videoPath) return
      
      // Arrêter toute animation en cours
      this.stopAnimation()
      
      this.videoElement.src = videoPath
      this.videoElement.load()
    },
    
    handleVideoLoaded() {
      console.log('Vidéo chargée, dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight)
      this.initializeView()
      
      // Démarrer l'animation pour le rendu fluide
      this.startAnimation()
    },
    
    playVideo() {
      if (!this.videoElement) return
      
      this.videoElement.play()
      this.startAnimation()
    },
    
    pauseVideo() {
      if (!this.videoElement) return
      
      this.videoElement.pause()
    },
    
    startAnimation() {
      // Arrêter l'animation existante si elle existe
      this.stopAnimation()
      
      // Utiliser l'API de vue-konva pour accéder à l'animation
      const layer = this.$refs.layer.getNode()
      
      // Créer une fonction d'animation qui sera appelée à chaque frame
      const animate = () => {
        // Forcer le rafraîchissement du layer
        layer.batchDraw()
        
        // Continuer l'animation si on est toujours en lecture
        if (this.videoStore?.isPlaying) {
          this.animationId = requestAnimationFrame(animate)
        }
      }
      
      // Démarrer l'animation
      this.animationId = requestAnimationFrame(animate)
    },
    
    stopAnimation() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
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
      if (!container || !this.videoElement) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      const videoRatio = this.videoElement.videoWidth / this.videoElement.videoHeight

      let width = containerWidth
      let height = width / videoRatio

      if (height > containerHeight) {
        height = containerHeight
        width = height * videoRatio
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
          this.localSelectedObjectId = clickedRect.objectId
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
          this.localSelectedObjectId = clickedPoint.objectId
          this.isDragging = true
          this.dragStartPos = pointerPos
          console.log('Selected point:', this.selectedId)
          return
        }

        this.selectedId = null
      }

      switch(this.currentTool) {
        case 'rectangle':
          if (!this.localSelectedObjectId) {
            this.localSelectedObjectId = this.annotationStore.addObject()
          }
          
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

      const imageOriginalWidth = this.videoElement.videoWidth
      const imageOriginalHeight = this.videoElement.videoHeight
      const scaleX = imageOriginalWidth / this.imageWidth
      const scaleY = imageOriginalHeight / this.imageHeight

      const originalRect = {
        x: Math.round(relativeStart.x * scaleX),
        y: Math.round(relativeStart.y * scaleY),
        width: Math.round(this.rectangleSize.width * scaleX),
        height: Math.round(this.rectangleSize.height * scaleY)
      }

      // Ajouter l'annotation au store
      this.annotationStore.addAnnotation(this.currentFrameNumber, {
        objectId: this.localSelectedObjectId,
        type: 'rectangle',
        x: originalRect.x,
        y: originalRect.y,
        width: originalRect.width,
        height: originalRect.height
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
      if (!this.localSelectedObjectId) {
        this.localSelectedObjectId = this.annotationStore.addObject()
      }
      
      const relativeX = pos.x - this.position.x
      const relativeY = pos.y - this.position.y
      
      const sourceElement = this.videoElement
      const imageOriginalWidth = sourceElement.videoWidth
      const imageOriginalHeight = sourceElement.videoHeight
      const scaleX = imageOriginalWidth / this.imageWidth
      const scaleY = imageOriginalHeight / this.imageHeight
      
      const imageX = Math.round(relativeX * scaleX)
      const imageY = Math.round(relativeY * scaleY)
      
      this.annotationStore.addAnnotation(this.currentFrameNumber, {
        objectId: this.localSelectedObjectId,
        type: 'point',
        x: imageX,
        y: imageY,
        pointType: type
      })
      
      console.log('Point ajouté:', { x: imageX, y: imageY, type: type })
    },

    handleKeyDown(e) {
      if (e.key === 'Delete' && this.selectedId) {
        this.annotationStore.removeAnnotation(this.currentFrameNumber, this.selectedId)
        this.selectedId = null
        console.log('Element deleted')
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
    },

    updateCurrentFrame() {
      if (!this.videoElement) return
      
      const frameRate = this.annotationStore.currentSession.frameRate || 30
      this.currentFrameNumber = Math.floor(this.videoElement.currentTime * frameRate)
    },

    selectObject(objectId) {
      this.localSelectedObjectId = objectId
      this.$emit('object-selected', objectId)
    },

    createNewObject() {
      this.localSelectedObjectId = this.annotationStore.addObject()
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
    },
    'videoStore.currentTime'() {
      this.updateCurrentFrame()
    },
    selectedObjectId(newId) {
      this.localSelectedObjectId = newId
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
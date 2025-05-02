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
      <div class="video-wrapper">
        <video
          ref="videoRef"
          class="video-element"
          crossorigin="anonymous"
          muted
        ></video>
      </div>
      
      <div class="canvas-wrapper">
        <v-stage
          ref="stage"
          :config="stageConfig"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          class="canvas-overlay"
        >
          <v-layer ref="layer">
            <!-- Fond transparent explicite -->
            <v-rect
              :config="{
                x: position.x,
                y: position.y,
                width: imageWidth,
                height: imageHeight,
                fill: 'transparent'
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
                stroke: rect.color,
                strokeWidth: rect.objectId === annotationStore.selectedObjectId ? 3 : 2,
                fill: rect.objectId === annotationStore.selectedObjectId ? `${rect.color}33` : `${rect.color}22`,
                objectId: rect.objectId
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
                y: point.y,
                objectId: point.objectId
              }"
            >
              <v-circle
                :config="{
                  radius: point.objectId === annotationStore.selectedObjectId ? 6 : 5,
                  fill: point.color,
                  stroke: 'white',
                  strokeWidth: point.objectId === annotationStore.selectedObjectId ? 2 : 1
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
      originalVideoPath: null,
      proxyVideoPath: null,
      isUsingProxy: true,
      originalVideoDimensions: { width: 0, height: 0 },
    }
  },

  mounted() {
    // Réactiver l'élément vidéo
    this.videoElement = this.$refs.videoRef
    this.videoElement.muted = true
    this.videoElement.addEventListener('loadedmetadata', this.handleVideoLoaded)
    this.videoElement.addEventListener('timeupdate', this.updateCurrentFrame)
    
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
      return !!this.annotationStore.selectedObjectId
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
      if (this.originalVideoDimensions.width && this.imageWidth) {
        return this.originalVideoDimensions.width / this.imageWidth
      }
      if (!this.videoElement || !this.imageWidth) return 1
      return this.videoElement.videoWidth / this.imageWidth
    },
    scaleY() {
      if (this.originalVideoDimensions.height && this.imageHeight) {
        return this.originalVideoDimensions.height / this.imageHeight
      }
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
            if (Math.abs(this.videoElement.currentTime - newTime) > 0.05) {
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
      
      this.originalVideoPath = videoPath
      
      // Si l'élément vidéo est commenté, ne pas essayer de charger la vidéo
      if (!this.videoElement) {
        console.log("Mode test: élément vidéo non disponible, simulation uniquement")
        // Simuler des dimensions pour le test
        this.imageWidth = 640
        this.imageHeight = 360
        this.updateDimensions()
        return
      }
      
      // Obtenir les dimensions de la vidéo originale avant de créer le proxy
      this.getOriginalVideoDimensions(videoPath)
        .then(dimensions => {
          console.log("Dimensions de la vidéo originale:", dimensions.width, "x", dimensions.height)
          // Stocker les dimensions originales pour les utiliser dans les calculs de coordonnées
          this.originalVideoDimensions = dimensions
          
          // Vérifier si un proxy existe déjà ou en créer un
          this.createOrLoadProxy(videoPath)
            .then(proxyPath => {
              this.proxyVideoPath = proxyPath
              
              // Charger le proxy si l'option est activée, sinon charger l'original
              const sourceToLoad = this.isUsingProxy ? proxyPath : videoPath
              this.videoElement.src = sourceToLoad
              this.videoElement.load()
            })
            .catch(err => {
              console.error("Erreur lors de la création du proxy:", err)
              // En cas d'erreur, charger la vidéo originale
              this.videoElement.src = videoPath
              this.videoElement.load()
            })
        })
        .catch(err => {
          console.error("Erreur lors de l'obtention des dimensions de la vidéo originale:", err)
          // Continuer avec le chargement normal
          this.videoElement.src = videoPath
          this.videoElement.load()
        })
    },
    
    async getOriginalVideoDimensions(videoPath) {
      return new Promise((resolve, reject) => {
        // Créer un élément vidéo temporaire pour obtenir les dimensions
        const tempVideo = document.createElement('video')
        tempVideo.style.display = 'none'
        
        // Configurer les gestionnaires d'événements
        tempVideo.onloadedmetadata = () => {
          const dimensions = {
            width: tempVideo.videoWidth,
            height: tempVideo.videoHeight
          }
          
          // Nettoyer
          document.body.removeChild(tempVideo)
          
          resolve(dimensions)
        }
        
        tempVideo.onerror = (error) => {
          // Nettoyer
          if (document.body.contains(tempVideo)) {
            document.body.removeChild(tempVideo)
          }
          
          reject(error)
        }
        
        // Ajouter l'élément au DOM et charger la vidéo
        document.body.appendChild(tempVideo)
        tempVideo.src = videoPath
      })
    },
    
    async createOrLoadProxy(originalPath) {
      // Générer un nom de fichier pour le proxy
      const proxyPath = this.generateProxyPath(originalPath)
      
      // Vérifier si le proxy existe déjà
      const proxyExists = await this.checkIfFileExists(proxyPath)
      
      if (proxyExists) {
        console.log("Proxy vidéo existant trouvé:", proxyPath)
        return proxyPath
      }
      
      // Créer un nouveau proxy
      console.log("Création d'un nouveau proxy vidéo...")
      return this.createVideoProxy(originalPath, proxyPath)
    },
    
    generateProxyPath(originalPath) {
      // Exemple: transformer "/videos/original.mp4" en "/videos/original_proxy.mp4"
      const pathParts = originalPath.split('.')
      const extension = pathParts.pop()
      return `${pathParts.join('.')}_proxy.${extension}`
    },
    
    async checkIfFileExists(filePath) {
      // Vérifier si nous sommes dans Electron
      if (window.electron) {
        // Utiliser l'API Electron via le pont contextIsolation
        return window.electron.checkFileExists(filePath);
      } else {
        // Version de développement ou web: simuler l'existence du fichier
        console.warn("Environnement non-Electron détecté, impossible de vérifier l'existence du fichier");
        return false;
      }
    },
    
    async createVideoProxy(originalPath, proxyPath) {
      // Vérifier si nous sommes dans Electron
      if (window.electron) {
        // Utiliser l'API Electron via le pont contextIsolation
        return window.electron.createVideoProxy(originalPath, proxyPath);
      } else {
        // Version de développement ou web: utiliser la vidéo originale
        console.warn("Environnement non-Electron détecté, impossible de créer un proxy");
        return originalPath; // Retourner le chemin original comme fallback
      }
    },
    
    toggleProxyMode() {
      this.isUsingProxy = !this.isUsingProxy
      
      // Sauvegarder la position actuelle
      const currentTime = this.videoElement.currentTime
      
      // Charger la vidéo appropriée
      this.videoElement.src = this.isUsingProxy ? this.proxyVideoPath : this.originalVideoPath
      this.videoElement.load()
      
      // Restaurer la position après le chargement
      this.videoElement.addEventListener('loadedmetadata', () => {
        this.videoElement.currentTime = currentTime
      }, { once: true })
    },
    
    handleVideoLoaded() {
      console.log('Vidéo chargée, dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight)
      
      // Ajouter un log pour indiquer si c'est le proxy ou l'original
      const sourceType = this.isUsingProxy ? "proxy" : "originale"
      console.log(`Vidéo ${sourceType} chargée. Dimensions d'affichage:`, 
                  this.videoElement.videoWidth, 'x', this.videoElement.videoHeight)
      
      this.initializeView()
      
      // Démarrer l'animation pour le rendu fluide
      this.startAnimation()
    },
    
    playVideo() {
      if (!this.videoElement) {
        console.log("Mode test: élément vidéo non disponible")
        return
      }
      
      this.videoElement.play()
      this.startAnimation()
    },
    
    pauseVideo() {
      if (!this.videoElement) {
        console.log("Mode test: élément vidéo non disponible")
        return
      }
      
      this.videoElement.pause()
    },
    
    startAnimation() {
      // Arrêter l'animation existante si elle existe
      this.stopAnimation()
      
      // Démarrer l'animation
      this.animationId = requestAnimationFrame(this.animate)
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
      if (!container) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      // Utiliser des dimensions fixes pour le test ou les dimensions de la vidéo si disponibles
      const videoWidth = this.videoElement ? this.videoElement.videoWidth : this.imageWidth
      const videoHeight = this.videoElement ? this.videoElement.videoHeight : this.imageHeight
      const videoRatio = videoWidth / videoHeight

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
      
      // Forcer une mise à jour du canvas
      if (this.$refs.layer) {
        const layer = this.$refs.layer.getNode();
        layer.batchDraw();
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
      }

      switch(this.currentTool) {
        case 'rectangle':
          if (!this.annotationStore.selectedObjectId) {
            this.annotationStore.addObject()
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
        
        // Mettre à jour la position dans le store après le drag
        if (this.selectedId) {
          const selectedRect = this.rectangles.find(r => r.id === this.selectedId)
          if (selectedRect) {
            // Convertir les coordonnées d'affichage en coordonnées réelles
            const realX = Math.round((selectedRect.x - this.position.x) * this.scaleX)
            const realY = Math.round((selectedRect.y - this.position.y) * this.scaleY)
            const realWidth = Math.round(selectedRect.width * this.scaleX)
            const realHeight = Math.round(selectedRect.height * this.scaleY)
            
            // Mettre à jour l'annotation dans le store
            this.annotationStore.updateAnnotation(this.currentFrameNumber, this.selectedId, {
              x: realX,
              y: realY,
              width: realWidth,
              height: realHeight
            })
          }
          
          const selectedPoint = this.points.find(p => p.id === this.selectedId)
          if (selectedPoint) {
            // Convertir les coordonnées d'affichage en coordonnées réelles
            const realX = Math.round((selectedPoint.x - this.position.x) * this.scaleX)
            const realY = Math.round((selectedPoint.y - this.position.y) * this.scaleY)
            
            // Mettre à jour l'annotation dans le store
            this.annotationStore.updateAnnotation(this.currentFrameNumber, this.selectedId, {
              x: realX,
              y: realY
            })
          }
        }
        return
      }

      if (!this.isDrawing || this.currentTool !== 'rectangle') return

      const relativeStart = {
        x: this.rectangleStart.x - this.position.x,
        y: this.rectangleStart.y - this.position.y
      }

      // Utiliser les dimensions réelles de la vidéo originale, pas du proxy
      const originalRect = {
        x: Math.round(relativeStart.x * this.scaleX),
        y: Math.round(relativeStart.y * this.scaleY),
        width: Math.round(this.rectangleSize.width * this.scaleX),
        height: Math.round(this.rectangleSize.height * this.scaleY)
      }

      // Créer l'annotation avec les coordonnées réelles
      const annotation = {
        objectId: this.annotationStore.selectedObjectId,
        type: 'rectangle',
        x: originalRect.x,
        y: originalRect.y,
        width: originalRect.width,
        height: originalRect.height
      }

      // Ajouter l'annotation au store
      this.annotationStore.addAnnotation(this.currentFrameNumber, annotation)

      // Log détaillé
      console.log('Rectangle ajouté à la frame', this.currentFrameNumber, ':', annotation)
      console.log('État actuel des annotations:', JSON.parse(JSON.stringify(this.annotationStore.frameAnnotations)))

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
      if (!this.annotationStore.selectedObjectId) {
        this.annotationStore.addObject()
      }
      
      const relativeX = pos.x - this.position.x
      const relativeY = pos.y - this.position.y
      
      // Utiliser les dimensions réelles de la vidéo originale, pas du proxy
      const imageX = Math.round(relativeX * this.scaleX)
      const imageY = Math.round(relativeY * this.scaleY)
      
      // Créer l'annotation avec les coordonnées réelles
      const annotation = {
        objectId: this.annotationStore.selectedObjectId,
        type: 'point',
        x: imageX,
        y: imageY,
        pointType: type
      }
      
      // Ajouter l'annotation au store
      this.annotationStore.addAnnotation(this.currentFrameNumber, annotation)
      
      // Log détaillé
      console.log('Point ajouté à la frame', this.currentFrameNumber, ':', annotation)
      console.log('État actuel des annotations:', JSON.parse(JSON.stringify(this.annotationStore.frameAnnotations)))
    },

    handleKeyDown(e) {
      if (e.key === 'Delete' && this.selectedId) {
        this.annotationStore.removeAnnotation(this.currentFrameNumber, this.selectedId)
        this.selectedId = null
        console.log('Element deleted')
      }
      
      // Ajouter la navigation frame par frame avec les flèches
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault() // Empêcher le défilement de la page
        
        // Calculer la nouvelle frame
        const frameRate = this.annotationStore.currentSession.frameRate || 30
        const currentFrame = this.currentFrameNumber
        const newFrame = e.key === 'ArrowLeft' ? Math.max(0, currentFrame - 1) : currentFrame + 1
        
        // Calculer le nouveau temps basé sur la frame
        const newTime = newFrame / frameRate
        
        // Mettre à jour le temps dans le store et la vidéo
        this.videoStore.setCurrentTime(newTime)
        if (this.videoElement) {
          this.videoElement.currentTime = newTime
        }
        
        // console.log(`Navigation: Frame ${currentFrame} -> ${newFrame}, Temps: ${newTime.toFixed(3)}s`)
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

      // Appliquer le redimensionnement selon la poignée utilisée
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
      
      // Convertir les coordonnées d'affichage en coordonnées réelles
      const realX = Math.round((rect.x - this.position.x) * this.scaleX)
      const realY = Math.round((rect.y - this.position.y) * this.scaleY)
      const realWidth = Math.round(rect.width * this.scaleX)
      const realHeight = Math.round(rect.height * this.scaleY)
      
      // Mettre à jour l'annotation dans le store avec les coordonnées réelles
      this.annotationStore.updateAnnotation(this.currentFrameNumber, this.selectedId, {
        x: realX,
        y: realY,
        width: realWidth,
        height: realHeight
      })
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
      
      // Utiliser Math.round au lieu de Math.floor pour une meilleure précision
      const newFrameNumber = Math.round(this.videoElement.currentTime * frameRate)
      
      // Ne mettre à jour que si la frame a changé
      if (newFrameNumber !== this.currentFrameNumber) {
        this.currentFrameNumber = newFrameNumber
        
        // Forcer le rafraîchissement du canvas pour s'assurer que seules les annotations
        // de la frame actuelle sont affichées
        if (this.$refs.layer) {
          const layer = this.$refs.layer.getNode()
          layer.batchDraw()
        }
        
        // Log pour débogage
        // console.log(`Temps: ${this.videoElement.currentTime.toFixed(3)}s, Frame: ${this.currentFrameNumber}`)
      }
    },

    selectObject(objectId) {
      this.annotationStore.selectObject(objectId)
      this.$emit('object-selected', objectId)
    },

    createNewObject() {
      this.annotationStore.addObject()
    },

    animate() {
      // Récupérer les éléments sélectionnés
      if (this.$refs.layer && this.annotationStore.selectedObjectId) {
        const layer = this.$refs.layer.getNode();
        
        // Trouver tous les éléments de l'objet sélectionné
        const selectedRects = layer.find('Rect').filter(rect => {
          return rect.attrs.objectId === this.annotationStore.selectedObjectId;
        });
        
        const selectedPoints = layer.find('Group').filter(group => {
          return group.attrs.objectId === this.annotationStore.selectedObjectId;
        });
        
        // Appliquer l'animation
        [...selectedRects, ...selectedPoints].forEach(shape => {
          // Animation de pulsation
          const scale = 1 + Math.sin(Date.now() / 300) * 0.05; // Pulsation subtile
          shape.scale({ x: scale, y: scale });
        });
        
        layer.batchDraw();
      }
      
      // Continuer l'animation
      this.animationId = requestAnimationFrame(this.animate);
    },
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
    'annotationStore.selectedObjectId'(newId) {
      console.log('Objet sélectionné changé:', newId)
      // Redémarrer l'animation quand l'objet sélectionné change
      this.startAnimation()
    },
    currentFrameNumber() {
      // Forcer le rafraîchissement du canvas quand la frame change
      this.$nextTick(() => {
        if (this.$refs.layer) {
          const layer = this.$refs.layer.getNode()
          layer.batchDraw()
        }
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

.video-wrapper, .canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-wrapper {
  z-index: 1;
}

.canvas-wrapper {
  z-index: 999;
}

.video-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: transparent;
  pointer-events: auto;
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

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.pulse-animation {
  animation: pulse 1.5s infinite ease-in-out;
}
</style> 
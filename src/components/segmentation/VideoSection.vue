<template>
  <div class="video-section">
    <tool-bar 
      :current-tool="currentTool" 
      @tool-selected="selectTool"
    />

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
                stroke: getObjectColor(annotationStore.selectedObjectId),
                strokeWidth: 1,
                fill: null,
                dash: []
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
                strokeWidth: rect.objectId === annotationStore.selectedObjectId ? 2 : 1,
                fill: null,
                dash: rect.type === 'proxy' ? [5, 5] : [],
                id: rect.id,
                objectId: rect.objectId
              }"
              @mousedown="handleShapeMouseDown($event, rect.id)"
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
            
            <!-- Masques de segmentation -->
            <v-shape
              v-for="annotation in maskedAnnotations"
              :key="`mask-${annotation.id}`"
              :config="{
                sceneFunc: (context, shape) => drawMask(context, shape, annotation),
                fill: annotation.objectId === annotationStore.selectedObjectId ? 
                  `${getObjectColor(annotation.objectId)}88` : 
                  `${getObjectColor(annotation.objectId)}44`,
                stroke: getObjectColor(annotation.objectId),
                strokeWidth: annotation.objectId === annotationStore.selectedObjectId ? 2 : 1,
                opacity: 0.8,
                listening: true,
                id: annotation.id
              }"
              @mousedown="handleMaskClick(annotation.id)"
            />
          </v-layer>
        </v-stage>
      </div>
    </div>

    <!-- Le composant est toujours présent, mais les boutons sont conditionnels -->
    <validation-tools
      :show-validation-buttons="isPointingMode"
      @validate="validatePoints"
      @cancel="cancelPoints"
    />
  </div>
</template>

<script>
import { useVideoStore } from '@/stores/videoStore'
import { useAnnotationStore } from '@/stores/annotationStore'
import ToolBar from './tools/ToolBar.vue'
import ValidationTools from './tools/ValidationTools.vue'
import axios from 'axios'
import { notificationService } from '@/services/notificationService'

export default {
  name: 'VideoSection',

  components: {
    ToolBar,
    ValidationTools
  },

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
      apiBaseUrl: 'http://localhost:8000',
      isProcessingSegmentation: false,
      maskCache: {},
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
      return this.currentTool === 'positive' || this.currentTool === 'negative' || this.currentTool === 'arrow';
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
      // Combiner les points des annotations existantes et les points temporaires
      const frameAnnotations = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber) || []
      
      // Points des annotations de type "mask" qui contiennent des points
      const annotationPoints = frameAnnotations
        .filter(annotation => annotation.type === 'mask' && annotation.points)
        .flatMap(annotation => annotation.points.map(point => ({
          id: `${annotation.id}-point-${point.x}-${point.y}`,
          objectId: annotation.objectId,
          x: this.position.x + (point.x / this.scaleX),
          y: this.position.y + (point.y / this.scaleY),
          type: point.type,
          color: this.getObjectColor(annotation.objectId),
          fromAnnotation: annotation.id
        })))
      
      // Points temporaires
      const tempPoints = this.annotationStore.temporaryPoints.map(point => ({
        id: `temp-point-${point.id}`,
        objectId: point.objectId,
        x: this.position.x + (point.x / this.scaleX),
        y: this.position.y + (point.y / this.scaleY),
        type: point.pointType,
        color: this.getObjectColor(point.objectId),
        isTemporary: true
      }))
      
      return [...annotationPoints, ...tempPoints]
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
    },
    maskedAnnotations() {
      const frameAnnotations = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber) || [];
      return frameAnnotations.filter(annotation => annotation.mask && annotation.maskImageSize);
    },
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
          // console.log('État de lecture changé dans VideoSection:', isPlaying)
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
      const stage = this.$refs.stage.getStage();
      const pointerPos = stage.getPointerPosition();
      this.mousePosition = pointerPos;

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

      if (!this.isDrawing || this.currentTool !== 'rectangle') return;

      this.rectangleSize = {
        width: pointerPos.x - this.rectangleStart.x,
        height: pointerPos.y - this.rectangleStart.y
      };
    },

    async handleMouseUp() {
      if (this.resizing) {
        this.resizing = false;
        return;
      }

      if (this.isDragging) {
        this.isDragging = false;
        
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
        return;
      }

      if (!this.isDrawing || this.currentTool !== 'rectangle') return;

      // Normaliser les coordonnées du rectangle pour s'assurer que x, y est le coin supérieur gauche
      // et que width, height sont positifs
      let normalizedRect = this.normalizeRectangle(
        this.rectangleStart.x,
        this.rectangleStart.y,
        this.rectangleSize.width,
        this.rectangleSize.height
      );
      
      const relativeStart = {
        x: normalizedRect.x - this.position.x,
        y: normalizedRect.y - this.position.y
      };

      // Utiliser les dimensions réelles de la vidéo originale, pas du proxy
      const originalRect = {
        x: Math.round(relativeStart.x * this.scaleX),
        y: Math.round(relativeStart.y * this.scaleY),
        width: Math.round(normalizedRect.width * this.scaleX),
        height: Math.round(normalizedRect.height * this.scaleY)
      };

      // Vérifier s'il existe déjà des annotations pour cet objet sur cette frame
      const existingAnnotations = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber)
        .filter(annotation => annotation.objectId === this.annotationStore.selectedObjectId);
      
      // Si des annotations existent déjà, les supprimer avant d'ajouter la nouvelle
      if (existingAnnotations.length > 0) {
        console.log(`Suppression de ${existingAnnotations.length} annotations existantes pour l'objet ${this.annotationStore.selectedObjectId}`);
        existingAnnotations.forEach(annotation => {
          this.annotationStore.removeAnnotation(this.currentFrameNumber, annotation.id);
        });
      }

      // Créer l'annotation avec les coordonnées réelles
      const annotation = {
        objectId: this.annotationStore.selectedObjectId,
        type: 'rectangle',
        x: originalRect.x,
        y: originalRect.y,
        width: originalRect.width,
        height: originalRect.height
      };

      // Ajouter l'annotation au store
      const annotationId = this.annotationStore.addAnnotation(this.currentFrameNumber, annotation);

      // Appeler l'API pour obtenir le masque de segmentation
      this.getSegmentationMask(annotationId, originalRect)
        .then(result => {
          if (result.success) {
            // Log détaillé
            console.log('Rectangle ajouté à la frame', this.currentFrameNumber, ':', annotation);
            console.log('État actuel des annotations:', JSON.parse(JSON.stringify(this.annotationStore.frameAnnotations)));
          } else {
            console.error('Erreur lors de la segmentation:', result.error);
          }
        });

      this.isDrawing = false;
      this.rectangleSize = { width: 0, height: 0 };
    },

    // Ajouter cette nouvelle méthode pour normaliser les coordonnées du rectangle
    normalizeRectangle(x, y, width, height) {
      // Si la largeur est négative, ajuster x et width
      let newX = x;
      let newWidth = width;
      if (width < 0) {
        newX = x + width;
        newWidth = Math.abs(width);
      }
      
      // Si la hauteur est négative, ajuster y et height
      let newY = y;
      let newHeight = height;
      if (height < 0) {
        newY = y + height;
        newHeight = Math.abs(height);
      }
      
      return {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      };
    },

    async getSegmentationMask(annotationId, bbox) {
      let notificationId = null;
      // Stocker l'ID de l'objet actuel au moment de lancer la segmentation
      const currentObjectId = this.annotationStore.selectedObjectId;
      
      try {
        // Créer une notification pour cette tâche de segmentation
        notificationId = notificationService.addNotification({
          title: 'Segmentation en cours',
          message: `Traitement de la région ${bbox.width}x${bbox.height}`
        });
        
        this.isProcessingSegmentation = true;
        
        // Capturer l'image actuelle de la vidéo
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Utiliser les dimensions réelles de la vidéo
        canvas.width = this.originalVideoDimensions.width
        canvas.height = this.originalVideoDimensions.height
        
        // Dessiner l'image actuelle sur le canvas
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height)
        
        // Convertir le canvas en blob
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.95)
        })
        
        // Créer un FormData pour l'envoi
        const formData = new FormData()
        formData.append('file', blob, 'frame.jpg')
        formData.append('bbox', JSON.stringify(bbox))
        
        console.log('Envoi de la requête de segmentation avec bbox:', bbox)
        
        // Appeler l'API
        const response = await axios.post(`${this.apiBaseUrl}/segment/bbox`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        console.log('Réponse de segmentation reçue:', response.data)
        
        // Stocker le masque dans l'annotation
        if (response.data && response.data.masks && response.data.masks.length > 0) {
          // Prendre le masque avec le meilleur score
          const bestMaskIndex = response.data.scores.indexOf(Math.max(...response.data.scores))
          const bestMask = response.data.masks[bestMaskIndex]
          const bestScore = response.data.scores[bestMaskIndex]
          
          // Mettre à jour l'annotation avec le masque en utilisant l'objectId sauvegardé
          this.annotationStore.updateAnnotation(this.currentFrameNumber, annotationId, {
            mask: bestMask,
            maskScore: bestScore,
            maskImageSize: response.data.image_size,
            objectId: currentObjectId // Utiliser l'ID d'objet sauvegardé
          })
          
          // Log détaillé du masque
          console.log(`Masque ajouté à l'annotation ${annotationId} avec un score de ${bestScore}`)
          console.log('Détails du masque:')
          console.log('- Format:', typeof bestMask === 'string' ? 'RLE (chaîne)' : 'Autre format')
          console.log('- Taille de la chaîne RLE:', bestMask.length)
          console.log('- Début du masque:', bestMask.substring(0, 100) + '...')
          console.log('- Dimensions de l\'image:', response.data.image_size)
          
          // Récupérer l'annotation complète pour vérifier
          const updatedAnnotation = this.annotationStore.getAnnotation(this.currentFrameNumber, annotationId)
          console.log('Annotation mise à jour avec masque:', updatedAnnotation)
          
          // Mettre à jour la notification avec le succès
          if (notificationId) {
            notificationService.updateNotification(notificationId, {
              status: 'success',
              title: 'Segmentation réussie',
              message: `Masque généré avec un score de ${bestScore.toFixed(2)}`
            });
          }
          
          return {
            success: true,
            maskScore: bestScore
          }
        } else {
          console.warn('Aucun masque n\'a été retourné par l\'API')
          return {
            success: false
          }
        }
      } catch (error) {
        console.error('Erreur lors de la segmentation:', error)
        
        // Mettre à jour la notification avec l'erreur
        if (notificationId) {
          notificationService.updateNotification(notificationId, {
            status: 'error',
            title: 'Échec de la segmentation',
            message: error.message || 'Une erreur est survenue'
          });
        }
        
        return {
          success: false,
          error: error.message
        }
      } finally {
        this.isProcessingSegmentation = false
      }
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
      
      // Vérifier s'il existe des rectangles pour cet objet sur cette frame
      const existingRectangles = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber)
        .filter(annotation => 
          annotation.objectId === this.annotationStore.selectedObjectId && 
          annotation.type === 'rectangle'
        );
      
      // Si des rectangles existent, les supprimer avant d'ajouter le point
      if (existingRectangles.length > 0) {
        console.log(`Suppression de ${existingRectangles.length} rectangles existants pour l'objet ${this.annotationStore.selectedObjectId}`);
        existingRectangles.forEach(rectangle => {
          this.annotationStore.removeAnnotation(this.currentFrameNumber, rectangle.id);
        });
        
        // Supprimer également les masques associés à ces rectangles
        const associatedMasks = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber)
          .filter(annotation => 
            annotation.objectId === this.annotationStore.selectedObjectId && 
            annotation.type === 'mask' && 
            (!annotation.points || annotation.points.length === 0)
          );
        
        associatedMasks.forEach(mask => {
          this.annotationStore.removeAnnotation(this.currentFrameNumber, mask.id);
        });
      }
      
      // Au lieu de créer une annotation de point, ajouter le point à une collection temporaire
      this.annotationStore.addTemporaryPoint({
        objectId: this.annotationStore.selectedObjectId,
        x: imageX,
        y: imageY,
        pointType: type
      })
      
      // Log détaillé
      console.log('Point temporaire ajouté:', { x: imageX, y: imageY, type })
    },

    handleKeyDown(e) {
      // Raccourci pour supprimer un élément sélectionné
      if (e.key === 'Delete' && this.selectedId) {
        // Déterminer le type d'élément sélectionné
        const selectedRect = this.rectangles.find(r => r.id === this.selectedId);
        const selectedPoint = this.points.find(p => p.id === this.selectedId);
        
        if (selectedRect) {
          // Supprimer le rectangle
          this.annotationStore.removeAnnotation(this.currentFrameNumber, this.selectedId);
          
          // Vérifier s'il reste des annotations pour cet objet sur cette frame
          this.checkAndCleanupMasks(selectedRect.objectId);
        } 
        else if (selectedPoint) {
          if (selectedPoint.isTemporary) {
            // Supprimer un point temporaire
            this.annotationStore.removeTemporaryPoint(selectedPoint.id.replace('temp-point-', ''));
          } else {
            // Supprimer un point d'une annotation existante
            const annotationId = selectedPoint.fromAnnotation;
            const annotation = this.annotationStore.getAnnotation(this.currentFrameNumber, annotationId);
            
            if (annotation && annotation.points) {
              // Filtrer les points pour retirer celui qui est sélectionné
              const pointKey = selectedPoint.id.split('-point-')[1]; // Récupérer les coordonnées du point
              const [pointX, pointY] = pointKey.split('-').map(Number);
              
              const updatedPoints = annotation.points.filter(p => 
                !(p.x === pointX && p.y === pointY)
              );
              
              if (updatedPoints.length > 0) {
                // Mettre à jour l'annotation avec les points restants
                this.annotationStore.updateAnnotation(this.currentFrameNumber, annotationId, {
                  points: updatedPoints
                });
              } else {
                // Si plus aucun point, supprimer l'annotation complète
                this.annotationStore.removeAnnotation(this.currentFrameNumber, annotationId);
              }
              
              // Vérifier s'il reste des annotations pour cet objet sur cette frame
              this.checkAndCleanupMasks(selectedPoint.objectId);
            }
          }
        }
        
        this.selectedId = null;
        console.log('Element deleted');
      }
      
      // Raccourci pour valider les points et lancer la segmentation (touche v)
      if (e.key === 'v' || e.key === 'V') {
        // Vérifier s'il y a des points temporaires à valider
        const tempPoints = this.annotationStore.getTemporaryPointsForObject(this.annotationStore.selectedObjectId);
        if (tempPoints && tempPoints.length > 0) {
          e.preventDefault(); // Empêcher le comportement par défaut de la touche
          console.log('Validation des points par raccourci clavier (v)');
          this.validatePoints();
        }
      }
      
      // Raccourci pour annuler les points (touche Escape)
      if (e.key === 'Escape') {
        const tempPoints = this.annotationStore.getTemporaryPointsForObject(this.annotationStore.selectedObjectId);
        if (tempPoints && tempPoints.length > 0) {
          console.log('Annulation des points par raccourci clavier (Escape)');
          this.cancelPoints();
        }
      }
      
      // Navigation frame par frame avec les flèches
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

    // Nouvelle méthode pour vérifier et nettoyer les masques orphelins
    checkAndCleanupMasks(objectId) {
      const frameAnnotations = this.annotationStore.getAnnotationsForFrame(this.currentFrameNumber) || [];
      
      // Vérifier s'il reste des annotations (rectangles ou points) pour cet objet sur cette frame
      const hasRemainingElements = frameAnnotations.some(annotation => 
        annotation.objectId === objectId && 
        (annotation.type === 'rectangle' || 
         (annotation.type === 'mask' && annotation.points && annotation.points.length > 0))
      );
      
      if (!hasRemainingElements) {
        // Si aucun élément ne reste, supprimer tous les masques associés à cet objet sur cette frame
        const masksToRemove = frameAnnotations
          .filter(annotation => 
            annotation.objectId === objectId && 
            annotation.type === 'mask' && 
            (!annotation.points || annotation.points.length === 0)
          )
          .map(annotation => annotation.id);
        
        masksToRemove.forEach(maskId => {
          this.annotationStore.removeAnnotation(this.currentFrameNumber, maskId);
        });
        
        if (masksToRemove.length > 0) {
          console.log(`Suppression de ${masksToRemove.length} masques orphelins pour l'objet ${objectId}`);
        }
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

    async validatePoints() {
      // Capturer immédiatement l'image et l'objet actuels au moment du clic
      const targetFrameNumber = this.currentFrameNumber;
      const targetObjectId = this.annotationStore.selectedObjectId;
      
      // Vérifier si un objet est sélectionné
      if (!targetObjectId) {
        console.warn("Aucun objet sélectionné pour la validation des points");
        return;
      }
      
      let notificationId;
      try {
        // Récupérer tous les points temporaires pour l'objet sélectionné
        const tempPoints = this.annotationStore.getTemporaryPointsForObject(targetObjectId);
        
        notificationId = notificationService.addNotification({
          title: 'Segmentation par points',
          message: `Préparation de la segmentation pour la frame ${targetFrameNumber}...`
        });
        
        // Sauvegarder l'outil actuel avant la segmentation
        const currentTool = this.currentTool;
        
        this.isProcessingSegmentation = true;
        
        // Vérifier s'il existe des rectangles pour cet objet sur cette frame
        const existingRectangles = this.annotationStore.getAnnotationsForFrame(targetFrameNumber)
          .filter(annotation => 
            annotation.objectId === targetObjectId && 
            annotation.type === 'rectangle'
          );
        
        // Si des rectangles existent, les supprimer avant de valider les points
        if (existingRectangles.length > 0) {
          console.log(`Suppression de ${existingRectangles.length} rectangles existants pour l'objet ${targetObjectId}`);
          existingRectangles.forEach(rectangle => {
            this.annotationStore.removeAnnotation(targetFrameNumber, rectangle.id);
          });
        }
        
        // Vérifier si un masque existe déjà pour cet objet sur cette frame
        const existingMasks = this.annotationStore.getAnnotationsForFrame(targetFrameNumber)
          .filter(annotation => 
            annotation.objectId === targetObjectId && 
            annotation.type === 'mask'
          );
        
        // Récupérer tous les points existants pour cet objet
        let allPoints = [];
        
        // Ajouter les points des masques existants s'il y en a
        if (existingMasks.length > 0) {
          existingMasks.forEach(mask => {
            if (mask.points && mask.points.length > 0) {
              // Convertir les points du masque au format des points temporaires
              const maskPoints = mask.points.map(p => ({
                objectId: mask.objectId,
                x: p.x,
                y: p.y,
                pointType: p.type
              }));
              
              // Ajouter uniquement les points qui ne sont pas déjà dans allPoints
              maskPoints.forEach(maskPoint => {
                const isDuplicate = allPoints.some(p => 
                  p.x === maskPoint.x && p.y === maskPoint.y && p.pointType === maskPoint.pointType
                );
                
                if (!isDuplicate) {
                  allPoints.push(maskPoint);
                }
              });
            }
          });
        }
        
        // Ajouter les points temporaires s'il y en a
        if (tempPoints && tempPoints.length > 0) {
          tempPoints.forEach(tempPoint => {
            const isDuplicate = allPoints.some(p => 
              p.x === tempPoint.x && p.y === tempPoint.y && p.pointType === tempPoint.pointType
            );
            
            if (!isDuplicate) {
              allPoints.push(tempPoint);
            }
          });
        }
        
        // Si aucun point n'est disponible, afficher un message et sortir
        if (allPoints.length === 0) {
          notificationService.updateNotification(notificationId, {
            status: 'warning',
            title: 'Segmentation impossible',
            message: 'Aucun point disponible pour la segmentation'
          });
          return;
        }
        
        // Mettre à jour la notification
        notificationService.updateNotification(notificationId, {
          message: `Traitement avec ${allPoints.length} points pour la frame ${targetFrameNumber}`
        });
        
        // Capturer l'image actuelle de la vidéo
        // Sauvegarder le temps actuel
        const currentTime = this.videoElement.currentTime;
        
        // Aller à la frame cible si ce n'est pas la frame actuelle
        if (this.currentFrameNumber !== targetFrameNumber) {
          const frameRate = this.annotationStore.currentSession.frameRate || 30;
          const targetTime = targetFrameNumber / frameRate;
          this.videoElement.currentTime = targetTime;
          
          // Attendre que la vidéo soit à la bonne position
          await new Promise(resolve => {
            const checkTime = () => {
              if (Math.abs(this.videoElement.currentTime - targetTime) < 0.01) {
                resolve();
              } else {
                setTimeout(checkTime, 10);
              }
            };
            checkTime();
          });
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Utiliser les dimensions réelles de la vidéo
        canvas.width = this.originalVideoDimensions.width;
        canvas.height = this.originalVideoDimensions.height;
        
        // Dessiner l'image actuelle sur le canvas
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
        
        // Restaurer le temps original si nécessaire
        if (this.currentFrameNumber !== targetFrameNumber) {
          this.videoElement.currentTime = currentTime;
        }
        
        // Convertir le canvas en blob
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        // Préparer les points et les labels pour l'API
        const pointCoords = allPoints.map(p => [p.x, p.y]);
        const pointLabels = allPoints.map(p => p.pointType === 'positive' ? 1 : 0);
        
        // Créer un FormData pour l'envoi
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        formData.append('points', JSON.stringify(pointCoords));
        formData.append('labels', JSON.stringify(pointLabels));
        
        console.log(`Envoi de la requête de segmentation pour la frame ${targetFrameNumber} et l'objet ${targetObjectId}`);
        console.log('Points:', pointCoords);
        console.log('Labels:', pointLabels);
        
        // Appeler l'API
        const response = await axios.post(`${this.apiBaseUrl}/segment`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('Réponse de segmentation reçue:', response.data);
        
        // Stocker le masque dans une nouvelle annotation ou mettre à jour l'existante
        if (response.data && response.data.masks && response.data.masks.length > 0) {
          // Prendre le masque avec le meilleur score
          const bestMaskIndex = response.data.scores.indexOf(Math.max(...response.data.scores));
          const bestMask = response.data.masks[bestMaskIndex];
          const bestScore = response.data.scores[bestMaskIndex];
          
          // Créer une nouvelle annotation de type "mask" avec tous les points
          const annotation = {
            objectId: targetObjectId, // Utiliser l'ID d'objet capturé au début
            type: 'mask',
            mask: bestMask,
            maskScore: bestScore,
            maskImageSize: response.data.image_size,
            points: allPoints.map(p => ({
              x: p.x,
              y: p.y,
              type: p.pointType
            }))
          };
          
          // Si un masque existe déjà, le mettre à jour, sinon en créer un nouveau
          let annotationId;
          if (existingMasks.length > 0) {
            // Supprimer tous les masques existants pour cet objet sur cette frame
            existingMasks.forEach(mask => {
              this.annotationStore.removeAnnotation(targetFrameNumber, mask.id);
            });
            
            // Créer un nouveau masque avec tous les points
            annotationId = this.annotationStore.addAnnotation(targetFrameNumber, annotation);
            console.log(`Masque existant remplacé par un nouveau masque ${annotationId} avec un score de ${bestScore} pour la frame ${targetFrameNumber}`);
          } else {
            // Ajouter une nouvelle annotation
            annotationId = this.annotationStore.addAnnotation(targetFrameNumber, annotation);
            console.log(`Nouveau masque ajouté avec l'ID ${annotationId} et un score de ${bestScore} pour la frame ${targetFrameNumber}`);
          }
          
          // Effacer les points temporaires
          this.annotationStore.clearTemporaryPoints();
          
          // Mettre à jour la notification avec le succès
          notificationService.updateNotification(notificationId, {
            status: 'success',
            title: 'Segmentation réussie',
            message: `Masque généré avec un score de ${bestScore.toFixed(2)} pour la frame ${targetFrameNumber}`
          });
        } else {
          console.warn('Aucun masque n\'a été retourné par l\'API');
          notificationService.updateNotification(notificationId, {
            status: 'error',
            title: 'Échec de la segmentation',
            message: 'Aucun masque n\'a été retourné par l\'API'
          });
        }
        
        // Une fois la segmentation terminée, restaurer l'outil précédemment sélectionné
        this.currentTool = currentTool;
        
      } catch (error) {
        console.error('Erreur lors de la segmentation par points:', error);
        
        // Mettre à jour la notification avec l'erreur
        if (notificationId) {
          notificationService.updateNotification(notificationId, {
            status: 'error',
            title: 'Échec de la segmentation',
            message: error.message || 'Une erreur est survenue'
          });
        }
      } finally {
        this.isProcessingSegmentation = false;
        
        // Supprimer la notification après un délai si elle est toujours présente
        if (notificationId) {
          setTimeout(() => {
            notificationService.removeNotification(notificationId);
          }, 3000);
        }
      }
    },

    cancelPoints() {
      // Au lieu de supprimer des annotations, effacer simplement les points temporaires
      this.annotationStore.clearTemporaryPoints()
      
      // Revenir à l'outil de sélection
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

    getObjectColor(objectId) {
      const object = this.annotationStore.objects[objectId];
      return object ? object.color : '#CCCCCC';
    },
    
    handleMaskClick(maskId, e) {
      // Empêcher la propagation pour éviter que handleMouseDown ne soit aussi appelé
      if (e && e.evt) {
        e.evt.stopPropagation(); // Remplacer cancelBubble par stopPropagation
      }
      
      // Sélectionner le masque
      this.selectedId = maskId;
      
      console.log('Selected mask:', maskId);
    },
    
    drawMask(context, shape, annotation) {
      if (!annotation.mask || !annotation.maskImageSize) {
        console.warn('Annotation sans masque ou dimensions:', annotation);
        return;
      }
      
      // Vérifier si le masque est déjà dans le cache
      const cacheKey = `${annotation.id}-${annotation.mask.substring(0, 20)}`;
      let maskImage = this.maskCache[cacheKey];
      
      if (!maskImage) {
        try {
          console.log(`Décodage du masque pour l'annotation ${annotation.id}`);
          console.log('Début du masque:', annotation.mask.substring(0, 50) + '...');
          
          // Créer une nouvelle image pour charger le masque base64
          maskImage = new Image();
          
          // Attendre que l'image soit chargée avant de continuer
          const loadPromise = new Promise((resolve, reject) => {
            maskImage.onload = () => resolve();
            maskImage.onerror = (e) => reject(new Error(`Erreur de chargement de l'image: ${e}`));
          });
          
          // Définir la source de l'image (base64)
          if (annotation.mask.startsWith('data:')) {
            // Si c'est déjà un data URL
            maskImage.src = annotation.mask;
          } else {
            // Sinon, supposer que c'est un base64 brut et créer un data URL
            maskImage.src = `data:image/png;base64,${annotation.mask}`;
          }
          
          // Attendre que l'image soit chargée
          loadPromise.then(() => {
            console.log(`Image du masque chargée: ${maskImage.width}x${maskImage.height}`);
            
            // Créer un canvas temporaire pour traiter l'image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maskImage.width;
            tempCanvas.height = maskImage.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Dessiner l'image sur le canvas temporaire
            tempCtx.drawImage(maskImage, 0, 0);
            
            // Obtenir les données de l'image
            const imageData = tempCtx.getImageData(0, 0, maskImage.width, maskImage.height);
            const data = imageData.data;
            
            // Obtenir la couleur de l'objet
            const objectColor = this.getObjectColor(annotation.objectId);
            const r = parseInt(objectColor.slice(1, 3), 16);
            const g = parseInt(objectColor.slice(3, 5), 16);
            const b = parseInt(objectColor.slice(5, 7), 16);
            
            // Parcourir tous les pixels
            for (let i = 0; i < data.length; i += 4) {
              // Si le pixel est blanc (ou presque blanc)
              if (data[i] > 200 && data[i+1] > 200 && data[i+2] > 200) {
                // Remplacer par la couleur de l'objet avec une transparence
                data[i] = r;
                data[i+1] = g;
                data[i+2] = b;
                data[i+3] = 180; // Semi-transparent
              } else {
                // Rendre le pixel complètement transparent
                data[i+3] = 0;
              }
            }
            
            // Remettre les données modifiées dans le canvas
            tempCtx.putImageData(imageData, 0, 0);
            
            // Créer une nouvelle image à partir du canvas modifié
            const coloredMaskImage = new Image();
            coloredMaskImage.src = tempCanvas.toDataURL();
            
            // Mettre en cache l'image colorée
            this.maskCache[cacheKey] = coloredMaskImage;
            
            // Forcer un nouveau rendu
            this.$nextTick(() => {
              if (this.$refs.layer) {
                this.$refs.layer.getNode().batchDraw();
              }
            });
          }).catch(error => {
            console.error('Erreur lors du traitement de l\'image du masque:', error);
          });
          
          // Retourner tôt car l'image n'est pas encore chargée
          return;
        } catch (error) {
          console.error('Erreur lors de la création de l\'image du masque:', error);
          return;
        }
      }
      
      // Si l'image n'est pas encore complètement chargée, retourner
      if (!maskImage.complete) {
        return;
      }
      
      // Calculer l'échelle pour adapter le masque à la taille d'affichage
      const scaleX = this.imageWidth / annotation.maskImageSize.width;
      const scaleY = this.imageHeight / annotation.maskImageSize.height;
      
      // Dessiner le masque sur le canvas principal
      const ctx = context._context;
      ctx.save();
      
      // Appliquer la transformation pour positionner correctement le masque
      ctx.translate(this.position.x, this.position.y);
      ctx.scale(scaleX, scaleY);
      
      // Dessiner l'image du masque coloré
      ctx.drawImage(maskImage, 0, 0);
      
      // Restaurer le contexte
      ctx.restore();
      
      // Indiquer à Konva que le dessin est terminé
      shape.strokeEnabled(false); // Désactiver le contour automatique
    },

    handleShapeMouseDown(e, shapeId) {
      // Empêcher la propagation pour éviter que handleMouseDown ne soit aussi appelé
      e.evt.stopPropagation(); // Remplacer cancelBubble par stopPropagation
      
      // Sélectionner la forme
      this.selectedId = shapeId;
      
      // Si l'outil actuel est la flèche, activer le mode de déplacement
      if (this.currentTool === 'arrow') {
        this.isDragging = true;
        
        const stage = this.$refs.stage.getStage();
        this.dragStartPos = stage.getPointerPosition();
        
        console.log('Selected shape:', shapeId);
      }
    },

    // Ajouter cette méthode pour gérer l'ajout de points à un masque existant
    addPointToExistingMask(pos, type) {
      if (!this.annotationStore.selectedObjectId) {
        this.annotationStore.addObject();
      }
      
      const relativeX = pos.x - this.position.x;
      const relativeY = pos.y - this.position.y;
      
      // Utiliser les dimensions réelles de la vidéo originale
      const imageX = Math.round(relativeX * this.scaleX);
      const imageY = Math.round(relativeY * this.scaleY);
      
      // Ajouter le point à la collection temporaire
      this.annotationStore.addTemporaryPoint({
        objectId: this.annotationStore.selectedObjectId,
        x: imageX,
        y: imageY,
        pointType: type
      });
      
      console.log('Point temporaire ajouté:', { x: imageX, y: imageY, type });
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

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
}

.tool-btn:not(:disabled):hover {
  background: #4a4a4a;
}

.pulse-animation {
  animation: pulse 1.5s infinite ease-in-out;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 
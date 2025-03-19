<template>
  <div class="segmentation-view">
    <!-- Left sidebar -->
    <div class="sidebar">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Input Folder</span>
        </div>
        <div class="section-content">
          <div class="folder-path">{{ inputFolder || 'No folder selected' }}</div>
          <button class="action-button" @click="selectInputFolder">Select Folder</button>
          
          <div class="video-list" v-if="videos.length > 0">
            <div v-for="video in videos" 
                 :key="video.path"
                 class="video-item"
                 :class="{ 'selected': selectedVideo && selectedVideo.path === video.path }"
                 @click="selectVideo(video)">
              {{ video.name }}
            </div>
          </div>
          <div v-else-if="inputFolder" class="empty-message">
            No videos found in this folder
          </div>

          <!-- Objects Management Section -->
          <div class="section-header" style="margin-top: 20px;">
            <span class="section-title">Objects</span>
          </div>
          <div class="objects-list">
            <div v-for="(object, index) in objects" 
                 :key="index"
                 class="object-item"
                 :class="{ 'selected': selectedObjectIndex === index }"
                 :style="selectedObjectIndex === index ? { 
                   backgroundColor: object.color,
                   opacity: 0.8
                 } : {}">
              <div class="object-content" @click="selectObject(index)">
                {{ object.name }}
              </div>
              <button class="delete-button" 
                      @click="deleteObject(index)"
                      v-if="objects.length > 1">
                ×
              </button>
            </div>
            <button class="action-button" @click="addNewObject" style="margin-top: 10px;">
              Add New Object
            </button>
          </div>

          <!-- Drawing Mode Section -->
          <div class="section">
            <div class="section-header">
              <span class="section-title">Drawing Mode</span>
            </div>
            <div class="drawing-modes">
              <button 
                class="mode-button" 
                :class="{ active: drawingMode === 'rectangle' }"
                @click="drawingMode = 'rectangle'">
                Rectangle
              </button>
              <button 
                class="mode-button" 
                :class="{ active: drawingMode === 'point' }"
                @click="drawingMode = 'point'">
                Point
              </button>
            </div>
          </div>

          <!-- Auto Detection Section -->
          <div class="section">
            <div class="section-header">
              <span class="section-title">Auto Detection</span>
            </div>
            <button 
              class="action-button"
              @click="detectPersons"
              :disabled="hasUsedAutoDetection">
              Detect Persons
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="main-content">
      <!-- Video display -->
      <div class="video-container">
        <div v-if="!selectedVideo" class="no-video-message">
          Select a video from the sidebar to start
        </div>
        <div v-else class="video-wrapper">
          <video ref="videoPlayer" class="video-player">
            <source :src="selectedVideo.path" type="video/mp4">
          </video>
          <div class="video-overlay" 
               ref="videoOverlay"
               @mousedown="startDrawing"
               @mousemove="drawing"
               @mouseup="endDrawing"
               @mouseleave="endDrawing">
            <div v-for="(point, index) in visiblePoints" 
                 :key="'point-'+index" 
                 class="point-marker"
                 :style="{ 
                   left: point.x + 'px', 
                   top: point.y + 'px',
                   backgroundColor: objects[selectedObjectIndex].color,
                   borderColor: 'white'
                 }">
            </div>
            <div v-if="drawingRect"
                 class="rectangle-marker"
                 :style="{
                   left: `${drawingRect.x}px`,
                   top: `${drawingRect.y}px`,
                   width: `${drawingRect.width}px`,
                   height: `${drawingRect.height}px`,
                   borderColor: objects[selectedObjectIndex].color
                 }">
            </div>
            <div v-if="currentFrameMask" 
                 class="segmentation-mask" 
                 :style="{
                   backgroundImage: `url(${currentFrameMask})`,
                   opacity: 0.5
                 }">
            </div>
          </div>
        </div>
      </div>

      <!-- Video controls and timeline -->
      <div class="video-controls" v-if="selectedVideo">
        <button class="play-button" @click="togglePlay">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>

        <div class="timeline" 
             @mousedown="startScrubbing"
             @mousemove="scrub"
             @mouseup="stopScrubbing"
             @mouseleave="stopScrubbing"
             ref="timeline">
          <!-- Thumbnails container -->
          <div class="thumbnails-container">
            <div v-for="(_, index) in 12" :key="index" class="thumbnail">
              <canvas :ref="'thumbnail_' + index" width="160" height="90"></canvas>
            </div>
          </div>
          
          <!-- Progress and cursor -->
          <div class="timeline-progress" :style="{ width: timelinePosition + '%' }"></div>
          <div class="timeline-cursor-container" :style="{ left: timelinePosition + '%' }">
            <div class="timeline-cursor-line"></div>
            <div class="timeline-cursor-handle"></div>
            <div class="timeline-cursor-time" v-if="duration > 0">{{ formatTimeWithMs(currentTime) }}</div>
          </div>
        </div>
      </div>

      <!-- Object timelines -->
      <div class="object-timelines" v-if="selectedVideo">
        <div class="object-track" v-for="(object, index) in objects" :key="index">
          <div class="track-label" :style="{ color: object.color }">{{ object.name }}</div>
          <div class="track-content" :style="{ '--track-color': object.color }">
            <div v-for="time in getObjectPoints(index)" 
                 :key="time"
                 class="track-marker"
                 :style="{ 
                   left: (time / duration * 100) + '%',
                   backgroundColor: object.color
                 }"
                 :class="{ 'active': isCurrentFrame(time) }"
                 @click="seekToTime(parseFloat(time))">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SegmentationView',

  data() {
    return {
      inputFolder: '',
      videos: [],
      selectedVideo: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      thumbnails: [],
      currentThumbnailIndex: 0,
      timelinePosition: 0,
      isDragging: false,
      isScrubbing: false,
      animationFrameId: null,
      predefinedColors: [
        '#3498db', // Bleu clair
        '#2ecc71', // Vert émeraude
        '#e74c3c', // Rouge corail
        '#9b59b6', // Violet améthyste
        '#f1c40f', // Jaune soleil
        '#1abc9c', // Turquoise
        '#e67e22', // Orange mandarine
        '#34495e', // Bleu marine
        '#27ae60', // Vert forêt
        '#8e44ad'  // Violet royal
      ],
      objects: [
        { name: 'Object 1', points: {}, color: '#3498db' }
      ],
      selectedObjectIndex: 0,
      masks: {}, // Pour stocker les masques par frame et par objet
      drawingMode: 'rectangle', // 'point' ou 'rectangle'
      isDrawing: false,
      drawingRect: null,
      startPoint: null,
      hasUsedAutoDetection: false, // Pour ne permettre qu'une seule utilisation
    }
  },

  computed: {
    currentFramePoints() {
      const frameTime = Math.round(this.currentTime * 100) / 100
      const currentObject = this.objects[this.selectedObjectIndex]
      return currentObject?.points[frameTime] || []
    },
    
    visiblePoints() {
      return this.currentFramePoints.filter(point => !point.isTimelineMarker)
    },

    currentFrameMask() {
      const frameTime = Math.round(this.currentTime * 100) / 100
      const currentObject = this.objects[this.selectedObjectIndex]
      return currentObject?.masks?.[frameTime]
    }
  },

  methods: {
    async selectInputFolder() {
      try {
        const result = await window.electron.openDirectory()
        if (!result.canceled && result.filePaths.length > 0) {
          this.inputFolder = result.filePaths[0]
          await this.loadVideos()
        }
      } catch (error) {
        console.error('Error selecting folder:', error)
      }
    },

    async loadVideos() {
      try {
        this.videos = await window.electron.getVideosFromFolder(this.inputFolder)
      } catch (error) {
        console.error('Error loading videos:', error)
        this.videos = []
      }
    },

    selectVideo(video) {
      this.selectedVideo = video
      this.resetVideoState()
    },

    resetVideoState() {
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.thumbnails = []
      this.currentThumbnailIndex = 0
      this.timelinePosition = 0
      
      // Cancel any ongoing animation
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }
      
      // Clear all points when changing video
      this.objects = [{ name: 'Object 1', points: {}, color: '#3498db' }]
      
      // Wait for the video to be loaded in the DOM
      this.$nextTick(() => {
        const video = this.$refs.videoPlayer
        if (video) {
          video.load()
        }
      })
    },

    togglePlay() {
      const video = this.$refs.videoPlayer
      if (video.paused) {
        video.play()
        this.isPlaying = true
        // Start smooth animation
        this.updateTimelinePosition()
      } else {
        video.pause()
        this.isPlaying = false
        // Stop animation
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId)
          this.animationFrameId = null
        }
      }
    },

    seekToThumbnail(index) {
      const video = this.$refs.videoPlayer
      const seekTime = (index / this.thumbnails.length) * this.duration
      video.currentTime = seekTime
      this.currentThumbnailIndex = index
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    formatTimeWithMs(seconds) {
      const secs = Math.floor(seconds)
      const cs = Math.floor((seconds % 1) * 100)
      return `${secs}:${cs.toString().padStart(2, '0')}`
    },

    updateTimelinePosition() {
      if (this.isPlaying) {
        const video = this.$refs.videoPlayer
        if (video) {
          this.currentTime = video.currentTime
          this.timelinePosition = (this.currentTime / this.duration) * 100
          this.animationFrameId = requestAnimationFrame(this.updateTimelinePosition)
        }
      }
    },

    handleTimeUpdate() {
      // We don't need to update position here anymore as it's handled by requestAnimationFrame
      const video = this.$refs.videoPlayer
      this.currentTime = video.currentTime
      this.currentThumbnailIndex = Math.floor((this.currentTime / this.duration) * this.thumbnails.length)
    },

    handleLoadedMetadata() {
      const video = this.$refs.videoPlayer
      this.duration = video.duration
      this.generateThumbnails()
    },

    generateThumbnails() {
      if (!this.duration) return
      
      const thumbnailCount = 12
      for (let i = 0; i < thumbnailCount; i++) {
        const time = (i / (thumbnailCount - 1)) * this.duration
        const canvas = this.$refs[`thumbnail_${i}`]?.[0]
        if (canvas) {
          this.generateThumbnail(time, canvas)
        }
      }
    },

    async generateThumbnail(time, canvasRef) {
      const video = this.$refs.videoPlayer
      if (!video || !canvasRef) return

      // Save current time
      const currentTime = video.currentTime
      
      // Seek to the time we want to capture
      video.currentTime = time
      
      // Wait for the seek to complete
      await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true })
      })
      
      // Draw the frame
      const ctx = canvasRef.getContext('2d')
      ctx.drawImage(video, 0, 0, canvasRef.width, canvasRef.height)
      
      // Restore original time
      video.currentTime = currentTime
    },

    startDragging(event) {
      this.isDragging = true
      document.addEventListener('mousemove', this.drag)
      document.addEventListener('mouseup', this.stopDragging)
      event.preventDefault()
    },

    drag(event) {
      if (!this.isDragging) return
      
      const timeline = this.$refs.timeline
      const rect = timeline.getBoundingClientRect()
      let position = (event.clientX - rect.left) / rect.width
      position = Math.max(0, Math.min(1, position))
      
      this.timelinePosition = position * 100
      this.currentTime = position * this.duration
      
      const video = this.$refs.videoPlayer
      if (video) {
        video.currentTime = this.currentTime
      }
    },

    stopDragging() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.drag)
      document.removeEventListener('mouseup', this.stopDragging)
    },

    startScrubbing(event) {
      this.isScrubbing = true
      this.scrub(event)
    },

    scrub(event) {
      if (!this.isScrubbing) return
      
      const timeline = this.$refs.timeline
      const rect = timeline.getBoundingClientRect()
      let position = (event.clientX - rect.left) / rect.width
      position = Math.max(0, Math.min(1, position))
      
      this.timelinePosition = position * 100
      this.currentTime = position * this.duration
      
      const video = this.$refs.videoPlayer
      if (video) {
        video.currentTime = this.currentTime
        // Force update the display
        this.$forceUpdate()
      }
    },

    stopScrubbing() {
      this.isScrubbing = false
    },

    startDrawing(event) {
      if (this.drawingMode === 'rectangle') {
        this.isDrawing = true
        const rect = this.$refs.videoOverlay.getBoundingClientRect()
        this.startPoint = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
        this.drawingRect = {
          x: this.startPoint.x,
          y: this.startPoint.y,
          width: 0,
          height: 0
        }
      } else {
        this.handleVideoClick(event)
      }
    },

    drawing(event) {
      if (!this.isDrawing || this.drawingMode !== 'rectangle') return
      
      const rect = this.$refs.videoOverlay.getBoundingClientRect()
      const currentX = event.clientX - rect.left
      const currentY = event.clientY - rect.top
      
      this.drawingRect = {
        x: Math.min(this.startPoint.x, currentX),
        y: Math.min(this.startPoint.y, currentY),
        width: Math.abs(currentX - this.startPoint.x),
        height: Math.abs(currentY - this.startPoint.y)
      }
    },

    async endDrawing() {
      if (!this.isDrawing || this.drawingMode !== 'rectangle') return
      
      this.isDrawing = false
      if (this.drawingRect.width < 5 || this.drawingRect.height < 5) {
        this.drawingRect = null
        return
      }
      
      await this.handleRectangleSegmentation(this.drawingRect)
      this.drawingRect = null
    },

    async handleRectangleSegmentation(rect) {
      const video = this.$refs.videoPlayer
      const overlay = this.$refs.videoOverlay
      const overlayRect = overlay.getBoundingClientRect()
      
      // Conversion en coordonnées réelles
      const scaleX = video.videoWidth / overlayRect.width
      const scaleY = video.videoHeight / overlayRect.height
      
      const realRect = {
        x: Math.round(rect.x * scaleX),
        y: Math.round(rect.y * scaleY),
        width: Math.round(rect.width * scaleX),
        height: Math.round(rect.height * scaleY)
      }

      console.log('Real rectangle coordinates:', realRect)

      const frameTime = Math.round(this.currentTime * 100) / 100
      const currentObject = this.objects[this.selectedObjectIndex]

      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'))
        const formData = new FormData()
        formData.append('file', blob, 'frame.jpg')
        formData.append('bbox', JSON.stringify({
          x: realRect.x,
          y: realRect.y,
          width: realRect.width,
          height: realRect.height
        }))

        const response = await fetch('http://localhost:8000/segment/bbox', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Erreur de segmentation')

        const data = await response.json()

        // Convertir le masque base64 en URL data
        if (data.masks && data.masks.length > 0) {
          // Initialiser l'objet masks si nécessaire
          if (!currentObject.masks) {
            currentObject.masks = {}
          }
          
          // Pour le rectangle, on remplace simplement le masque existant
          const newMaskUrl = `data:image/png;base64,${data.masks[0]}`
          currentObject.masks[frameTime] = newMaskUrl
          
          // Ajouter un point dans la timeline pour marquer la segmentation
          if (!currentObject.points[frameTime]) {
            currentObject.points[frameTime] = []
          }
          // On ajoute un point "virtuel" pour la timeline
          currentObject.points[frameTime].push({ isTimelineMarker: true })
          
          console.log('Rectangle mask set for frame:', frameTime)
        }

      } catch (error) {
        console.error('Erreur lors de la segmentation:', error)
      }
    },

    async handleVideoClick(event) {
      const overlay = this.$refs.videoOverlay
      const video = this.$refs.videoPlayer
      const rect = overlay.getBoundingClientRect()
      
      // Coordonnées dans l'interface
      const viewportX = event.clientX - rect.left
      const viewportY = event.clientY - rect.top
      
      // Conversion vers les coordonnées réelles de la vidéo
      const scaleX = video.videoWidth / rect.width
      const scaleY = video.videoHeight / rect.height
      const realX = Math.round(viewportX * scaleX)
      const realY = Math.round(viewportY * scaleY)
      
      console.log('Click coordinates (viewport):', { x: viewportX, y: viewportY })
      console.log('Real coordinates:', { x: realX, y: realY })
      
      const frameTime = Math.round(this.currentTime * 100) / 100
      const currentObject = this.objects[this.selectedObjectIndex]
      
      // Stocker les coordonnées de l'interface pour l'affichage
      if (!currentObject.points[frameTime]) {
        currentObject.points[frameTime] = []
      }
      currentObject.points[frameTime].push({ x: viewportX, y: viewportY })

      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'))

        const formData = new FormData()
        formData.append('file', blob, 'frame.jpg')
        formData.append('points', JSON.stringify([[realX, realY]]))

        const response = await fetch('http://localhost:8000/segment', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Erreur de segmentation')

        const data = await response.json()

        // Convertir le masque base64 en URL data
        if (data.masks && data.masks.length > 0) {
          // Initialiser l'objet masks si nécessaire
          if (!currentObject.masks) {
            currentObject.masks = {}
          }
          
          // Combiner le nouveau masque avec l'ancien s'il existe
          const newMaskUrl = `data:image/png;base64,${data.masks[0]}`
          
          if (currentObject.masks[frameTime]) {
            // Créer un canvas pour combiner les masques
            const combineCanvas = document.createElement('canvas')
            const ctx = combineCanvas.getContext('2d')
            
            // Charger l'ancien masque
            const oldMask = new Image()
            oldMask.src = currentObject.masks[frameTime]
            
            // Charger le nouveau masque
            const newMask = new Image()
            newMask.src = newMaskUrl
            
            // Attendre que les deux images soient chargées
            await Promise.all([
              new Promise(resolve => oldMask.onload = resolve),
              new Promise(resolve => newMask.onload = resolve)
            ])
            
            // Configurer le canvas
            combineCanvas.width = video.videoWidth
            combineCanvas.height = video.videoHeight
            
            // Dessiner l'ancien masque
            ctx.drawImage(oldMask, 0, 0)
            
            // Combiner avec le nouveau masque en utilisant "destination-out"
            ctx.globalCompositeOperation = 'lighter'
            ctx.drawImage(newMask, 0, 0)
            
            // Convertir le canvas combiné en URL data
            currentObject.masks[frameTime] = combineCanvas.toDataURL('image/png')
            
            console.log('Masks combined for frame:', frameTime)
          } else {
            // S'il n'y a pas de masque précédent, utiliser le nouveau directement
            currentObject.masks[frameTime] = newMaskUrl
          }
        }

      } catch (error) {
        console.error('Erreur lors de la segmentation:', error)
      }
    },

    isCurrentFrame(time) {
      const currentFrameTime = Math.round(this.currentTime * 100) / 100
      return Math.abs(currentFrameTime - parseFloat(time)) < 0.01
    },

    addNewObject() {
      const newIndex = this.objects.length
      this.objects.push({
        name: `Object ${newIndex + 1}`,
        points: {},
        color: this.predefinedColors[newIndex % this.predefinedColors.length],
        masks: {}
      })
    },

    selectObject(index) {
      this.selectedObjectIndex = index
    },

    getObjectPoints(objectIndex) {
      const object = this.objects[objectIndex]
      return Object.keys(object.points || {}).filter(time => {
        // Retourner true si le tableau de points n'est pas vide
        // ou s'il contient un marqueur de timeline
        return object.points[time].length > 0
      })
    },

    seekToTime(time) {
      const video = this.$refs.videoPlayer
      if (video) {
        video.currentTime = time
        this.currentTime = time
        this.timelinePosition = (time / this.duration) * 100
        console.log('Seeking to time:', time)
      }
    },

    handleKeyPress(event) {
      if (event.key === 'Delete') {
        this.deleteCurrentFrameData()
      }
    },

    deleteCurrentFrameData() {
      const frameTime = Math.round(this.currentTime * 100) / 100
      const currentObject = this.objects[this.selectedObjectIndex]
      
      if (currentObject && this.isCurrentFrame(frameTime)) {
        console.log('Deleting data for frame:', frameTime, 'object:', currentObject.name)
        
        // Supprimer les points
        if (currentObject.points) {
          delete currentObject.points[frameTime]
        }
        
        // Supprimer le masque
        if (currentObject.masks) {
          delete currentObject.masks[frameTime]
        }
        
        // Forcer la mise à jour de la vue
        this.$forceUpdate()
      }
    },

    deleteObject(index) {
      if (this.objects.length <= 1) {
        console.warn('Cannot delete the last object')
        return
      }

      // Supprimer l'objet
      this.objects.splice(index, 1)

      // Renommer les objets restants et réattribuer les couleurs
      this.objects.forEach((obj, i) => {
        obj.name = `Object ${i + 1}`
        obj.color = this.predefinedColors[i % this.predefinedColors.length]
      })

      // Ajuster l'index sélectionné si nécessaire
      if (this.selectedObjectIndex >= this.objects.length) {
        this.selectedObjectIndex = this.objects.length - 1
      }
      
      console.log('Object deleted and remaining objects renamed')
    },

    async detectPersons() {
      if (this.hasUsedAutoDetection) {
        console.warn('Auto detection can only be used once')
        return
      }

      const video = this.$refs.videoPlayer
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'))
        const formData = new FormData()
        formData.append('file', blob, 'frame.jpg')

        const response = await fetch('http://localhost:8000/detect-and-segment/persons/', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Erreur de détection')

        const data = await response.json()
        const frameTime = Math.round(this.currentTime * 100) / 100

        // Créer un nouvel objet pour chaque personne détectée
        data.detections.forEach((detection, index) => {
          const newObject = {
            name: `Person ${this.objects.length + index + 1}`,
            points: {},
            masks: {},
            color: this.predefinedColors[(this.objects.length + index) % this.predefinedColors.length]
          }

          // Ajouter un point virtuel pour la timeline
          newObject.points[frameTime] = [{ isTimelineMarker: true }]
          
          // Ajouter le masque
          newObject.masks[frameTime] = `data:image/png;base64,${detection.mask}`

          this.objects.push(newObject)
        })

        this.hasUsedAutoDetection = true
        console.log(`Added ${data.detections.length} new person objects`)

      } catch (error) {
        console.error('Erreur lors de la détection des personnes:', error)
      }
    },
  },

  mounted() {
    window.addEventListener('keydown', this.handleKeyPress)
    
    // Set default folder and load videos
    this.inputFolder = "C:\\Users\\antoi\\Documents\\Work_Learn\\Stage-Rennes\\RepositoryFootballVision\\SportDETR\\data\\football\\raw"
    this.loadVideos().then(() => {
      // Select first video if available
      if (this.videos.length > 0) {
        this.selectVideo(this.videos[0])
      }
    })
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyPress)
    // Clean up animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  },

  watch: {
    selectedVideo(newVideo, oldVideo) {
      if (oldVideo) {
        const video = this.$refs.videoPlayer
        video.removeEventListener('timeupdate', this.handleTimeUpdate)
        video.removeEventListener('loadedmetadata', this.handleLoadedMetadata)
      }
      
      if (newVideo) {
        this.$nextTick(() => {
          const video = this.$refs.videoPlayer
          video.addEventListener('timeupdate', this.handleTimeUpdate)
          video.addEventListener('loadedmetadata', this.handleLoadedMetadata)
        })
      }
    }
  }
}
</script>

<style scoped>
.segmentation-view {
  height: 100vh;
  background: #1a1a1a;
  display: flex;
}

.sidebar {
  width: 300px;
  background: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.section {
  padding: 16px;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  color: white;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.folder-path {
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  color: #fff;
  font-size: 12px;
  word-break: break-all;
}

.action-button {
  width: 100%;
  padding: 8px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #333;
  border-color: #444;
}

.video-list {
  margin-top: 16px;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
}

.video-item {
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.video-item:hover {
  background: #2a2a2a;
}

.video-item.selected {
  background: #2a2a2a;
  border-left: 2px solid #4CAF50;
}

.empty-message {
  color: #666;
  text-align: center;
  padding: 16px;
  font-size: 13px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.no-video-message {
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 16px;
}

.video-container {
  height: 60%;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  overflow: hidden;
}

.video-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.point-marker {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: red;
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.video-player {
  max-width: 100%;
  max-height: 100%;
}

.video-controls {
  height: 60px;
  min-height: 60px;
  background: #1a1a1a;
  border-top: 1px solid #333;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.play-button {
  min-width: 40px;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline {
  flex: 1;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  position: relative;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
}

.thumbnails-container {
  display: flex;
  height: 100%;
  width: 100%;
  gap: 2px;
}

.thumbnail {
  flex: 1;
  height: 100%;
  background: #1a1a1a;
  overflow: hidden;
}

.thumbnail canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(33, 150, 243, 0.2);
  pointer-events: none;
}

.timeline-cursor-container {
  position: absolute;
  top: 0;
  height: 100%;
  transform: translateX(-50%);
  pointer-events: none;
}

.timeline-cursor-line {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background: #2196f3;
  transform: translateX(-50%);
}

.timeline-cursor-handle {
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  background: #2196f3;
  border-radius: 50%;
  transform: translateX(-50%);
  cursor: grab;
  pointer-events: auto;
}

.timeline-cursor-time {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.objects-list {
  margin-top: 10px;
}

.object-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  margin: 4px 0;
  border-radius: 4px;
  background: #2a2a2a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.object-item.selected {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.object-content {
  flex-grow: 1;
}

.delete-button {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  margin-left: 8px;
  padding: 0;
  line-height: 1;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background: rgba(255, 0, 0, 0.4);
  transform: scale(1.1);
}

.object-timelines {
  flex: 1;
  background: #1a1a1a;
  border-top: 1px solid #333;
  padding: 10px 15px;
  overflow-y: auto;
  max-height: calc(40% - 60px);
}

.object-track {
  display: flex;
  align-items: center;
  height: 20px;
  min-height: 20px;
  gap: 15px;
  width: 100%;
}

.object-track + .object-track {
  margin-top: 10px;
}

.track-label {
  min-width: 40px;
  width: 40px;
  color: white;
  font-size: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.track-content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.track-content::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 1px;
  background: var(--track-color);
  opacity: 0.3;
  top: 50%;
  transform: translateY(-50%);
}

.track-marker {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  top: 50%;
  transition: all 0.2s ease;
  z-index: 1;
  cursor: pointer;
}

.track-marker:hover {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}

.track-marker.active {
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  width: 14px;
  height: 14px;
}

.segmentation-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
}

.drawing-modes {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-button {
  flex: 1;
  padding: 8px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-button.active {
  background: #4CAF50;
  border-color: #45a049;
}

.rectangle-marker {
  position: absolute;
  border: 2px solid;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

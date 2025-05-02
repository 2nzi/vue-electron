<template>
  <div class="timeline-section">
    <div class="timeline-container">
      <div class="controls">
        <button class="play-pause-btn" @click="togglePlayPause">
          <!-- Triangle creux pour le bouton play -->
          <svg v-if="!isPlaying" viewBox="0 0 24 24" width="20" height="20">
            <polygon points="5,3 19,12 5,21" fill="none" stroke="white" stroke-width="1.5"/>
          </svg>
          <!-- Icône pause -->
          <svg v-else viewBox="0 0 24 24" width="20" height="20">
            <rect x="6" y="4" width="4" height="16" fill="white"/>
            <rect x="14" y="4" width="4" height="16" fill="white"/>
          </svg>
        </button>
      </div>
      <div class="video-timeline">
        <div class="timeline-track">
          <div class="time-marker" :style="{ left: progressPercentage + '%' }">
            <div class="time-indicator">{{ formatTimeSimple(preciseTime) }}</div>
            <div class="marker-head"></div>
            <div class="marker-line"></div>
          </div>
          
          <!-- Suppression des marqueurs d'annotation -->
          
          <div class="frames-container">
            <div 
              class="frame" 
              v-for="(thumbnail, index) in thumbnails" 
              :key="index"
              :style="{ backgroundImage: `url(${thumbnail})` }"
            ></div>
          </div>
          <input 
            type="range" 
            min="0" 
            :max="duration" 
            step="0.01" 
            v-model="currentTime"
            @input="seekVideo"
            class="timeline-slider"
          />
        </div>
      </div>
      <div class="timeline-tools"></div>
    </div>
  </div>
</template> 

<script>
import { useVideoStore } from '../../stores/videoStore'
import { useAnnotationStore } from '../../stores/annotationStore'

export default {
  name: 'TimelineSection',
  
  data() {
    return {
      videoStore: useVideoStore(),
      annotationStore: useAnnotationStore(),
      isPlaying: false,
      currentTime: 0,
      duration: 100, // Valeur par défaut, sera mise à jour quand la vidéo sera chargée
      videoElement: null,
      thumbnails: [],
      thumbnailCount: 6,
      timeUpdateInterval: null,
      keyboardListener: null,
      unsubscribeTimeUpdate: null,
      frameRate: 30, // Taux d'images par défaut, à mettre à jour lors du chargement de la vidéo
      currentFrame: 0 // Numéro de frame actuel
    }
  },
  
  computed: {
    progressPercentage() {
      // Utiliser directement la valeur du store pour s'assurer que les mises à jour sont reflétées
      const storeTime = this.videoStore.currentTime || this.currentTime
      return (storeTime / this.duration) * 100 || 0
    },
    
    // Calculer le temps exact basé sur le numéro de frame
    preciseTime() {
      return this.currentFrame / this.frameRate
    },
    
    // Récupérer toutes les frames qui ont des annotations
    annotationFrames() {
      return this.annotationStore.frameAnnotations || {}
    }
  },
  
  mounted() {
    // Ajouter un écouteur d'événement pour les touches Entrée et Espace
    this.keyboardListener = (event) => {
      if (event.key === ' ' || event.code === 'Space') {
        // Empêcher le comportement par défaut (comme le défilement de la page avec la barre d'espace)
        event.preventDefault();
        this.togglePlayPause();
      }
    };
    document.addEventListener('keydown', this.keyboardListener);
    
    // S'abonner aux changements de temps dans le store
    this.unsubscribeTimeUpdate = this.videoStore.$subscribe((mutation, state) => {
      if (state.currentTime !== this.currentTime) {
        this.currentTime = state.currentTime
        // Mettre à jour également le numéro de frame
        this.currentFrame = this.getCurrentFrame()
      }
    })
  },
  
  watch: {
    'videoStore.selectedVideo': {
      handler(newVideo) {
        if (newVideo) {
          console.log('Nouvelle vidéo sélectionnée dans Timeline:', newVideo)
          this.resetPlayer()
          this.loadVideo(newVideo.path)
          
          // Mettre à jour le frameRate dans le store d'annotation
          if (this.annotationStore.currentSession) {
            this.annotationStore.currentSession.videoId = newVideo.id || newVideo.path
            this.annotationStore.currentSession.frameRate = this.frameRate
          }
        }
      },
      immediate: true
    }
  },
  
  methods: {
    async loadVideo(videoPath) {
      try {
        // Utiliser la méthode du store pour charger la vidéo
        const { duration, videoElement, frameRate } = await this.videoStore.loadVideoMetadata(videoPath)
        
        // Mettre à jour les propriétés locales
        this.duration = duration
        this.videoElement = videoElement
        this.frameRate = frameRate || 30 // Utiliser 30 fps par défaut si non spécifié
        
        // Mettre à jour le frameRate dans le store d'annotation
        if (this.annotationStore.currentSession) {
          this.annotationStore.currentSession.frameRate = this.frameRate
        }
        
        // Générer les vignettes
        this.generateThumbnails(videoElement)
      } catch (error) {
        console.error('Erreur lors du chargement de la vidéo:', error)
      }
    },
    
    // Calculer la position d'une frame sur la timeline (en pourcentage)
    getFramePosition(frameNumber) {
      const timeInSeconds = frameNumber / this.frameRate
      return (timeInSeconds / this.duration) * 100
    },
    
    // Obtenir la couleur pour un marqueur d'annotation
    getAnnotationColor(frameNumber) {
      const annotations = this.annotationStore.getAnnotationsForFrame(frameNumber)
      if (annotations.length > 0) {
        // Utiliser la couleur du premier objet annoté
        const objectId = annotations[0].objectId
        const object = this.annotationStore.objects[objectId]
        return object ? object.color : '#FFFFFF'
      }
      return '#FFFFFF' // Couleur par défaut
    },
    
    async generateThumbnails(videoEl) {
      this.thumbnails = []
      
      // Créer un canvas pour dessiner les vignettes
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Définir la taille du canvas
      canvas.width = 160  // Largeur de la vignette
      canvas.height = 90  // Hauteur de la vignette (ratio 16:9)
      
      // Générer les vignettes à intervalles réguliers
      for (let i = 0; i < this.thumbnailCount; i++) {
        const timePoint = (i / (this.thumbnailCount - 1)) * this.duration
        
        // Positionner la vidéo au point temporel
        videoEl.currentTime = timePoint
        
        // Attendre que la vidéo soit positionnée
        await new Promise(resolve => {
          videoEl.addEventListener('seeked', resolve, { once: true })
        })
        
        // Dessiner l'image sur le canvas
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
        
        // Convertir le canvas en URL de données
        const thumbnailUrl = canvas.toDataURL('image/jpeg')
        this.thumbnails.push(thumbnailUrl)
      }
    },
    
    // Méthode pour aller à une frame spécifique
    goToFrame(frameNumber) {
      this.currentFrame = frameNumber
      const preciseTime = frameNumber / this.frameRate
      
      // Mettre à jour le temps avec une précision à l'image près
      this.currentTime = preciseTime
      this.videoStore.currentTime = preciseTime
      
      if (this.videoElement) {
        // Utiliser requestAnimationFrame pour s'assurer que le DOM est prêt
        requestAnimationFrame(() => {
          this.videoElement.currentTime = preciseTime
        })
      }
      
      // Mettre à jour l'interface
      this.seekVideo()
    },
    
    // Méthode pour obtenir le numéro de frame actuel à partir du temps
    getCurrentFrame() {
      // Utiliser Math.round au lieu de Math.floor pour une meilleure précision
      return Math.round(this.currentTime * this.frameRate)
    },
    
    togglePlayPause() {
      this.isPlaying = !this.isPlaying
      
      // Mettre à jour le store pour que VideoSection soit informé
      this.videoStore.isPlaying = this.isPlaying
      
      if (this.videoElement) {
        if (this.isPlaying) {
          // S'assurer que la vidéo commence à la position exacte de la frame actuelle
          const preciseTime = this.currentFrame / this.frameRate
          this.videoElement.currentTime = preciseTime
          this.videoElement.play()
          this.startTimeUpdate()
        } else {
          this.videoElement.pause()
          this.stopTimeUpdate()
          // Capturer le numéro de frame exact lors de la pause
          this.currentFrame = this.getCurrentFrame()
        }
      } else {
        // Mode simulation
        if (this.isPlaying) {
          // Commencer la simulation à partir de la frame actuelle
          this.startTimeUpdate()
        } else {
          this.stopTimeUpdate()
          // Capturer le numéro de frame exact lors de la pause
          this.currentFrame = this.getCurrentFrame()
        }
      }
    },
    
    seekVideo() {
      // Calculer le numéro de frame exact
      this.currentFrame = this.getCurrentFrame()
      
      // Calculer le temps précis basé sur le numéro de frame
      const preciseTime = this.currentFrame / this.frameRate
      
      if (this.videoElement) {
        this.videoElement.currentTime = preciseTime
      }
      
      // Mettre à jour le store avec le temps précis
      this.videoStore.currentTime = preciseTime
    },
    
    startTimeUpdate() {
      // Utiliser requestAnimationFrame pour une meilleure fluidité
      const updateTime = () => {
        if (this.videoElement) {
          this.currentTime = this.videoElement.currentTime
          // Mettre à jour le numéro de frame actuel
          this.currentFrame = this.getCurrentFrame()
          // Mettre à jour le store à chaque frame
          this.videoStore.currentTime = this.currentTime
        } else {
          // Simulation pour test - avancer d'une frame à la fois
          this.currentFrame += 1
          this.currentTime = this.currentFrame / this.frameRate
          
          // Vérifier si on a atteint la fin
          if (this.currentTime >= this.duration) {
            this.isPlaying = false
            this.videoStore.isPlaying = false
            this.stopTimeUpdate()
            return
          }
          
          // Mettre à jour le store même en mode simulation
          this.videoStore.currentTime = this.currentTime
        }
        
        if (this.isPlaying) {
          this.animationFrameId = requestAnimationFrame(updateTime)
        }
      }
      
      this.animationFrameId = requestAnimationFrame(updateTime)
    },
    
    stopTimeUpdate() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }
    },
    
    resetPlayer() {
      this.isPlaying = false
      this.currentTime = 0
      this.stopTimeUpdate()
      this.thumbnails = []
    },
    
    formatTimeSimple(seconds) {
      const secs = Math.floor(seconds)
      const cs = Math.floor((seconds - secs) * 100)
      // Ajouter le numéro de frame pour plus de précision
      const frame = this.getCurrentFrame()
      return `${secs}:${cs < 10 ? '0' : ''}${cs} (f:${frame})`
    }
  },
  
  beforeUnmount() {
    this.stopTimeUpdate()
    if (this.videoElement) {
      this.videoElement.pause()
      this.videoElement.src = ''
      this.videoElement = null
    }
    
    // Supprimer l'écouteur d'événement lors du démontage du composant
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
    
    // Désabonner de l'écoute des changements dans le store
    if (this.unsubscribeTimeUpdate) {
      this.unsubscribeTimeUpdate()
    }
  }
}
</script>

<style scoped>
.timeline-section {
  padding-top: 25px;
  width: 100%;
}

.timeline-container {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.controls {
  display: flex;
  align-items: center;
}

.play-pause-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.video-timeline {
  flex-grow: 1;
  position: relative;
}

.timeline-track {
  position: relative;
  height: 50px;
}

.frames-container {
  display: flex;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.frame {
  flex: 1;
  height: 100%;
  background-size: cover;
  background-position: center;
  border-right: 2px solid black;
}

.frame:last-child {
  border-right: none;
}

.time-marker {
  position: absolute;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-indicator {
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 4px;
  white-space: nowrap;
}

.marker-head {
  width: 6px;
  height: 3px;
  background: white;
}

.marker-line {
  width: 2px;
  height: 50px;
  background: white;
}

.timeline-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 5;
}

.timeline-tools {
  width: 50px;
  height: 50px;
}

.annotation-marker {
  position: absolute;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 8;
  cursor: pointer;
}

.annotation-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: white;
  margin-bottom: 2px;
}
</style> 
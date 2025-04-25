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
            <div class="time-indicator">{{ formatTimeSimple(currentTime) }}</div>
            <div class="marker-head"></div>
            <div class="marker-line"></div>
          </div>
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

export default {
  name: 'TimelineSection',
  
  data() {
    return {
      videoStore: useVideoStore(),
      isPlaying: false,
      currentTime: 0,
      duration: 100, // Valeur par défaut, sera mise à jour quand la vidéo sera chargée
      videoElement: null,
      thumbnails: [],
      thumbnailCount: 6,
      timeUpdateInterval: null,
      keyboardListener: null
    }
  },
  
  computed: {
    progressPercentage() {
      return (this.currentTime / this.duration) * 100 || 0
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
  },
  
  watch: {
    'videoStore.selectedVideo': {
      handler(newVideo) {
        if (newVideo) {
          console.log('Nouvelle vidéo sélectionnée dans Timeline:', newVideo)
          this.resetPlayer()
          this.loadVideo(newVideo.path)
        }
      },
      immediate: true
    }
  },
  
  methods: {
    async loadVideo(videoPath) {
      // Créer un élément vidéo temporaire pour charger la vidéo
      const tempVideo = document.createElement('video')
      tempVideo.src = videoPath
      tempVideo.crossOrigin = 'anonymous' // Nécessaire pour certaines sources vidéo
      
      // Attendre que les métadonnées soient chargées
      await new Promise(resolve => {
        tempVideo.addEventListener('loadedmetadata', () => {
          this.duration = tempVideo.duration
          this.videoElement = tempVideo
          resolve()
        })
        
        // En cas d'erreur
        tempVideo.addEventListener('error', () => {
          console.error('Erreur lors du chargement de la vidéo')
          resolve()
        })
      })
      
      // Générer les vignettes
      this.generateThumbnails(tempVideo)
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
    
    togglePlayPause() {
      this.isPlaying = !this.isPlaying
      
      // Mettre à jour le store pour que VideoSection soit informé
      this.videoStore.isPlaying = this.isPlaying
      
      if (this.videoElement) {
        if (this.isPlaying) {
          this.videoElement.play()
          this.startTimeUpdate()
        } else {
          this.videoElement.pause()
          this.stopTimeUpdate()
        }
      } else {
        // Mode simulation
        if (this.isPlaying) {
          this.startTimeUpdate()
        } else {
          this.stopTimeUpdate()
        }
      }
    },
    
    seekVideo() {
      if (this.videoElement) {
        this.videoElement.currentTime = this.currentTime
      }
      
      // Mettre à jour le store pour que VideoSection soit informé
      this.videoStore.currentTime = this.currentTime
    },
    
    startTimeUpdate() {
      // Utiliser requestAnimationFrame pour une meilleure fluidité
      const updateTime = () => {
        if (this.videoElement) {
          this.currentTime = this.videoElement.currentTime
          // Mettre à jour le store à chaque frame
          this.videoStore.currentTime = this.currentTime
        } else {
          // Simulation pour test
          this.currentTime = Math.min(this.currentTime + 0.03, this.duration)
          // Mettre à jour le store même en mode simulation
          this.videoStore.currentTime = this.currentTime
          
          if (this.currentTime >= this.duration) {
            this.isPlaying = false
            this.videoStore.isPlaying = false
            this.stopTimeUpdate()
            return
          }
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
      return `${secs}:${cs < 10 ? '0' : ''}${cs}`
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
  }
}
</script>

<style scoped>
.timeline-section {
  background: #000000;
  padding-top: 35px;
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
</style> 
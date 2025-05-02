<template>
  <div 
    class="object-item" 
    :class="{ 'selected': isSelected }"
    @click="toggleSelection"
  >
    <div class="object-id">
      <span>{{ objectId }}</span>
    </div>
    <div class="object-timeline" ref="timelineRef">
      <div class="timeline-line"></div>
      <!-- Points pour chaque annotation -->
      <div 
        v-for="(frameKey, index) in annotatedFrames" 
        :key="index"
        class="annotation-point"
        :style="{
          left: `${calculatePositionExact(parseInt(frameKey))}%`,
          backgroundColor: getObjectColor
        }"
        :title="`Frame ${frameKey}`"
        @click.stop="goToFrame(parseInt(frameKey))"
      ></div>
    </div>
  </div>
</template>

<script>
import { useAnnotationStore } from '@/stores/annotationStore'
import { useVideoStore } from '@/stores/videoStore'
import { computed, ref } from 'vue'

export default {
  name: 'ObjectItem',
  props: {
    objectId: {
      type: String,
      default: 'object1'
    },
    colorIndex: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const annotationStore = useAnnotationStore()
    const videoStore = useVideoStore()
    const timelineRef = ref(null)
    
    // Vérifier si cet objet est actuellement sélectionné
    const isSelected = computed(() => {
      return annotationStore.selectedObjectId === props.objectId
    })
    
    // Fonction pour basculer la sélection de l'objet
    const toggleSelection = () => {
      if (isSelected.value) {
        annotationStore.deselectObject()
      } else {
        annotationStore.selectObject(props.objectId)
      }
    }
    
    // Récupérer toutes les frames où cet objet a des annotations
    const annotatedFrames = computed(() => {
      const frames = []
      Object.keys(annotationStore.frameAnnotations).forEach(frameKey => {
        const hasObjectAnnotation = annotationStore.frameAnnotations[frameKey].some(
          annotation => annotation.objectId === props.objectId
        )
        if (hasObjectAnnotation) {
          frames.push(frameKey)
        }
      })
      return frames
    })
    
    // Obtenir la couleur de l'objet
    const getObjectColor = computed(() => {
      return annotationStore.objects[props.objectId]?.color || '#4CAF50'
    })
    
    // Calculer la position en pourcentage pour une frame donnée
    const calculatePositionExact = (frameNumber) => {
      const frameRate = annotationStore.currentSession.frameRate || 30
      const timeInSeconds = frameNumber / frameRate
      const videoDuration = videoStore.duration || videoStore.selectedVideo?.duration || 0
      
      if (!videoDuration || videoDuration <= 0) {
        console.warn('Attention: Durée de vidéo non disponible, utilisation d\'une valeur par défaut')
        return 0 // Ou retourner une position par défaut
      }
      
      return (timeInSeconds / videoDuration) * 100
    }
    
    // Fonction pour naviguer vers une frame spécifique
    const goToFrame = (frameNumber) => {
      // Convertir le numéro de frame en temps (secondes)
      const frameRate = annotationStore.currentSession.frameRate || 30
      
      // Utiliser une valeur exacte pour le temps en secondes
      // Ajouter un petit décalage (0.001) pour éviter les problèmes d'arrondi
      const timeInSeconds = frameNumber / frameRate + 0.001
      
      // console.log(`Navigation vers frame ${frameNumber}, temps: ${timeInSeconds}s`)
      
      // Mettre à jour le temps courant dans le videoStore
      videoStore.setCurrentTime(timeInSeconds)
      
      // Utiliser la méthode seek si disponible
      if (videoStore.seek) {
        videoStore.seek(timeInSeconds)
      } else {
        // Fallback: essayer d'accéder directement à l'élément vidéo
        const videoElement = document.querySelector('video')
        if (videoElement) {
          videoElement.currentTime = timeInSeconds
        }
      }
      
      // Forcer la mise à jour de l'interface
      videoStore.updateProgressBar(timeInSeconds)
    }
    
    return {
      annotatedFrames,
      calculatePositionExact,
      getObjectColor,
      timelineRef,
      isSelected,
      toggleSelection,
      goToFrame
    }
  }
}
</script>

<style scoped>
.object-item {
  display: flex;
  height: 24px;
  margin-bottom: 18px;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 4px;
  padding: 2px 4px;
}

.object-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.object-item.selected {
  background-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.object-id {
  width: 35px;
  font-weight: bold;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: white;
}

.object-timeline {
  flex-grow: 1;
  height: 100%;
  position: relative;
  border-radius: 4px;
  display: flex;
  align-items: center;
  border-color: white;
}

.timeline-line {
  height: 1px;
  width: 100%;
  background-color: white;
}

.annotation-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
</style> 
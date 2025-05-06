<template>
  <div class="zoom-video">
    <div class="zoom-header">
      <h3>Zoom: {{ objectName }}</h3>
    </div>
    <div class="zoom-content">
      <pre>{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script>
import { useAnnotationStore } from '@/stores/annotationStore'
import { useVideoStore } from '@/stores/videoStore'
import { computed } from 'vue'

export default {
  name: 'ZoomVideo',
  
  setup() {
    const annotationStore = useAnnotationStore()
    const videoStore = useVideoStore()

    const getCurrentFrameNumber = () => {
      const frameRate = annotationStore.currentSession?.frameRate || 30
      return Math.round(videoStore.currentTime * frameRate)
    }

    const objectName = computed(() => {
      if (!annotationStore.selectedObjectId) return 'Aucun objet sélectionné'
      return annotationStore.objects[annotationStore.selectedObjectId]?.name || 
             annotationStore.selectedObjectId
    })

    const debugInfo = computed(() => {
      const currentFrame = getCurrentFrameNumber()
      const frameAnnotations = annotationStore.getAnnotationsForFrame(currentFrame) || []
      const selectedAnnotations = frameAnnotations.filter(
        annotation => annotation.objectId === annotationStore.selectedObjectId
      )

      return {
        currentFrame,
        selectedObjectId: annotationStore.selectedObjectId,
        annotationsCount: selectedAnnotations.length,
        annotations: selectedAnnotations
      }
    })

    return {
      objectName,
      debugInfo
    }
  }
}
</script>

<style scoped>
.zoom-video {
  width: 100%;
  height: 100%;
  background: #2c2c2c;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.zoom-header {
  padding: 8px 12px;
  background: #3c3c3c;
  border-bottom: 1px solid #4a4a4a;
}

.zoom-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
}

.zoom-content {
  flex: 1;
  padding: 10px;
  color: white;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
}
</style> 
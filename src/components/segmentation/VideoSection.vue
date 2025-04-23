<template>
  <div class="video-section">
    <div class="video-tools">
      <!-- Outils vidéo -->
    </div>
    <div class="video-container" ref="container">
      <v-stage
        ref="stage"
        :config="stageConfig"
        @mousedown="handleMouseDown"
      >
        <v-layer ref="layer">
          <v-image
            :config="{
              image: imageElement,
              width: imageWidth,
              height: imageHeight,
              x: position.x,
              y: position.y
            }"
          />
          <v-circle
            v-for="point in points"
            :key="point.id"
            :config="{
              x: point.x,
              y: point.y,
              radius: 5,
              fill: 'red',
              stroke: 'white',
              strokeWidth: 1
            }"
          />
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoSection',

  data() {
    return {
      imageElement: null,
      imageWidth: 0,
      imageHeight: 0,
      position: { x: 0, y: 0 },
      points: [],
      stageConfig: {
        width: 0,
        height: 0
      }
    }
  },

  mounted() {
    this.imageElement = new Image()
    this.imageElement.src = require('@/assets/imgFoot.jpg')
    this.imageElement.onload = () => {
      this.updateDimensions()
      this.centerImage()
    }
    
    this.updateDimensions()
    window.addEventListener('resize', this.updateDimensions)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.updateDimensions)
  },

  methods: {
    updateDimensions() {
      const container = this.$refs.container
      if (!container) return

      this.imageWidth = container.clientWidth
      this.imageHeight = container.clientWidth * 9/16

      this.stageConfig.width = this.imageWidth
      this.stageConfig.height = this.imageHeight
    },

    centerImage() {
      const stage = this.$refs.stage?.getStage()
      if (!stage) return

      this.position = {
        x: 0,
        y: 0
      }
    },

    handleMouseDown(e) {
      if (e.evt.button !== 0) return

      const stage = this.$refs.stage.getStage()
      const pointerPos = stage.getPointerPosition()

      // Calculer le ratio entre la taille de l'image originale et sa taille affichée
      const imageOriginalWidth = this.imageElement.naturalWidth
      const imageOriginalHeight = this.imageElement.naturalHeight
      const scaleX = imageOriginalWidth / this.imageWidth
      const scaleY = imageOriginalHeight / this.imageHeight

      // Convertir les coordonnées du clic en coordonnées de l'image originale
      const imageX = Math.round(pointerPos.x * scaleX)
      const imageY = Math.round(pointerPos.y * scaleY)

      this.points.push({
        id: Date.now(),
        x: pointerPos.x, // Garder les coordonnées d'affichage pour le rendu
        y: pointerPos.y
      })

      console.log('Coordonnées dans l\'image originale:', { x: imageX, y: imageY })
    }
  }
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
  background: #2a2a2a;
  border-radius: 4px;
}

.video-container {
  flex: 1;
  position: relative;
  background: #2a2a2a;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.video-container > * {
  position: absolute;
  left: 0;
  width: 100%;
  height: auto;
}
</style> 
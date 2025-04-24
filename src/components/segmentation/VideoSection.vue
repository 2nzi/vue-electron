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
    window.addEventListener('keydown', this.handleKeyDown)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.updateDimensions)
    window.removeEventListener('keydown', this.handleKeyDown)
  },

  methods: {
    updateDimensions() {
      const container = this.$refs.container
      if (!container) return

      // Obtenir les dimensions du conteneur
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      // Calculer les dimensions en respectant le ratio 16:9 et la hauteur max
      let width = containerWidth
      let height = width * 9/16

      // Si la hauteur calculée dépasse la hauteur du conteneur, on ajuste
      if (height > containerHeight) {
        height = containerHeight
        width = height * 16/9
      }

      // Mettre à jour les dimensions
      this.imageWidth = width
      this.imageHeight = height
      this.stageConfig.width = width
      this.stageConfig.height = height

      // Centrer l'image
      this.position.x = (containerWidth - width) / 2
      this.position.y = (containerHeight - height) / 2
    },

    centerImage() {
      const stage = this.$refs.stage?.getStage()
      if (!stage) return

      this.position = {
        x: 0,
        y: 0
      }
    },

    selectTool(tool) {
      this.currentTool = tool
    },

    handleMouseDown(e) {
      if (e.evt.button !== 0) return

      const stage = this.$refs.stage.getStage()
      const pointerPos = stage.getPointerPosition()

      // Vérifier si le clic est dans les limites de l'image
      if (!this.isInsideImage(pointerPos)) return

      if (this.currentTool === 'arrow') {
        // Vérifier si on clique sur un rectangle
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

        // Vérifier si on clique sur un point (avec une marge de 5 pixels)
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
          // Stocker directement les coordonnées absolues
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

        // Mettre à jour la position du rectangle ou du point sélectionné
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

      // Calculer la taille du rectangle en utilisant les coordonnées absolues
      this.rectangleSize = {
        width: pointerPos.x - this.rectangleStart.x,
        height: pointerPos.y - this.rectangleStart.y
      }
    },

    handleMouseUp() {
      if (this.isDragging) {
        this.isDragging = false
        return
      }

      if (!this.isDrawing || this.currentTool !== 'rectangle') return

      // Convertir en coordonnées relatives à l'image
      const relativeStart = {
        x: this.rectangleStart.x - this.position.x,
        y: this.rectangleStart.y - this.position.y
      }

      // Convertir en coordonnées de l'image originale
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

      // Sauvegarder le rectangle avec les coordonnées absolues pour l'affichage
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

    // Nouvelle méthode pour vérifier si un point est dans l'image
    isInsideImage(point) {
      return point.x >= this.position.x && 
             point.x <= this.position.x + this.imageWidth &&
             point.y >= this.position.y && 
             point.y <= this.position.y + this.imageHeight
    },

    addPoint(pos, type) {
      const imageOriginalWidth = this.imageElement.naturalWidth
      const imageOriginalHeight = this.imageElement.naturalHeight
      const scaleX = imageOriginalWidth / this.imageWidth
      const scaleY = imageOriginalHeight / this.imageHeight

      const imageX = Math.round(pos.x * scaleX)
      const imageY = Math.round(pos.y * scaleY)

      this.points.push({
        id: Date.now(),
        x: pos.x + this.position.x, // Ajuster la position pour le rendu
        y: pos.y + this.position.y,
        type: type,
        color: type === 'positive' ? '#4CAF50' : '#f44336'
      })

      console.log('Point ajouté:', { x: imageX, y: imageY, type: type })
    },

    handleKeyDown(e) {
      if (e.key === 'Delete' && this.selectedId) {
        // Supprimer l'élément des rectangles s'il y est
        this.rectangles = this.rectangles.filter(rect => rect.id !== this.selectedId)
        // Supprimer l'élément des points s'il y est
        this.points = this.points.filter(point => point.id !== this.selectedId)
        // Réinitialiser la sélection
        this.selectedId = null
        console.log('Element deleted:', this.selectedId)
      }
    },
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
  /* background: #2a2a2a; */
  border-radius: 4px;
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
  /* background: #2a2a2a; */
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.video-container > * {
  position: absolute;
  left: 0;
  height: auto;
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
</style> 
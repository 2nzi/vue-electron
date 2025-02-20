<template>
  <div 
    class="video-frame-container" 
    tabindex="0" 
    ref="container"
    @keydown="handleKeyDown"
    @focus="handleFocus"
    @blur="handleBlur">
    <div class="video-frame" 
         ref="imageContainer"
         :style="frameStyle"
         @contextmenu.prevent
         @wheel.prevent="handleZoom"
         @mousedown="handleMouseDown"
         @mousemove="handleMouseMove"
         @mouseup="stopPan"
         @mouseleave="stopPan">
      <div class="image-container" :style="transformStyle">
        <img v-if="thumbnail" 
             :src="thumbnail" 
             alt="Video frame"
             @load="initializeImage"
             ref="image"
             class="video-image" />
        <div v-for="(point, index) in calibrationPoints" 
             :key="index"
             class="calibration-point"
             :class="{ 'selected-point': selectedFieldPoint && Number(selectedFieldPoint.index) === Number(index) }"
             :style="{
               left: `${point.x}px`,
               top: `${point.y}px`
             }">
        </div>
        <div v-for="(line, id) in calibrationLines"
             :key="'line-'+id"
             class="calibration-polyline">
          <svg class="polyline-svg">
            <g v-for="(line, id) in calibrationLines" :key="id">
              <polyline
                :points="formatPoints(line.points)"
                :class="{ 'selected-line': selectedFieldLine && selectedFieldLine.id === id }"
                fill="none"
                stroke="#00FF15"
                stroke-width="2"
              />
              <circle v-for="(point, index) in line.points"
                      :key="'point-'+index"
                      :cx="point.x"
                      :cy="point.y"
                      r="2"
                      class="polyline-point"
                      :class="{
                        'selected-line-point': selectedFieldLine && selectedFieldLine.id === id,
                        'dragging': isDraggingPoint && draggedLineId === id && selectedPointIndex === index,
                        'shared-point': sharedPoints.has(`${id}-${index}`),
                        'hoverable': isCtrlPressed && selectedFieldLine
                      }"
              />
            </g>
          </svg>
        </div>
        <div v-for="(point, index) in currentLinePoints"
             :key="'temp-'+index"
             class="calibration-point temp-point"
             :style="{
               left: `${point.x}px`,
               top: `${point.y}px`
             }" />
        <svg class="temp-polyline-svg" v-if="currentLinePoints.length > 0">
          <polyline
            :points="getPolylinePoints(currentLinePoints)"
            stroke="#FFC107"
            stroke-dasharray="5,5"
            fill="none"
            stroke-width="2"
          />
        </svg>
      </div>
    </div>
    <div class="save-section">
      <ClearButton 
        :disabled="Object.keys(calibrationLines).length === 0 && Object.keys(calibrationPoints).length === 0"
        @clear="clearCalibration"
      />
      <button 
        class="save-btn" 
        @click="$emit('save-calibration')"
        :disabled="Object.keys(calibrationLines).length === 0">
        <span class="save-text">Sauvegarder la calibration</span>
      </button>
    </div>
  </div>
</template>

<script>
import ClearButton from './ClearButton.vue';

export default {
  name: 'CalibrationArea',
  components: {
    ClearButton
  },
  props: {
    thumbnail: {
      type: String,
      default: null
    },
    calibrationPoints: {
      type: Object,
      default: () => ({})
    },
    calibrationLines: {
      type: Object,
      default: () => ({}),
      validator: function(lines) {
        return Object.values(lines).every(line => {
          if (line.type === 'circle' || line.type === 'arc') {
            return line.center && typeof line.radius === 'number';
          }
          return Array.isArray(line.points);
        });
      }
    },
    selectedFieldPoint: {
      type: Object,
      default: null
    },
    selectedFieldLine: {
      type: Object,
      default: null
    }
  },
  emits: [
    'save-calibration',
    'point-placed',
    'update:thumbnail',
    'update:calibrationPoints',
    'update:selectedFieldPoint',
    'line-points-placed'
  ],
  data() {
    return {
      scale: 1,
      translation: { x: 0, y: 0 },
      aspectRatio: 1,
      imageSize: { width: 0, height: 0 },
      isPanning: false,
      isMiddleMouseDown: false,
      lastMousePosition: { x: 0, y: 0 },
      linePoints: [],
      placedLinePoints: [],
      currentLinePoints: [],
      isDrawingLine: false,
      isDraggingPoint: false,
      selectedPointIndex: null,
      draggedLineId: null,
      proximityThreshold: 10,
      tempPoint: null,
      isWaitingForValidation: false,
      isCtrlPressed: false,
      hoveredPoint: null,
      sharedPoints: new Set(),
      draggedPoints: [],
      isCreatingLine: false,
    }
  },
  computed: {
    frameStyle() {
      if (!this.aspectRatio) return {};
      
      const container = this.$refs.imageContainer?.parentElement;
      if (!container) return {};
      
      const parentWidth = container.clientWidth;
      const parentHeight = container.clientHeight;
      
      let width, height;
      
      if (parentWidth / parentHeight > this.aspectRatio) {
        height = parentHeight;
        width = height * this.aspectRatio;
      } else {
        width = parentWidth;
        height = width / this.aspectRatio;
      }
      
      return {
        width: `${width}px`,
        height: `${height}px`
      };
    },
    transformStyle() {
      return {
        transform: `translate(${this.translation.x}px, ${this.translation.y}px) scale(${this.scale})`,
        transformOrigin: '0 0'
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  },
  methods: {
    async loadVideos() {
      try {
        this.videos = await window.electron.getVideosFromFolder(this.folderPath)
        if (this.videos.length > 0) {
          await this.selectVideo(this.videos[3])
          // await this.selectVideo(this.videos[0])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error)
      }
    },
    async selectVideo(video) {
      this.$emit('update:thumbnail', null);
      try {
        const response = await fetch(`http://localhost:8000/video/first-frame?video_path=${encodeURIComponent(video.path)}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la frame');
        }
        const data = await response.json();
        this.$emit('update:thumbnail', data.data);
      } catch (error) {
        console.error('Erreur lors du chargement de la première frame:', error);
        this.$emit('update:thumbnail', null);
      }
    },
    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },
    initializeImage(event) {
      const image = event.target;
      
      this.imageSize = {
        width: image.naturalWidth,
        height: image.naturalHeight
      };
      
      this.aspectRatio = this.imageSize.width / this.imageSize.height;
    },
    handleZoom(event) {
      const zoomFactor = 0.1;
      const delta = Math.sign(event.deltaY) * -1;
      const newScale = this.scale + delta * zoomFactor;
      
      // Limiter le zoom entre 1x et 5x
      const oldScale = this.scale;
      this.scale = Math.min(Math.max(newScale, 1), 15);
      
      // Si on revient à l'échelle 1, on réinitialise la translation
      if (this.scale === 1) {
        this.translation = { x: 0, y: 0 };
        return;
      }
      
      if (this.scale !== oldScale) {
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Point dans l'image originale que nous voulons garder sous la souris
        const pointX = (mouseX - this.translation.x) / oldScale;
        const pointY = (mouseY - this.translation.y) / oldScale;

        // Calculer la nouvelle translation pour maintenir le point sous la souris
        this.translation = {
          x: mouseX - (pointX * this.scale),
          y: mouseY - (pointY * this.scale)
        };

      }
    },
    handleFieldPointSelected(pointData) {
      this.$emit('update:selectedFieldPoint', pointData);
    },
    handleMouseDown(event) {
      if (event.button === 1) { // Clic molette
        this.isMiddleMouseDown = true;
        this.lastMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
        event.preventDefault();
        return;
      }

      // Ajout de la gestion des points
      if (event.button === 0 && this.selectedFieldPoint) { // Clic gauche avec un point sélectionné
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Créer ou mettre à jour le point
        const newPoints = { ...this.calibrationPoints };
        newPoints[this.selectedFieldPoint.index] = {
          x: (x - this.translation.x) / this.scale,
          y: (y - this.translation.y) / this.scale
        };
        this.$emit('update:calibrationPoints', newPoints);
        return;
      }

      // Gestion existante des lignes
      if (event.button === 2 && this.selectedFieldLine) { // Clic droit
        if (this.currentLinePoints.length >= 2) {
          // Créer ou mettre à jour la ligne
          const newLines = { ...this.calibrationLines };
          newLines[this.selectedFieldLine.id] = {
            points: [...this.currentLinePoints]
          };
          this.$emit('update:calibrationLines', newLines);
          this.currentLinePoints = []; // Réinitialiser les points temporaires
          this.isCreatingLine = false; // Sortir du mode création
        }
        return;
      }

      if (event.button === 0) { // Clic gauche
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const x = (mouseX - this.translation.x) / this.scale;
        const y = (mouseY - this.translation.y) / this.scale;

        if (this.isDraggingPoint) {
          // Valider la position au clic
          const newLines = { ...this.calibrationLines };
          this.draggedPoints.forEach(({ lineId, pointIndex }) => {
            if (newLines[lineId] && Array.isArray(newLines[lineId].points)) {
              newLines[lineId].points[pointIndex] = { x, y };
            }
          });
          this.$emit('update:calibrationLines', newLines);
          
          // Réinitialiser l'état
          this.isDraggingPoint = false;
          this.draggedPoints = [];
          this.tempPoint = null;
          return;
        }

        if (!this.isCreatingLine) {
          if (this.isCtrlPressed) {
            const nearestPoint = this.findLineByPoint(x, y);
            const circleIntersections = this.findCircleIntersections(x, y, 
              this.selectedFieldLine?.id);
            
            if (nearestPoint || circleIntersections.length > 0) {
              if (this.currentLinePoints.length === 0) {
                // Commencer une nouvelle ligne avec un point d'intersection
                this.isCreatingLine = true;
                if (nearestPoint) {
                  this.currentLinePoints.push(nearestPoint.point);
                  this.sharedPoints.add(`${nearestPoint.lineId}-${nearestPoint.pointIndex}`);
                } else {
                  // Gérer plusieurs intersections possibles
                  this.currentLinePoints.push(circleIntersections[0].point);
                  this.sharedPoints.add(`${circleIntersections[0].lineId}-intersection`);
                }
                return;
              }
            }
          }
          // Mode modification
          const nearestPoint = this.findLineByPoint(x, y);
          if (nearestPoint) {
            this.isDraggingPoint = true;
            const sharedLines = this.findAllLinesWithPoint(nearestPoint.point.x, nearestPoint.point.y);
            this.draggedPoints = sharedLines.map(line => ({
              lineId: line.lineId,
              pointIndex: line.pointIndex
            }));
            this.tempPoint = { ...nearestPoint.point };
            return;
          } else if (this.selectedFieldLine) {
            // Commencer une nouvelle ligne
            this.isCreatingLine = true;
            this.currentLinePoints = [{ x, y }];
          }
        } else {
          // Mode création
          if (this.isCtrlPressed) {
            const nearestPoint = this.findLineByPoint(x, y);
            if (nearestPoint && nearestPoint.lineId !== this.selectedFieldLine.id) {
              this.currentLinePoints.push(nearestPoint.point);
              this.sharedPoints.add(`${nearestPoint.lineId}-${nearestPoint.pointIndex}`);
              return;
            }
          }
          this.currentLinePoints.push({ x, y });
        }
      }
    },
    handleMouseMove(event) {
      if (this.isMiddleMouseDown) {
        const dx = event.clientX - this.lastMousePosition.x;
        const dy = event.clientY - this.lastMousePosition.y;
        
        const container = this.$refs.imageContainer;
        const image = this.$refs.image;
        
        if (!container || !image) return;
        
        const containerRect = container.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        
        // Calculer les limites de translation
        const minX = containerRect.width - imageRect.width * this.scale;
        const minY = containerRect.height - imageRect.height * this.scale;
        
        // Appliquer les limites
        const newX = Math.min(0, Math.max(minX, this.translation.x + dx));
        const newY = Math.min(0, Math.max(minY, this.translation.y + dy));
        
        this.translation.x = newX;
        this.translation.y = newY;
        
        this.lastMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
        return;
      }

      if (this.isDraggingPoint && this.draggedPoints.length > 0) {
        const rect = this.$refs.imageContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const x = (mouseX - this.translation.x) / this.scale;
        const y = (mouseY - this.translation.y) / this.scale;

        // Mettre à jour tous les points partagés
        const newLines = { ...this.calibrationLines };
        this.draggedPoints.forEach(({ lineId, pointIndex }) => {
          if (newLines[lineId] && Array.isArray(newLines[lineId].points)) {
            newLines[lineId].points[pointIndex] = { x, y };
          }
        });
        
        this.$emit('update:calibrationLines', newLines);
      }
    },
    handleMouseUp(event) {
      if (event.button === 1) {
        this.isMiddleMouseDown = false;
        return;
      }
      if (this.isDraggingPoint) {
        const newLines = { ...this.calibrationLines };
        newLines[this.draggedLineId].points[this.selectedPointIndex] = this.tempPoint;
        this.$emit('update:calibrationLines', newLines);
        
        this.isDraggingPoint = false;
        this.selectedPointIndex = null;
        this.draggedLineId = null;
        this.tempPoint = null;
      }
    },
    stopPan() {
      this.isMiddleMouseDown = false;
    },
    async saveCalibration() {
      if (!this.selectedVideo || Object.keys(this.calibrationLines).length === 0) return;

      const fieldKeypoints = this.$refs.footballField.keypoints;
      const imageSize = this.$refs.calibrationArea.imageSize;

      const calibrationData = {
        metadata: {
          video_name: this.selectedVideo.name,
          video_path: this.selectedVideo.path,
          calibration_date: new Date().toISOString(),
          image_size: {
            width: imageSize.width,
            height: imageSize.height
          }
        },
        keypoints: {},
        lines: {},
        lines_normalized: {},
        field_dimensions: {
          width: 105,
          height: 68
        }
      };

      // Traitement des points de calibration
      for (const [index, point] of Object.entries(this.calibrationPoints)) {
        calibrationData.keypoints[index] = {
          image_coordinates: {
            x: Math.round(point.x * 100) / 100,
            y: Math.round(point.y * 100) / 100
          },
          field_coordinates: {
            x: Math.round(fieldKeypoints[index][0] * 100) / 100,
            y: Math.round(fieldKeypoints[index][1] * 100) / 100
          }
        };
      }

      // Traitement des lignes
      for (const [lineName, line] of Object.entries(this.calibrationLines)) {
        // Coordonnées en pixels
        calibrationData.lines[lineName] = line.points.map(point => ({
          x: Math.round(point.x * 100) / 100,
          y: Math.round(point.y * 100) / 100
        }));

        // Coordonnées normalisées
        calibrationData.lines_normalized[lineName] = line.points.map(point => ({
          x: Math.round((point.x / imageSize.width) * 100) / 100,
          y: Math.round((point.y / imageSize.height) * 100) / 100
        }));
      }

      try {
        const response = await fetch('http://localhost:8000/calibration/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_path: this.selectedVideo.path,
            calibration_data: calibrationData
          })
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la sauvegarde');
        }

        const result = await response.json();
        if (result.success) {
          alert('Calibration sauvegardée avec succès !');
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde de la calibration');
      }
    },
    handleKeyDown(event) {
      if (event.key === 'Control') {
        this.isCtrlPressed = true;
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        this.deleteLine();
      }
    },
    handleKeyUp(event) {
      if (event.key === 'Control') {
        this.isCtrlPressed = false;
      }
    },
    handleFocus() {
      console.log('Container focused');
    },
    handleBlur() {
      console.log('Container lost focus');
    },
    handleWheel(event) {
      event.preventDefault();
      
      // Si la touche Ctrl est enfoncée, on gère le zoom
      if (event.ctrlKey) {
        // Gérer le zoom si vous avez cette fonctionnalité
        return;
      }
      
      // Sinon, on gère le pan (translation)
      if (event.shiftKey) {
        // Si Shift est enfoncé, on déplace horizontalement
        this.panPosition.x -= event.deltaY;
      } else {
        // Déplacement vertical par défaut
        this.panPosition.y -= event.deltaY;
      }
    },
    handleLineSelected(points) {
      this.linePoints = points;
      this.placedLinePoints = [];
    },
    getPolylinePoints(points) {
      if (!points) return '';
      return points.map(p => `${p.x},${p.y}`).join(' ');
    },
    findLineByPoint(x, y) {
      for (const [lineId, line] of Object.entries(this.calibrationLines)) {
        const points = line.points;
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const dx = point.x - x;
          const dy = point.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < this.proximityThreshold) {
            return {
              lineId,
              pointIndex: i,
              point
            };
          }
        }
      }
      return null;
    },
    findSharedPoint(x, y) {
      for (const [lineId, line] of Object.entries(this.calibrationLines)) {
        if (lineId === this.selectedFieldLine?.id) continue;
        
        const points = line.points;
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const dx = point.x - x;
          const dy = point.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < this.proximityThreshold) {
            return {
              lineId,
              pointIndex: i,
              point
            };
          }
        }
      }
      return null;
    },
    formatPoints(points) {
      if (!points) return '';
      return points.map(p => `${p.x},${p.y}`).join(' ');
    },
    findAllLinesWithPoint(x, y) {
      const sharedLines = [];
      for (const [lineId, line] of Object.entries(this.calibrationLines)) {
        const points = line.points;
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const dx = point.x - x;
          const dy = point.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < this.proximityThreshold) {
            sharedLines.push({
              lineId,
              pointIndex: i,
              point
            });
          }
        }
      }
      return sharedLines;
    },
    deleteLine() {
      if (this.selectedFieldLine) {
        const newLines = { ...this.calibrationLines };
        // Supprimer les références aux points partagés
        if (newLines[this.selectedFieldLine.id]) {
          const points = newLines[this.selectedFieldLine.id].points;
          points.forEach((_, index) => {
            this.sharedPoints.delete(`${this.selectedFieldLine.id}-${index}`);
          });
        }
        // Supprimer la ligne
        delete newLines[this.selectedFieldLine.id];
        this.$emit('update:calibrationLines', newLines);
        this.$emit('update:selectedFieldLine', null);
        this.currentLinePoints = [];
        this.isCreatingLine = false;
      }
    },
    findCircleIntersections(x, y, lineId) {
      const intersections = [];
      const threshold = this.proximityThreshold / this.scale;
      
      for (const [id, line] of Object.entries(this.calibrationLines)) {
        if (id === lineId) continue;
        
        // Vérifier si la ligne est un cercle ou un arc
        if (line.type === 'circle' || line.type === 'arc') {
          const center = line.center;
          const radius = line.radius;
          
          // Calculer la distance au centre
          const dx = x - center.x;
          const dy = y - center.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Si on est proche du rayon, c'est une intersection
          if (Math.abs(distance - radius) < threshold) {
            intersections.push({
              lineId: id,
              point: { x, y }
            });
          }
        }
      }
      return intersections;
    },
    clearCalibration() {
      this.$emit('update:calibrationPoints', {});
      this.$emit('update:calibrationLines', {});
      this.$emit('update:selectedFieldPoint', null);
      this.$emit('update:selectedFieldLine', null);
      this.currentLinePoints = [];
      this.isCreatingLine = false;
      this.sharedPoints.clear();
    }
  }
}
</script>

<style scoped>
.video-frame-container {
  flex: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 0;
  background-color: #1a1a1a;
  border-radius: 4px;
  padding: 10px;
  outline: none; /* Pour enlever le contour bleu quand l'élément est focus */
}

.video-frame {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: calc(100% - 50px);
  margin-bottom: 45px;
}

.image-container {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.video-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.calibration-point {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #4CAF50;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.8),
              0 0 12px rgba(76, 175, 80, 0.5);
}

.selected-point {
  background-color: #FFC107;
  box-shadow: 0 0 8px rgba(255, 193, 7, 0.8),
              0 0 15px rgba(255, 193, 7, 0.5);
}

.save-section {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  gap: 10px;
}

.clear-btn {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid #f44336;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  margin-right: 10px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3),
              inset 0 0 10px rgba(244, 67, 54, 0.2);
}

.clear-btn:hover:not(:disabled) {
  background-color: rgba(244, 67, 54, 0.15);
  border-color: #f44336;
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.4),
              inset 0 0 15px rgba(244, 67, 54, 0.3);
}

.clear-btn:active:not(:disabled) {
  background-color: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.3),
              inset 0 0 8px rgba(244, 67, 54, 0.2);
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid #4CAF50;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3),
              inset 0 0 10px rgba(76, 175, 80, 0.2);
}

.save-btn:hover:not(:disabled) {
  background-color: rgba(76, 175, 80, 0.15);
  border-color: #4CAF50;
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.4),
              inset 0 0 15px rgba(76, 175, 80, 0.3);
}

.save-btn:active:not(:disabled) {
  background-color: rgba(76, 175, 80, 0.2);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3),
              inset 0 0 8px rgba(76, 175, 80, 0.2);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-text {
  opacity: 1;
}

.line-points-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  color: #ffffff;
  font-size: 0.9rem;
}

.calibration-polyline {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.polyline-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.polyline-svg polyline {
  transition: stroke-width 0.2s;
}

.selected-line {
  stroke-width: 2;
  stroke: #FFC107 !important;
}

.polyline-point {
  fill: #00FF15;
  stroke: white;
  stroke-width: 0.5;
  transition: all 0.2s ease;
  pointer-events: all;
  cursor: pointer;
}

.polyline-point:hover {
  fill: #FFC107;
  r: 3;
  stroke-width: 2;
}

.selected-line .polyline-point {
  cursor: grab;
}

.polyline-point.dragging {
  fill: #FF4081;
  r: 4;
  stroke-width: 3;
}

.selected-line-point {
  fill: #FFC107;
  r: 2;
  stroke-width: 1;
}

.temp-point {
  background-color: #FFC107;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid white;
  z-index: 2;
}

.temp-polyline-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.polyline-point.shared-point {
  fill: #FFC107;
  stroke: #FF4081;
  stroke-width: 2;
  r: 4;
  animation: pulse 2s infinite;
}

.polyline-point.hoverable {
  cursor: pointer;
  filter: brightness(1.2);
}

@keyframes pulse {
  0% {
    stroke-width: 2;
    stroke-opacity: 1;
  }
  50% {
    stroke-width: 3;
    stroke-opacity: 0.5;
  }
  100% {
    stroke-width: 2;
    stroke-opacity: 1;
  }
}
</style> 
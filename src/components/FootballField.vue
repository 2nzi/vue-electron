<template>
  <div class="football-field">
    <svg viewBox="0 0 105 68" preserveAspectRatio="xMidYMid meet">
      <g>
        <!-- Terrain de base -->
        <rect x="0" y="0" width="105" height="68" fill="none" stroke="#00FF15" stroke-width="0.3"/>
        
        <!-- Lignes cliquables -->
        <g class="lines">
          <!-- Toutes les lignes avec la nouvelle méthode getLineColor -->
          <line v-for="(line, name) in lineCoordinates" 
                :key="name"
                class="field-line"
                :stroke="getLineColor(name)"
                :x1="line.x1"
                :y1="line.y1"
                :x2="line.x2"
                :y2="line.y2"
                @click="selectLine(name)" />
          
          <!-- Buts -->
          <line class="field-line" x1="11" y1="34" x2="16.5" y2="34" @click="selectLine(7)" />
          <line class="field-line" x1="11" y1="30.34" x2="11" y2="37.66" @click="selectLine(8)" />
          <line class="field-line" x1="16.5" y1="30.34" x2="16.5" y2="37.66" @click="selectLine(9)" />
          <line class="field-line" x1="88.5" y1="34" x2="94" y2="34" @click="selectLine(10)" />
          <line class="field-line" x1="88.5" y1="30.34" x2="88.5" y2="37.66" @click="selectLine(11)" />
          <line class="field-line" x1="94" y1="30.34" x2="94" y2="37.66" @click="selectLine(12)" />
          
          <!-- Ligne médiane et lignes de touche -->
          <line class="field-line" x1="52.5" y1="0" x2="52.5" y2="68" @click="selectLine(13)" />
          <line class="field-line" x1="0" y1="0" x2="105" y2="0" @click="selectLine(14)" />
          <line class="field-line" x1="0" y1="0" x2="0" y2="68" @click="selectLine(15)" />
          <line class="field-line" x1="105" y1="0" x2="105" y2="68" @click="selectLine(16)" />
          <line class="field-line" x1="0" y1="68" x2="105" y2="68" @click="selectLine(17)" />
          
          <!-- Petites surfaces -->
          <line class="field-line" x1="0" y1="24.84" x2="5.5" y2="24.84" @click="selectLine(18)" />
          <line class="field-line" x1="5.5" y1="24.84" x2="5.5" y2="43.16" @click="selectLine(19)" />
          <line class="field-line" x1="0" y1="43.16" x2="5.5" y2="43.16" @click="selectLine(20)" />
          <line class="field-line" x1="99.5" y1="24.84" x2="105" y2="24.84" @click="selectLine(21)" />
          <line class="field-line" x1="99.5" y1="24.84" x2="99.5" y2="43.16" @click="selectLine(22)" />
          <line class="field-line" x1="99.5" y1="43.16" x2="105" y2="43.16" @click="selectLine(23)" />
        </g>

        <!-- Points existants -->
        <circle v-for="(point, index) in keypoints" 
                :key="index"
                :cx="point[0]" 
                :cy="point[1]" 
                r="1.5"
                :fill="getPointColor(index)"
                class="keypoint"
                @click="selectPoint(index)" />
      </g>
    </svg>
    
    <!-- Info sur la ligne sélectionnée -->
    <div v-if="selectedLine && LINES[selectedLine]" class="line-info">
      {{ LINES[selectedLine].name }}
    </div>
  </div>
</template>

<script>
const LINES = {
  // Utilisation des noms standardisés de la classe SoccerPitch
  'Side line top': { name: 'Side line top', description: 'Ligne de but' },
  'Side line bottom': { name: 'Side line bottom', description: 'Ligne de but opposée' },
  'Side line left': { name: 'Side line left', description: 'Ligne de touche gauche' },
  'Side line right': { name: 'Side line right', description: 'Ligne de touche droite' },
  'Middle line': { name: 'Middle line', description: 'Ligne médiane' },
  
  'Big rect. left bottom': { name: 'Big rect. left bottom', description: 'Surface de réparation gauche - ligne basse' },
  'Big rect. left main': { name: 'Big rect. left main', description: 'Surface de réparation gauche - ligne parallèle' },
  'Big rect. left top': { name: 'Big rect. left top', description: 'Surface de réparation gauche - ligne haute' },
  'Big rect. right bottom': { name: 'Big rect. right bottom', description: 'Surface de réparation droite - ligne basse' },
  'Big rect. right main': { name: 'Big rect. right main', description: 'Surface de réparation droite - ligne parallèle' },
  'Big rect. right top': { name: 'Big rect. right top', description: 'Surface de réparation droite - ligne haute' },
  
  'Small rect. left bottom': { name: 'Small rect. left bottom', description: 'Petite surface gauche - ligne basse' },
  'Small rect. left main': { name: 'Small rect. left main', description: 'Petite surface gauche - ligne parallèle' },
  'Small rect. left top': { name: 'Small rect. left top', description: 'Petite surface gauche - ligne haute' },
  'Small rect. right bottom': { name: 'Small rect. right bottom', description: 'Petite surface droite - ligne basse' },
  'Small rect. right main': { name: 'Small rect. right main', description: 'Petite surface droite - ligne parallèle' },
  'Small rect. right top': { name: 'Small rect. right top', description: 'Petite surface droite - ligne haute' },
  
  'Goal left crossbar': { name: 'Goal left crossbar', description: 'Barre transversale but gauche' },
  'Goal left post left': { name: 'Goal left post left', description: 'Poteau gauche but gauche' },
  'Goal left post right': { name: 'Goal left post right', description: 'Poteau droit but gauche' },
  'Goal right crossbar': { name: 'Goal right crossbar', description: 'Barre transversale but droit' },
  'Goal right post left': { name: 'Goal right post left', description: 'Poteau gauche but droit' },
  'Goal right post right': { name: 'Goal right post right', description: 'Poteau droit but droit' },
  
  'Circle central': { name: 'Circle central', description: 'Cercle central' },
  'Circle left': { name: 'Circle left', description: 'Arc gauche' },
  'Circle right': { name: 'Circle right', description: 'Arc droit' }
};

// Définition des dimensions standard d'un terrain de football
const FIELD_DIMENSIONS = {
  PITCH_LENGTH: 105,
  PITCH_WIDTH: 68,
  GOAL_LINE_TO_PENALTY_MARK: 11.0,
  PENALTY_AREA_WIDTH: 40.32,
  PENALTY_AREA_LENGTH: 16.5,
  GOAL_AREA_WIDTH: 18.32,
  GOAL_AREA_LENGTH: 5.5,
  CENTER_CIRCLE_RADIUS: 9.15,
  GOAL_HEIGHT: 2.44,
  GOAL_LENGTH: 7.32
};

export default {
  name: 'FootballField',
  props: {
    positionedLines: {
      type: Object,
      default: () => ({})
    },
    positionedPoints: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      selectedPointIndex: null,
      selectedLine: null,
      LINES,
      FIELD_DIMENSIONS,
      keypoints: [
        [0., 0.], [52.5, 0.], [105., 0.], [0., 13.84], [16.5, 13.84], [88.5, 13.84], [105., 13.84],
        [0., 24.84], [5.5, 24.84], [99.5, 24.84], [105., 24.84], [0., 30.34], [0., 30.34],
        [105., 30.34], [105., 30.34], [0., 37.66], [0., 37.66], [105., 37.66], [105., 37.66],
        [0., 43.16], [5.5, 43.16], [99.5, 43.16], [105., 43.16], [0., 54.16], [16.5, 54.16],
        [88.5, 54.16], [105., 54.16], [0., 68.], [52.5, 68.], [105., 68.], [16.5, 26.68],
        [52.5, 24.85], [88.5, 26.68], [16.5, 41.31], [52.5, 43.15], [88.5, 41.31],
        [11., 34.], [16.5, 34.], [20.15, 34.],
        [43.35, 34.], [52.5, 34.], [61.5, 34.], [84.85, 34.],
        [88.5, 34.], [94., 34.]
      ],
      lineCoordinates: {
        'Side line top': { x1: 0, y1: 0, x2: 105, y2: 0 },
        'Side line bottom': { x1: 0, y1: 68, x2: 105, y2: 68 },
        'Side line left': { x1: 0, y1: 0, x2: 0, y2: 68 },
        'Side line right': { x1: 105, y1: 0, x2: 105, y2: 68 },
        'Middle line': { x1: 52.5, y1: 0, x2: 52.5, y2: 68 },
        
        // Surfaces de réparation
        'Big rect. left bottom': { x1: 0, y1: 54.16, x2: 16.5, y2: 54.16 },
        'Big rect. left main': { x1: 16.5, y1: 13.84, x2: 16.5, y2: 54.16 },
        'Big rect. left top': { x1: 0, y1: 13.84, x2: 16.5, y2: 13.84 },
        'Big rect. right bottom': { x1: 88.5, y1: 54.16, x2: 105, y2: 54.16 },
        'Big rect. right main': { x1: 88.5, y1: 13.84, x2: 88.5, y2: 54.16 },
        'Big rect. right top': { x1: 88.5, y1: 13.84, x2: 105, y2: 13.84 },
        
        // Petites surfaces
        'Small rect. left bottom': { x1: 0, y1: 43.16, x2: 5.5, y2: 43.16 },
        'Small rect. left main': { x1: 5.5, y1: 24.84, x2: 5.5, y2: 43.16 },
        'Small rect. left top': { x1: 0, y1: 24.84, x2: 5.5, y2: 24.84 },
        'Small rect. right bottom': { x1: 99.5, y1: 43.16, x2: 105, y2: 43.16 },
        'Small rect. right main': { x1: 99.5, y1: 24.84, x2: 99.5, y2: 43.16 },
        'Small rect. right top': { x1: 99.5, y1: 24.84, x2: 105, y2: 24.84 },
        
        // Buts
        'Goal left crossbar': { x1: 11, y1: 34, x2: 16.5, y2: 34 },
        'Goal left post left': { x1: 11, y1: 30.34, x2: 11, y2: 37.66 },
        'Goal left post right': { x1: 16.5, y1: 30.34, x2: 16.5, y2: 37.66 },
        'Goal right crossbar': { x1: 88.5, y1: 34, x2: 94, y2: 34 },
        'Goal right post left': { x1: 88.5, y1: 30.34, x2: 88.5, y2: 37.66 },
        'Goal right post right': { x1: 94, y1: 30.34, x2: 94, y2: 37.66 }
      },
      lastSelected: null // 'point' ou 'line'
    }
  },
  methods: {
    selectPoint(index) {
      if (this.selectedLine) this.selectedLine = null;
      this.selectedPointIndex = index;
      this.lastSelected = 'point';
      this.$emit('point-selected', {
        index,
        coordinates: this.keypoints[index]
      });
    },
    selectLine(lineName) {
      if (this.selectedPointIndex !== null) this.selectedPointIndex = null;
      this.selectedLine = lineName;
      this.lastSelected = 'line';
      if (this.LINES[lineName]) {
        this.$emit('line-selected', {
          id: lineName,
          name: this.LINES[lineName].name,
          description: this.LINES[lineName].description,
          coordinates: this.lineCoordinates[lineName]
        });
      }
    },
    getPointColor(index) {
      if (this.selectedPointIndex === index && this.lastSelected === 'point') {
        return index in this.positionedPoints ? '#FFFF00' : 'red';
      }
      return index in this.positionedPoints ? '#00FF15' : 'white';
    },
    getLineColor(lineName) {
      if (this.selectedLine === lineName && this.lastSelected === 'line') {
        return this.positionedLines[lineName] ? '#FFFF00' : 'red';
      }
      return this.positionedLines[lineName] ? '#00FF15' : 'white';
    }
  }
}
</script>

<style scoped>
.football-field {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
}

.field-line {
  stroke-width: 1;
  cursor: pointer;
  transition: stroke-width 0.3s;
}

.field-line:hover {
  stroke-width: 1.8;
  opacity: 0.8;
}

.line-info {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.keypoint {
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); /* Effet de brillance pour les points */
  cursor: pointer;
}

.keypoint:hover {
  filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.8));
}
</style>
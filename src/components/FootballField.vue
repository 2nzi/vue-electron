<template>
  <div class="football-field">
    <svg viewBox="-7 -2 119 72" preserveAspectRatio="xMidYMid meet" @click="handleBackgroundClick">
      <g>
        <!-- Base field -->
        <rect x="0" y="0" width="105" height="68" fill="none" stroke="#333" stroke-width="0.3"/>
        
        <!-- Clickable lines -->
        <g class="lines">
          <line v-for="(line, name) in lineCoordinates" 
                :key="name"
                class="field-line"
                :stroke="getLineColor(name)"
                :x1="line.x1"
                :y1="line.y1"
                :x2="line.x2"
                :y2="line.y2"
                @click="selectLine(name)" />
        </g>

        <!-- Key points -->
        <circle v-for="(point, index) in keypoints" 
                :key="index"
                :cx="point[0]" 
                :cy="point[1]" 
                r="2"
                :fill="getPointColor(index)"
                class="keypoint"
                @click="selectPoint(index)" />
        
        <!-- Center circle -->
        <circle 
          cx="52.5" 
          cy="34" 
          r="9.15" 
          fill="none" 
          :stroke="getLineColor('Circle central')"
          class="field-line"
          @click="selectLine('Circle central')" />
          
        
        <!-- Penalty area arcs -->
        <path 
          v-for="arc in circle_left_right" 
          :key="'Circle ' + arc.side"
          :d="getPenaltyArc(arc)"
          fill="none"
          :stroke="getLineColor('Circle ' + arc.side)"
          class="field-line"
          @click="selectLine('Circle ' + arc.side)" />
      </g>
    </svg>
    
    <!-- Selected line or point info -->
    <div v-if="selectedLine && LINES[selectedLine]" class="info-overlay">
      {{ LINES[selectedLine].name }}
    </div>
    <div v-if="selectedPointIndex !== null" class="info-overlay">
      {{ POINTS[selectedPointIndex].name }}
    </div>
  </div>
</template>

<script>
// Définition exacte des classes de lignes comme dans SoccerNet
const LINES = {
  'Big rect. left bottom': { name: 'Big rect. left bottom', description: 'Left penalty area - bottom line' },
  'Big rect. left main': { name: 'Big rect. left main', description: 'Left penalty area - parallel line' },
  'Big rect. left top': { name: 'Big rect. left top', description: 'Left penalty area - top line' },
  'Big rect. right bottom': { name: 'Big rect. right bottom', description: 'Right penalty area - bottom line' },
  'Big rect. right main': { name: 'Big rect. right main', description: 'Right penalty area - parallel line' },
  'Big rect. right top': { name: 'Big rect. right top', description: 'Right penalty area - top line' },
  'Circle central': { name: 'Center circle', description: 'Center circle' },
  'Circle left': { name: 'Left circle', description: 'Left arc' },
  'Circle right': { name: 'Right circle', description: 'Right arc' },
  'Goal left crossbar': { name: 'Goal left crossbar', description: 'Left goal crossbar' },
  'Goal left post left': { name: 'Goal left post left', description: 'Left goal - left post' },
  'Goal left post right': { name: 'Goal left post right', description: 'Left goal - right post' },
  'Goal right crossbar': { name: 'Goal right crossbar', description: 'Right goal crossbar' },
  'Goal right post left': { name: 'Goal right post left', description: 'Right goal - left post' },
  'Goal right post right': { name: 'Goal right post right', description: 'Right goal - right post' },
  'Goal unknown': { name: 'Goal unknown', description: 'Unidentified goal' },
  'Line unknown': { name: 'Line unknown', description: 'Unidentified line' },
  'Middle line': { name: 'Middle line', description: 'Center line' },
  'Side line bottom': { name: 'Side line bottom', description: 'Bottom goal line' },
  'Side line left': { name: 'Side line left', description: 'Left touch line' },
  'Side line right': { name: 'Side line right', description: 'Right touch line' },
  'Side line top': { name: 'Side line top', description: 'Top goal line' },
  'Small rect. left bottom': { name: 'Small rect. left bottom', description: 'Left goal area - bottom line' },
  'Small rect. left main': { name: 'Small rect. left main', description: 'Left goal area - parallel line' },
  'Small rect. left top': { name: 'Small rect. left top', description: 'Left goal area - top line' },
  'Small rect. right bottom': { name: 'Small rect. right bottom', description: 'Right goal area - bottom line' },
  'Small rect. right main': { name: 'Small rect. right main', description: 'Right goal area - parallel line' },
  'Small rect. right top': { name: 'Small rect. right top', description: 'Right goal area - top line' },
  center_circle: {
    name: "Center circle",
    type: "circle",
    color: "#00FF15"
  },
  circle_left: {
    name: "Left circle",
    type: "arc",
    color: "#00FF15"
  },
  circle_right: {
    name: "Right circle",
    type: "arc",
    color: "#00FF15"
  }
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

const POINTS = {
  0: { name: "Center point" },
  1: { name: "Left penalty point" },
  2: { name: "Right penalty point" }
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
      POINTS,
      keypoints: [
        [52.5, 34],    // Center point
        [11, 34],      // Left penalty point
        [94, 34],      // Right penalty point
      ],
      lineCoordinates: {
        'Side line top': { x1: 0, y1: 0, x2: 105, y2: 0 },
        'Side line bottom': { x1: 0, y1: 68, x2: 105, y2: 68 },
        'Side line left': { x1: 0, y1: 0, x2: 0, y2: 68 },
        'Side line right': { x1: 105, y1: 0, x2: 105, y2: 68 },
        'Middle line': { x1: 52.5, y1: 0, x2: 52.5, y2: 68 },
        
        // Penalty areas
        'Big rect. left bottom': { x1: 0, y1: 54.16, x2: 16.5, y2: 54.16 },
        'Big rect. left main': { x1: 16.5, y1: 13.84, x2: 16.5, y2: 54.16 },
        'Big rect. left top': { x1: 0, y1: 13.84, x2: 16.5, y2: 13.84 },
        'Big rect. right bottom': { x1: 88.5, y1: 54.16, x2: 105, y2: 54.16 },
        'Big rect. right main': { x1: 88.5, y1: 13.84, x2: 88.5, y2: 54.16 },
        'Big rect. right top': { x1: 88.5, y1: 13.84, x2: 105, y2: 13.84 },
        
        // Goal areas
        'Small rect. left bottom': { x1: 0, y1: 43.16, x2: 5.5, y2: 43.16 },
        'Small rect. left main': { x1: 5.5, y1: 24.84, x2: 5.5, y2: 43.16 },
        'Small rect. left top': { x1: 0, y1: 24.84, x2: 5.5, y2: 24.84 },
        'Small rect. right bottom': { x1: 99.5, y1: 43.16, x2: 105, y2: 43.16 },
        'Small rect. right main': { x1: 99.5, y1: 24.84, x2: 99.5, y2: 43.16 },
        'Small rect. right top': { x1: 99.5, y1: 24.84, x2: 105, y2: 24.84 },
        
        // Goals
        'Goal left post left': { x1: -5, y1: 37.66, x2: 0, y2: 37.66 },
        'Goal left crossbar': { x1: -5, y1: 30.34, x2: -5, y2: 37.66 },
        'Goal left post right': { x1: -5, y1: 30.34, x2: 0, y2: 30.34 },
        'Goal right post left': { x1: 105, y1: 30.34, x2: 110, y2: 30.34 },
        'Goal right crossbar': { x1: 110, y1: 30.34, x2: 110, y2: 37.66 },
        'Goal right post right': { x1: 105, y1: 37.66, x2: 110, y2: 37.66 },
      },
      lastSelected: null, // 'point' or 'line'
      circle_left_right: [
        { x: 11, y: 34, side: 'left' },
        { x: 94, y: 34, side: 'right' }
      ]
    }
  },
  methods: {
    handleBackgroundClick(event) {
      // Vérifie si le clic vient directement du SVG (pas d'un enfant)
      if (event.target.tagName === 'svg') {
        if (this.selectedPointIndex !== null) {
          this.selectedPointIndex = null;
          this.$emit('point-selected', null);
        }
        if (this.selectedLine) {
          this.selectedLine = null;
          this.$emit('line-selected', null);
        }
        this.lastSelected = null;
      }
    },
    selectPoint(index, event) {
      if (event) {
        event.stopPropagation();
      }
      if (this.selectedLine) this.selectedLine = null;
      this.selectedPointIndex = index;
      this.lastSelected = 'point';
      this.$emit('point-selected', {
        index,
        coordinates: this.keypoints[index],
        name: this.POINTS[index].name
      });
    },
    selectLine(lineName, event) {
      if (event) {
        event.stopPropagation();
      }
      if (this.selectedPointIndex !== null) this.selectedPointIndex = null;
      this.selectedLine = lineName;
      this.lastSelected = 'line';
      if (this.LINES[lineName]) {
        this.$emit('line-selected', {
          id: lineName,
          name: this.LINES[lineName].name,
          description: this.LINES[lineName].description
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
    },  
    
    getPenaltyArc(arc) {
      const radius = 9.15;
      const startAngle = arc.side === 'left' ? -53 : -127;
      const endAngle = arc.side === 'left' ? 53 : 127;
      
      const start = {
        x: arc.x + radius * Math.cos(startAngle * Math.PI / 180),
        y: arc.y + radius * Math.sin(startAngle * Math.PI / 180)
      };
      
      const end = {
        x: arc.x + radius * Math.cos(endAngle * Math.PI / 180),
        y: arc.y + radius * Math.sin(endAngle * Math.PI / 180)
      };
      
      const largeArc = 0;
      const sweep = arc.side === 'left' ? 1 : 0;
      
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
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
  stroke-width: 0.8;
  cursor: pointer;
}

/* Specific style for goal lines */
.field-line[class*="Goal"] {
  stroke-width: 1;  /* Thicker line for goals */
}

.field-line:hover {
  stroke-width: 1.2;  /* Even thicker on hover */
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
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); /* Glow effect for points */
  cursor: pointer;
}

.keypoint:hover {
  filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.8));
}

.info-overlay {
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
</style>
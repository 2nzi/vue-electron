<template>
  <svg class="football-field" viewBox="0 0 68 105" preserveAspectRatio="xMidYMid meet">
    <!-- On utilise une transformation pour pivoter tout le terrain -->
    <g transform="translate(68, 0) rotate(90)">
      <!-- Terrain complet -->
      <rect x="0" y="0" width="105" height="68" fill="none" stroke="#00FF15" stroke-width="0.3"/>
      
      <!-- Ligne médiane -->
      <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#00FF15" stroke-width="0.3"/>
      <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#00FF15" stroke-width="0.3"/>
      <circle cx="52.5" cy="34" r="0.5" fill="white"/>
      
      <!-- Surface de réparation gauche -->
      <rect x="0" y="13.84" width="16.5" height="40.32" fill="none" stroke="#00FF15" stroke-width="0.3"/>
      <rect x="0" y="24.84" width="5.5" height="18.32" fill="none" stroke="#00FF15" stroke-width="0.3"/>
      <circle cx="11" cy="34" r="0.5" fill="white"/>
      
      <!-- Surface de réparation droite -->
      <rect x="88.5" y="13.84" width="16.5" height="40.32" fill="none" stroke="#00FF15" stroke-width="0.3"/>
      <rect x="99.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="#00FF15" stroke-width="0.3"/>
      <circle cx="94" cy="34" r="0.5" fill="white"/>
      
      <!-- Points clés -->
      <template v-for="(point, index) in keypoints" :key="index">
        <circle 
          :cx="point[0]" 
          :cy="point[1]" 
          r="1.5" 
          :fill="getPointColor(index)"
          class="keypoint"
          @click="selectPoint(index)"
        />
      </template>
    </g>
  </svg>
</template>

<script>
export default {
  name: 'FootballField',
  props: {
    positionedPoints: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      selectedPointIndex: null,
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
      ]
    }
  },
  methods: {
    selectPoint(index) {
      this.selectedPointIndex = index;
      this.$emit('point-selected', {
        index,
        coordinates: this.keypoints[index]
      });
    },
    getPointColor(index) {
      if (this.selectedPointIndex === index) return 'red';
      if (index in this.positionedPoints) return '#00FF15';
      return 'white';
    }
  }
}
</script>

<style scoped>
.football-field {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #1a1a1a; /* Fond sombre pour mieux voir les lignes vertes */
}

.keypoint {
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); /* Effet de brillance pour les points */
  cursor: pointer;
}

.keypoint:hover {
  filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.8));
}
</style>
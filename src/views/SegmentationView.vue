<template>
  <div class="segmentation-view">
    <!-- Sidebar component avec v-show pour l'animation -->
    <SegmentationSidebar class="sidebar" :class="{ 'sidebar-collapsed': !sidebarOpen }" v-show="sidebarOpen" />
    
    <!-- Bouton pour plier/déplier -->
    <button class="toggle-sidebar" @click="toggleSidebar">
      <span class="arrow" :class="{ 'arrow-reversed': !sidebarOpen }">›</span>
    </button>

    <div class="main-content" :class="{ 'main-content-expanded': !sidebarOpen }">
      <!-- Main video section -->
      <VideoSection class="video-section" />

      <!-- Zoom video preview -->
      <ZoomVideo class="zoom-video" />

      <!-- Timeline component -->
      <VideoTimeline class="timeline" />

      <!-- Warning section -->
      <WarningSection class="warning" />
    </div>
  </div>
</template>

<script>
import SegmentationSidebar from '@/components/segmentation/SegmentationSidebar.vue'
import VideoSection from '@/components/segmentation/VideoSection.vue'
import ZoomVideo from '@/components/segmentation/ZoomVideo.vue'
import VideoTimeline from '@/components/segmentation/VideoTimeline.vue'
import WarningSection from '@/components/segmentation/WarningSection.vue'

export default {
  name: 'SegmentationView',
  
  components: {
    SegmentationSidebar,
    VideoSection,
    ZoomVideo,
    VideoTimeline,
    WarningSection
  },

  data() {
    return {
      sidebarOpen: true
    }
  },

  methods: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    }
  }
}
</script>

<style scoped>
.segmentation-view {
  display: flex;
  height: 100vh;
  background: #1a1a1a;
  position: relative;
}

.sidebar {
  width: 200px;
  border-right: 1px solid #333;
  transition: all 0.3s ease;
}

.sidebar-collapsed {
  width: 0;
  padding: 0;
  margin: 0;
}

.toggle-sidebar {
  position: absolute;
  left: 200px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  width: 20px;
  height: 60px;
  background: #333;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  color: white;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-sidebar:hover {
  background: #444;
}

.arrow {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.arrow-reversed {
  transform: rotate(180deg);
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 16fr 9fr;
  grid-template-rows: 1fr 1fr;
  gap: 24px;
  padding: 8px;
  background: #3A3A3A;
  transition: margin-left 0.3s ease;
}

.main-content-expanded {
  margin-left: 20px; /* Pour compenser le bouton */
}

/* Modifier la position du bouton quand la sidebar est repliée */
.sidebar-collapsed ~ .toggle-sidebar {
  left: 0;
}

.video-section, .zoom-video, .timeline, .warning {
  background: #2a2a2a;
  border-radius: 8px;
}

.video-section {
  grid-column: 1;
  grid-row: 1;
  background: #1a1a1a;
}

.zoom-video {
  grid-column: 2;
  grid-row: 1;
  background: #1a1a1a;
}

.timeline {
  grid-column: 1;
  grid-row: 2;
  background: #1a1a1a;
  display: flex; /* Ajout pour permettre à l'enfant de prendre toute la hauteur */
  flex-direction: column; /* Organisation verticale */
  max-height: 100%; /* Limite la hauteur à la cellule de la grille */
  overflow: hidden; /* Empêche le débordement */
}

.warning {
  grid-column: 2;
  grid-row: 2;
  background: #1a1a1a;
}
</style>

<template>
  <div class="segmentation-view">
    <!-- Sidebar component -->
    <SegmentationSidebar class="sidebar" />

    <div class="main-content">
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
  }
}
</script>

<style scoped>
.segmentation-view {
  display: flex;
  height: 100vh;
  background: #1a1a1a;
}

.sidebar {
  width: 300px;
  border-right: 1px solid #333;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 5fr 2fr;
  grid-template-rows: 3fr 2fr;
  gap: 8px;
  padding: 8px;
  background: #3A3A3A;
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
}

.warning {
  grid-column: 2;
  grid-row: 2;
  background: #1a1a1a;
}
</style>

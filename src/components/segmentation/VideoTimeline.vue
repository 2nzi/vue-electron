<template>
  <div class="video-timeline">
    <timeline-section />
    <objects-timeline-section />
  </div>
</template>

<script>
import TimelineSection from './TimelineSection.vue'
import ObjectsTimelineSection from './ObjectsTimelineSection.vue'

export default {
  name: 'VideoTimeline',
  components: {
    TimelineSection,
    ObjectsTimelineSection
  }
}
</script>

<style scoped>
.video-timeline {
  width: 100%;
  background: #424242;
  border-radius: 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style> 
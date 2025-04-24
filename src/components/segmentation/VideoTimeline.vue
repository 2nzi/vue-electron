<template>
  <div class="video-timeline">
    <div class="timeline-section">
      <h3>Video Timeline</h3>
      <div class="placeholder-video"></div>
    </div>

    <div class="objects-timeline-section">
      <h3>Object Section Timelines</h3>
      <div class="placeholder-objects"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoTimeline',
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

.timeline-section,
.objects-timeline-section {
  background: #363636;
  border-radius: 8px;
  padding: 12px;
}

.objects-timeline-section {
  height: 100%;
}

.placeholder-video {
  height: 40px;
  background: #2c2c2c;
  border-radius: 4px;
}

.placeholder-objects {
  height: 120px;
  background: #2c2c2c;
  border-radius: 4px;
}

h3 {
  color: #ffffff;
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 500;
}
</style> 
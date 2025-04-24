<template>
  <div class="timeline-section">
    <div class="timeline-container">
      <div class="controls">
        <button class="play-pause-btn">
          <i class="fas fa-play"></i>
        </button>
      </div>
      <div class="placeholder-video"></div>
      <div class="timeline-tools"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TimelineSection',
}
</script>

<style scoped>
.timeline-section {
  background: #363636;
  border-radius: 8px;
  padding: 12px;
}

.timeline-container {
  display: flex;
  gap: 8px;
  height: 100%;
}

.controls {
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-pause-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2c2c2c;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.play-pause-btn:hover {
  background: #3c3c3c;
}

.placeholder-video {
  height: 40px;
  background: #2c2c2c;
  border-radius: 4px;
  flex-grow: 1;
}

.timeline-tools {
  width: 50px;
  background: #2c2c2c;
  border-radius: 4px;
  height: 100%;
}

h3 {
  color: #ffffff;
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 500;
}
</style> 
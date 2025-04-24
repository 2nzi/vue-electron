<template>
  <div class="video-progress">
    <div 
      class="timeline-bar"
      ref="timelineBar"
      @click="handleTimelineClick"
    >
      <div 
        class="progress-indicator"
        :style="{ left: `${(currentTime / duration) * 100}%` }"
      ></div>
    </div>
    <div class="time-display">
      {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoProgressTimeline',
  
  props: {
    duration: {
      type: Number,
      required: true
    },
    currentTime: {
      type: Number,
      required: true
    }
  },

  methods: {
    handleTimelineClick(event) {
      const rect = this.$refs.timelineBar.getBoundingClientRect()
      const clickPosition = event.clientX - rect.left
      const percentage = clickPosition / rect.width
      const newTime = this.duration * percentage
      this.$emit('seek', newTime)
    },

    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.video-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-bar {
  height: 8px;
  background: #666666;
  border-radius: 4px;
  position: relative;
  cursor: pointer;
}

.progress-indicator {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #4CAF50;
  border-radius: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.time-display {
  color: #ffffff;
  font-size: 0.875rem;
  text-align: center;
}
</style> 
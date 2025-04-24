<template>
  <div class="object-timeline">
    <div class="object-info">
      <span class="object-name">{{ object.name }}</span>
    </div>
    <div class="timeline-segments">
      <div 
        v-for="segment in object.segments"
        :key="segment.id"
        class="segment"
        :style="{
          left: `${(segment.start / videoDuration) * 100}%`,
          width: `${((segment.end - segment.start) / videoDuration) * 100}%`
        }"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ObjectTimeline',
  
  props: {
    object: {
      type: Object,
      required: true
    },
    videoDuration: {
      type: Number,
      required: true
    }
  }
}
</script>

<style scoped>
.object-timeline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.object-info {
  width: 120px;
  flex-shrink: 0;
}

.object-name {
  color: #ffffff;
  font-size: 0.875rem;
}

.timeline-segments {
  flex-grow: 1;
  height: 24px;
  background: #2c2c2c;
  border-radius: 4px;
  position: relative;
}

.segment {
  position: absolute;
  height: 100%;
  background: #4CAF50;
  opacity: 0.7;
  border-radius: 2px;
}
</style> 
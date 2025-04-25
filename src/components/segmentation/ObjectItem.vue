<template>
  <div class="object-item">
    <div class="object-id">
      <span>{{ objectId }}</span>
    </div>
    <div class="object-timeline">
      <div class="timeline-line"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ObjectItem',
  props: {
    objectId: {
      type: String,
      default: 'object1'
    },
    colorIndex: {
      type: Number,
      default: 0
    }
  }
}
</script>

<style scoped>
.object-item {
  display: flex;
  height: 24px;
  margin-bottom: 18px;
  align-items: center;
}

.object-id {
  width: 35px;
  font-weight: bold;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: white;
}

.object-timeline {
  flex-grow: 1;
  height: 100%;
  position: relative;
  border-radius: 4px;
  display: flex;
  align-items: center;
  border-color: white;
}

.timeline-line {
  height: 1px;
  width: 100%;
  background-color: white;
}
</style> 
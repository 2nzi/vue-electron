<template>
  <div class="object-item">
    <div class="object-id">
      <span>{{ objectId }}</span>
    </div>
    <div class="object-timeline"></div>
  </div>
</template>

<script>
export default {
  name: 'ObjectItem',
  props: {
    objectId: {
      type: String,
      default: 'object1'
    }
  }
}
</script>

<style scoped>
.object-item {
  display: flex;
  gap: 8px;
  height: 40px;
  margin-bottom: 8px;
}

.object-id {
  width: 50px;
  background: #2c2c2c;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-timeline {
  flex-grow: 1;
  background: #2c2c2c;
  border-radius: 4px;
}
</style> 
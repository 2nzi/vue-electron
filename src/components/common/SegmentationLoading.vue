<template>
  <div class="segmentation-loading">
    <div class="spinner"></div>
    <span>{{ message || 'Segmentation en cours...' }}</span>
  </div>
</template>

<script>
export default {
  name: 'SegmentationLoading',
  props: {
    message: {
      type: String,
      default: 'Segmentation en cours...'
    }
  }
}
</script>

<style scoped>
.segmentation-loading {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1000;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 
<template>
  <button 
    class="tool-btn"
    :class="{ active: isActive }"
    @click="$emit('click')"
    :title="title"
  >
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: 'ToolButton',
  
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    }
  },
  
  emits: ['click']
}
</script>

<style scoped>
.tool-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #4a4a4a;
}

.tool-btn.active {
  background: #3a3a3a;
  color: white;
}

.tool-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
}

.tool-btn:not(:disabled):hover {
  background: #4a4a4a;
}
</style> 
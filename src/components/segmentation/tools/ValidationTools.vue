<template>
  <div class="validation-tools">
    <div v-if="showValidationButtons" class="validation-buttons">
      <tool-button 
        @click="$emit('validate')"
        title="Validate Points"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </tool-button>
      
      <tool-button 
        @click="$emit('cancel')"
        title="Cancel Points"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </tool-button>
    </div>
  </div>
</template>

<script>
import ToolButton from './ToolButton.vue'

export default {
  name: 'ValidationTools',
  
  components: {
    ToolButton
  },
  
  props: {
    showValidationButtons: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['validate', 'cancel']
}
</script>

<style scoped>
.validation-tools {
  width: 50px;
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.validation-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style> 
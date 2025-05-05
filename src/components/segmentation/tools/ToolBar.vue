<template>
  <div class="video-tools">
    <tool-button 
      :is-active="currentTool === 'arrow'"
      @click="selectTool('arrow')"
      title="Selection Tool"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 3l7 19 2.051-7.179L19 13 3 3z"/>
      </svg>
    </tool-button>
    
    <tool-button 
      :is-active="currentTool === 'rectangle'"
      @click="selectTool('rectangle')"
      title="Rectangle Tool"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      </svg>
    </tool-button>
    
    <tool-button 
      :is-active="currentTool === 'positive'"
      @click="selectTool('positive')"
      title="Positive Point"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor">
        <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
        <line x1="7" y1="12" x2="17" y2="12" stroke="white" stroke-width="2"/>
        <line x1="12" y1="7" x2="12" y2="17" stroke="white" stroke-width="2"/>
      </svg>
    </tool-button>

    <tool-button 
      :is-active="currentTool === 'negative'"
      @click="selectTool('negative')"
      title="Negative Point"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor">
        <circle cx="12" cy="12" r="10" fill="#f44336"/>
        <line x1="7" y1="12" x2="17" y2="12" stroke="white" stroke-width="2"/>
      </svg>
    </tool-button>
  </div>
</template>

<script>
import ToolButton from './ToolButton.vue'

export default {
  name: 'ToolBar',
  
  components: {
    ToolButton
  },
  
  props: {
    currentTool: {
      type: String,
      required: true
    }
  },
  
  emits: ['tool-selected'],
  
  methods: {
    selectTool(tool) {
      this.$emit('tool-selected', tool)
    }
  }
}
</script>

<style scoped>
.video-tools {
  width: 50px;
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
</style> 
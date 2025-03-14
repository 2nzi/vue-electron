<template>
  <div class="nav-switch">
    <button
      class="switch-button"
      :class="{ active: currentRoute === '/calibration' }"
      @click="switchTo('calibration')"
      title="Switch to Calibration (Alt+C)"
    >
      Calibration
    </button>
    <button
      class="switch-button"
      :class="{ active: currentRoute === '/segmentation' }"
      @click="switchTo('segmentation')"
      title="Switch to Segmentation (Alt+S)"
    >
      Segmentation
    </button>
  </div>
</template>

<script>
export default {
  name: 'NavigationSwitch',
  
  computed: {
    currentRoute() {
      return this.$route.path
    }
  },
  
  mounted() {
    window.addEventListener('keydown', this.handleKeyPress)
  },
  
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyPress)
  },
  
  methods: {
    switchTo(route) {
      if (this.$route.path !== '/' + route) {
        this.$router.push('/' + route)
      }
    },
    
    handleKeyPress(event) {
      if (event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'c':
            this.switchTo('calibration')
            break
          case 's':
            this.switchTo('segmentation')
            break
        }
      }
    }
  }
}
</script>

<style scoped>
.nav-switch {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 1000;
}

.switch-button {
  padding: 0.5rem 1rem;
  border: 1px solid #2196f3;
  border-radius: 4px;
  background: white;
  color: #2196f3;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.switch-button:hover {
  background: #e3f2fd;
}

.switch-button.active {
  background: #2196f3;
  color: white;
}
</style> 
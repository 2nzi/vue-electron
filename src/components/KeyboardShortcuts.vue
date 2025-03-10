<template>
  <div>
    <button @click="showModal = true" class="shortcuts-btn">
      <i class="fas fa-keyboard"></i>
      Shortcuts
    </button>

    <div v-if="showModal" class="modal-overlay" @click="showModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <div class="shortcuts-content">
          <div class="shortcuts-section">
            <h3>Calibration Points</h3>
            <div class="shortcut-item">
              <span class="key">Right click</span>
              <span class="description">Add a point</span>
            </div>
            <div class="shortcut-item">
              <span class="key">Click on point</span>
              <span class="description">Select and modify point position</span>
            </div>
            <div class="shortcut-item">
              <span class="key">Ctrl + Right click</span>
              <span class="description">Mark point as intersection</span>
            </div>
          </div>

          <div class="shortcuts-section">
            <h3>Calibration Lines</h3>
            <div class="shortcut-item">
              <span class="key">Click on line</span>
              <span class="description">Select a line for labeling</span>
            </div>
            <div class="shortcut-item">
              <span class="key">Right click</span>
              <span class="description">Add point to line</span>
            </div>
            <div class="shortcut-item">
              <span class="key">Left click</span>
              <span class="description">Finish line</span>
            </div>
          </div>

          <div class="shortcuts-section">
            <h3>Editing</h3>
            <div class="shortcut-item">
              <span class="key">Delete</span>
              <span class="description">Delete selected element</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KeyboardShortcuts',
  data() {
    return {
      showModal: false
    }
  }
}
</script>

<style scoped>
.shortcuts-btn {
  background-color: #2a2a2a;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.shortcuts-btn:hover {
  background-color: #3a3a3a;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  color: white;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #333;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 8px;
}

.close-btn:hover {
  color: #999;
}

.shortcuts-content {
  padding: 16px;
}

.shortcuts-section {
  margin-bottom: 24px;
}

.shortcuts-section h3 {
  color: #666;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #333;
}

.key {
  background-color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
}

.description {
  color: #ccc;
}
</style> 
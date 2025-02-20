<template>
  <div>
    <!-- Bouton Clear -->
    <button 
      class="clear-btn" 
      @click="showConfirmDialog"
      :disabled="disabled">
      <span class="clear-text">Effacer tout</span>
    </button>

    <!-- Dialog de confirmation avec style néon -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog-content neon-panel" @click.stop>
        <h3 class="neon-title">Confirmation</h3>
        <p class="dialog-message">Êtes-vous sûr de vouloir effacer tous les points et lignes ?</p>
        <p class="warning-text">Cette action est irréversible.</p>
        <div class="dialog-buttons">
          <button class="cancel-btn neon-btn-gray" @click="closeDialog">Annuler</button>
          <button class="confirm-btn neon-btn-red" @click="confirmClear">Confirmer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClearButton',
  props: {
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showDialog: false
    }
  },
  methods: {
    showConfirmDialog() {
      this.showDialog = true
    },
    closeDialog() {
      this.showDialog = false
    },
    confirmClear() {
      this.$emit('clear')
      this.closeDialog()
    }
  }
}
</script>

<style scoped>
.clear-btn {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid #f44336;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  margin-right: 10px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3),
              inset 0 0 10px rgba(244, 67, 54, 0.2);
}

.clear-btn:hover:not(:disabled) {
  background-color: rgba(244, 67, 54, 0.15);
  border-color: #f44336;
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.4),
              inset 0 0 15px rgba(244, 67, 54, 0.3);
}

.clear-btn:active:not(:disabled) {
  background-color: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.3),
              inset 0 0 8px rgba(244, 67, 54, 0.2);
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.neon-panel {
  background-color: rgba(28, 28, 28, 0.95);
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  box-shadow: 0 0 20px rgba(244, 67, 54, 0.2),
              inset 0 0 15px rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  animation: neonPulse 2s infinite;
}

.neon-title {
  color: #ffffff;
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  text-align: center;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5),
               0 0 20px rgba(255, 255, 255, 0.3),
               0 0 30px rgba(255, 255, 255, 0.1);
}

.dialog-message {
  color: #ffffff;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  text-align: center;
}

.warning-text {
  color: #f44336;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  text-align: center;
  text-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
}

.dialog-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.neon-btn-gray {
  background-color: transparent;
  color: #ffffff;
  border: 1px solid #666;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.neon-btn-gray:hover {
  background-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2),
              inset 0 0 15px rgba(255, 255, 255, 0.1);
}

.neon-btn-red {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid #f44336;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
}

.neon-btn-red:hover {
  background-color: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.4),
              inset 0 0 15px rgba(244, 67, 54, 0.2);
}

@keyframes neonPulse {
  0% {
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.2),
                inset 0 0 15px rgba(244, 67, 54, 0.2);
  }
  50% {
    box-shadow: 0 0 25px rgba(244, 67, 54, 0.3),
                inset 0 0 20px rgba(244, 67, 54, 0.3);
  }
  100% {
    box-shadow: 0 0 20px rgba(244, 67, 54, 0.2),
                inset 0 0 15px rgba(244, 67, 54, 0.2);
  }
}
</style> 
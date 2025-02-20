<template>
  <div>
    <!-- Bouton Clear -->
    <button 
      class="clear-btn" 
      @click="showConfirmDialog"
      :disabled="disabled">
      <span class="clear-text">Effacer tout</span>
    </button>

    <!-- Dialog de confirmation -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog-content" @click.stop>
        <h3>Confirmation</h3>
        <p>Êtes-vous sûr de vouloir effacer tous les points et lignes ?</p>
        <p class="warning-text">Cette action est irréversible.</p>
        <div class="dialog-buttons">
          <button class="cancel-btn" @click="closeDialog">Annuler</button>
          <button class="confirm-btn" @click="confirmClear">Confirmer</button>
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  min-width: 300px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.dialog-content h3 {
  margin-top: 0;
  color: #ffffff;
}

.warning-text {
  color: #f44336;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-btn, .confirm-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.cancel-btn {
  background-color: transparent;
  border: 1px solid #666;
  color: #ffffff;
}

.cancel-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.confirm-btn {
  background-color: #f44336;
  border: none;
  color: white;
}

.confirm-btn:hover {
  background-color: #d32f2f;
}
</style> 
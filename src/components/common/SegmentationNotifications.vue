<template>
  <div class="segmentation-notifications">
    <transition-group name="notification-fade">
      <div 
        v-for="notification in notifications" 
        :key="notification.id" 
        class="segmentation-notification"
        :class="{ 'success': notification.status === 'success', 'error': notification.status === 'error' }"
      >
        <div class="notification-content">
          <div class="spinner" v-if="notification.status === 'processing'"></div>
          <div class="icon success-icon" v-else-if="notification.status === 'success'">✓</div>
          <div class="icon error-icon" v-else-if="notification.status === 'error'">✗</div>
          <div class="notification-text">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
          </div>
        </div>
        <button class="close-button" @click="removeNotification(notification.id)">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'SegmentationNotifications',
  data() {
    return {
      notifications: [],
      nextId: 1
    }
  },
  methods: {
    addNotification(notification) {
      const id = this.nextId++;
      const newNotification = {
        id,
        status: 'processing',
        title: 'Segmentation en cours',
        message: 'Traitement de la segmentation...',
        autoClose: true,
        ...notification
      };
      
      this.notifications.push(newNotification);
      
      // Retourner l'ID pour permettre les mises à jour
      return id;
    },
    
    updateNotification(id, updates) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications[index] = { ...this.notifications[index], ...updates };
        
        // Auto-fermeture pour les notifications terminées
        if ((updates.status === 'success' || updates.status === 'error') && 
            this.notifications[index].autoClose) {
          setTimeout(() => this.removeNotification(id), 5000);
        }
      }
    },
    
    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        this.notifications.splice(index, 1);
      }
    },
    
    clearAll() {
      this.notifications = [];
    }
  }
}
</script>

<style scoped>
.segmentation-notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.segmentation-notification {
  background-color: rgba(30, 30, 30, 0.9);
  color: white;
  border-radius: 6px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-left: 4px solid #2196F3;
  animation: slide-in 0.3s ease-out;
}

.segmentation-notification.success {
  border-left-color: #4CAF50;
}

.segmentation-notification.error {
  border-left-color: #F44336;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
}

.notification-message {
  font-size: 12px;
  opacity: 0.8;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  flex-shrink: 0;
}

.icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.success-icon {
  background-color: #4CAF50;
}

.error-icon {
  background-color: #F44336;
}

.close-button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  line-height: 1;
}

.close-button:hover {
  color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-fade-enter-active, .notification-fade-leave-active {
  transition: all 0.3s;
}

.notification-fade-enter-from, .notification-fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 
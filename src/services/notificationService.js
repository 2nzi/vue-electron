import { ref } from 'vue';

// Singleton pour stocker la référence au composant de notifications
const notificationComponent = ref(null);

export const notificationService = {
  setNotificationComponent(component) {
    notificationComponent.value = component;
  },
  
  addNotification(notification) {
    if (notificationComponent.value) {
      return notificationComponent.value.addNotification(notification);
    }
    return null;
  },
  
  updateNotification(id, updates) {
    if (notificationComponent.value) {
      notificationComponent.value.updateNotification(id, updates);
    }
  },
  
  removeNotification(id) {
    if (notificationComponent.value) {
      notificationComponent.value.removeNotification(id);
    }
  },
  
  clearAll() {
    if (notificationComponent.value) {
      notificationComponent.value.clearAll();
    }
  }
}; 
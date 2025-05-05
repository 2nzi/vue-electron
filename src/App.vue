<template>
  <div id="app">
    <router-view />
    <segmentation-notifications ref="notifications" />
  </div>
</template>

<script>
import SegmentationNotifications from '@/components/common/SegmentationNotifications.vue';
import { notificationService } from '@/services/notificationService';

export default {
  name: 'App',
  components: {
    SegmentationNotifications,
  },
  mounted() {
    // Enregistrer le composant de notifications dans le service
    notificationService.setNotificationComponent(this.$refs.notifications);
  }
}
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>


<!-- npm run electron:serve -->
<!-- uvicorn main:app --reload -->
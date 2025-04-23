<template>
  <div id="app">
    <navigation-switch />
    <router-view />
  </div>
</template>

<script>
import NavigationSwitch from '@/components/shared/NavigationSwitch.vue'

export default {
  name: 'App',
  components: {
    NavigationSwitch
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
<template>
  <div class="sidebar" :class="{ 'sidebar-hidden': !showSidebar }">
    <div class="sidebar-header">
      <button @click="toggleSidebar" class="toggle-sidebar-btn">
        {{ showSidebar ? '←' : '→' }}
      </button>
    </div>
    <div class="video-list" v-if="showSidebar">
      <div v-for="video in videos" 
           :key="video.path"
           class="video-item"
           :class="{ 'selected': selectedVideo === video }"
           @click="$emit('video-selected', video)">
        <span class="video-name">{{ video.name }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoSidebar',
  props: {
    videos: {
      type: Array,
      required: true
    },
    selectedVideo: {
      type: Object,
      default: null
    },
    showSidebar: {
      type: Boolean,
      default: true
    }
  },
  emits: ['video-selected', 'toggle-sidebar'],
  methods: {
    toggleSidebar() {
      this.$emit('toggle-sidebar')
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 250px;
  background-color: #2a2a2a;
  border-right: 1px solid #3a3a3a;
  transition: width 0.3s ease;
  overflow-y: auto;
}

.sidebar-hidden {
  width: 40px;
}

.sidebar-header {
  padding: 0.5rem;
  border-bottom: 1px solid #3a3a3a;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.video-list {
  padding: 0.5rem;
}

.video-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: #3a3a3a;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.video-item:hover {
  background-color: #4a4a4a;
}

.video-item.selected {
  background-color: #4CAF50;
}

.video-name {
  color: white;
  font-size: 0.9rem;
}
</style> 
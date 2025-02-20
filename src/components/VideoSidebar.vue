<template>
  <div class="sidebar" :class="{ 'sidebar-hidden': !showSidebar }">
    <div class="sidebar-header neon-header">
      <button @click="toggleSidebar" class="toggle-sidebar-btn neon-text">
        {{ showSidebar ? '←' : '→' }}
      </button>
    </div>
    <div class="video-list" v-if="showSidebar">
      <div v-for="video in videos" 
           :key="video.path"
           class="video-item neon-item"
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
  background-color: rgba(42, 42, 42, 0.95);
  border-right: 1px solid rgba(76, 175, 80, 0.3);
  transition: all 0.3s ease;
  overflow-y: auto;
  box-shadow: inset -5px 0 15px rgba(76, 175, 80, 0.1);
}

.sidebar-hidden {
  width: 40px;
  border-right: 1px solid rgba(76, 175, 80, 0.5);
  box-shadow: inset -2px 0 10px rgba(76, 175, 80, 0.2);
}

.neon-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(76, 175, 80, 0.3);
  background: linear-gradient(
    to bottom,
    rgba(76, 175, 80, 0.1),
    transparent
  );
}

.toggle-sidebar-btn {
  background: none;
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4CAF50;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.toggle-sidebar-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.3);
  text-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
}

.video-list {
  padding: 1rem;
}

.neon-item {
  padding: 0.8rem;
  margin-bottom: 0.8rem;
  background-color: rgba(58, 58, 58, 0.95);
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.1);
}

.neon-item:hover {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.4);
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.2),
              inset 0 0 10px rgba(76, 175, 80, 0.1);
  transform: translateX(5px);
}

.neon-item.selected {
  background-color: rgba(76, 175, 80, 0.15);
  border-color: #4CAF50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3),
              inset 0 0 15px rgba(76, 175, 80, 0.2);
}

.video-name {
  color: #ffffff;
  font-size: 0.9rem;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.selected .video-name {
  color: #4CAF50;
  text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

/* Personnalisation de la scrollbar */
.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: rgba(42, 42, 42, 0.95);
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(76, 175, 80, 0.3);
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(76, 175, 80, 0.5);
}
</style> 
<template>
  <div class="objects-timeline-section">
    <div class="timeline-container">
      <div class="objects-container">
        <object-item v-for="object in objects" :key="object.id" :object-id="object.id" />
      </div>
      <div class="timeline-tools"></div>
    </div>
  </div>
</template>

<script>
import ObjectItem from './ObjectItem.vue'

export default {
  name: 'ObjectsTimelineSection',
  components: {
    ObjectItem
  },
  data() {
    return {
      objects: [
        { id: 'Id1' },
        { id: 'Id2' },
        { id: 'Id3' },
        { id: 'Id4' },
        { id: 'Id5' },
        { id: 'Id6' },
        { id: 'Id7' },
        { id: 'Id8' }
        
      ]
    }
  }
}
</script>

<style scoped>
.objects-timeline-section {
  background: #363636;
  border-radius: 8px;
  padding: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Contenir tout le contenu */
}

.timeline-container {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0; /* Crucial pour que le scroll fonctionne dans un conteneur flex */
  overflow: hidden; /* Contenir les enfants */
}

.objects-container {
  flex-grow: 1;
  overflow-y: auto; /* Activer le défilement vertical */
  padding-right: 8px;
  /* Stylisation de la scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #555 #2c2c2c;
}

/* Stylisation de la scrollbar pour Chrome/Safari/Edge */
.objects-container::-webkit-scrollbar {
  width: 8px;
}

.objects-container::-webkit-scrollbar-track {
  background: #2c2c2c;
  border-radius: 4px;
}

.objects-container::-webkit-scrollbar-thumb {
  background-color: #555;
  border-radius: 4px;
}

.timeline-tools {
  width: 50px;
  background: #2c2c2c;
  border-radius: 4px;
  height: 100%;
}

h3 {
  color: #ffffff;
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 500;
}
</style> 
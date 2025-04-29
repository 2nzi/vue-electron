<template>
  <div class="objects-timeline-section">
    <div class="timeline-container">
      <div class="objects-container">
        <object-item 
          v-for="object in objects" 
          :key="object.id" 
          :object-id="object.id"
          :object-name="object.name"
          :color="object.color"
          :is-selected="annotationStore.selectedObjectId === object.id"
          @click="selectObject(object.id)"
        />
        <div class="add-object" v-if="objects.length === 0 || showAddButton">
          <button class="add-button" @click="addNewObject">+</button>
        </div>
        <div class="empty-state" v-if="objects.length === 0">
          <p>Aucun objet créé</p>
          <p>Cliquez sur + pour ajouter un objet</p>
        </div>
      </div>
      <div class="timeline-tools"></div>
    </div>
  </div>
</template>

<script>
import ObjectItem from './ObjectItem.vue'
import { useAnnotationStore } from '@/stores/annotationStore'

export default {
  name: 'ObjectsTimelineSection',
  components: {
    ObjectItem
  },
  
  setup() {
    const annotationStore = useAnnotationStore()
    return { annotationStore }
  },
  
  data() {
    return {
      showAddButton: true
    }
  },
  
  computed: {
    objects() {
      // Récupérer les objets depuis le store
      return Object.values(this.annotationStore.objects)
    }
  },
  
  methods: {
    selectObject(objectId) {
      // Utiliser l'action du store pour sélectionner l'objet
      this.annotationStore.selectObject(objectId)
      
      // Émettre un événement pour informer d'autres composants
      this.$emit('object-selected', objectId)
    },
    
    addNewObject() {
      // Ajouter un nouvel objet via le store
      const newObjectId = this.annotationStore.addObject()
      
      // Émettre un événement pour informer d'autres composants
      this.$emit('object-selected', newObjectId)
    }
  }
}
</script>

<style scoped>
.objects-timeline-section {
  background: #363636;
  border-radius: 8px;
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
  padding: 8px;
  background: #2a2a2a;
  border-radius: 4px;
  /* Stylisation de la scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #555 #2c2c2c;
  direction: rtl; /* Déplace la scrollbar à gauche */
}

.objects-container > * {
  direction: ltr; /* Rétablit la direction normale pour le contenu */
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

.add-object {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.add-button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #2c2c2c;
  border: none;
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-button:hover {
  background: #3c3c3c;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 20px 0;
  font-size: 0.9rem;
}

.empty-state p {
  margin: 5px 0;
}
</style> 
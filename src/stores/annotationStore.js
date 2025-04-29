// Dans un store Pinia (stores/annotationStore.js)
import { defineStore } from 'pinia'

export const useAnnotationStore = defineStore('annotations', {
  state: () => ({
    // Session courante
    currentSession: {
      id: 'session-1',
      name: 'Session d\'annotation',
      videoId: null,
      frameRate: 30
    },
    
    // Dictionnaire des objets
    objects: {
      // Exemple: "object-1": { id: "object-1", name: "Personne", color: "#4CAF50" }
    },
    
    // Compteur pour les IDs d'objets
    objectIdCounter: 1,
    
    // Annotations par frame
    frameAnnotations: {
      // Exemple: "15": [{ objectId: "object-1", type: "rectangle", x: 100, y: 100, width: 200, height: 150 }]
    },
    selectedObjectId: null
  }),
  
  actions: {
    // Sélectionner un objet
    selectObject(objectId) {
      this.selectedObjectId = objectId
      console.log(`Objet sélectionné: ${objectId}`)
    },
    
    // Désélectionner l'objet actuel
    deselectObject() {
      this.selectedObjectId = null
    },
    
    // Ajouter une annotation pour l'objet sélectionné à la frame actuelle
    addAnnotation(frameNumber, annotation) {
      // S'assurer que le tableau d'annotations pour cette frame existe
      if (!this.frameAnnotations[frameNumber]) {
        this.frameAnnotations[frameNumber] = []
      }
      
      // Ajouter l'annotation au tableau
      this.frameAnnotations[frameNumber].push(annotation)
      console.log(`Annotation ajoutée pour l'objet ${annotation.objectId} à la frame ${frameNumber}`)
    },
    
    // Ajouter un nouvel objet
    addObject(objectData = {}) {
      const objectId = `Id-${this.objectIdCounter++}`
      
      this.objects[objectId] = {
        id: objectId,
        name: objectData.name || `Objet ${this.objectIdCounter - 1}`,
        color: objectData.color || this.getRandomColor(),
        // Autres propriétés selon vos besoins
      }
      
      // Sélectionner automatiquement le nouvel objet
      this.selectObject(objectId)
      
      return objectId
    },
    
    // Récupérer les annotations pour une frame
    getAnnotationsForFrame(frameNumber) {
      return this.frameAnnotations[frameNumber.toString()] || []
    },
    
    // Supprimer une annotation
    removeAnnotation(frameNumber, annotationId) {
      const frameKey = frameNumber.toString()
      if (this.frameAnnotations[frameKey]) {
        this.frameAnnotations[frameKey] = this.frameAnnotations[frameKey]
          .filter(a => a.id !== annotationId)
      }
    },
    
    // Générer une couleur aléatoire
    getRandomColor() {
      return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    },
    
    // Sauvegarder les annotations (version simple)
    saveAnnotations() {
      // Utiliser localStorage pour une version simple
      localStorage.setItem('annotations', JSON.stringify({
        currentSession: this.currentSession,
        objects: this.objects,
        objectIdCounter: this.objectIdCounter,
        frameAnnotations: this.frameAnnotations
      }))
    },
    
    // Charger les annotations (version simple)
    loadAnnotations() {
      const saved = localStorage.getItem('annotations')
      if (saved) {
        const data = JSON.parse(saved)
        this.currentSession = data.currentSession
        this.objects = data.objects
        this.objectIdCounter = data.objectIdCounter || 1
        this.frameAnnotations = data.frameAnnotations
      }
    }
  }
})
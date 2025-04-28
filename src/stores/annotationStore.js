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
    }
  }),
  
  actions: {
    // Ajouter un nouvel objet
    addObject(name, color) {
      const id = `Id${this.objectIdCounter}`
      this.objects[id] = {
        id,
        name: name || `Objet ${this.objectIdCounter}`,
        color: color || this.getRandomColor()
      }
      this.objectIdCounter++
      return id
    },
    
    // Ajouter une annotation à une frame
    addAnnotation(frameNumber, annotation) {
      // Convertir en string pour utiliser comme clé
      const frameKey = frameNumber.toString()
      
      // Initialiser le tableau si nécessaire
      if (!this.frameAnnotations[frameKey]) {
        this.frameAnnotations[frameKey] = []
      }
      
      // Ajouter l'annotation
      this.frameAnnotations[frameKey].push({
        id: Date.now().toString(),
        ...annotation
      })
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
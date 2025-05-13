// Dans un store Pinia (stores/annotationStore.js)
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

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
    frameAnnotations: {}, // { frameNumber: [{ id, objectId, type, x, y, width, height, mask, maskScore, maskImageSize }] }
    selectedObjectId: null,
    temporaryPoints: [] // Nouvelle propriété pour stocker les points temporaires
  }),
  
  getters: {
    getTemporaryPointsForObject: (state) => (objectId) => {
      return state.temporaryPoints.filter(point => point.objectId === objectId)
    }
  },
  
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
      const id = uuidv4()
      const newAnnotation = { 
        id, 
        ...annotation,
        // Si c'est un masque et qu'il y a une bbox, l'ajouter à l'annotation
        ...(annotation.type === 'mask' && annotation.bbox ? { bbox: annotation.bbox } : {})
      }
      
      if (!this.frameAnnotations[frameNumber]) {
        this.frameAnnotations[frameNumber] = []
      }
      
      this.frameAnnotations[frameNumber].push(newAnnotation)
      
      // Retourner l'ID pour pouvoir mettre à jour l'annotation plus tard
      return id
    },
    
    updateAnnotation(frameNumber, annotationId, updates) {
      if (!this.frameAnnotations[frameNumber]) return
      
      const annotationIndex = this.frameAnnotations[frameNumber].findIndex(
        a => a.id === annotationId
      )
      
      if (annotationIndex === -1) return
      
      // Mettre à jour l'annotation avec les nouvelles propriétés
      this.frameAnnotations[frameNumber][annotationIndex] = {
        ...this.frameAnnotations[frameNumber][annotationIndex],
        ...updates
      }
    },
    
    // Ajouter un nouvel objet
    addObject(objectData = {}) {
      const objectId = `${this.objectIdCounter++}`
      
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
    
    // Nouvelle méthode pour supprimer tous les masques d'un objet sur une frame
    removeMasksForObject(frameNumber, objectId) {
      const frameKey = frameNumber.toString()
      if (this.frameAnnotations[frameKey]) {
        this.frameAnnotations[frameKey] = this.frameAnnotations[frameKey]
          .filter(a => !(a.objectId === objectId && a.type === 'mask'))
      }
    },
    
    // Vérifier si un objet a encore des annotations sur une frame
    hasAnnotationsForObject(frameNumber, objectId) {
      const frameKey = frameNumber.toString()
      if (!this.frameAnnotations[frameKey]) return false
      
      return this.frameAnnotations[frameKey]
        .some(a => a.objectId === objectId)
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
    },
    
    getAnnotation(frameNumber, annotationId) {
      if (!this.frameAnnotations[frameNumber]) return null
      
      return this.frameAnnotations[frameNumber].find(a => a.id === annotationId) || null
    },
    
    addTemporaryPoint(point) {
      // Ajouter un ID unique au point
      const pointWithId = {
        ...point,
        id: uuidv4()
      }
      this.temporaryPoints.push(pointWithId)
      return pointWithId.id
    },
    
    removeTemporaryPoint(pointId) {
      const index = this.temporaryPoints.findIndex(p => p.id === pointId)
      if (index !== -1) {
        this.temporaryPoints.splice(index, 1)
      }
    },
    
    clearTemporaryPoints() {
      this.temporaryPoints = []
    }
  }
})
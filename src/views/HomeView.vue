<template>
    <div class="home">
      <div class="hero">
        <h1 class="title">Vision Tools</h1>
        <button class="select-button" @click="selectFolder">
          Select Video Folder
          <span class="arrow">→</span>
        </button>
        <p v-if="selectedFolder" class="selected-path">
          Selected: {{ selectedFolder }}
        </p>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'HomeView',
    data() {
      return {
        selectedFolder: null
      }
    },
    methods: {
      async selectFolder() {
        try {
          const result = await window.electron.openDirectory()
          if (result && !result.canceled) {
            this.selectedFolder = result.filePaths[0]
            this.$router.push({
              name: 'calibration',
              params: { 
                folderPath: encodeURIComponent(this.selectedFolder)
              }
            })
          }
        } catch (error) {
          console.error('Erreur lors de la sélection du dossier:', error)
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .home {
    height: 100vh;
    width: 100%;
  }
  
  .hero {
    height: 100%;
    background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
      url('@/assets/football.jpg'); /* Assurez-vous d'ajouter une image de surf dans vos assets */
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .title {
    color: white;
    font-size: 4rem;
    font-weight: bold;
    margin-bottom: 2rem;
  }
  
  .select-button {
    background-color: white;
    color: black;
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 25px;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: transform 0.2s;
  }
  
  .select-button:hover {
    transform: scale(1.05);
  }
  
  .arrow {
    font-size: 1.2rem;
  }
  
  .selected-path {
    color: white;
    margin-top: 1rem;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    max-width: 80%;
    word-break: break-all;
  }
  </style>
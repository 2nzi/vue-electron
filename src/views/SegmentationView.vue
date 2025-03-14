<template>
  <div class="segmentation-view">
    <!-- Left sidebar -->
    <div class="sidebar">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Input Folder</span>
        </div>
        <div class="section-content">
          <div class="folder-path">{{ inputFolder || 'No folder selected' }}</div>
          <button class="action-button" @click="selectInputFolder">Select Folder</button>
          
          <div class="video-list" v-if="videos.length > 0">
            <div v-for="video in videos" 
                 :key="video.path"
                 class="video-item"
                 :class="{ 'selected': selectedVideo && selectedVideo.path === video.path }"
                 @click="selectVideo(video)">
              {{ video.name }}
            </div>
          </div>
          <div v-else-if="inputFolder" class="empty-message">
            No videos found in this folder
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="main-content">
      <!-- Video display -->
      <div class="video-container">
        <div v-if="!selectedVideo" class="no-video-message">
          Select a video from the sidebar to start
        </div>
        <video v-else ref="videoPlayer" class="video-player">
          <source :src="selectedVideo.path" type="video/mp4">
        </video>
      </div>

      <!-- Video controls and timeline -->
      <div class="video-controls" v-if="selectedVideo">
        <button class="play-button" @click="togglePlay">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>

        <div class="timeline" 
             @mousedown="startScrubbing"
             @mousemove="scrub"
             @mouseup="stopScrubbing"
             @mouseleave="stopScrubbing"
             ref="timeline">
          <!-- Thumbnails container -->
          <div class="thumbnails-container">
            <div v-for="(_, index) in 12" :key="index" class="thumbnail">
              <canvas :ref="'thumbnail_' + index" width="160" height="90"></canvas>
            </div>
          </div>
          
          <!-- Progress and cursor -->
          <div class="timeline-progress" :style="{ width: timelinePosition + '%' }"></div>
          <div class="timeline-cursor-container" :style="{ left: timelinePosition + '%' }">
            <div class="timeline-cursor-line"></div>
            <div class="timeline-cursor-handle"></div>
            <div class="timeline-cursor-time" v-if="duration > 0">{{ formatTimeWithMs(currentTime) }}</div>
          </div>
        </div>
      </div>

      <!-- Object timeline -->
      <div class="object-timeline" v-if="selectedVideo">
        <div class="object-track">
          <div class="track-label">Object 1</div>
          <div class="track-content"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SegmentationView',

  data() {
    return {
      inputFolder: '',
      videos: [],
      selectedVideo: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      thumbnails: [],
      currentThumbnailIndex: 0,
      timelinePosition: 0,
      isDragging: false,
      isScrubbing: false
    }
  },

  methods: {
    async selectInputFolder() {
      try {
        const result = await window.electron.openDirectory()
        if (!result.canceled && result.filePaths.length > 0) {
          this.inputFolder = result.filePaths[0]
          await this.loadVideos()
        }
      } catch (error) {
        console.error('Error selecting folder:', error)
      }
    },

    async loadVideos() {
      try {
        this.videos = await window.electron.getVideosFromFolder(this.inputFolder)
      } catch (error) {
        console.error('Error loading videos:', error)
        this.videos = []
      }
    },

    selectVideo(video) {
      this.selectedVideo = video
      this.resetVideoState()
    },

    resetVideoState() {
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.thumbnails = []
      this.currentThumbnailIndex = 0
      this.timelinePosition = 0
      
      // Wait for the video to be loaded in the DOM
      this.$nextTick(() => {
        const video = this.$refs.videoPlayer
        if (video) {
          video.load()
        }
      })
    },

    togglePlay() {
      const video = this.$refs.videoPlayer
      if (video.paused) {
        video.play()
        this.isPlaying = true
      } else {
        video.pause()
        this.isPlaying = false
      }
    },

    seekToThumbnail(index) {
      const video = this.$refs.videoPlayer
      const seekTime = (index / this.thumbnails.length) * this.duration
      video.currentTime = seekTime
      this.currentThumbnailIndex = index
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    },

    formatTimeWithMs(seconds) {
      const secs = Math.floor(seconds)
      const cs = Math.floor((seconds % 1) * 100)
      return `${secs}:${cs.toString().padStart(2, '0')}`
    },

    updateTimelinePosition() {
      this.timelinePosition = (this.currentTime / this.duration) * 100
    },

    handleTimeUpdate() {
      const video = this.$refs.videoPlayer
      this.currentTime = video.currentTime
      this.updateTimelinePosition()
      this.currentThumbnailIndex = Math.floor((this.currentTime / this.duration) * this.thumbnails.length)
    },

    handleLoadedMetadata() {
      const video = this.$refs.videoPlayer
      this.duration = video.duration
      this.generateThumbnails()
    },

    generateThumbnails() {
      if (!this.duration) return
      
      const thumbnailCount = 12
      for (let i = 0; i < thumbnailCount; i++) {
        const time = (i / (thumbnailCount - 1)) * this.duration
        const canvas = this.$refs[`thumbnail_${i}`]?.[0]
        if (canvas) {
          this.generateThumbnail(time, canvas)
        }
      }
    },

    async generateThumbnail(time, canvasRef) {
      const video = this.$refs.videoPlayer
      if (!video || !canvasRef) return

      // Save current time
      const currentTime = video.currentTime
      
      // Seek to the time we want to capture
      video.currentTime = time
      
      // Wait for the seek to complete
      await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true })
      })
      
      // Draw the frame
      const ctx = canvasRef.getContext('2d')
      ctx.drawImage(video, 0, 0, canvasRef.width, canvasRef.height)
      
      // Restore original time
      video.currentTime = currentTime
    },

    startDragging(event) {
      this.isDragging = true
      document.addEventListener('mousemove', this.drag)
      document.addEventListener('mouseup', this.stopDragging)
      event.preventDefault()
    },

    drag(event) {
      if (!this.isDragging) return
      
      const timeline = this.$refs.timeline
      const rect = timeline.getBoundingClientRect()
      let position = (event.clientX - rect.left) / rect.width
      position = Math.max(0, Math.min(1, position))
      
      this.timelinePosition = position * 100
      this.currentTime = position * this.duration
      
      const video = this.$refs.videoPlayer
      if (video) {
        video.currentTime = this.currentTime
      }
    },

    stopDragging() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.drag)
      document.removeEventListener('mouseup', this.stopDragging)
    },

    startScrubbing(event) {
      this.isScrubbing = true
      this.scrub(event)
    },

    scrub(event) {
      if (!this.isScrubbing) return
      
      const timeline = this.$refs.timeline
      const rect = timeline.getBoundingClientRect()
      let position = (event.clientX - rect.left) / rect.width
      position = Math.max(0, Math.min(1, position))
      
      this.timelinePosition = position * 100
      this.currentTime = position * this.duration
      
      const video = this.$refs.videoPlayer
      if (video) {
        video.currentTime = this.currentTime
        // Force update the display
        this.$forceUpdate()
      }
    },

    stopScrubbing() {
      this.isScrubbing = false
    }
  },

  mounted() {
    window.addEventListener('keydown', this.handleKeyPress)
    
    // Set default folder and load videos
    this.inputFolder = "C:\\Users\\antoi\\Documents\\Work_Learn\\Stage-Rennes\\RepositoryFootballVision\\SportDETR\\data\\football\\raw"
    this.loadVideos().then(() => {
      // Select first video if available
      if (this.videos.length > 0) {
        this.selectVideo(this.videos[0])
      }
    })
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyPress)
  },

  watch: {
    selectedVideo(newVideo, oldVideo) {
      if (oldVideo) {
        const video = this.$refs.videoPlayer
        video.removeEventListener('timeupdate', this.handleTimeUpdate)
        video.removeEventListener('loadedmetadata', this.handleLoadedMetadata)
      }
      
      if (newVideo) {
        this.$nextTick(() => {
          const video = this.$refs.videoPlayer
          video.addEventListener('timeupdate', this.handleTimeUpdate)
          video.addEventListener('loadedmetadata', this.handleLoadedMetadata)
        })
      }
    }
  }
}
</script>

<style scoped>
.segmentation-view {
  height: 100vh;
  background: #1a1a1a;
  display: flex;
}

.sidebar {
  width: 300px;
  background: #1a1a1a;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.section {
  padding: 16px;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  color: white;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.folder-path {
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  color: #fff;
  font-size: 12px;
  word-break: break-all;
}

.action-button {
  width: 100%;
  padding: 8px;
  background: #2a2a2a;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #333;
  border-color: #444;
}

.video-list {
  margin-top: 16px;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
}

.video-item {
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.video-item:hover {
  background: #2a2a2a;
}

.video-item.selected {
  background: #2a2a2a;
  border-left: 2px solid #4CAF50;
}

.empty-message {
  color: #666;
  text-align: center;
  padding: 16px;
  font-size: 13px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-video-message {
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 16px;
}

/* Existing styles remain unchanged */
.video-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  overflow: hidden;
}

.video-player {
  max-width: 100%;
  max-height: 100%;
}

.video-controls {
  height: 60px;
  background: #1a1a1a;
  border-top: 1px solid #333;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.play-button {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline {
  flex: 1;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  position: relative;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
}

.thumbnails-container {
  display: flex;
  height: 100%;
  width: 100%;
  gap: 2px;
}

.thumbnail {
  flex: 1;
  height: 100%;
  background: #1a1a1a;
  overflow: hidden;
}

.thumbnail canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(33, 150, 243, 0.2);
  pointer-events: none;
}

.timeline-cursor-container {
  position: absolute;
  top: 0;
  height: 100%;
  transform: translateX(-50%);
  pointer-events: none;
}

.timeline-cursor-line {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background: #2196f3;
  transform: translateX(-50%);
}

.timeline-cursor-handle {
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  background: #2196f3;
  border-radius: 50%;
  transform: translateX(-50%);
  cursor: grab;
  pointer-events: auto;
}

.timeline-cursor-time {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.object-timeline {
  height: 60px;
  background: #1a1a1a;
  border-top: 1px solid #333;
  padding: 10px 15px;
}

.object-track {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 15px;
}

.track-label {
  width: 40px;
  color: white;
  font-size: 14px;
}

.track-content {
  flex: 1;
  height: 30px;
  background: #2a2a2a;
  border-radius: 4px;
}
</style>

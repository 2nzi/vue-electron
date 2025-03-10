<template>
  <div class="calibration">
    <div class="main-content">
      <VideoSidebar 
        :videos="videos"
        :selectedVideo="selectedVideo"
        :showSidebar="showSidebar"
        :inputFolder="inputFolder"
        :outputFolder="outputFolder"
        @video-selected="selectVideo"
        @toggle-sidebar="toggleSidebar"
        @input-folder-selected="handleInputFolderSelected"
        @output-folder-selected="handleOutputFolderSelected"
      />

      <div class="content-area">
        <div class="header-actions">
          <KeyboardShortcuts />
        </div>

        <!-- <div class="metadata-section" v-if="selectedVideo">
          <h4>METADATA</h4>
          <div class="metadata-info">
            <p>name: {{ selectedVideo.name }}</p>
            <p>session: {{ selectedVideo.session || 'session_name' }}</p>
            <p>created: {{ new Date().toLocaleDateString() }}</p>
          </div>
        </div> -->

        <div class="video-display">
          <div class="calibration-container">
            <CalibrationArea
              ref="calibrationArea"
              :thumbnail="thumbnail"
              :calibrationPoints="calibrationPoints"
              :calibrationLines="calibrationLines"
              :selectedFieldPoint="selectedFieldPoint"
              :selectedFieldLine="selectedFieldLine"
              @update:thumbnail="updateThumbnail"
              @update:calibrationPoints="updateCalibrationPoints"
              @update:calibrationLines="updateCalibrationLines"
              @update:selectedFieldPoint="updateSelectedFieldPoint"
              @update:selectedFieldLine="updateSelectedFieldLine"
              @save-calibration="saveCalibration"
            />
          </div>
          <div class="field-container">
            <FootballField 
              ref="footballField"
              @point-selected="handleFieldPointSelected"
              @line-selected="handleFieldLineSelected"
              :positionedPoints="calibrationPoints"
              :positionedLines="calibrationLines"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VideoSidebar from '@/components/VideoSidebar.vue'
import CalibrationArea from '@/components/CalibrationArea.vue'
import FootballField from '@/components/FootballField.vue'
import KeyboardShortcuts from '@/components/KeyboardShortcuts.vue'

export default {
  name: 'CalibrationView',
  components: {
    VideoSidebar,
    CalibrationArea,
    FootballField,
    KeyboardShortcuts
  },
  data() {
    return {
      videos: [],
      selectedVideo: null,
      thumbnail: null,
      showSidebar: true,
      calibrationPoints: {},
      selectedFieldPoint: null,
      calibrationLines: {},
      selectedFieldLine: null,
      videoSrc: '',
      inputFolder: '',
      outputFolder: ''
    }
  },
  async created() {
    if (this.folderPath) {
      await this.loadVideos()
    }
  },
  methods: {
    async handleInputFolderSelected(folderPath) {
      this.inputFolder = folderPath
      await this.loadVideos()
    },

    handleOutputFolderSelected(folderPath) {
      this.outputFolder = folderPath
    },

    async loadVideos() {
      if (!this.inputFolder) return
      
      try {
        this.videos = await window.electron.getVideosFromFolder(this.inputFolder)
        if (this.videos.length > 0) {
          await this.selectVideo(this.videos[0])
        }
      } catch (error) {
        console.error('Error loading videos:', error)
      }
    },

    async selectVideo(video) {
      console.log('Starting selectVideo with:', video)
      try {
        this.selectedVideo = video
        this.thumbnail = null
        
        console.log('Extracting first frame from video:', video.path)
        const result = await window.electron.getFirstFrame(video.path)
        
        if (result.success) {
          console.log('Frame extracted successfully')
          this.thumbnail = result.data
        } else {
          throw new Error('Failed to extract frame')
        }
      } catch (error) {
        console.error('Detailed error in selectVideo:', error)
        this.thumbnail = null
      }
    },

    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },

    handleFieldPointSelected(pointData) {
      this.selectedFieldLine = null
      this.selectedFieldPoint = pointData
    },

    handleFieldLineSelected(lineData) {
      this.selectedFieldPoint = null
      this.selectedFieldLine = lineData
    },

    updateThumbnail(newThumbnail) {
      this.thumbnail = newThumbnail
    },

    updateCalibrationPoints(newPoints) {
      this.calibrationPoints = { ...newPoints }
    },

    updateCalibrationLines(newLines) {
      this.calibrationLines = { ...newLines }
    },

    updateSelectedFieldPoint(newPoint) {
      this.selectedFieldPoint = newPoint
    },

    updateSelectedFieldLine(newLine) {
      this.selectedFieldLine = newLine
      if (this.$refs.footballField) {
        this.$refs.footballField.selectedLine = newLine ? newLine.id : null
      }
    },

    async saveCalibration() {
      if (!this.selectedVideo || !this.outputFolder || Object.keys(this.calibrationLines).length === 0) {
        if (!this.outputFolder) {
          alert('Please select an output folder first')
        }
        return
      }

      const fieldKeypoints = this.$refs.footballField.keypoints
      
      if (!this.$refs.calibrationArea) {
        console.error('CalibrationArea component is not mounted.')
        return
      }

      const imageContainer = document.querySelector('.video-frame')
      const imageSize = this.$refs.calibrationArea.imageSize
      if (!imageSize) {
        console.error('Image size is not available.')
        return
      }
      const containerWidth = imageContainer.clientWidth
      const containerHeight = imageContainer.clientHeight

      const calibrationData = {
        metadata: {
          video_name: this.selectedVideo.name,
          video_path: this.selectedVideo.path,
          calibration_date: new Date().toISOString(),
          image_size: {
            width: imageSize.width,
            height: imageSize.height
          }
        },
        keypoints: {},
        lines: {},
        lines_normalized: {},
        field_dimensions: {
          width: 105,
          height: 68
        }
      }

      // Traitement des points de calibration
      for (const [index, point] of Object.entries(this.calibrationPoints)) {
        calibrationData.keypoints[index] = {
          image_coordinates: {
            x: Math.round(point.x * 100) / 100,
            y: Math.round(point.y * 100) / 100
          },
          field_coordinates: {
            x: Math.round(fieldKeypoints[index][0] * 100) / 100,
            y: Math.round(fieldKeypoints[index][1] * 100) / 100
          }
        }
      }

      // Traitement des lignes
      for (const [lineName, line] of Object.entries(this.calibrationLines)) {
        calibrationData.lines[lineName] = line.points.map(point => {
          return {
            x: point.x / containerWidth * imageSize.width,
            y: point.y / containerHeight * imageSize.height
          }
        })
        
        calibrationData.lines_normalized[lineName] = line.points.map(point => {
          return {
            x: point.x / containerWidth,
            y: point.y / containerHeight
          }
        })
      }

      try {
        const result = await window.electron.saveCalibration(
          this.selectedVideo.path,
          calibrationData,
          this.outputFolder
        )
        
        if (result.success) {
          alert('Calibration saved successfully!')
        }
      } catch (error) {
        console.error('Error during save:', error)
        alert('Error saving calibration')
      }
    }
  }
}
</script>

<style scoped>
.calibration {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  color: white;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.metadata-section {
  margin-bottom: 1rem;
}

.metadata-info {
  background-color: #2a2a2a;
  padding: 1rem;
  border-radius: 4px;
}

.video-display {
  flex: 1;
  display: flex;
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}

.calibration-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.field-container {
  flex: 1;
  min-width: 0;
  background-color: #1a1a1a;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}

.field-container :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
</style> 
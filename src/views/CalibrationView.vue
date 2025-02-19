<template>
  <div class="calibration">
    <div class="main-content">
      <VideoSidebar 
        :videos="videos"
        :selectedVideo="selectedVideo"
        :showSidebar="showSidebar"
        @video-selected="selectVideo"
        @toggle-sidebar="toggleSidebar"
      />

      <div class="content-area">
        <div class="metadata-section" v-if="selectedVideo">
          <h4>METADATA</h4>
          <div class="metadata-info">
            <p>nom: {{ selectedVideo.name }}</p>
            <p>session: {{ selectedVideo.session || 'nom_de_la_session' }}</p>
            <p>création: {{ new Date().toLocaleDateString() }}</p>
          </div>
        </div>

        <div class="video-display">
          <div class="calibration-container">
            <CalibrationArea
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

export default {
  name: 'CalibrationView',
  components: {
    VideoSidebar,
    CalibrationArea,
    FootballField
  },
  props: {
    folderPath: {
      type: String,
      required: true
    }
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
      selectedFieldLine: null
    }
  },
  async created() {
    if (this.folderPath) {
      await this.loadVideos()
    }
  },
  methods: {
    async loadVideos() {
      try {
        this.videos = await window.electron.getVideosFromFolder(this.folderPath)
        if (this.videos.length > 0) {
          await this.selectVideo(this.videos[0])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des vidéos:', error)
      }
    },

    async selectVideo(video) {
      this.selectedVideo = video
      this.thumbnail = null
      try {
        const response = await fetch(`http://localhost:8000/video/first-frame?video_path=${encodeURIComponent(video.path)}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de la frame');
        }
        const data = await response.json();
        this.thumbnail = data.data;
      } catch (error) {
        console.error('Erreur lors du chargement de la première frame:', error);
        this.thumbnail = null;
      }
    },

    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },

    handleFieldPointSelected(pointData) {
      this.selectedFieldLine = null;
      this.selectedFieldPoint = pointData;
    },

    handleFieldLineSelected(lineData) {
      this.selectedFieldPoint = null;
      this.selectedFieldLine = lineData;
    },

    updateThumbnail(newThumbnail) {
      this.thumbnail = newThumbnail;
    },

    updateCalibrationPoints(newPoints) {
      this.calibrationPoints = { ...newPoints };
    },

    updateCalibrationLines(newLines) {
      this.calibrationLines = { ...newLines };
    },

    updateSelectedFieldPoint(newPoint) {
      this.selectedFieldPoint = newPoint;
    },

    updateSelectedFieldLine(newLine) {
      this.selectedFieldLine = newLine;
      if (this.$refs.footballField) {
        this.$refs.footballField.selectedLine = newLine ? newLine.id : null;
      }
    },

    async saveCalibration() {
      if (!this.selectedVideo) return;

      const fieldKeypoints = this.$refs.footballField.keypoints;
      const calibrationData = {
        metadata: {
          video_name: this.selectedVideo.name,
          video_path: this.selectedVideo.path,
          calibration_date: new Date().toISOString(),
          total_keypoints: fieldKeypoints.length,
          positioned_keypoints: Object.keys(this.calibrationPoints).length,
        },
        keypoints: {},
        field_dimensions: {
          width: 105,
          height: 68
        }
      };

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
        };
      }

      try {
        const response = await fetch('http://localhost:8000/calibration/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_path: this.selectedVideo.path,
            calibration_data: calibrationData
          })
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la sauvegarde');
        }

        const result = await response.json();
        if (result.success) {
          alert('Calibration sauvegardée avec succès !');
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde de la calibration');
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
</style> 
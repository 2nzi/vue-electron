import { createRouter, createWebHashHistory } from 'vue-router'
import CalibrationView from '../views/CalibrationView.vue'
import SegmentationView from '../views/SegmentationView.vue'

const routes = [
  {
    path: '/',
    redirect: '/segmentation'
  },
  {
    path: '/calibration',
    name: 'calibration',
    component: CalibrationView
  },
  {
    path: '/segmentation',
    name: 'segmentation',
    component: SegmentationView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 
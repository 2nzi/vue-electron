import { createRouter, createWebHashHistory } from 'vue-router'
import CalibrationView from '../views/CalibrationView.vue'

const routes = [
  {
    path: '/',
    name: 'calibration',
    component: CalibrationView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 
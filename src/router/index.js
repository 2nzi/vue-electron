import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CalibrationView from '../views/CalibrationView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/calibration/:folderPath',
    name: 'calibration',
    component: CalibrationView,
    props: route => ({ 
      folderPath: decodeURIComponent(route.params.folderPath)
    })
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 
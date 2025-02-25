/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/preload.js":
/*!************************!*\
  !*** ./src/preload.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const { contextBridge, ipcRenderer } = __webpack_require__(/*! electron */ \"electron\")\r\n\r\ncontextBridge.exposeInMainWorld('electron', {\r\n  openDirectory: async () => {\r\n    try {\r\n      return await ipcRenderer.invoke('dialog:openDirectory')\r\n    } catch (error) {\r\n      console.error('Erreur lors de l\\'ouverture du dossier:', error)\r\n      throw error\r\n    }\r\n  },\r\n  getVideosFromFolder: async (folderPath) => {\r\n    try {\r\n      return await ipcRenderer.invoke('folder:getVideos', folderPath)\r\n    } catch (error) {\r\n      console.error('Erreur lors de la lecture du dossier:', error)\r\n      throw error\r\n    }\r\n  },\r\n  getVideoThumbnail: async (videoPath) => {\r\n    try {\r\n      return await ipcRenderer.invoke('video:getThumbnail', videoPath)\r\n    } catch (error) {\r\n      console.error('Erreur lors de la génération de la miniature:', error)\r\n      throw error\r\n    }\r\n  },\r\n  getFirstFrame: async (videoPath) => {\r\n    try {\r\n      const response = await fetch(`http://localhost:8000/video/first-frame?video_path=${encodeURIComponent(videoPath)}`);\r\n      if (!response.ok) {\r\n        throw new Error('Erreur lors de la récupération de la frame');\r\n      }\r\n      const data = await response.json();\r\n      return data.data; // Retourne l'image en base64\r\n    } catch (error) {\r\n      console.error('Erreur:', error);\r\n      throw error;\r\n    }\r\n  },\r\n  saveCalibration: async (data) => {\r\n    try {\r\n      return await ipcRenderer.invoke('calibration:save', data)\r\n    } catch (error) {\r\n      console.error('Erreur lors de la sauvegarde de la calibration:', error)\r\n      throw error\r\n    }\r\n  }\r\n}) \n\n//# sourceURL=webpack:///./src/preload.js?");

/***/ }),

/***/ 0:
/*!******************************!*\
  !*** multi ./src/preload.js ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("module.exports = __webpack_require__(/*! C:\\Users\\antoi\\Documents\\Work_Learn\\Stage-Rennes\\RepositoryFootballVision\\AntoineVerdon\\Software\\vue-electron\\src\\preload.js */\"./src/preload.js\");\n\n\n//# sourceURL=webpack:///multi_./src/preload.js?");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = require(\"electron\");\n\n//# sourceURL=webpack:///external_%22electron%22?");

/***/ })

/******/ });
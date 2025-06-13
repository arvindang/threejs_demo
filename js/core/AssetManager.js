/* ---------- Asset Management ---------- */
export class AssetManager {
  constructor() {
    this.models3D = new Map();
    this.contentAssets = new Map();
    this.fileGroups = new Map(); // Store related files for GLTF models
    this.currentModel = null;
    this.currentContent = null;
  }

  addModel(file, id = null) {
    console.log('AssetManager.addModel called with:', file.name);
    const modelId = id || `model_${Date.now()}`;
    
    // Check if this is part of a GLTF file group
    const baseName = this.getBaseName(file.name);
    const extension = this.getFileExtension(file.name);
    const modelType = this.getModelType(file.name);
    
    let modelData;
    
    if (extension === 'gltf') {
      // For GLTF files, we need to create a file group
      modelData = {
        id: modelId,
        name: file.name,
        baseName: baseName,
        mainFile: file,
        relatedFiles: new Map(),
        url: null, // Will be set when all files are ready
        type: file.type,
        size: file.size,
        modelType: modelType,
        isGLTF: true
      };
      
      // Store the group for this basename
      this.fileGroups.set(baseName, modelData);
    } else {
      // For standalone files (GLB, FBX, OBJ, PLY, STL), create blob URL directly
      const url = URL.createObjectURL(file);
      modelData = {
        id: modelId,
        name: file.name,
        file: file,
        url: url,
        type: file.type,
        size: file.size,
        modelType: modelType,
        isGLTF: false
      };
    }
    
    this.models3D.set(modelId, modelData);
    console.log('Model stored in AssetManager:', modelId, this.models3D.size, 'total models');
    
    this.updateModelsUI();
    console.log('UI updated for models');
    return modelId;
  }

  // Handle related files for GLTF models (bin, textures, etc.)
  addRelatedFile(file) {
    const baseName = this.getBaseName(file.name);
    const extension = this.getFileExtension(file.name);
    
    // Find the GLTF model this file belongs to
    const group = this.fileGroups.get(baseName);
    if (group) {
      console.log(`Adding related file ${file.name} to GLTF group ${baseName}`);
      group.relatedFiles.set(file.name, file);
      group.size += file.size;
      
      // Update the model in the main collection
      const model = this.models3D.get(group.id);
      if (model) {
        model.relatedFiles = group.relatedFiles;
        model.size = group.size;
        this.setupGLTFLoader(model);
      }
      
      this.updateModelsUI();
      return true;
    }
    
    return false;
  }

  // Setup custom loader for GLTF with dependencies
  setupGLTFLoader(modelData) {
    if (!modelData.isGLTF) return;
    
    console.log('Setting up GLTF loader for:', modelData.name);
    
    // Create object URLs for all files
    const fileMap = new Map();
    fileMap.set(modelData.name, URL.createObjectURL(modelData.mainFile));
    
    modelData.relatedFiles.forEach((file, filename) => {
      fileMap.set(filename, URL.createObjectURL(file));
    });
    
    // Create a custom manager to handle file loading
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      // Extract filename from URL
      const filename = url.split('/').pop();
      const objectURL = fileMap.get(filename);
      
      if (objectURL) {
        console.log(`Redirecting ${filename} to blob URL`);
        return objectURL;
      }
      
      console.warn(`File not found in group: ${filename}`);
      return url;
    });
    
    modelData.customManager = manager;
    modelData.fileMap = fileMap;
  }

  getBaseName(filename) {
    return filename.replace(/\.[^/.]+$/, "");
  }

  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  getModelType(filename) {
    const extension = this.getFileExtension(filename);
    switch (extension) {
      case 'glb':
        return 'glb';
      case 'gltf':
        return 'gltf';
      case 'fbx':
        return 'fbx';
      case 'obj':
        return 'obj';
      case 'ply':
        return 'ply';
      case 'stl':
        return 'stl';
      default:
        return 'unknown';
    }
  }

  addContent(file, id = null) {
    const contentId = id || `content_${Date.now()}`;
    const url = URL.createObjectURL(file);
    
    this.contentAssets.set(contentId, {
      id: contentId,
      name: file.name,
      file: file,
      url: url,
      type: file.type,
      size: file.size
    });
    
    this.updateContentUI();
    return contentId;
  }

  loadModel(modelId) {
    const model = this.models3D.get(modelId);
    if (model) {
      this.currentModel = modelId;
      
      // Import viewer3D globally - this will be set by main.js
      const viewer3D = window.viewer3D;
      
      if (model.isGLTF) {
        // For GLTF files, create URL and pass custom manager
        if (!model.url) {
          model.url = URL.createObjectURL(model.mainFile);
        }
        viewer3D.loadGLTFModel(model.url, model.name, model.customManager);
      } else {
        // For other file types, call the appropriate loader method
        switch (model.modelType) {
          case 'glb':
            viewer3D.loadModel(model.url, model.name);
            break;
          case 'fbx':
            viewer3D.loadFBXModel(model.url, model.name);
            break;
          case 'obj':
            viewer3D.loadOBJModel(model.url, model.name);
            break;
          case 'ply':
            viewer3D.loadPLYModel(model.url, model.name);
            break;
          case 'stl':
            viewer3D.loadSTLModel(model.url, model.name);
            break;
          default:
            console.warn('Unknown model type:', model.modelType, 'falling back to GLB loader');
            viewer3D.loadModel(model.url, model.name);
        }
      }
      
      this.updateModelsUI();
    }
  }

  loadContent(contentId) {
    const content = this.contentAssets.get(contentId);
    if (content) {
      this.currentContent = contentId;
      
      // Import contentViewer globally - this will be set by main.js
      const contentViewer = window.contentViewer;
      contentViewer.loadContent(content);
      this.updateContentUI();
    }
  }

  deleteModel(modelId) {
    const model = this.models3D.get(modelId);
    if (model) {
      URL.revokeObjectURL(model.url);
      this.models3D.delete(modelId);
      if (this.currentModel === modelId) {
        this.currentModel = null;
        window.viewer3D.clearModel();
      }
      this.updateModelsUI();
    }
  }

  deleteContent(contentId) {
    const content = this.contentAssets.get(contentId);
    if (content) {
      URL.revokeObjectURL(content.url);
      this.contentAssets.delete(contentId);
      if (this.currentContent === contentId) {
        this.currentContent = null;
        window.contentViewer.clearContent();
      }
      this.updateContentUI();
    }
  }

  // Get asset by ID (for recording playback)
  getAssetById(assetId) {
    // Check 3D models first
    const model = this.models3D.get(assetId);
    if (model) {
      return model;
    }
    
    // Check content assets
    const content = this.contentAssets.get(assetId);
    if (content) {
      return content;
    }
    
    return null;
  }

  // Get currently loaded 3D asset (for recording)
  get currentAsset3D() {
    if (this.currentModel) {
      return this.models3D.get(this.currentModel);
    }
    return null;
  }

  // Get currently loaded content asset (for recording)
  get currentAssetContent() {
    if (this.currentContent) {
      return this.contentAssets.get(this.currentContent);
    }
    return null;
  }

  updateModelsUI() {
    console.log('updateModelsUI called, models count:', this.models3D.size);
    const modelsList = document.getElementById('modelsList');
    
    if (!modelsList) {
      console.error('modelsList element not found!');
      return;
    }
    
    if (this.models3D.size === 0) {
      console.log('No models to display, showing empty state');
      modelsList.innerHTML = '<div class="text-muted small text-center py-3">No models uploaded yet</div>';
      return;
    }

    console.log('Building UI for', this.models3D.size, 'models');
    modelsList.innerHTML = '';
    this.models3D.forEach((model, id) => {
      console.log('Creating UI for model:', id, model.name);
      const item = document.createElement('div');
      item.className = `asset-item p-2 mb-2 rounded border ${this.currentModel === id ? 'active' : ''}`;
      
      // Build file info display
      let fileInfo = `<div class="fw-semibold small">${model.name}</div>`;
      
      if (model.isGLTF && model.relatedFiles && model.relatedFiles.size > 0) {
        fileInfo += `<div class="text-muted" style="font-size: 0.7rem;">+ ${model.relatedFiles.size} related files</div>`;
      }
      
      fileInfo += `<div class="text-muted" style="font-size: 0.75rem;">${this.formatFileSize(model.size)}</div>`;
      
      // Add warning for incomplete GLTF files
      const isIncomplete = model.isGLTF && (!model.relatedFiles || model.relatedFiles.size === 0);
      const warningIcon = isIncomplete ? '<i class="bi bi-exclamation-triangle text-warning me-1" title="GLTF may be missing related files"></i>' : '';
      
      item.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
          <div class="flex-grow-1 model-item-content" data-model-id="${id}" style="cursor: pointer;">
            ${warningIcon}${fileInfo}
          </div>
          <button class="btn btn-sm btn-outline-danger model-delete-btn" data-model-id="${id}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      
      // Add event listeners
      const contentDiv = item.querySelector('.model-item-content');
      const deleteBtn = item.querySelector('.model-delete-btn');
      
      contentDiv.addEventListener('click', () => this.loadModel(id));
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteModel(id);
      });
      
      modelsList.appendChild(item);
      console.log('Model UI item added to DOM');
    });
    console.log('updateModelsUI completed');
  }

  updateContentUI() {
    const contentList = document.getElementById('contentList');
    
    if (this.contentAssets.size === 0) {
      contentList.innerHTML = '<div class="text-muted small text-center py-3">No content uploaded yet</div>';
      return;
    }

    contentList.innerHTML = '';
    this.contentAssets.forEach((content, id) => {
      const item = document.createElement('div');
      item.className = `asset-item p-2 mb-2 rounded border ${this.currentContent === id ? 'active' : ''}`;
      
      const icon = this.getFileIcon(content.type);
      item.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
          <div class="flex-grow-1 content-item-content" data-content-id="${id}" style="cursor: pointer;">
            <div class="d-flex align-items-center">
              <i class="bi ${icon} me-2"></i>
              <div>
                <div class="fw-semibold small">${content.name}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${this.formatFileSize(content.size)}</div>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-danger content-delete-btn" data-content-id="${id}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      
      // Add event listeners
      const contentDiv = item.querySelector('.content-item-content');
      const deleteBtn = item.querySelector('.content-delete-btn');
      
      contentDiv.addEventListener('click', () => this.loadContent(id));
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteContent(id);
      });
      
      contentList.appendChild(item);
    });
  }

  getFileIcon(type) {
    if (type.includes('pdf')) return 'bi-file-pdf';
    if (type.includes('image')) return 'bi-file-image';
    return 'bi-file-earmark';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 
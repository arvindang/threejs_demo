/* ---------- Drag and Drop Handler ---------- */
export class DragDropHandler {
  constructor() {
    this.setupDropZones();
  }

  setupDropZones() {
    // 3D Models drop zone
    const modelsDropZone = document.getElementById('modelsDropZone');
    const modelsFileInput = document.getElementById('modelsFileInput');
    
    this.setupDropZone(modelsDropZone, modelsFileInput, (files) => {
      this.handleModelFiles(files);
    }, ['.glb', '.gltf', '.fbx', '.obj', '.ply', '.stl']);

    // Content drop zone
    const contentDropZone = document.getElementById('contentDropZone');
    const contentFileInput = document.getElementById('contentFileInput');
    
    this.setupDropZone(contentDropZone, contentFileInput, (files) => {
      this.handleContentFiles(files);
    }, ['.pdf', '.png', '.jpg', '.jpeg']);
  }

  setupDropZone(dropZone, fileInput, onFiles, acceptedTypes) {
    // Drag events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => 
        acceptedTypes.some(type => file.name.toLowerCase().endsWith(type))
      );
      
      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      onFiles(files);
      e.target.value = ''; // Reset input
    });
  }

  handleModelFiles(files) {
    console.log('handleModelFiles called with:', files.length, 'files');
    
    // First pass: identify GLTF files and related files
    const gltfFiles = [];
    const relatedFiles = [];
    const standaloneFiles = [];
    
    files.forEach(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (extension === 'gltf') {
        gltfFiles.push(file);
      } else if (['glb', 'fbx', 'obj', 'ply', 'stl'].includes(extension)) {
        standaloneFiles.push(file);
      } else if (['bin', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(extension)) {
        relatedFiles.push(file);
      } else {
        console.warn('Unknown file type for 3D model:', file.name);
        standaloneFiles.push(file); // Try to load anyway
      }
    });
    
    // Process standalone files (GLB, etc.)
    standaloneFiles.forEach(file => {
      console.log('Processing standalone model file:', file.name, file.type, file.size);
      try {
        const modelId = assetManager.addModel(file);
        console.log('Added standalone model with ID:', modelId);
        // Auto-load the first model if none is currently loaded
        if (!assetManager.currentModel) {
          console.log('Auto-loading model:', modelId);
          assetManager.loadModel(modelId);
        }
      } catch (error) {
        console.error('Error handling standalone model file:', error);
      }
    });
    
    // Process GLTF files
    gltfFiles.forEach(file => {
      console.log('Processing GLTF model file:', file.name, file.type, file.size);
      try {
        const modelId = assetManager.addModel(file);
        console.log('Added GLTF model with ID:', modelId);
        
        // Auto-load the first model if none is currently loaded
        if (!assetManager.currentModel) {
          console.log('Auto-loading GLTF model:', modelId);
          assetManager.loadModel(modelId);
        }
      } catch (error) {
        console.error('Error handling GLTF model file:', error);
      }
    });
    
    // Process related files and try to match them to GLTF models
    relatedFiles.forEach(file => {
      console.log('Processing related file:', file.name, file.type, file.size);
      try {
        const wasAdded = assetManager.addRelatedFile(file);
        if (!wasAdded) {
          console.warn('Could not match related file to any GLTF model:', file.name);
          // Could potentially treat as a standalone model or texture
        }
      } catch (error) {
        console.error('Error handling related file:', error);
      }
    });
  }

  handleContentFiles(files) {
    console.log('handleContentFiles called with:', files.length, 'files');
    files.forEach(file => {
      console.log('Processing content file:', file.name, file.type, file.size);
      try {
        const contentId = assetManager.addContent(file);
        console.log('Added content with ID:', contentId);
        // Auto-load the first content if none is currently loaded
        if (!assetManager.currentContent) {
          console.log('Auto-loading content:', contentId);
          assetManager.loadContent(contentId);
        }
      } catch (error) {
        console.error('Error handling content file:', error);
      }
    });
  }
} 
# Interactive 3D Learning Platform

A prototype for creating synchronized lessons that combine 3D models with traditional educational content (PDFs, images) while recording instructor interactions for student playback.

## 🎯 Vision

This platform enables instructors to create the "textbook of the future" for medical and engineering education by synchronizing 3D model interactions with traditional content, guided by instructor narration.

## ✨ Features

### Two-Pane Layout
- **Left Pane**: 3D model viewer with interactive controls
- **Right Pane**: Content viewer supporting PDF and image files
- **Collapsible Drawers**: Asset management for both 3D models and content

### File Management
- **Drag & Drop**: Upload 3D models (GLB/GLTF) and content (PDF/PNG/JPG)
- **Asset Library**: Manage multiple files with easy switching
- **Local Storage**: Files persist in browser session

### 3D Viewer
- **Model Loading**: Support for GLB and GLTF files
- **Interactive Controls**: Explode view, slice view, part isolation
- **Object Selection**: Click to focus on individual parts
- **Smooth Animations**: GSAP-powered camera transitions

### Content Viewer
- **PDF Support**: Full PDF viewing with page navigation and zoom
- **Image Support**: Display PNG, JPG images with zoom controls
- **Navigation**: Page controls for multi-page documents

### Recording System
- **Audio Recording**: Capture instructor narration
- **Interaction Tracking**: Record 3D manipulations and content navigation
- **Synchronized Playback**: Replay lessons with perfect timing

## 🚀 Quick Start

1. **Start the server**:
   ```bash
   npm install
   node server.js
   ```

2. **Open your browser** to `http://localhost:3000`

3. **Upload content**:
   - Drag 3D models (GLB/GLTF) to the left drawer
   - Drag content files (PDF/PNG/JPG) to the right drawer

4. **Create a lesson**:
   - Load a 3D model and content file
   - Click record and start teaching
   - Interact with both the 3D model and content
   - Stop recording when finished

5. **Playback**:
   - Click play to review your recorded lesson

## 📁 Project Structure

```
threejs_demo/
├── index.html          # Two-pane UI layout
├── viewer.js           # Core application logic
├── style.css           # Custom styles
├── server.js           # Development server
├── package.json        # Dependencies
├── README.md           # This file
├── todo.md             # Development roadmap
└── claude.md           # Technical documentation
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **3D Engine**: Three.js v0.164.0
- **PDF Viewer**: PDF.js (Mozilla)
- **UI Framework**: Bootstrap 5
- **Animations**: GSAP
- **File Handling**: HTML5 File API with drag-and-drop

## 🎮 Usage Guide

### Uploading Files
1. **3D Models**: Drag GLB or GLTF files to the left drawer or click "Browse Files"
2. **Content**: Drag PDF, PNG, or JPG files to the right drawer or click "Browse Files"

### 3D Interaction
- **Rotate**: Click and drag to orbit around the model
- **Zoom**: Scroll wheel to zoom in/out
- **Select Parts**: Click on model parts to focus and isolate
- **Explode View**: Use the GUI slider to separate parts
- **Slice View**: Use the GUI slider to cut through the model

### Content Navigation
- **PDF Files**: Use page navigation buttons and zoom controls
- **Images**: Use zoom controls to examine details

### Recording Lessons
1. Set up your 3D model and content
2. Click the red record button
3. Narrate while interacting with both panes
4. Click stop when finished
5. Use play button to review

## 🔧 Development

### Current Status
- ✅ Two-pane layout with collapsible drawers
- ✅ Drag-and-drop file upload
- ✅ 3D model loading and interaction
- ✅ PDF and image viewing
- ✅ Basic recording and playback
- ✅ Asset management system

### Next Steps
See `todo.md` for detailed development roadmap including:
- Enhanced recording with state synchronization
- Improved 3D selection sensitivity
- Mobile responsiveness
- Advanced annotation tools

## 🎯 Target Use Cases

- **Medical Education**: Anatomy lessons with 3D organs and textbook diagrams
- **Engineering**: Mechanical assemblies with technical drawings
- **Architecture**: Building models with floor plans and specifications
- **Science**: Molecular structures with research papers

## 📖 Documentation

- **Technical Guide**: See `claude.md` for detailed architecture and development patterns
- **Development Roadmap**: See `todo.md` for planned features and priorities

## 🤝 Contributing

This is a prototype project. For development guidelines and architecture details, see `claude.md`.

## 📄 License

MIT License - see LICENSE file for details.

---

**Note**: This is a proof-of-concept focused on Chrome desktop. For production use, additional browser compatibility and mobile support would be needed.

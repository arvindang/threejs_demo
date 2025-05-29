# Claude Development Guide - Interactive 3D Learning Platform

## 🎯 Project Overview & Vision

This is a prototype for an interactive 3D learning platform - the "textbook of the future" for medical and engineering education. The goal is to enable instructors to create synchronized lessons combining 3D models with traditional content (PDFs, slides, images) while recording their interactions for student playback.

### Core Hypothesis
Students learn spatial and mechanical concepts better when they can see 3D models manipulated in sync with traditional educational content, especially when guided by instructor narration and interaction.

## 🏗️ Current Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6 modules), Three.js, Bootstrap 5
- **3D Engine**: Three.js v0.164.0 with GLTFLoader, OrbitControls
- **Backend**: Simple Node.js static server (development only)
- **Storage**: Browser localStorage/IndexedDB (planned)
- **File Formats**: GLB/GLTF for 3D, PDF/PPT/PNG for content

### File Structure
```
threejs_demo/
├── index.html          # Main UI layout
├── viewer.js           # Core 3D viewer and interaction logic
├── style.css           # Minimal custom styles
├── server.js           # Development server
├── package.json        # Dependencies
├── README.md           # Project documentation
├── todo.md             # Development roadmap
└── claude.md           # This file - technical guidance
```

### Key Components

#### 1. 3D Viewer (`viewer.js`)
- **Scene Setup**: Three.js scene with proper lighting and shadows
- **Model Loading**: GLTFLoader for 3D assets from URLs or files
- **Interaction**: Raycasting for object selection, OrbitControls for navigation
- **Features**: Explode view, slice view, object isolation/focus
- **Recording**: Captures camera state, interactions, and audio

#### 2. UI Layout (`index.html`)
- **Current**: Single-pane 3D viewer with recording controls
- **Planned**: Two-pane layout (3D | Content) with collapsible drawers

#### 3. Recording System
- **Audio**: MediaRecorder API for voice capture
- **Interactions**: Custom event tracking for 3D manipulations
- **Playback**: Synchronized audio and visual state restoration
- **Storage**: JSON format for interaction events

## 🔧 Technical Implementation Details

### 3D Object Management
```javascript
// Current object isolation system
function focusOnPart(selectedMesh) {
  // Issues: Too sensitive, poor centering
  // Needs: Click threshold, better camera positioning
}
```

**Known Issues:**
- Object selection is overly sensitive (single click isolates)
- Camera centering on focused objects is imprecise

**Recommended Fixes:**
1. Implement double click to select and isolate object
4. Add visual hover states before selection

### Recording Architecture
```javascript
// Current recording state structure
let recordedEvents = [
  {
    timestamp: 1234567890,
    type: 'camera_change',
    data: { position: [x,y,z], target: [x,y,z] }
  },
  {
    timestamp: 1234567891,
    type: 'object_focus',
    data: { objectId: 'gear_1', action: 'isolate' }
  }
];
```

**Needs Enhancement:**
- Add content pane state tracking
- Improve timestamp precision
- Handle asset switching during recording
- Better error recovery for interrupted recordings

### File Upload Strategy
**Current**: Hardcoded GLB URL from Khronos samples
**Planned**: Multi-file drag-and-drop with local storage

**Implementation Approach:**
1. Use HTML5 File API for drag-and-drop
2. Store files in IndexedDB for persistence
3. Generate object URLs for Three.js loading
4. Implement file validation and size limits

## 🎨 UI/UX Design Principles

### Two-Pane Layout Design
```
┌─────────────────────────────────────────────────────────┐
│ Header: Lesson Title, Author, Description              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ │ ┌─────────────────────────────────┐ │
│ │ 3D Models       │ │ │ Content Assets                  │ │
│ │ ├─ Model 1      │ │ │ ├─ Presentation.pdf             │ │
│ │ ├─ Model 2      │ │ │ ├─ Diagram.png                  │ │
│ │ └─ Model 3      │ │ │ └─ Notes.ppt                    │ │
│ └─────────────────┘ │ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                3D Viewer                              │ │
│ │                                                       │ │
│ │                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                Content Viewer                         │ │
│ │                (PDF/Image/Slides)                     │ │
│ │                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Recording Controls: ● ■ ▶ ⏸ ═══════════════ 00:00      │
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
- **Desktop**: Side-by-side panes (50/50 split), drawers are collapsable to display and allow selection between 3D Models and Content Assets
- **Tablet**: Stacked panes with tabs
- **Mobile**: Single pane with swipe navigation

## 🔍 Development Patterns & Best Practices

### Code Organization
```javascript
// Recommended module structure
class AssetManager {
  constructor() {
    this.assets3D = new Map();
    this.assetsContent = new Map();
  }
  
  async uploadAsset(file, type) { /* ... */ }
  getAsset(id) { /* ... */ }
  deleteAsset(id) { /* ... */ }
}

class RecordingManager {
  constructor(viewer3D, contentViewer) {
    this.viewer3D = viewer3D;
    this.contentViewer = contentViewer;
  }
  
  startRecording() { /* ... */ }
  captureState() { /* ... */ }
  playback() { /* ... */ }
}
```

### Error Handling Strategy
```javascript
// Implement graceful degradation
try {
  await loadGLTFModel(url);
} catch (error) {
  console.error('Model loading failed:', error);
  showFallbackContent();
  notifyUser('Model could not be loaded. Please try a different file.');
}
```

## 🚀 Deployment Considerations

### Current Setup
- Development server only (`node server.js`)
- No build process or optimization
- Static file serving
- Keep this a simple proof of concept, it's okay to dummy content 

### Production Recommendations
1. **Build Process**: Webpack/Vite for bundling and optimization
2. **CDN**: Serve Three.js and other libraries from CDN
3. **Compression**: Gzip/Brotli for assets
4. **Caching**: Proper cache headers for static assets
5. **HTTPS**: Required for MediaRecorder API

## 🔮 Future Architecture Decisions

### Backend Integration (Phase 2)
When moving beyond static frontend:
- **File Storage**: AWS S3, Google Cloud Storage, or similar
- **Database**: PostgreSQL for metadata, Redis for sessions
- **API**: RESTful or GraphQL for asset management
- **Authentication**: OAuth2 for user management

### AI Integration (Phase 3)
- **Transcription**: OpenAI Whisper API or Azure Speech Services
- **Vector Database**: Pinecone, Weaviate, or Chroma for RAG
- **LLM Integration**: OpenAI GPT-4 or Claude for content analysis

### Scalability Considerations
- **CDN**: CloudFront or CloudFlare for global asset delivery
- **Streaming**: For large 3D models and long recordings
- **Real-time**: WebRTC for live collaborative sessions

## 🐛 Known Issues & Workarounds

### Current Bugs
1. **Selection Sensitivity**: Objects isolate on single click
   - **Workaround**: Use double-click detection
   - **Fix**: Implement click threshold and confirmation

2. **Camera Centering**: Focused objects not properly centered
   - **Workaround**: Manual camera adjustment
   - **Fix**: Calculate bounding box and optimal camera position

3. **Recording Sync**: Audio and visual state can drift
   - **Workaround**: Use high-frequency timestamps
   - **Fix**: Implement frame-accurate synchronization

### Browser Compatibility
- **Safari**: WebGL performance issues with complex models
- **Firefox**: MediaRecorder API limitations
- **Mobile**: Touch gesture conflicts with OrbitControls

## 📚 Learning Resources

### Three.js Documentation
- [Official Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Three.js Fundamentals](https://threejsfundamentals.org/)

### WebGL & 3D Graphics
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [Real-Time Rendering](http://www.realtimerendering.com/)

### Educational Technology
- [Cognitive Load Theory](https://en.wikipedia.org/wiki/Cognitive_load_theory)
- [Universal Design for Learning](https://www.cast.org/impact/universal-design-for-learning-udl)

## 🤝 Collaboration Guidelines

### When Working with Claude
1. **Provide Context**: Always reference this file and current todo.md
2. **Specify Scope**: Be clear about which phase/feature you're working on
3. **Share Code**: Include relevant code snippets for context
4. **Test Incrementally**: Implement and test small changes first

### Code Review Checklist
- [ ] Follows existing code patterns and style
- [ ] Includes error handling and edge cases
- [ ] Performance impact considered
- [ ] Accessibility requirements met
- [ ] Cross-browser compatibility verified
- [ ] Documentation updated if needed

### Git Workflow
```bash
# Feature development
git checkout -b feature/two-pane-layout
git commit -m "feat: implement split-screen layout"
git push origin feature/two-pane-layout

# Bug fixes
git checkout -b fix/selection-sensitivity
git commit -m "fix: add double-click threshold for object selection"
```

---

## 📞 Quick Reference

### Key Files to Modify
- `index.html` - UI layout and structure
- `viewer.js` - 3D functionality and interactions
- `style.css` - Custom styling (minimal)
- `package.json` - Dependencies

### Important Functions
- `focusOnPart()` - Object isolation (needs fixing)
- `startRecording()` - Begin capture session
- `captureState()` - Record current state
- `playRecording()` - Playback recorded session

### External Dependencies
- Three.js v0.164.0
- Bootstrap 5.3.3
- lil-gui (controls)
- GSAP (animations)

### Browser APIs Used
- MediaRecorder (audio recording)
- File API (file uploads - planned)
- IndexedDB (storage - planned)
- WebGL (3D rendering) 
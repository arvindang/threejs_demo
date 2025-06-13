# 🎉 Interactive 3D Learning Platform Demo

The server is running at **http://localhost:3000**

## What You Can Do Now:

### 1. **Upload 3D Models** 
- Drag 3D model files to the left drawer: **GLB, GLTF, FBX, OBJ, PLY, STL**
- Try the sample gearbox model that loads automatically
- Click on parts to focus and isolate them
- Use explode and slice controls

### 2. **Upload Content**
- Drag PDF, PNG, or JPG files to the right drawer
- Navigate through PDF pages with controls
- Zoom in and out on content
- Switch between different uploaded files

### 3. **Record Lessons**
- Click the red record button in the header
- Interact with both the 3D model and content
- Narrate your lesson while manipulating objects
- Stop recording and play back your lesson

### 4. **Explore Features**
- **Collapsible Drawers**: Toggle asset panels on/off
- **Asset Management**: Upload, switch, and delete files
- **3D Interactions**: Rotate, zoom, explode, slice, focus
- **Content Navigation**: Page controls, zoom, pan

## Test Files You Can Use:

### 3D Models (GLB/GLTF/FBX/OBJ/PLY/STL)
- **GLB/GLTF**: Download from [Sketchfab](https://sketchfab.com/3d-models?features=downloadable&sort_by=-likeCount) or [Khronos Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models)
- **FBX**: From Autodesk Maya, 3ds Max, or Blender exports
- **OBJ**: Universal format from any 3D software
- **PLY/STL**: Great for 3D scanned models and 3D printing files

### Content Files
- **PDFs**: Any PDF document, technical manuals, textbooks
- **Images**: PNG or JPG files, diagrams, charts, photos

## Getting Started:

0. ``` npm start ```
1. **Open** http://localhost:3000 in Chrome
2. **Upload** a 3D model to the left drawer
3. **Upload** a PDF or image to the right drawer
4. **Click Record** and start teaching!
5. **Interact** with both panes while narrating
6. **Stop** and **Play** to review your lesson

## Current Features ✅

- ✅ Two-pane layout with collapsible drawers
- ✅ Drag-and-drop file upload
- ✅ 3D model loading and interaction
- ✅ PDF viewing with navigation
- ✅ Image viewing with zoom
- ✅ Basic recording and playback
- ✅ Asset management system

## Coming Soon 🚀

- Enhanced 3D selection sensitivity
- PowerPoint support
- Synchronized recording of both panes
- Annotation and pointer tools
- Mobile responsiveness

## Need Help?
- See `todo.md` for development roadmap
- Review `claude.md` for technical details

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **3D Engine**: Three.js v0.164.0
- **PDF Viewer**: PDF.js (Mozilla)
- **UI Framework**: Bootstrap 5
- **Animations**: GSAP
- **File Handling**: HTML5 File API with drag-and-drop

## 🎯 Target Use Cases

- **Medical Education**: Anatomy lessons with 3D organs and textbook diagrams
- **Engineering**: Mechanical assemblies with technical drawings
- **Architecture**: Building models with floor plans and specifications
- **Science**: Molecular structures with research papers

**Happy Learning!** 🎓 
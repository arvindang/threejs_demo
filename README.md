# 3D Object Manipulation Prototype

A simple prototype for a lesson with a 3D object that allows the user to manipulate the object: zoom, pan, explode and slice.

## Features
- Orbit controls (pan, zoom, rotate)
- Explode view slider
- Slice view slider
- Reset button to restore default state

## Setup and Running

### Option 1: Using a local server (recommended)
1. Make sure you have Node.js installed
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   
   or
   
   npx serve .

   ```
4. Open your browser and navigate to http://localhost:3000

### Option 2: Using a simple HTTP server alternative
If you don't want to use Node.js, you can use any of these alternatives:

#### Python
```
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```

#### VS Code
Use the "Live Server" extension to serve the files.

## Note About CORS
This prototype uses CDN resources and loads a 3D model from GitHub. These resources have CORS restrictions, which means you **cannot** simply open the HTML file directly in a browser. You must use a local server as described above. 
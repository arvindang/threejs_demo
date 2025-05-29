/* ---------- Content Viewer Class ---------- */
export class ContentViewer {
  constructor() {
    this.currentContent = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.zoomLevel = 1;
    this.baseZoomLevel = 1; // Add base zoom level for auto-fit
    this.pdfDoc = null;
    
    this.setupEventListeners();
    this.setupResizeObserver();
  }

  setupEventListeners() {
    document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
    document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
    document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
  }

  setupResizeObserver() {
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target.classList.contains('content-viewer-pane')) {
            // Debounce resize calls to avoid excessive refitting
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
              this.onResize();
            }, 150);
          }
        }
      });
      
      const contentPane = document.querySelector('.content-viewer-pane');
      if (contentPane) {
        this.resizeObserver.observe(contentPane);
      }
    }
  }

  async loadContent(content) {
    this.currentContent = content;
    this.hideAllViewers();
    
    if (content.type.includes('pdf')) {
      await this.loadPDF(content.url);
    } else if (content.type.includes('image')) {
      this.loadImage(content.url);
    } else {
      this.showUnsupportedViewer();
    }
  }

  async loadPDF(url) {
    try {
      // Import PDF.js
      const pdfjsLib = await import('https://unpkg.com/pdfjs-dist@latest/build/pdf.min.mjs');
      
      // Set worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs';
      
      const loadingTask = pdfjsLib.getDocument(url);
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;
      
      // Calculate base zoom to fit container width
      await this.calculateBaseZoom();
      
      await this.renderPDFPage(this.currentPage);
      this.showPDFViewer();
      this.updateNavigation();
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showUnsupportedViewer();
    }
  }

  async calculateBaseZoom() {
    if (!this.pdfDoc) return;
    
    const page = await this.pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Get the container width (accounting for padding and margins)
    const pdfViewer = document.getElementById('pdfViewer');
    const containerWidth = pdfViewer.getBoundingClientRect().width - 40; // 20px padding on each side
    
    // Calculate scale to fit width
    this.baseZoomLevel = Math.min(containerWidth / viewport.width, 1.0); // Never scale up beyond 100%
    this.zoomLevel = this.baseZoomLevel;
    
    console.log(`PDF auto-fit: container width: ${containerWidth}px, page width: ${viewport.width}px, scale: ${this.baseZoomLevel.toFixed(2)}`);
  }

  async renderPDFPage(pageNum) {
    if (!this.pdfDoc) return;
    
    const page = await this.pdfDoc.getPage(pageNum);
    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale: this.zoomLevel });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Add some styling to the canvas for better presentation
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.border = '1px solid #dee2e6';
    canvas.style.borderRadius = '4px';
    canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
  }

  loadImage(url) {
    const img = document.getElementById('imageDisplay');
    img.src = url;
    img.onload = () => {
      this.showImageViewer();
      this.updateNavigation();
    };
    img.onerror = () => {
      this.showUnsupportedViewer();
    };
  }

  clearContent() {
    this.currentContent = null;
    this.pdfDoc = null;
    this.hideAllViewers();
    this.showEmptyState();
  }

  hideAllViewers() {
    document.getElementById('contentViewerEmpty').style.display = 'none';
    document.getElementById('pdfViewer').classList.add('d-none');
    document.getElementById('imageViewer').classList.add('d-none');
    document.getElementById('unsupportedViewer').classList.add('d-none');
    document.getElementById('contentNavigation').classList.add('d-none');
  }

  showEmptyState() {
    document.getElementById('contentViewerEmpty').style.display = 'block';
  }

  showPDFViewer() {
    document.getElementById('pdfViewer').classList.remove('d-none');
    document.getElementById('contentNavigation').classList.remove('d-none');
  }

  showImageViewer() {
    document.getElementById('imageViewer').classList.remove('d-none');
    document.getElementById('contentNavigation').classList.remove('d-none');
  }

  showUnsupportedViewer() {
    document.getElementById('unsupportedViewer').classList.remove('d-none');
  }

  updateNavigation() {
    if (this.currentContent?.type.includes('pdf')) {
      document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${this.totalPages}`;
      document.getElementById('prevPage').disabled = this.currentPage <= 1;
      document.getElementById('nextPage').disabled = this.currentPage >= this.totalPages;
      
      // Show zoom level relative to fit-to-width (base zoom)
      const relativeZoom = (this.zoomLevel / this.baseZoomLevel) * 100;
      document.getElementById('zoomLevel').textContent = `${Math.round(relativeZoom)}%`;
    } else {
      document.getElementById('pageInfo').textContent = 'Image';
      document.getElementById('prevPage').disabled = true;
      document.getElementById('nextPage').disabled = true;
      document.getElementById('zoomLevel').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  async prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.renderPDFPage(this.currentPage);
      this.updateNavigation();
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.renderPDFPage(this.currentPage);
      this.updateNavigation();
    }
  }

  async zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, this.baseZoomLevel * 4); // Allow zoom up to 4x the base fit
    if (this.currentContent?.type.includes('pdf')) {
      await this.renderPDFPage(this.currentPage);
    }
    this.updateNavigation();
  }

  async zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, this.baseZoomLevel * 0.3); // Allow zoom down to 30% of base fit
    if (this.currentContent?.type.includes('pdf')) {
      await this.renderPDFPage(this.currentPage);
    }
    this.updateNavigation();
  }

  // Handle container resize - recalculate base zoom and re-render
  async onResize() {
    if (this.currentContent?.type.includes('pdf') && this.pdfDoc) {
      await this.calculateBaseZoom();
      await this.renderPDFPage(this.currentPage);
      this.updateNavigation();
    }
  }
} 
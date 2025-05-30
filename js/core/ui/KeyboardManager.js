export class KeyboardManager {
  constructor() {
    this.callbacks = {
      onToolActivate: null,
      onPercentageSet: null,
      onShowHelp: null
    };
    
    this.setupKeyboardShortcuts();
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
        return;
      }

      // Handle tool shortcuts
      const key = event.key.toLowerCase();
      
      switch (key) {
        case 'v':
          event.preventDefault();
          this.callbacks.onToolActivate?.('arrow');
          break;
        case 'e':
          event.preventDefault();
          this.callbacks.onToolActivate?.('explode');
          break;
        case 's':
          event.preventDefault();
          this.callbacks.onToolActivate?.('slice');
          break;
        case 'a':
          event.preventDefault();
          this.callbacks.onToolActivate?.('animation');
          break;
        case 'x':
          event.preventDefault();
          this.callbacks.onToolActivate?.('xray');
          break;
        case 'r':
          event.preventDefault();
          this.callbacks.onToolActivate?.('reset');
          break;
        case '?':
        case '/':
          event.preventDefault();
          this.showKeyboardShortcutsHelp();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          event.preventDefault();
          this.handlePercentageShortcut(parseInt(key), event.shiftKey);
          break;
      }
    });
  }

  handlePercentageShortcut(digit, shiftKey) {
    let percentageValue;
    
    // Handle special case: Shift+0 = 100%
    if (digit === 0 && shiftKey) {
      percentageValue = 1.0; // 100%
    } else {
      // Regular mapping: 0=0%, 1=10%, 2=20%, ..., 9=90%
      percentageValue = digit / 10;
    }
    
    // Notify callback with percentage value
    this.callbacks.onPercentageSet?.(percentageValue);
  }

  showKeyboardShortcutsHelp() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('keyboardShortcutsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'keyboardShortcutsModal';
      modal.className = 'modal fade';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-keyboard me-2"></i>
                Keyboard Shortcuts
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-6">
                  <h6 class="text-muted mb-3">Tools</h6>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">V</kbd>
                    <span>Select & Navigate</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">E</kbd>
                    <span>Explode View</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">S</kbd>
                    <span>Slice View</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">A</kbd>
                    <span>Animations</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">X</kbd>
                    <span>X-ray Mode</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">R</kbd>
                    <span>Reset View</span>
                  </div>
                </div>
                <div class="col-6">
                  <h6 class="text-muted mb-3">Percentage Control</h6>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">0</kbd>
                    <span>0%</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">1</kbd>
                    <span>10%</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">2</kbd>
                    <span>20%</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <span class="me-2">...</span>
                    <span class="text-muted">and so on</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">9</kbd>
                    <span>90%</span>
                  </div>
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">⇧</kbd><kbd class="me-2">0</kbd>
                    <span>100%</span>
                  </div>
                  <hr class="my-3">
                  <div class="d-flex align-items-center mb-2">
                    <kbd class="me-2">?</kbd>
                    <span>Show this help</span>
                  </div>
                </div>
              </div>
              <div class="alert alert-info mt-3 mb-0">
                <small>
                  <i class="bi bi-info-circle me-1"></i>
                  Percentage controls (0-9, ⇧0) apply to the currently active tool: Explode, Slice, or X-ray.
                </small>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Notify callback if set
    this.callbacks.onShowHelp?.();
  }
} 
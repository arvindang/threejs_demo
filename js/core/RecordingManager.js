/* ---------- Recording System (Simplified) ---------- */
export class RecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedEvents = [];
    this.recordingStartTime = null;
    this.recordingState = 'idle';
    this.currentAudio = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('btnRecord').addEventListener('click', () => this.startRecording());
    document.getElementById('btnStop').addEventListener('click', () => this.stopRecording());
    document.getElementById('btnPlay').addEventListener('click', () => this.playRecording());
    document.getElementById('btnPause').addEventListener('click', () => this.pauseRecording());
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordedEvents = [];
      this.recordingStartTime = Date.now();
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      
      this.mediaRecorder.start();
      this.recordingState = 'recording';
      this.updateButtonStates();
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.recordingState === 'recording') {
      this.mediaRecorder.stop();
      this.recordingState = 'stopped';
      this.updateButtonStates();
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.currentAudio = URL.createObjectURL(audioBlob);
        console.log('Recording stopped');
      };
    }
  }

  playRecording() {
    if (this.currentAudio) {
      const audio = new Audio(this.currentAudio);
      audio.play();
      this.recordingState = 'playing';
      this.updateButtonStates();
      
      audio.onended = () => {
        this.recordingState = 'stopped';
        this.updateButtonStates();
      };
    }
  }

  pauseRecording() {
    // Simplified pause functionality
    this.recordingState = 'paused';
    this.updateButtonStates();
  }

  updateButtonStates() {
    const btnRecord = document.getElementById('btnRecord');
    const btnStop = document.getElementById('btnStop');
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');

    // Reset all states
    [btnRecord, btnStop, btnPlay, btnPause].forEach(btn => btn.disabled = false);

    switch (this.recordingState) {
      case 'idle':
        btnStop.disabled = true;
        btnPlay.disabled = true;
        btnPause.disabled = true;
        break;
      case 'recording':
        btnRecord.disabled = true;
        btnPlay.disabled = true;
        btnPause.disabled = true;
        break;
      case 'stopped':
        btnPause.disabled = true;
        btnPlay.disabled = !this.currentAudio;
        break;
      case 'playing':
        btnRecord.disabled = true;
        btnPlay.disabled = true;
        break;
    }
  }
} 
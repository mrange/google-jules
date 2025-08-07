type AudioDataListener = (data: Float32Array) => void;

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private worker: Worker | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private listeners: AudioDataListener[] = [];
  private audioQueue: Float32Array[] = [];

  private sampleRate = 44100;
  private bufferSize = 4096;

  constructor() {
    this.worker = new Worker(new URL('./formula-worker.ts', import.meta.url));
    this.worker.onmessage = this.handleWorkerMessage;
  }

  public async start(): Promise<void> {
    if (this.isPlaying) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: this.sampleRate,
      });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.scriptNode = this.audioContext.createScriptProcessor(this.bufferSize, 0, 2);
    this.scriptNode.onaudioprocess = this.handleAudioProcess;
    this.scriptNode.connect(this.audioContext.destination);

    this.isPlaying = true;
  }

  public stop(): void {
    if (!this.isPlaying || !this.scriptNode) {
      return;
    }

    this.scriptNode.disconnect();
    this.scriptNode = null;
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setFormula(formula: string): void {
    this.worker?.postMessage({
      type: 'SET_FORMULA',
      payload: { formula },
    });
  }

  public seek(position: number): void {
    // position is normalized 0-1
    this.currentTime = this.getDuration() * position;
  }

  public getDuration(): number {
    // This will be dynamic later based on loop points
    return 10; // seconds
  }

  private handleAudioProcess = (event: AudioProcessingEvent): void => {
    const leftChannel = event.outputBuffer.getChannelData(0);
    const rightChannel = event.outputBuffer.getChannelData(1);

    if (this.audioQueue.length > 0) {
      const audioData = this.audioQueue.shift()!;
      for (let i = 0; i < this.bufferSize; i++) {
        leftChannel[i] = audioData[i];
        rightChannel[i] = audioData[i];
      }
      this.broadcastData(audioData);
    } else {
      // Play silence if the queue is empty
      for (let i = 0; i < this.bufferSize; i++) {
        leftChannel[i] = 0;
        rightChannel[i] = 0;
      }
    }

    // Always request more data from the worker
    this.worker?.postMessage({
      type: 'GET_AUDIO_DATA',
      payload: {
        bufferSize: this.bufferSize,
        sampleRate: this.sampleRate,
        currentTime: this.currentTime,
      },
    });
  };

  public addDataListener(listener: AudioDataListener): void {
    this.listeners.push(listener);
  }

  public removeDataListener(listener: AudioDataListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private broadcastData(data: Float32Array): void {
    // Downsample the data for visualization to avoid performance issues
    const downsampledData = new Float32Array(256);
    const step = Math.floor(data.length / 256);
    for (let i = 0; i < 256; i++) {
      downsampledData[i] = data[i * step];
    }
    this.listeners.forEach(listener => listener(downsampledData));
  }

  private handleWorkerMessage = (event: MessageEvent): void => {
    const { type, payload } = event.data;

    if (type === 'AUDIO_DATA') {
      this.audioQueue.push(payload.audioData);
      this.currentTime = payload.newTime;
    } else if (type === 'FORMULA_OK') {
      if ((this as any).onFormulaOk) {
        (this as any).onFormulaOk();
      }
    } else if (type === 'FORMULA_ERROR') {
      if ((this as any).onFormulaError) {
        (this as any).onFormulaError(payload.message);
      }
    }
  };

  public cleanup(): void {
    this.stop();
    this.worker?.terminate();
  }
}

export default AudioEngine;

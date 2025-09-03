import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';
import AudioEngine from './AudioEngine';
import Waveform from './Waveform';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [formula, setFormula] = useState('return sin(t * 440 * 2 * Math.PI);');
  const [lastGoodFormula, setLastGoodFormula] = useState(formula);
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState(new Float32Array(256));
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const audioEngine = useRef<AudioEngine | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const updatePlayhead = useCallback(() => {
    if (audioEngine.current) {
      const duration = audioEngine.current.getDuration();
      if (duration > 0) {
        // This is a simplification. In a real app, you'd get the current time from the audio engine.
        // We'll simulate it for now.
        setPlayheadPosition((prev) => (prev + 0.001) % 1);
      }
    }
    animationFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, []);

  useEffect(() => {
    const currentAudioEngine = new AudioEngine();
    audioEngine.current = currentAudioEngine;

    const dataListener = (data: Float32Array) => {
      setAudioData(new Float32Array(data));
    };
    currentAudioEngine.addDataListener(dataListener);

    const formulaOkListener = () => {
      setError(null);
      setLastGoodFormula(formula);
    };
    const formulaErrorListener = (errorMessage: string) => {
      setError(errorMessage);
    };

    // This is a bit of a hack, ideally the AudioEngine would be a proper event emitter
    (currentAudioEngine as any).onFormulaOk = formulaOkListener;
    (currentAudioEngine as any).onFormulaError = formulaErrorListener;


    // Clean up the audio engine when the component unmounts
    return () => {
      currentAudioEngine.removeDataListener(dataListener);
      currentAudioEngine.cleanup();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [formula, updatePlayhead]);

  const handlePlayPause = async () => {
    if (audioEngine.current) {
      if (isPlaying) {
        audioEngine.current.stop();
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else {
        await audioEngine.current.start();
        audioEngine.current.setFormula(formula);
        setIsPlaying(true);
        animationFrameRef.current = requestAnimationFrame(updatePlayhead);
      }
    }
  };

  const handleFormulaChange = (value: string | undefined) => {
    if (value) {
      setFormula(value);
    }
  };

  const handleApplyFormula = () => {
    if (audioEngine.current) {
      audioEngine.current.setFormula(formula);
    }
  };

  const handleRevert = () => {
    setFormula(lastGoodFormula);
    setError(null);
    if (audioEngine.current) {
      audioEngine.current.setFormula(lastGoodFormula);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    // Add the Ctrl+Enter or Cmd+Enter shortcut to apply the formula
    editor.addCommand(
      2048, // monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
      handleApplyFormula
    );
  };

  const handleSeek = (position: number) => {
    if (audioEngine.current) {
      audioEngine.current.seek(position);
      setPlayheadPosition(position);
    }
  };

  return (
    <div className="App">
      <div className="controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={handleApplyFormula} style={{ marginLeft: '8px' }}>
          Apply Formula
        </button>
        {error && (
          <>
            <span style={{ color: '#ff4d4d', marginLeft: '16px' }}>Error: {error}</span>
            <button onClick={handleRevert} style={{ marginLeft: '8px' }}>
              Revert
            </button>
          </>
        )}
      </div>
      <div className="editor-container">
        <Editor
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={formula}
          onChange={handleFormulaChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            wordWrap: 'on',
            lineNumbers: 'off',
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden'
            }
          }}
        />
      </div>
      <div className="waveform-container" ref={waveformContainerRef}>
        <Waveform
          audioData={audioData}
          width={waveformContainerRef.current?.clientWidth || 0}
          height={waveformContainerRef.current?.clientHeight || 0}
          playheadPosition={playheadPosition}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
}

export default App;

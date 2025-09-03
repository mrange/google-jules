import React, { useRef, useEffect, useState } from 'react';

interface WaveformProps {
  audioData: Float32Array;
  width: number;
  height: number;
  playheadPosition: number; // Normalized to 0-1
  onSeek: (position: number) => void;
}

const Waveform: React.FC<WaveformProps> = ({ audioData, width, height, playheadPosition, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsSeeking(true);
    updateSeekPosition(event);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSeeking) {
      updateSeekPosition(event);
    }
  };

  const handleMouseUp = () => {
    setIsSeeking(false);
  };

  const updateSeekPosition = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const normalizedPosition = Math.max(0, Math.min(1, x / width));
    onSeek(normalizedPosition);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    context.fillStyle = '#262626';
    context.fillRect(0, 0, width, height);

    context.lineWidth = 2;
    context.strokeStyle = '#61dafb';
    context.beginPath();

    const sliceWidth = width / audioData.length;
    let x = 0;

    for (let i = 0; i < audioData.length; i++) {
      const v = audioData[i] * height;
      const y = height / 2 + v / 2;

      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }

      x += sliceWidth;
    }

    context.lineTo(width, height / 2);
    context.stroke();

    // Draw playhead
    const playheadX = playheadPosition * width;
    context.strokeStyle = '#ff4d4d';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(playheadX, 0);
    context.lineTo(playheadX, height);
    context.stroke();

  }, [audioData, width, height, playheadPosition]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default Waveform;

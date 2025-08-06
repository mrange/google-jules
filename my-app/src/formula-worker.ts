/* eslint-disable no-restricted-globals */

// Shorthand math functions
const sin = Math.sin;
const cos = Math.cos;
const exp = Math.exp;
const pow = Math.pow;
const noise = () => Math.random() * 2 - 1;

let formula: ((t: number) => number) | null = null;
let lastGoodFormula: ((t: number) => number) | null = null;

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'SET_FORMULA') {
    try {
      const newFormula = new Function('t', `
        const sin = Math.sin;
        const cos = Math.cos;
        const exp = Math.exp;
        const pow = Math.pow;
        const noise = () => Math.random() * 2 - 1;
        ${payload.formula}
      `) as (t: number) => number;

      // Test the new formula with a sample value to catch runtime errors
      newFormula(0);

      formula = newFormula;
      lastGoodFormula = newFormula;
      self.postMessage({ type: 'FORMULA_OK' });
    } catch (error) {
      formula = lastGoodFormula; // Revert to the last good formula
      self.postMessage({ type: 'FORMULA_ERROR', payload: { message: (error as Error).message } });
    }
  } else if (type === 'GET_AUDIO_DATA') {
    if (formula) {
      const { bufferSize, sampleRate, currentTime } = payload;
      const audioData = new Float32Array(bufferSize);
      let t = currentTime;
      const timeIncrement = 1 / sampleRate;

      for (let i = 0; i < bufferSize; i++) {
        try {
          audioData[i] = formula(t);
          t += timeIncrement;
        } catch (error) {
          // If an error occurs during audio generation, we'll just output silence for that sample.
          audioData[i] = 0;
        }
      }
      // Post the generated audio data back to the main thread
      self.postMessage({ type: 'AUDIO_DATA', payload: { audioData, newTime: t } }, [audioData.buffer]);
    }
  }
};

export {};

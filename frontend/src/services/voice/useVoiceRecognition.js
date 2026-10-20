import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as CapSpeech } from '@capacitor-community/speech-recognition';

/**
 * Unified Voice Recognition Hook for RAIS Frozen Foods app.
 * Compatible with Web browsers (Chrome, Edge, Safari, Android Chrome via Web Speech API)
 * and native Android shell via Capacitor (@capacitor-community/speech-recognition).
 * 
 * 100% Free / Zero API cost.
 * Privacy Notice: Voice audio is transcribed using the platform's speech engine
 * (Google Speech Services on Android, Web Speech API on Chrome/Edge).
 * No audio recordings are stored on RAIS agency backend servers.
 */
export const SPEECH_PRIVACY_NOTICE = 'Voice transcription uses device-level speech services (e.g., Google Speech Services). Audio is not stored on RAIS servers.';

export const useVoiceRecognition = (options = {}) => {
  const {
    language = 'en-IN',
    continuous = false,
    interimResults = true
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const nativeListenerRef = useRef(null);
  const nativeStateListenerRef = useRef(null);
  const callbacksRef = useRef({});
  const latestTranscriptRef = useRef('');

  // Check support on mount
  useEffect(() => {
    const checkSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const res = await CapSpeech.available();
          setIsSupported(Boolean(res?.available ?? true));
        } catch (e) {
          setIsSupported(true);
        }
      } else {
        const SpeechRecognition = typeof window !== 'undefined' && (
          window.SpeechRecognition ||
          window.webkitSpeechRecognition
        );
        setIsSupported(Boolean(SpeechRecognition));
      }
    };
    checkSupport();
  }, []);

  const stopListening = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CapSpeech.stop();
        if (nativeListenerRef.current) {
          nativeListenerRef.current.remove();
          nativeListenerRef.current = null;
        }
        if (nativeStateListenerRef.current) {
          nativeStateListenerRef.current.remove();
          nativeStateListenerRef.current = null;
        }
      } catch (err) {
        // Safe guard against native state
      }
      setIsListening(false);
      if (callbacksRef.current.onEnd) {
        callbacksRef.current.onEnd(latestTranscriptRef.current.trim());
      }
      return;
    }

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Safe guard against invalid state
      }
    }
    setIsListening(false);
  }, [isListening]);

  const startListening = useCallback(async (overrideCallbacks = {}) => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    latestTranscriptRef.current = '';

    callbacksRef.current = overrideCallbacks;

    // ─── 1. NATIVE ANDROID CAPACITOR PLATFORM ───
    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await CapSpeech.hasPermissions();
        if (!hasPerm?.permission) {
          const req = await CapSpeech.requestPermissions();
          if (!req?.permission) {
            const permMsg = 'Microphone permission was denied on your Android device. Please enable in Android Settings.';
            setError(permMsg);
            if (overrideCallbacks.onError) overrideCallbacks.onError(permMsg);
            return;
          }
        }

        setIsListening(true);
        if (callbacksRef.current.onStart) callbacksRef.current.onStart();

        // Remove any prior listeners
        if (nativeListenerRef.current) {
          try { nativeListenerRef.current.remove(); } catch (e) {}
        }
        if (nativeStateListenerRef.current) {
          try { nativeStateListenerRef.current.remove(); } catch (e) {}
        }

        nativeListenerRef.current = await CapSpeech.addListener('partialResults', (data) => {
          if (data && data.matches && data.matches.length > 0) {
            const recognized = data.matches[0];
            latestTranscriptRef.current = recognized;
            setTranscript(recognized);
            if (callbacksRef.current.onTranscript) {
              callbacksRef.current.onTranscript(recognized, false);
            }
          }
        });

        nativeStateListenerRef.current = await CapSpeech.addListener('listeningState', (state) => {
          if (state && state.status === 'stopped') {
            setIsListening(false);
            if (callbacksRef.current.onEnd) {
              callbacksRef.current.onEnd(latestTranscriptRef.current.trim());
            }
          }
        });

        await CapSpeech.start({
          language,
          maxResults: 1,
          prompt: 'Speak order or inventory update...',
          partialResults: true,
          popup: false
        });
        return;
      } catch (err) {
        console.warn('Capacitor native speech start failed, falling back to Web Speech API:', err);
        // Fall through to browser Web Speech API below
      }
    }

    // ─── 2. BROWSER WEB SPEECH API PLATFORM ───
    const SpeechRecognition = typeof window !== 'undefined' && (
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

    if (!SpeechRecognition) {
      const errMsg = 'Speech Recognition is not supported by your current browser. Please use Google Chrome, Microsoft Edge, or Android Chrome.';
      setError(errMsg);
      if (overrideCallbacks.onError) overrideCallbacks.onError(errMsg);
      return;
    }

    try {
      // Abort any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      let finalAccumulated = '';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        if (callbacksRef.current.onStart) callbacksRef.current.onStart();
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalAccumulated += (finalAccumulated ? ' ' : '') + res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        const currentText = finalAccumulated || interim;
        setTranscript(finalAccumulated);
        setInterimTranscript(interim);

        if (callbacksRef.current.onTranscript) {
          callbacksRef.current.onTranscript(currentText, Boolean(finalAccumulated));
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        let errorMsg = 'Could not capture speech.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser or device settings.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Please speak into the microphone.';
        } else if (event.error === 'network') {
          errorMsg = 'Network connection needed for browser voice transcription.';
        }

        setError(errorMsg);
        setIsListening(false);
        if (callbacksRef.current.onError) callbacksRef.current.onError(errorMsg);
      };

      recognition.onend = () => {
        setIsListening(false);
        const resolvedText = finalAccumulated.trim();
        if (callbacksRef.current.onEnd) {
          callbacksRef.current.onEnd(resolvedText);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      const errMsg = 'Failed to start microphone listening.';
      setError(errMsg);
      setIsListening(false);
      if (overrideCallbacks.onError) overrideCallbacks.onError(errMsg);
    }
  }, [language, continuous, interimResults]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        try {
          CapSpeech.removeAllListeners();
          CapSpeech.stop();
        } catch (e) {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim(),
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};

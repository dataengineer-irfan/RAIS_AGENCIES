/**
 * RAIS AGENCIES — Counter Soundbox Chime & Voice Announcer
 * Synthesizes a crisp Paytm/PhonePe-style audio chime via Web Audio API
 * followed by a spoken payment announcement via SpeechSynthesis.
 * 100% offline, zero external dependencies, zero subscriptions.
 */

// Warm up voices table on module load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try { window.speechSynthesis.getVoices?.(); } catch (e) {}
}

const STORAGE_KEY = 'rais_soundbox_enabled';

export function isSoundboxEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  const val = localStorage.getItem(STORAGE_KEY);
  return val === null ? true : val === 'true';
}

export function setSoundboxEnabled(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  // Dispatch custom event for immediate UI reaction
  window.dispatchEvent(new CustomEvent('rais-soundbox-toggled', { detail: { enabled } }));
}

export function playSoundboxChime(amount, { customerName = '', method = 'UPI', lang = 'en' } = {}) {
  if (!isSoundboxEnabled() || typeof window === 'undefined') return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // 1. Dual-tone chime: Tone 1 (880Hz / A5) for 150ms -> Tone 2 (1174Hz / D6) for 350ms
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174, now + 0.14);
    gain2.gain.setValueAtTime(0.45, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.55);

    // 2. Voice announcement after chime finishes (~580ms)
    setTimeout(() => {
      try {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const amtNum = Math.round(Number(amount) || 0);
        const formattedAmt = amtNum.toLocaleString('en-IN');

        const voices = window.speechSynthesis.getVoices?.() || [];
        // Check for native Telugu voice (e.g. Android Chrome Google Telugu, Windows Telugu TTS)
        const teVoice = voices.find(v => 
          v.lang === 'te-IN' || 
          v.lang?.toLowerCase().startsWith('te') || 
          v.name?.toLowerCase().includes('telugu')
        );

        let utterance;
        if (teVoice) {
          // Native Telugu speech engine: "రైస్ ఏజెన్సీస్ లో [amount] రూపాయలు అందాయి"
          utterance = new SpeechSynthesisUtterance(`రైస్ ఏజెన్సీస్ లో ${amtNum} రూపాయలు అందాయి`);
          utterance.voice = teVoice;
          utterance.lang = 'te-IN';
        } else {
          // Phonetic Telugu: Works with any Indian voice (en-IN) on Windows/Mac/Linux
          // Sounds exactly like Rayachoty Telugu to local listeners!
          utterance = new SpeechSynthesisUtterance(`RAIS Agencies lo ${amtNum} roopaayalu andaayi`);
          const inVoice = voices.find(v => v.lang === 'en-IN' || v.name?.includes('India') || v.name?.includes('Hindi'));
          if (inVoice) {
            utterance.voice = inVoice;
          }
          utterance.lang = 'en-IN';
        }

        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech announcement error:', err);
      }
    }, 580);

  } catch (err) {
    console.warn('Soundbox chime error:', err);
  }
}

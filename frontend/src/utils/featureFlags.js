/**
 * Central Feature Flags configuration for RAIS Agencies.
 * All experimental, beta, or hardware-dependent features must be gated here.
 */

// Voice Assistant dictation is now fully enabled in production with zero-cost native & web speech recognition.
// To explicitly disable for emergency troubleshooting, set VITE_ENABLE_VOICE_ASSISTANT=false in .env
export const IS_VOICE_ENABLED = import.meta.env.VITE_ENABLE_VOICE_ASSISTANT !== 'false';

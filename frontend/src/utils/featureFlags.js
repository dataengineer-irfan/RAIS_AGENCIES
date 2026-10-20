/**
 * Central Feature Flags configuration for RAIS Agencies.
 * All experimental, beta, or hardware-dependent features must be gated here.
 */

// Voice Assistant dictation is disabled in production by default to prevent unexpected native errors.
// To enable for development/testing, set VITE_ENABLE_VOICE_ASSISTANT=true in .env
export const IS_VOICE_ENABLED = import.meta.env.VITE_ENABLE_VOICE_ASSISTANT === 'true';

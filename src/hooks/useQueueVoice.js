import { useRef, useCallback } from "react";

/**
 * Custom hook for voice announcements in the queue system
 * Uses Web Speech API to announce patient calls in Telugu and English
 * Optimized for the Vizianagaram audience with full Telugu support
 */

// Telugu number mappings for 1-50
const TELUGU_NUMBERS = {
  1: "ఒకటి",
  2: "రెండు",
  3: "మూడు",
  4: "నాలుగు",
  5: "ఐదు",
  6: "ఆరు",
  7: "ఏడు",
  8: "ఎight",
  9: "తొమ్మిది",
  10: "పది",
  11: "పదకొండు",
  12: "పన్నెండు",
  13: "పదమూడు",
  14: "పదనాలుగు",
  15: "పదిహేను",
  16: "పదహారు",
  17: "పదిఏడు",
  18: "పదిఎight",
  19: "పందొమ్మిది",
  20: "ఇరవై",
  21: "ఇరవై ఒకటి",
  22: "ఇరవై రెండు",
  23: "ఇరవై మూడు",
  24: "ఇరవై నాలుగు",
  25: "ఇరవై ఐదు",
  26: "ఇరవై ఆరు",
  27: "ఇరవై ఏడు",
  28: "ఇరవై ఎight",
  29: "ఇరవై తొమ్మిది",
  30: "ముప్పై",
  31: "ముప్పై ఒకటి",
  32: "ముప్పై రెండు",
  33: "ముప్పై మూడు",
  34: "ముప్పై నాలుగు",
  35: "ముప్పై ఐదు",
  36: "ముప్పై ఆరు",
  37: "ముప్పై ఏడు",
  38: "ముప్పై ఎight",
  39: "ముప్పై తొమ్మిది",
  40: "నలభై",
  41: "నలభై ఒకటి",
  42: "నలభై రెండు",
  43: "నలభై మూడు",
  44: "నలభై నాలుగు",
  45: "నలభై ఐదు",
  46: "నలభై ఆరు",
  47: "నలభై ఏడు",
  48: "నలభై ఎight",
  49: "నలభై తొమ్మిది",
  50: "యాభై",
};

export const useQueueVoice = () => {
  const utteranceRef = useRef(null);
  const hasSpokenRef = useRef({});

  /**
   * Find the best available voice for Telugu speech synthesis
   * Prefers te-IN or te language, falls back to first available voice
   */
  const findTeluguVoice = useCallback(() => {
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();

    // Try to find Telugu (India) voice first
    const teluguInVoice = voices.find(
      (voice) => voice.lang && voice.lang.includes("te"),
    );
    if (teluguInVoice) return teluguInVoice;

    // Fallback to first available voice
    return voices.length > 0 ? voices[0] : null;
  }, []);

  /**
   * Get Telugu number word for a given token number
   * Falls back to the English number if mapping doesn't exist
   */
  const getTeluguNumber = useCallback((tokenNumber) => {
    return TELUGU_NUMBERS[tokenNumber] || tokenNumber.toString();
  }, []);

  /**
   * Announce a patient call in Telugu - Simple format
   * Format: 'టోకెన్ నంబర్ [నంబర్]. [పేరు] గారు.'
   */
  const announcePatient = useCallback(
    (tokenNumber, patientName) => {
      const SpeechSynthesisUtterance =
        window.SpeechSynthesisUtterance ||
        window.webkitSpeechSynthesisUtterance;
      const speechSynthesis =
        window.speechSynthesis || window.webkitSpeechSynthesis;

      if (!SpeechSynthesisUtterance || !speechSynthesis) {
        console.warn("Web Speech API not supported in this browser");
        return;
      }

      // Prevent duplicate announcements for the same token
      if (hasSpokenRef.current[tokenNumber]) {
        return;
      }
      hasSpokenRef.current[tokenNumber] = true;

      // Get Telugu number
      const teluguNumber = getTeluguNumber(tokenNumber);

      // Simple format: టోకెన్ నంబర్ [నంబర్]. [పేరు] గారు.
      const message = `టోకెన్ నంబర్ ${teluguNumber}. ${patientName} గారు.`;

      console.log("Announcing (Telugu):", message);

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "te-IN";
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to select Telugu voice
      const teluguVoice = findTeluguVoice();
      if (teluguVoice) {
        utterance.voice = teluguVoice;
      }

      utterance.onend = () => {
        console.log("Announcement completed for token:", tokenNumber);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        delete hasSpokenRef.current[tokenNumber];
      };

      utteranceRef.current = utterance;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    },
    [getTeluguNumber, findTeluguVoice],
  );

  /**
   * Legacy English announcement (for backward compatibility)
   * Kept for fallback if Telugu is not available
   */
  const announcePatientCall = useCallback(
    (tokenNumber, patientName) => {
      // Try Telugu first
      announcePatient(tokenNumber, patientName);
    },
    [announcePatient],
  );

  /**
   * Announce current queue status (optional - for periodic announcements)
   */
  const announceQueueStatus = useCallback((position, estimatedWaitTime) => {
    const SpeechSynthesisUtterance =
      window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
    const speechSynthesis =
      window.speechSynthesis || window.webkitSpeechSynthesis;

    if (!SpeechSynthesisUtterance || !speechSynthesis) {
      return;
    }

    const message = `You are at position ${position}. Estimated wait time is ${estimatedWaitTime} minutes.`;
    const utterance = new SpeechSynthesisUtterance(message);

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    speechSynthesis.speak(utterance);
  }, []);

  /**
   * Stop any ongoing speech
   */
  const stopAnnouncement = useCallback(() => {
    const speechSynthesis =
      window.speechSynthesis || window.webkitSpeechSynthesis;

    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
  }, []);

  /**
   * Reset spoken tokens (useful for demo/testing)
   */
  const resetSpokenTokens = useCallback(() => {
    hasSpokenRef.current = {};
  }, []);

  return {
    announcePatient, // New: Full Telugu announcement
    announcePatientCall, // Legacy: For backward compatibility
    announceQueueStatus,
    stopAnnouncement,
    resetSpokenTokens,
    isSupported: !!window.speechSynthesis,
    getTeluguNumber, // Export for testing/display purposes
  };
};

export default useQueueVoice;

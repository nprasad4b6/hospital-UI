import { useRef, useCallback, useEffect } from "react";

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
  8: "ఎనిమిది",
  9: "తొమ్మిది",
  10: "పది",
  11: "పదకొండు",
  12: "పన్నెండు",
  13: "పదమూడు",
  14: "పదనాలుగు",
  15: "పదిహేను",
  16: "పదహారు",
  17: "పదిఏడు",
  18: "పద్దెనిమిది",
  19: "పందొమ్మిది",
  20: "ఇరవై",
  21: "ఇరవై ఒకటి",
  22: "ఇరవై రెండు",
  23: "ఇరవై మూడు",
  24: "ఇరవై నాలుగు",
  25: "ఇరవై ఐదు",
  26: "ఇరవై ఆరు",
  27: "ఇరవై ఏడు",
  28: "ఇరవై ఎనిమిది",
  29: "ఇరవై తొమ్మిది",
  30: "ముప్పై",
  31: "ముప్పై ఒకటి",
  32: "ముప్పై రెండు",
  33: "ముప్పై మూడు",
  34: "ముప్పై నాలుగు",
  35: "ముప్పై ఐదు",
  36: "ముప్పై ఆరు",
  37: "ముప్పై ఏడు",
  38: "ముప్పై ఎనిమిది",
  39: "ముప్పై తొమ్మిది",
  40: "నలభై",
  41: "నలభై ఒకటి",
  42: "నలభై రెండు",
  43: "నలభై మూడు",
  44: "నలభై నాలుగు",
  45: "నలభై ఐదు",
  46: "నలభై ఆరు",
  47: "నలభై ఏడు",
  48: "నలభై ఎనిమిది",
  49: "నలభై తొమ్మిది",
  50: "యాభై",
};

export const useQueueVoice = () => {
  const utteranceRef = useRef(null);
  const hasSpokenRef = useRef({});
  const selectedVoiceRef = useRef(null);

  /**
   * Find the best available voice for Telugu speech synthesis
   * Prefers te-IN or te language, falls back to first available voice
   */
  const findTeluguVoice = useCallback(() => {
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();

    // Prefer explicit Telugu voices by language or voice name.
    const teluguInVoice = voices.find(
      (voice) =>
        (voice.lang && /^te(-|$)/i.test(voice.lang)) ||
        /telugu/i.test(voice.name || ""),
    );
    if (teluguInVoice) return teluguInVoice;

    return null;
  }, []);

  const loadPreferredVoice = useCallback(() => {
    if (!window.speechSynthesis) return;
    selectedVoiceRef.current = findTeluguVoice();
  }, [findTeluguVoice]);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    loadPreferredVoice();

    const handleVoicesChanged = () => {
      loadPreferredVoice();
    };

    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadPreferredVoice]);

  /**
   * Get Telugu number word for a given token number
   * Falls back to the English number if mapping doesn't exist
   */
  const getTeluguNumber = useCallback((tokenNumber) => {
    const num = Number(tokenNumber);
    if (!Number.isFinite(num)) {
      return String(tokenNumber || "");
    }
    return TELUGU_NUMBERS[num] || String(num);
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

      const numericToken = Number(tokenNumber);
      const normalizedToken = Number.isFinite(numericToken)
        ? Math.trunc(numericToken)
        : null;
      const teluguNumber = getTeluguNumber(
        normalizedToken !== null ? normalizedToken : tokenNumber,
      );
      const englishToken =
        normalizedToken !== null
          ? String(normalizedToken)
          : String(tokenNumber || "0");
      const safeName = String(patientName || "Patient").trim() || "Patient";

      const teluguVoice = selectedVoiceRef.current || findTeluguVoice();
      // Use Telugu phrase only with Telugu voice; otherwise use English numeric token
      // so token number is always spoken clearly.
      const message = teluguVoice
        ? `టోకెన్ నంబర్ ${teluguNumber}. ${safeName} గారు.`
        : `Token number ${englishToken}. ${safeName} garu.`;

      console.log("Announcing patient:", message);

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = teluguVoice ? "te-IN" : "en-IN";
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Auto-select Telugu voice whenever available.
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

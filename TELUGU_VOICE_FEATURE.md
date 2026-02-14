# Vizag Medical Pro - Telugu Voice Announcement Feature

## Overview

The `useQueueVoice` hook now provides full **Telugu language support** for patient announcements, optimized for the Vizianagaram medical clinic audience.

## Features

### 1. Telugu Number Mapping (1-50)

Numbers are automatically converted to Telugu words:

- 10 → "పది"
- 11 → "పదకొండు"
- 12 → "పన్నెండు"
- 20 → "ఇరవై"
- 30 → "ముప్పై"
- 40 → "నలభై"
- 50 → "యాభై"

### 2. Full Telugu Announcement Format

When a patient's status changes to `IN_PROGRESS`, the system announces:

**Original Format:**

```
టోకెన్ నంబర్. [నంబర్]. [పేరు]. గారు. దయచేసి డాక్టర్ గారి దగ్గరికి వెళ్ళండి.
```

**English Meaning:**

```
Token Number. [Number]. [Name]. Sir/Madam. Please go to the doctor's cabin.
```

### 3. Natural Pauses

The announcement uses periods and commas to create natural pauses:

- Period after "టోకెన్ నంబర్" (Token Number)
- Period after the number
- Period after the patient name
- Period after "గారు" (respectful suffix)
- Full stop at the end

This ensures proper articulation for Telugu speech synthesis.

### 4. Voice Selection

- **Primary Language:** Telugu (te-IN)
- **Speech Rate:** 0.8 (slightly slower for clarity)
- **Pitch:** 1.0 (normal)
- **Voice Selection:**
  - Automatically detects and uses Telugu voice if available
  - Falls back to first available system voice if Telugu is not found

### 5. Trigger Point

The announcement is triggered when:

- A patient's status changes to `IN_PROGRESS`
- The `CALL NEXT` button is clicked in the AssistantDashboard
- Voice announcements are enabled (toggle in header)

## Hook API

### `useQueueVoice()` Returns:

```javascript
{
  announcePatient,        // (tokenNumber, patientName) - Full Telugu announcement
  announcePatientCall,    // (tokenNumber, patientName) - Backward compatible wrapper
  announceQueueStatus,    // (position, estimatedWaitTime) - English queue status
  stopAnnouncement,       // () - Cancel ongoing speech
  resetSpokenTokens,      // () - Clear duplicate prevention cache
  isSupported,            // boolean - Web Speech API support
  getTeluguNumber,        // (tokenNumber) - Get Telugu word for number
}
```

## Usage Example

```javascript
import { useQueueVoice } from "../hooks/useQueueVoice";

const MyComponent = () => {
  const { announcePatient, announcePatientCall } = useQueueVoice();

  // Announce in full Telugu
  const handleAnnounce = () => {
    announcePatient(10, "రాజేష్"); // Announces: "టోకెన్ నంబర్. పది. రాజేష్. గారు. దయచేసి డాక్టర్ గారి దగ్గరికి వెళ్ళండి."
  };

  return <button onClick={handleAnnounce}>Announce</button>;
};
```

## Browser Support

- **Chrome/Edge:** Full support (native Web Speech API)
- **Firefox:** Partial support (may use system voices)
- **Safari:** Full support (iOS 14.5+)
- **Mobile Browsers:** Supported with varying voice quality

## Testing the Feature

1. Open the AssistantDashboard
2. Register a new patient via the Registration tab
3. Click `CALL NEXT` button in AssistantPanel
4. The patient name and token number should be announced in Telugu
5. Check browser console for detailed logs

## Customization

To modify Telugu numbers or announcement text:

1. Edit `TELUGU_NUMBERS` constant in `useQueueVoice.js`
2. Update the message construction in `announcePatient()` function
3. The format string is in the `message` variable

## Notes

- Each token is announced only once (duplicate prevention via `hasSpokenRef`)
- If speech synthesis fails, the error is logged but doesn't crash the app
- The feature respects user's voice toggle preference
- Announcements are cancelled if a new consultation starts

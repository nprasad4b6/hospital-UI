# Voice Announcements Feature

## Overview

The hospital queue system now includes automatic voice announcements using the Web Speech API. When a new patient is called (status changes to 'IN_PROGRESS'), the browser announces their token number and name in English with Telugu phonetic pronunciation.

## Features

### 1. **useQueueVoice Hook** (`frontend/src/hooks/useQueueVoice.js`)

A custom React hook that manages voice announcements with:

- **Web Speech API Integration**: Uses browser's native speech synthesis
- **Telugu Phonetic Mapping**: Common Telugu names are converted to phonetic English for natural pronunciation
- **Professional Tone**: Configured for clear, professional announcements
- **Duplicate Prevention**: Prevents re-announcing the same patient token

### 2. **Voice Announcement Format**

```
"Token number [Number], [Name] garu, please proceed to the doctor."
```

- Uses "garu" (Telugu cultural courtesy term) for natural regional appeal
- Example: "Token number 5, Rajesh garu, please proceed to the doctor."

### 3. **Phonetic Name Mapping**

Includes mappings for common Telugu names such as:

- **Male Names**: Rajesh, Suresh, Mahesh, Kiran, Arjun, etc.
- **Female Names**: Priya, Sneha, Divya, Anjali, Pooja, etc.
- **Surnames**: Reddy, Rao, Shah, Verma, Patel, etc.

### 4. **Integration Points**

#### LobbyTV Component

- Displays the announcement in 1080p lobby screens
- Shows patient name, token number, and phone
- Voice toggle button in top-right corner (green = enabled, gray = disabled)

#### AssistantDashboard Component

- Announces when assistant calls the next patient
- Voice toggle in header with speaker icon
- Helps clinical assistant stay aware of announcements

### 5. **Voice Control**

- **Toggle Button**: Each component has a voice enable/disable button
- **Browser Support Check**: Automatically detects if Web Speech API is available
- **State Management**: Voice preference is maintained per session

## Configuration

### Environment Variables

- `REACT_APP_API_URL`: Socket.io server URL (default: `http://localhost:5000`)

### Customization

You can customize the voice announcement by editing `useQueueVoice.js`:

```javascript
utterance.lang = "en-IN"; // Change language/accent
utterance.rate = 0.9; // Adjust speed (0.1 to 10)
utterance.pitch = 1.0; // Adjust pitch (0 to 2)
utterance.volume = 1.0; // Adjust volume (0 to 1)
```

## Phonetic Name Mappings

The hook includes phonetic mappings for:

- **Indian English pronunciation** for Tamil/Telugu audience
- Automatic phonetic conversion for names in the mapping list
- Fallback to original name if not in mapping

### Adding New Names

To add more names, edit the `phoneticMap` object in `useQueueVoice.js`:

```javascript
const phoneticMap = {
  name: "PHONETIC-VERSION",
  // ... existing mappings
};
```

## Audio Specifications

- **Language**: English with Indian English accent (`en-IN`)
- **Rate**: 0.9 (slightly slower for clarity)
- **Pitch**: 1.0 (normal)
- **Volume**: 1.0 (full volume)

## Browser Compatibility

- ✅ Chrome/Chromium-based browsers
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ❌ Older browsers without Web Speech API support (gracefully falls back)

## Usage Example

```javascript
import { useQueueVoice } from "../hooks/useQueueVoice";

// Inside component
const { announcePatientCall, isSupported } = useQueueVoice();

// Announce a patient
announcePatientCall(5, "Rajesh Kumar");
// Speaks: "Token number 5, Rajesh garu, please proceed to the doctor."
```

## Testing

To test voice announcements:

1. Start a patient registration
2. Navigate to Lobby TV or Assistant Dashboard
3. Click the voice toggle button (top-right)
4. Open browser Developer Console (F12) to see announcement logs
5. When a patient status changes to "IN_PROGRESS", you'll hear the announcement

## Known Limitations

- Web Speech API requires browser support (not available in older browsers)
- Voice synthesis quality depends on the operating system
- Multiple announcements won't overlap (previous speech is cancelled)
- Some browsers may require user interaction before first speech synthesis

## Future Enhancements

- [ ] Add more regional language support (Tamil, Kannada, Hindi)
- [ ] Persistent voice preference settings
- [ ] Custom announcement messages
- [ ] Background music/notification tone before announcement
- [ ] Multi-language announcements

import { Platform } from 'react-native';

// --- CONFIGURATION ---
// UPDATE THIS IP TO YOUR COMPUTER'S LAN IP FOR PHYSICAL DEVICE TESTING
// Example: '192.168.1.15'
const LAN_IP = '10.0.2.2'; // Default for Android Emulator. Change this for real devices!
// const LAN_IP = '192.168.0.2'; // Example for physical device testing

export const API_URL = Platform.select({
    web: 'http://localhost:5000',
    android: `http://${LAN_IP}:5000`, // Default Emulator loopback
    ios: 'http://localhost:5000',
});

// Production DLC Endpoint (Hosted on GCS)
export const DLC_ENDPOINT = 'https://storage.googleapis.com/neurochess/mobile_puzzles_extra.sqlite';
export const DEEP_DLC_ENDPOINT = 'https://storage.googleapis.com/neurochess/mobile_deep_extra.sqlite';

console.log('[Config] Using API URL:', API_URL);

import { Audio } from 'expo-av';

// Sound files
const SOUNDS = {
    move: require('../../assets/sounds/Move.mp3'),
    capture: require('../../assets/sounds/Capture.mp3'),
    error: require('../../assets/sounds/GenericNotify.mp3'),
};

class SoundService {
    private sounds: { [key: string]: Audio.Sound | null } = {
        move: null,
        capture: null,
        error: null,
    };
    private loaded = false;

    async init() {
        if (this.loaded) return;

        try {
            // Set audio mode for web compatibility
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            });

            // Preload all sounds
            const { sound: moveSound } = await Audio.Sound.createAsync(SOUNDS.move);
            const { sound: captureSound } = await Audio.Sound.createAsync(SOUNDS.capture);
            const { sound: errorSound } = await Audio.Sound.createAsync(SOUNDS.error);

            this.sounds.move = moveSound;
            this.sounds.capture = captureSound;
            this.sounds.error = errorSound;

            this.loaded = true;
            console.log('[SoundService] Sounds loaded');
        } catch (e) {
            console.error('[SoundService] Failed to load sounds:', e);
        }
    }

    async playMove() {
        try {
            if (this.sounds.move) {
                await this.sounds.move.setPositionAsync(0);
                await this.sounds.move.playAsync();
            }
        } catch (e) {
            console.log('[SoundService] Move sound error:', e);
        }
    }

    async playCapture() {
        try {
            if (this.sounds.capture) {
                await this.sounds.capture.setPositionAsync(0);
                await this.sounds.capture.playAsync();
            }
        } catch (e) {
            console.log('[SoundService] Capture sound error:', e);
        }
    }

    async playError() {
        try {
            if (this.sounds.error) {
                await this.sounds.error.setPositionAsync(0);
                await this.sounds.error.playAsync();
            }
        } catch (e) {
            console.log('[SoundService] Error sound error:', e);
        }
    }

    // Convenience method that determines which sound to play based on move
    async playMoveSound(isCapture: boolean) {
        if (isCapture) {
            await this.playCapture();
        } else {
            await this.playMove();
        }
    }

    async unload() {
        for (const key in this.sounds) {
            if (this.sounds[key]) {
                await this.sounds[key]!.unloadAsync();
                this.sounds[key] = null;
            }
        }
        this.loaded = false;
    }
}

// Singleton instance
export const soundService = new SoundService();

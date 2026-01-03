import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_COUNT_KEY = 'ad_game_count';
const REMOVE_ADS_KEY = 'remove_ads_owned';
const NBACK_PREMIUM_KEY = 'nback_premium_owned';

export const AdService = {
    _gameCount: 0,
    _initialized: false,

    async init() {
        if (this._initialized) return;
        try {
            const savedCount = await AsyncStorage.getItem(GAME_COUNT_KEY);
            this._gameCount = savedCount ? parseInt(savedCount, 10) : 0;
            this._initialized = true;
        } catch (e) {
            console.error("AdService init failed", e);
        }
    },

    async isAdFree(): Promise<boolean> {
        try {
            // Check all entitlement keys
            const removeAds = await AsyncStorage.getItem(REMOVE_ADS_KEY) === 'true';
            const nbackPremium = await AsyncStorage.getItem(NBACK_PREMIUM_KEY) === 'true';

            // Add future entitlements here (e.g., puzzle pack)
            return removeAds || nbackPremium;
        } catch (e) {
            console.error("AdService check failed", e);
            return false;
        }
    },

    async incrementGameCount(): Promise<boolean> {
        if (!this._initialized) await this.init();

        // 1. Check if user is premium
        const adFree = await this.isAdFree();
        if (adFree) return false;

        // 2. Increment
        this._gameCount++;
        await AsyncStorage.setItem(GAME_COUNT_KEY, this._gameCount.toString());

        // 3. Check Frequency (Every 5th game)
        // Game 1, 2, 3, 4, 5 (Show), 6, 7, 8, 9, 10 (Show)
        return this._gameCount > 0 && this._gameCount % 5 === 0;
    },

    async purchaseRemoveAds() {
        await AsyncStorage.setItem(REMOVE_ADS_KEY, 'true');
    },

    async debugReset() {
        await AsyncStorage.removeItem(GAME_COUNT_KEY);
        this._gameCount = 0;
    }
};

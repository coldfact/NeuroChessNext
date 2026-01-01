import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { DatabaseService, soundService } from '../src/services';

export default function RootLayout() {
    useEffect(() => {
        DatabaseService.init().catch((e: unknown) => console.error("DB Init Failed:", e));
        soundService.init().catch((e: unknown) => console.error("Sound Init Failed:", e));
    }, []);

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#1a1a1a' },
                }}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
});

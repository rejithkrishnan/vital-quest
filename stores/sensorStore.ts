import { create } from 'zustand';
import { Pedometer } from 'expo-sensors';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

interface PedometerSubscription {
    remove: () => void;
}

interface SensorState {
    steps: number;
    isPedometerAvailable: boolean | null; // null = unknown
    isTracking: boolean;
    subscription: PedometerSubscription | null;
    permissionStatus: string | null;

    checkAvailability: () => Promise<boolean>;
    requestPermission: () => Promise<void>;
    fetchStepsToday: () => Promise<void>;
    startTracking: () => Promise<void>;
    stopTracking: () => void;
}

export const useSensorStore = create<SensorState>((set, get) => ({
    steps: 0,
    isPedometerAvailable: null,
    isTracking: false,
    subscription: null,
    permissionStatus: null,

    checkAvailability: async () => {
        try {
            if (Platform.OS === 'web') {
                set({ isPedometerAvailable: false });
                return false;
            }

            // Android explicit permission check
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
                );

                // If already granted, we can proceed
                if (granted) {
                    set({ permissionStatus: 'granted' });
                    try {
                        const isAvailable = await Pedometer.isAvailableAsync();
                        set({ isPedometerAvailable: isAvailable });
                        return isAvailable;
                    } catch (e) {
                        // Even if check succeeds, isAvailableAsync might fail on some devices
                        set({ isPedometerAvailable: false });
                        return false;
                    }
                } else {
                    set({ permissionStatus: 'denied' });
                    return false;
                }
            }

            // iOS handling via expo-sensors (standard way)
            const { status } = await Pedometer.getPermissionsAsync();
            set({ permissionStatus: status });
            if (status === 'granted') {
                const isAvailable = await Pedometer.isAvailableAsync();
                set({ isPedometerAvailable: isAvailable });
                return isAvailable;
            } else if (status === 'undetermined') {
                // Try requesting immediately on iOS if undetermined
                const { status: newStatus } = await Pedometer.requestPermissionsAsync();
                set({ permissionStatus: newStatus });
                if (newStatus === 'granted') {
                    const isAvailable = await Pedometer.isAvailableAsync();
                    set({ isPedometerAvailable: isAvailable });
                    return isAvailable;
                }
            }
            // Denied
            set({ isPedometerAvailable: false });
            return false;
        } catch (error) {
            console.log('Error checking Pedometer availability:', error);
            set({ isPedometerAvailable: false });
            return false;
        }
    },

    requestPermission: async () => {
        try {
            if (Platform.OS === 'web') return;

            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
                    {
                        title: "Activity Tracking Permission",
                        message: "Vital Quest needs access to step tracking to count your daily steps.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('🔓 Android Permission GRANTED via PermissionsAndroid');
                    set({ permissionStatus: 'granted' });
                    const isAvailable = await Pedometer.isAvailableAsync();
                    set({ isPedometerAvailable: isAvailable });
                    if (isAvailable) get().startTracking();
                } else {
                    console.log('🔒 Android Permission DENIED');
                    set({ permissionStatus: 'denied' });
                    Alert.alert(
                        "Permission Required",
                        "We need physical activity permission to count your steps. Please enable it in Settings."
                    );
                }
                return;
            }

            // iOS
            const { status } = await Pedometer.requestPermissionsAsync();
            set({ permissionStatus: status });
            if (status === 'granted') {
                const isAvailable = await Pedometer.isAvailableAsync();
                set({ isPedometerAvailable: isAvailable });
                if (isAvailable) get().startTracking();
            }
        } catch (error) {
            console.log('Error requesting permission:', error);
        }
    },

    fetchStepsToday: async () => {
        const { isPedometerAvailable } = get();
        if (isPedometerAvailable === false) return;

        // Android does not support getting step count for a date range
        if (Platform.OS === 'android') {
            console.log('🤖 Android: Skipping fetchStepsToday (history not supported)');
            return;
        }

        try {
            const start = new Date();
            start.setHours(0, 0, 0, 0); // Midnight today
            const end = new Date();

            const result = await Pedometer.getStepCountAsync(start, end);
            console.log('👟 Steps today:', result.steps);
            set({ steps: result.steps });
        } catch (error) {
            console.log('Error fetching steps:', error);
        }
    },

    startTracking: async () => {
        const { isPedometerAvailable, subscription, checkAvailability, fetchStepsToday } = get();

        // Don't start if already tracking
        if (subscription) return;

        // Check availability if unknown
        if (isPedometerAvailable === null) {
            const available = await checkAvailability();
            if (!available) return;
        } else if (!isPedometerAvailable) {
            return;
        }

        // Fetch today's steps first (iOS only)
        await fetchStepsToday();

        try {
            // Subscribe to step updates
            const sub = Pedometer.watchStepCount(result => {
                set({ steps: result.steps });
            });

            console.log('👟 Pedometer tracking started');
            set({ subscription: sub, isTracking: true });
        } catch (error) {
            console.log('Error starting pedometer subscription:', error);
        }
    },

    stopTracking: () => {
        const { subscription } = get();
        if (subscription) {
            subscription.remove();
            set({ subscription: null, isTracking: false });
        }
    },
}));

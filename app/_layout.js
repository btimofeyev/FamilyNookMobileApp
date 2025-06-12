import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FamilyProvider, useFamily } from '../context/FamilyContext';
import { NotificationProvider } from '../context/NotificationContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

// Keep the splash screen visible while we check authentication
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
    // Load any custom fonts if needed
    const [fontsLoaded] = useFonts({
        // Add custom fonts here if needed
    });

    useEffect(() => {
        if (fontsLoaded) {
            // This is now handled in RootLayoutNav to prevent race conditions
        }
    }, [fontsLoaded]);


    if (!fontsLoaded) {
        return null; // Still loading fonts
    }

    return (
        <AuthProvider>
            <NotificationProvider>
                <FamilyProvider>
                    <RootLayoutNav />
                </FamilyProvider>
            </NotificationProvider>
        </AuthProvider>
    );
};

// --- REDESIGNED LOADING/RETRY SCREEN ---
const LoadingScreen = ({ showRetry, onRetry }) => (
    <LinearGradient
        colors={['#d4fc79', '#96e6a1']}
        style={styles.loadingContainer}
    >
        <StatusBar style="dark" />
        {showRetry ? (
            <View style={{ alignItems: 'center' }}>
                <Text style={styles.retryText}>
                    We're having trouble connecting to your account.
                </Text>
                <TouchableOpacity
                    onPress={onRetry}
                    style={styles.buttonContainer}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#20bf55', '#01baef']}
                        style={styles.buttonGradient}
                    >
                        <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.buttonText}>
                            Retry Connection
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        ) : (
            <ActivityIndicator size="large" color="#2c5b2f" />
        )}
    </LinearGradient>
);

// Navigation structure with authentication
function RootLayoutNav() {
    const { isAuthenticated, loading: authLoading, authInitialized, refreshUserSession, user } = useAuth();
    const { familiesInitialized, loading: familyLoading, hasFamilies, retryLoadFamilies } = useFamily();
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        const hideSplash = async () => {
            if (authInitialized) {
                try {
                    await SplashScreen.hideAsync();
                } catch (e) {
                    console.warn('Error hiding splash screen:', e);
                }
            }
        };
        hideSplash();
    }, [authInitialized]);

    useEffect(() => {
        if (authInitialized && isAuthenticated && familiesInitialized && !hasFamilies && !familyLoading) {
            const checkIfInFamilySetup = async () => {
                if (!user?.family_id) {
                    setShowRetry(false);
                    return;
                }
                const registrationTime = await SecureStore.getItemAsync('registration_time');
                const isRecentRegistration = registrationTime &&
                    (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000;

                if (isRecentRegistration && !user?.family_id) {
                    setShowRetry(false);
                } else if (!isRecentRegistration) {
                    const timer = setTimeout(() => {
                        setShowRetry(true);
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            };
            checkIfInFamilySetup();
        } else {
            setShowRetry(false);
        }
    }, [authInitialized, isAuthenticated, familiesInitialized, hasFamilies, familyLoading, user]);

    const handleRetry = async () => {
        setShowRetry(false);
        try {
            await refreshUserSession();
            await retryLoadFamilies();
        } catch (error) {
            console.error('Retry failed:', error);
            setShowRetry(true);
        }
    };

    if (!authInitialized || authLoading) {
        return <LoadingScreen showRetry={false} />;
    }

    if (isAuthenticated && !familyLoading && !hasFamilies && showRetry) {
        return <LoadingScreen showRetry={true} onRetry={handleRetry} />;
    }

    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    // --- This is the critical change to allow screen backgrounds to be visible ---
                    contentStyle: { backgroundColor: 'transparent' },
                    animation: 'fade',
                }}
            >
                {isAuthenticated ? (
                    user?.family_id ? (
                        <Stack.Screen name="(tabs)" />
                    ) : (
                        <Stack.Screen name="(family-setup)" options={{ gestureEnabled: false }}/>
                    )
                ) : (
                    <Stack.Screen name="(auth)" />
                )}
            </Stack>
        </>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    retryText: {
        color: '#2c5b2f',
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        fontWeight: '500',
    },
    buttonContainer: {
        height: 54,
        borderRadius: 27, // Pill shape
        overflow: 'hidden',
        shadowColor: '#96e6a1', // Pastel green glow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 12,
    },
    buttonGradient: {
        height: '100%',
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});


export default RootLayout;
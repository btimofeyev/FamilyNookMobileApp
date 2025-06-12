import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '@env';
import { useFamily } from '../../context/FamilyContext';
import { Ionicons } from '@expo/vector-icons';

const API_ENDPOINT = API_URL || 'https://famlynook.com';

// Reusable component for the "Liquid Glass" input fields, styled for the pastel theme
const LiquidInput = ({ label, icon, error, children }) => {
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <BlurView
                intensity={80}
                tint="light"
                style={[styles.inputBlurView, error ? styles.inputError : null]}
            >
                <Ionicons name={icon} size={20} color="rgba(0, 0, 0, 0.5)" style={styles.inputIcon} />
                {children}
            </BlurView>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};


export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const { login, loading, error: authError } = useAuth();
    const { families, refreshFamilies, loading: familyLoading } = useFamily();
    const router = useRouter();

    // --- All validation and handleLogin logic remains unchanged ---
    const validateInputs = () => {
        let isValid = true;
        if (!email.trim()) {
            setEmailError('Email is required');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Please enter a valid email');
            isValid = false;
        } else {
            setEmailError('');
        }
        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            isValid = false;
        } else {
            setPasswordError('');
        }
        return isValid;
    };

    const handleLogin = async () => {
        if (!validateInputs()) return;
        const result = await login(email, password);
        if (result.success) {
            try {
                await refreshFamilies();
                const response = await axios.get(`${API_ENDPOINT}/api/dashboard/user/families`);
                if (response.data && response.data.length > 0) {
                    setTimeout(() => router.push('/(tabs)/feed'), 100);
                    return;
                }
                let attempts = 0;
                const maxAttempts = 50;
                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                    if (familyLoading) { continue; }
                    if (families && families.length > 0) {
                        setTimeout(() => router.push('/(tabs)/feed'), 100);
                        return;
                    }
                    if (!familyLoading) { break; }
                }
                setTimeout(() => router.push('/(auth)/family-setup'), 100);
            } catch (error) {
                if (families && families.length > 0) {
                    setTimeout(() => router.push('/(tabs)/feed'), 100);
                } else {
                    setTimeout(() => router.push('/(auth)/family-setup'), 100);
                }
            }
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#d4fc79', '#96e6a1']}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/mainlogo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.appName}>FamlyNook</Text>
                        <Text style={styles.tagline}>Connecting families, one moment at a time</Text>
                    </View>

                    <BlurView intensity={90} tint="light" style={styles.formContainer}>
                        <Text style={styles.title}>Welcome Back</Text>

                        {authError && <Text style={styles.authErrorText}>{authError}</Text>}

                        <LiquidInput label="Email" icon="mail-outline" error={emailError}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                selectionColor="rgba(0, 0, 0, 0.5)"
                            />
                        </LiquidInput>

                        <LiquidInput label="Password" icon="lock-closed-outline" error={passwordError}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                selectionColor="rgba(0, 0, 0, 0.5)"
                            />
                        </LiquidInput>

                        <Link href="/forgot-password" asChild>
                            <TouchableOpacity style={styles.forgotPasswordButton}>
                                <Text style={styles.forgotPassword}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </Link>

                        <TouchableOpacity
                            style={styles.buttonContainer}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#20bf55', '#01baef']}
                                style={styles.buttonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Sign In</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.signUpContainer}>
                            <Text style={styles.signUpText}>Don't have an account? </Text>
                            <Link href="/register" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.signUpLink}>Sign Up</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </BlurView>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

// Styles optimized for a light, pastel green theme
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 100,
        height: 100,
    },
    appName: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#2c5b2f', // Dark green for contrast
        marginTop: 16,
        textShadowColor: 'rgba(255, 255, 255, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(44, 91, 47, 0.8)', // Dark green for contrast
        marginTop: 4,
    },
    formContainer: {
        width: '100%',
        padding: 24,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#000000',
        textAlign: 'center',
    },
    authErrorText: {
        color: '#D90429',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.6)',
        marginBottom: 8,
    },
    inputBlurView: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 54,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    inputIcon: {
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingRight: 16,
        fontSize: 16,
        color: '#000000',
        backgroundColor: 'transparent',
    },
    inputError: {
        borderColor: '#D90429',
    },
    errorText: {
        color: '#D90429',
        fontSize: 13,
        marginTop: 6,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginVertical: 15,
    },
    forgotPassword: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.6)',
        fontWeight: '500',
    },
    buttonContainer: {
        height: 54,
        marginTop: 20,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
    },
    signUpText: {
        fontSize: 15,
        color: 'rgba(0, 0, 0, 0.6)',
    },
    signUpLink: {
        fontSize: 15,
        color: '#20bf55', // Contrasting green
        fontWeight: 'bold',
    },
});
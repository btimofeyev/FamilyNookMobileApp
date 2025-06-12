import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    ScrollView,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Reusable component for the "Liquid Glass" input fields
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

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const { register, loading, error: authError } = useAuth();
    const router = useRouter();

    // --- All validation and handleRegister logic remains unchanged ---
    const validateInputs = () => {
        let isValid = true;

        if (!name.trim()) {
            setNameError('Name is required');
            isValid = false;
        } else {
            setNameError('');
        }

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

        if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            isValid = false;
        } else {
            setConfirmPasswordError('');
        }

        return isValid;
    };

    const handleRegister = async () => {
        if (!validateInputs()) return;
        await register(name, email, password);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <StatusBar style="dark" />
            {/* --- NEW PASTEL GREEN GRADIENT --- */}
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

                    {/* --- UPDATED BLURVIEW FOR LIGHTER BACKGROUND --- */}
                    <BlurView intensity={90} tint="light" style={styles.formContainer}>
                        <Text style={styles.title}>Create Account</Text>

                        {authError && <Text style={styles.authErrorText}>{authError}</Text>}

                        <LiquidInput label="Full Name" icon="person-outline" error={nameError}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your full name"
                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                selectionColor="rgba(0, 0, 0, 0.5)"
                            />
                        </LiquidInput>

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
                                placeholder="Create a password"
                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                selectionColor="rgba(0, 0, 0, 0.5)"
                            />
                        </LiquidInput>

                        <LiquidInput label="Confirm Password" icon="lock-closed-outline" error={confirmPasswordError}>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                selectionColor="rgba(0, 0, 0, 0.5)"
                            />
                        </LiquidInput>

                        <TouchableOpacity
                            style={styles.buttonContainer}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                             {/* The button itself is now a solid, contrasting color for emphasis */}
                            <LinearGradient
                                colors={['#20bf55', '#01baef']}
                                style={styles.buttonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Create Account</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.signInContainer}>
                            <Text style={styles.signInText}>Already have an account? </Text>
                            <Link href="/login" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.signInLink}>Sign In</Text>
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
    buttonContainer: {
        height: 54,
        marginTop: 20,
        borderRadius: 27, // Pill shape
        overflow: 'hidden', // Important for gradient border radius
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
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
    },
    signInText: {
        fontSize: 15,
        color: 'rgba(0, 0, 0, 0.6)',
    },
    signInLink: {
        fontSize: 15,
        color: '#20bf55', // Contrasting green
        fontWeight: 'bold',
    },
});
import React, { useState, useRef, useEffect } from 'react';
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
    ScrollView,
    Animated,
    Dimensions
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Subtle Floating Elements for Depth
const FloatingElements = () => {
    const elements = useRef([]);
    
    useEffect(() => {
        elements.current = Array.from({ length: 6 }, (_, i) => ({
            id: i,
            translateY: new Animated.Value(height + 100),
            opacity: new Animated.Value(0),
            size: Math.random() * 60 + 30,
            delay: Math.random() * 5000
        }));

        const animateElements = () => {
            elements.current.forEach((element) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(element.delay),
                        Animated.parallel([
                            Animated.timing(element.translateY, {
                                toValue: -100,
                                duration: 22000,
                                useNativeDriver: true,
                            }),
                            Animated.sequence([
                                Animated.timing(element.opacity, {
                                    toValue: 0.25,
                                    duration: 2500,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(element.opacity, {
                                    toValue: 0,
                                    duration: 2000,
                                    useNativeDriver: true,
                                })
                            ])
                        ])
                    ])
                ).start();
            });
        };

        animateElements();
    }, []);

    return (
        <View style={styles.elementsContainer}>
            {elements.current.map(element => (
                <Animated.View
                    key={element.id}
                    style={[
                        styles.floatingElement,
                        {
                            width: element.size,
                            height: element.size,
                            left: Math.random() * (width - element.size),
                            transform: [{ translateY: element.translateY }],
                            opacity: element.opacity
                        }
                    ]}
                />
            ))}
        </View>
    );
};

// True Liquid Glass Input Component
const LiquidGlassInput = ({ label, icon, error, children, value }) => {
    const focusAnim = useRef(new Animated.Value(0)).current;
    const [isFocused, setIsFocused] = useState(false);

    const onFocus = () => {
        setIsFocused(true);
        Animated.timing(focusAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const onBlur = () => {
        setIsFocused(false);
        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.4)']
    });

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <Animated.View style={[styles.inputWrapper, { borderColor }]}>
                <BlurView
                    intensity={isFocused ? 120 : 80}
                    tint="light"
                    style={styles.inputBlur}
                >
                    <View style={styles.inputContent}>
                        <Ionicons 
                            name={icon} 
                            size={20} 
                            color={isFocused ? "#1f2937" : "rgba(31, 41, 55, 0.7)"} 
                            style={styles.inputIcon} 
                        />
                        {React.cloneElement(children, { onFocus, onBlur })}
                    </View>
                    {/* Liquid Glass Overlay */}
                    <View style={styles.liquidOverlay} />
                </BlurView>
            </Animated.View>
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

    // Subtle entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const validateInputs = () => {
        let isValid = true;
        
        if (!name.trim()) {
            setNameError('Name is required');
            isValid = false;
        } else if (name.trim().length < 2) {
            setNameError('Name must be at least 2 characters');
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

        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            isValid = false;
        } else {
            setConfirmPasswordError('');
        }

        return isValid;
    };

    const handleRegister = async () => {
        if (!validateInputs()) return;
        
        const result = await register(name.trim(), email.trim(), password);
        if (result.success) {
            if (result.needsFamilySetup) {
                router.push('/(auth)/family-setup');
            } else {
                router.push('/(tabs)/feed');
            }
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <StatusBar style="dark" />
            
            {/* True Liquid Glass Background with Blue Theme */}
            <LinearGradient
                colors={['#e0f2fe', '#bae6fd', '#7dd3fc']}
                style={styles.container}
            >
                <FloatingElements />
                
                {/* Background Blur Effect */}
                <BlurView intensity={20} tint="light" style={styles.backgroundBlur} />
                
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo Section */}
                    <Animated.View style={[styles.logoSection, { opacity: fadeAnim }]}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/mainlogo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.appName}>Join FamlyNook</Text>
                        <Text style={styles.tagline}>Create your family's digital home</Text>
                    </Animated.View>

                    {/* Main Liquid Glass Card */}
                    <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim }]}>
                        <BlurView intensity={100} tint="light" style={styles.liquidCard}>
                            <LinearGradient
                                colors={[
                                    'rgba(255, 255, 255, 0.4)',
                                    'rgba(255, 255, 255, 0.1)',
                                    'rgba(255, 255, 255, 0.3)'
                                ]}
                                style={styles.cardGradient}
                            ><Text style={styles.cardTitle}>Create Account</Text>
                                
                                {authError && (
                                    <BlurView intensity={80} tint="light" style={styles.errorCard}>
                                        <View style={styles.errorContent}>
                                            <Ionicons name="warning-outline" size={16} color="#dc2626" />
                                            <Text style={styles.errorMessage}>{authError}</Text>
                                        </View>
                                    </BlurView>
                                )}

                                <LiquidGlassInput label="Full Name" icon="person-outline" error={nameError} value={name}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your full name"
                                        placeholderTextColor="rgba(31, 41, 55, 0.5)"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                        selectionColor="#1f2937"
                                    />
                                </LiquidGlassInput>

                                <LiquidGlassInput label="Email" icon="mail-outline" error={emailError} value={email}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your email"
                                        placeholderTextColor="rgba(31, 41, 55, 0.5)"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        selectionColor="#1f2937"
                                    />
                                </LiquidGlassInput>

                                <LiquidGlassInput label="Password" icon="lock-closed-outline" error={passwordError} value={password}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Create a secure password"
                                        placeholderTextColor="rgba(31, 41, 55, 0.5)"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        selectionColor="#1f2937"
                                    />
                                </LiquidGlassInput>

                                <LiquidGlassInput label="Confirm Password" icon="checkmark-circle-outline" error={confirmPasswordError} value={confirmPassword}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirm your password"
                                        placeholderTextColor="rgba(31, 41, 55, 0.5)"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                        selectionColor="#1f2937"
                                    />
                                </LiquidGlassInput>

                                {/* Liquid Glass Button */}
                                <TouchableOpacity
                                    style={styles.buttonWrapper}
                                    onPress={handleRegister}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
                                        <LinearGradient
                                            colors={['rgba(15, 23, 42, 0.9)', 'rgba(30, 41, 59, 0.9)']}
                                            style={styles.buttonGradient}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFFFFF" size="small" />
                                            ) : (
                                                <Text style={styles.buttonText}>Create Account</Text>
                                            )}
                                        </LinearGradient>
                                    </BlurView>
                                </TouchableOpacity>

                                {/* Terms Section */}
                                <BlurView intensity={60} tint="light" style={styles.termsCard}>
                                    <Text style={styles.termsText}>
                                        By creating an account, you agree to our{' '}
                                        <Text style={styles.termsLink}>Terms of Service</Text>
                                        {' '}and{' '}
                                        <Text style={styles.termsLink}>Privacy Policy</Text>
                                    </Text>
                                </BlurView>

                                {/* Footer */}
                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>Already have an account? </Text>
                                    <Link href="/login" asChild>
                                        <TouchableOpacity>
                                            <Text style={styles.footerLink}>Sign in</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>
                            </LinearGradient>
                        </BlurView>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    elementsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    },
    floatingElement: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 1000,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    backgroundBlur: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
        minHeight: height,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
    },
    logo: {
        width: 60,
        height: 60,
    },
    appName: {
        fontSize: 38,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(15, 23, 42, 0.7)',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
        fontWeight: '500',
    },
    cardWrapper: {
        width: '100%',
        maxWidth: 400,
    },
    liquidCard: {
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 20,
    },
    cardGradient: {
        padding: 28,
    },
    cardTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 28,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    },
    errorCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.2)',
    },
    errorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(254, 242, 242, 0.8)',
    },
    errorMessage: {
        color: '#dc2626',
        fontSize: 14,
        marginLeft: 8,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        color: '#374151',
        marginBottom: 8,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    inputWrapper: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
    },
    inputBlur: {
        height: 56,
        justifyContent: 'center',
        position: 'relative',
    },
    inputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: '100%',
        zIndex: 2,
    },
    liquidOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
        fontWeight: '500',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 13,
        marginTop: 6,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    buttonWrapper: {
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: 'rgba(15, 23, 42, 0.3)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 12,
    },
    buttonBlur: {
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    buttonGradient: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    termsCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    termsText: {
        fontSize: 13,
        color: 'rgba(15, 23, 42, 0.7)',
        textAlign: 'center',
        lineHeight: 18,
        padding: 16,
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    termsLink: {
        color: '#374151',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 15,
        color: '#6b7280',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
    footerLink: {
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    },
});
// app/(auth)/forgot-password.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '@env';

const { width, height } = Dimensions.get('window');

const API_ENDPOINT = API_URL || 'https://famlynook.com';

// Liquid Glass Input Component
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
          <View style={styles.liquidOverlay} />
        </BlurView>
      </Animated.View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const topInset = useSafeAreaInsets().top;
  
  // Subtle entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      await axios.post(`${API_ENDPOINT}/api/auth/forgot-password`, { email });
      
      Alert.alert(
        "Reset Link Sent",
        "If an account exists with this email, you will receive a password reset link shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(
        "Reset Link Sent",
        "If an account exists with this email, you will receive a password reset link shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <StatusBar style="dark" />
      
      {/* Liquid Glass Background with Blue Theme */}
      <LinearGradient
        colors={['#e0f2fe', '#bae6fd', '#7dd3fc']}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topInset + 40 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back Button */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <BlurView intensity={80} tint="light" style={styles.backButtonBlur}>
                <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
                <Text style={styles.backButtonText}>Back</Text>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Main Content Card */}
          <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim }]}>
            <BlurView intensity={100} tint="light" style={styles.liquidCard}>
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.4)',
                  'rgba(255, 255, 255, 0.1)',
                  'rgba(255, 255, 255, 0.3)'
                ]}
                style={styles.cardGradient}
              >
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.description}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
                
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

                {/* Liquid Glass Button */}
                <TouchableOpacity
                  style={styles.buttonWrapper}
                  onPress={handleResetPassword}
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
                        <Text style={styles.buttonText}>Send Reset Link</Text>
                      )}
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    minHeight: height,
  },
  header: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  description: {
    fontSize: 16,
    color: 'rgba(15, 23, 42, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
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
});
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@env';

const { width, height } = Dimensions.get('window');

const API_ENDPOINT = API_URL || 'https://famlynook.com';

// Liquid Glass Input Component
const LiquidGlassInput = ({ label, icon, error, children, value, showStrengthBar = false, passwordStrength = 0 }) => {
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

  const getStrengthColor = () => {
    if (passwordStrength < 50) return '#FF3B30';
    if (passwordStrength < 75) return '#FFCC00';
    return '#34C759';
  };

  const getStrengthText = () => {
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Medium';
    return 'Strong';
  };

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
      {showStrengthBar && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View 
              style={[
                styles.strengthIndicator, 
                { 
                  width: `${passwordStrength}%`,
                  backgroundColor: getStrengthColor()
                }
              ]} 
            />
          </View>
          <Text style={styles.strengthText}>
            Password strength: {getStrengthText()}
          </Text>
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token } = params;
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

  useEffect(() => {
    if (!token) {
      Alert.alert(
        "Invalid Token",
        "The password reset link is invalid or has expired.",
        [{ text: "OK", onPress: () => router.push('/login') }]
      );
    }
  }, [token]);

  const validatePassword = () => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  };

  const validateConfirmPassword = () => {
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    } else {
      setConfirmPasswordError('');
      return true;
    }
  };

  const calculatePasswordStrength = (value) => {
    let strength = 0;
    
    if (value.length >= 8) strength += 25;
    if (value.match(/[A-Z]/)) strength += 25;
    if (value.match(/[0-9]/)) strength += 25;
    if (value.match(/[^A-Za-z0-9]/)) strength += 25;
    
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    calculatePasswordStrength(text);
  };

  const handleResetPassword = async () => {
    setError('');
    
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();
    
    if (!isPasswordValid || !isConfirmValid) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_ENDPOINT}/api/auth/reset-password`, { 
        token, 
        password 
      });
      
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error) {
      setError(
        error.response?.data?.error || 
        "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <StatusBar style="dark" />
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
            <View style={styles.errorContainer}>
              <BlurView intensity={100} tint="light" style={styles.liquidCard}>
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.4)',
                    'rgba(255, 255, 255, 0.1)',
                    'rgba(255, 255, 255, 0.3)'
                  ]}
                  style={styles.cardGradient}
                >
                  <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                  <Text style={styles.errorTitle}>Invalid Token</Text>
                  <Text style={styles.errorDescription}>
                    The password reset link is invalid or has expired.
                  </Text>
                </LinearGradient>
              </BlurView>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

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
              onPress={() => router.push('/login')}
            >
              <BlurView intensity={80} tint="light" style={styles.backButtonBlur}>
                <Ionicons name="arrow-back" size={20} color="#1C1C1E" />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Error Alert */}
          {error ? (
            <Animated.View style={[styles.alertContainer, { opacity: fadeAnim }]}>
              <BlurView intensity={100} tint="light" style={styles.alertCard}>
                <LinearGradient
                  colors={[
                    'rgba(255, 59, 48, 0.1)',
                    'rgba(255, 59, 48, 0.05)'
                  ]}
                  style={styles.alertGradient}
                >
                  <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                  <Text style={styles.alertText}>{error}</Text>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          ) : null}
          
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
                {success ? (
                  <View style={styles.successContainer}>
                    <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                    <Text style={styles.title}>Password Reset Successful</Text>
                    <Text style={styles.description}>
                      Your password has been reset successfully. You will be redirected to the login page shortly.
                    </Text>
                    <ActivityIndicator size="large" color="#7dd3fc" style={styles.loader} />
                  </View>
                ) : (
                  <>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.description}>
                      Create a new password for your account.
                    </Text>
                    
                    <LiquidGlassInput 
                      label="New Password" 
                      icon="lock-closed-outline" 
                      error={passwordError} 
                      value={password}
                      showStrengthBar={true}
                      passwordStrength={passwordStrength}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        placeholderTextColor="rgba(31, 41, 55, 0.5)"
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry
                        autoCapitalize="none"
                        selectionColor="#1f2937"
                      />
                    </LiquidGlassInput>
                    
                    <LiquidGlassInput 
                      label="Confirm Password" 
                      icon="lock-closed-outline" 
                      error={confirmPasswordError} 
                      value={confirmPassword}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm your password"
                        placeholderTextColor="rgba(31, 41, 55, 0.5)"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        selectionColor="#1f2937"
                      />
                    </LiquidGlassInput>

                    {/* Liquid Glass Button */}
                    <TouchableOpacity
                      style={styles.buttonWrapper}
                      onPress={handleResetPassword}
                      disabled={loading || !password || !confirmPassword}
                      activeOpacity={0.8}
                    >
                      <BlurView 
                        intensity={80} 
                        tint={(!password || !confirmPassword) ? "light" : "dark"} 
                        style={styles.buttonBlur}
                      >
                        <LinearGradient
                          colors={(!password || !confirmPassword) ? 
                            ['rgba(125, 211, 252, 0.3)', 'rgba(125, 211, 252, 0.2)'] :
                            ['rgba(15, 23, 42, 0.9)', 'rgba(30, 41, 59, 0.9)']
                          }
                          style={styles.buttonGradient}
                        >
                          {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={[styles.buttonText, (!password || !confirmPassword) && styles.buttonTextDisabled]}>
                              Reset Password
                            </Text>
                          )}
                        </LinearGradient>
                      </BlurView>
                    </TouchableOpacity>
                  </>
                )}
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
    backgroundColor: 'transparent',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 10 : 40,
    marginBottom: 30,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0f172a',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  description: {
    fontSize: 16,
    color: 'rgba(15, 23, 42, 0.7)',
    marginBottom: 32,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    color: '#3C3C43',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorMessage: {
    color: '#B71C1C',
    fontSize: 14,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 5,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthIndicator: {
    height: '100%',
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#7dd3fc',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(125, 211, 252, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(125, 211, 252, 0.5)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 20,
  }
});
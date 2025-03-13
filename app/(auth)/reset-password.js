// app/(auth)/reset-password.js
import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { API_URL } from '@env';

// Fallback in case env variable isn't loaded
const API_ENDPOINT = API_URL || 'https://famlynook.com';

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

  useEffect(() => {
    if (!token) {
      Alert.alert(
        "Invalid Token",
        "The password reset link is invalid or has expired.",
        [{ text: "OK", onPress: () => router.push('/login') }]
      );
    } else {
      console.log("Token received:", token);
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
    // Reset any previous errors
    setError('');
    
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();
    
    if (!isPasswordValid || !isConfirmValid) return;

    setLoading(true);
    try {
      console.log(`Sending reset request to ${API_ENDPOINT}/api/auth/reset-password with token: ${token}`);
      
      // Call reset password API
      const response = await axios.post(`${API_ENDPOINT}/api/auth/reset-password`, { 
        token, 
        password 
      });
      
      console.log('Reset password response:', response.data);
      
      setSuccess(true);
      
      // Navigate to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error) {
      console.log('Error resetting password:', error.response?.data || error.message);
      
      setError(
        error.response?.data?.error || 
        "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 50) return '#FF3B30'; // Red
    if (passwordStrength < 75) return '#FFCC00'; // Yellow
    return '#34C759'; // Green
  };

  const getStrengthText = () => {
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Medium';
    return 'Strong';
  };

  if (!token) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid reset token.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
          ) : null}
          
          <View style={styles.content}>
            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.title}>Password Reset Successful</Text>
                <Text style={styles.description}>
                  Your password has been reset successfully. You will be redirected to the login page shortly.
                </Text>
                <ActivityIndicator color="#4A90E2" style={styles.loader} />
              </View>
            ) : (
              <>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.description}>
                  Create a new password for your account.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={[styles.input, passwordError ? styles.inputError : null]}
                    placeholder="Enter new password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry
                    autoCapitalize="none"
                    onBlur={validatePassword}
                  />
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
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    onBlur={validateConfirmPassword}
                  />
                  {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
                </View>

                <TouchableOpacity 
                  style={[
                    styles.button, 
                    (!password || !confirmPassword) ? styles.buttonDisabled : null
                  ]} 
                  onPress={handleResetPassword}
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 15,
    color: '#1C1C1E',
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 30,
    lineHeight: 22,
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
    backgroundColor: '#4A90E2',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A1C6F7',
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
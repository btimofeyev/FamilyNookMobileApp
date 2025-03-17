// app/(auth)/login.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '@env';
import { useFamily } from '../../context/FamilyContext';

// Fallback in case env variable isn't loaded
const API_ENDPOINT = API_URL || 'https://famlynook.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, loading, error } = useAuth();
  const { families, refreshFamilies, loading: familyLoading } = useFamily();
  const router = useRouter();

  useEffect(() => {
    // Log environment information
    console.log('Environment check:');
    console.log('API_URL from env:', API_URL);
    console.log('API_ENDPOINT being used:', API_ENDPOINT);
    console.log('Full endpoint URL:', `${API_ENDPOINT}/api/health`);
    
    const testConnection = async () => {
      try {
        console.log('Testing API connection...');
        console.log('Request URL:', `${API_ENDPOINT}/api/health`);
        
        const response = await axios.get(`${API_ENDPOINT}/api/health`);
        console.log('API connection successful:', response.data);
        console.log('Response headers:', response.headers);
        console.log('Response status:', response.status);
      } catch (error) {
        console.error('API connection failed:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          headers: error.response?.headers,
          data: error.response?.data,
          request: error.request ? 'Request was made but no response' : 'Request setup failed'
        });
        
        // Log network info if available
        console.log('Network info:', {
          online: typeof navigator !== 'undefined' && navigator.onLine
        });
      }
    };
    
    testConnection();
  }, []);

  const validateInputs = () => {
    let isValid = true;

    // Email validation
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password validation
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
    console.log('Login result - ignoring family_id as it is not reliable:', result);
    
    if (result.success) {
      try {
        // Start loading families
        console.log('Starting family refresh...');
        await refreshFamilies();
        
        // Get the initial families data
        const response = await axios.get(`${API_ENDPOINT}/api/dashboard/user/families`);
        console.log('Direct families API response:', response.data);
        
        if (response.data && response.data.length > 0) {
          console.log('User has families from direct API check:', response.data);
          setTimeout(() => {
            router.push('/(tabs)/feed');
          }, 100);
          return;
        }
        
        // If no families found in direct check, wait for context to update
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        while (attempts < maxAttempts) {
          // Wait a bit between checks
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          
          // Skip if still loading
          if (familyLoading) {
            console.log('Still loading families in context, waiting... (attempt', attempts, 'of', maxAttempts, ')');
            continue;
          }
          
          // Check context data
          if (families && families.length > 0) {
            console.log('Found families in context:', families);
            setTimeout(() => {
              router.push('/(tabs)/feed');
            }, 100);
            return;
          }
          
          // If loading is complete and no families found, break
          if (!familyLoading) {
            console.log('Family loading complete, no families found');
            break;
          }
        }
        
        // If we get here, no families were found
        console.log('No families found after all checks, proceeding to family setup');
        setTimeout(() => {
          router.push('/(auth)/family-setup');
        }, 100);
        
      } catch (error) {
        console.error('Error checking families:', error);
        // Even on error, check the context one last time
        if (families && families.length > 0) {
          console.log('Found families in error handler:', families);
          setTimeout(() => {
            router.push('/(tabs)/feed');
          }, 100);
        } else {
          console.log('No families found in error handler, proceeding to setup');
          setTimeout(() => {
            router.push('/(auth)/family-setup');
          }, 100);
        }
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/mainlogo.png')}
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.appName}>FamlyNook</Text>
        <Text style={styles.tagline}>Connecting families, one moment at a time</Text>
      </View>

      <BlurView intensity={15} tint="dark" style={styles.formContainer}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Welcome Back</Text>
        
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Enter your email"
              placeholderTextColor="#8E8E93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor="#3BAFBC"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Enter your password"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              selectionColor="#3BAFBC"
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          <View style={styles.forgotPasswordContainer}>
            <Link href="/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPasswordButton}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity 
            style={styles.buttonContainer} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1E2B2F', '#3BAFBC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#F5F5F7" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#1E2B2F', // Midnight Green background
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F5F5F7', // Soft White for the app name
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5, // Apple-style tighter letter spacing
  },
  tagline: {
    fontSize: 16,
    color: '#8E8E93', // Slate Gray for the tagline
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(18, 18, 18, 0.85)', // Onyx Black with opacity
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    color: '#F5F5F7', // Soft White for the title
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#F5F5F7', // Soft White for labels
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.3)', // Subtle Teal Glow for borders
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.6)', // Slightly transparent Onyx Black
    color: '#F5F5F7', // Soft White for text
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
  },
  inputError: {
    borderColor: '#FF453A', // Apple's system red color
  },
  errorText: {
    color: '#FF453A', // Apple's system red color
    fontSize: 14,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 36,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
  },
  forgotPassword: {
    fontSize: 15,
    color: '#3BAFBC', // Teal Glow for interactive elements
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  buttonContainer: {
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonGradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F7', // Soft White for button text
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: -0.2,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 36,
  },
  signupText: {
    fontSize: 15,
    color: '#8E8E93', // Slate Gray for secondary text
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  signupLink: {
    fontSize: 15,
    color: '#3BAFBC', // Teal Glow for interactive links
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});
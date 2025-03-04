// app/(auth)/login.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import axios from 'axios';

const API_URL = 'http://192.168.100.96:3001';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing API connection...');
        const response = await axios.get(`${API_URL}/api/health`);
        console.log('API connection successful:', response.data);
      } catch (error) {
        console.error('API connection failed:', {
          message: error.message,
          code: error.code,
          response: error.response?.data
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
    console.log('Login result:', result);
    
    if (result.success) {
      console.log('Login successful, redirecting to feed...');
      router.replace('/(tabs)/feed');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')}  // Make sure to add your logo here
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.appName}>FamlyNook</Text>
        <Text style={styles.tagline}>Connecting families, one moment at a time</Text>
      </View>

      <BlurView intensity={20} tint="dark" style={styles.formContainer}>
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
            selectionColor="#4CC2C4"
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
            selectionColor="#4CC2C4"
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <Link href="/forgot-password" asChild>
          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    color: '#F0C142', // Golden color from the logo
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  tagline: {
    fontSize: 16,
    color: '#AEAEB2',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback for when BlurView doesn't work
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#38383A',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  inputError: {
    borderColor: '#FF453A',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  forgotPassword: {
    fontSize: 15,
    color: '#4CC2C4', // Teal color from the logo
    textAlign: 'right',
    marginTop: 12,
    marginBottom: 36,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  button: {
    backgroundColor: '#F0C142', // Golden yellow from the logo
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 36,
  },
  signupText: {
    fontSize: 15,
    color: '#AEAEB2',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  signupLink: {
    fontSize: 15,
    color: '#4CC2C4', // Teal color from the logo
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});
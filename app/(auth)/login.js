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

const API_ENDPOINT = API_URL || 'https://famlynook.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, loading, error } = useAuth();
  const { families, refreshFamilies, loading: familyLoading } = useFamily();
  const router = useRouter();

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
          setTimeout(() => {
            router.push('/(tabs)/feed');
          }, 100);
          return;
        }
        
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
          
          if (familyLoading) {
            continue;
          }
          
          if (families && families.length > 0) {
            setTimeout(() => {
              router.push('/(tabs)/feed');
            }, 100);
            return;
          }
          
          if (!familyLoading) {
            break;
          }
        }
        
        setTimeout(() => {
          router.push('/(auth)/family-setup');
        }, 100);
        
      } catch (error) {
        if (families && families.length > 0) {
          setTimeout(() => {
            router.push('/(tabs)/feed');
          }, 100);
        } else {
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
    backgroundColor: '#1E2B2F',
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
    color: '#F5F5F7',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#8E8E93',
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
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(59, 175, 188, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.6)',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
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
    color: '#3BAFBC',
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
    color: '#F5F5F7',
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
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  signupLink: {
    fontSize: 15,
    color: '#3BAFBC',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});
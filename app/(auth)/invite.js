// app/(auth)/invite.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter, useSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function InviteScreen() {
  const { token } = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [invitationDetails, setInvitationDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteError, setInviteError] = useState('');
  
  const { registerWithInvitation, checkInvitation, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token) {
        setInviteError('Invalid invitation link');
        setIsLoading(false);
        return;
      }

      const result = await checkInvitation(token);
      if (result.valid) {
        setInvitationDetails(result);
        setEmail(result.email || '');
      } else {
        setInviteError(result.error || 'Invalid or expired invitation');
      }
      setIsLoading(false);
    };

    verifyInvitation();
  }, [token]);

  const validateInputs = () => {
    let isValid = true;

    // Name validation
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
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

    // Confirm password validation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  const handleAcceptInvitation = async () => {
    if (!validateInputs()) return;

    const result = await registerWithInvitation(name, email, password, token);
    if (result.success) {
      router.replace('/(app)');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Verifying invitation...</Text>
      </View>
    );
  }

  if (inviteError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Image 
          style={styles.errorImage} 
          resizeMode="contain" 
        />
        <Text style={styles.errorTitle}>Invalid Invitation</Text>
        <Text style={styles.errorDescription}>{inviteError}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar style="dark" />
      
      <View style={styles.headerContainer}>
        <Image 
          style={styles.headerImage} 
          resizeMode="contain" 
        />
        <Text style={styles.title}>Join {invitationDetails?.familyName || 'Family'}</Text>
        <Text style={styles.subtitle}>You've been invited to join a family on FamlyNook!</Text>
      </View>

      <View style={styles.formContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            editable={false}
            selectTextOnFocus={false}
          />
          <Text style={styles.helperText}>Email is pre-filled from invitation</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
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
          />
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleAcceptInvitation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Accept Invitation</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  headerImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 10,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
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
  helperText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#4A90E2',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 10,
  },
  errorDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#8E8E93',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
});
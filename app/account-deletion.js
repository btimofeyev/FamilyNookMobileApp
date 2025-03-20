// app/account-deletion.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';

// Assuming you'll create these API functions
import { 
  requestAccountDeletion, 
  checkDeletionStatus, 
  cancelAccountDeletion 
} from '../app/api/accountService';

export default function AccountDeletionScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  
  // Check if there's a pending deletion request
  useEffect(() => {
    const checkDeletionStatusOnLoad = async () => {
      try {
        setLoading(true);
        const response = await checkDeletionStatus();
        setHasPendingRequest(response.hasPendingRequest);
        setRequestDetails(response.requestDetails);
      } catch (error) {
        console.error('Error checking deletion status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkDeletionStatusOnLoad();
  }, []);
  
  const handleRequestDeletion = () => {
    Alert.alert(
      'Request Account Deletion',
      'Are you sure you want to request account deletion? This will initiate the process to permanently delete your account and all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Deletion', style: 'destructive', onPress: confirmRequestDeletion }
      ]
    );
  };
  
  const confirmRequestDeletion = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const response = await requestAccountDeletion();
      
      Alert.alert(
        'Request Received',
        'We have sent an email with instructions to confirm your account deletion. Please check your email.',
        [{ text: 'OK' }]
      );
      
      setHasPendingRequest(true);
      
      // Refresh status
      const statusResponse = await checkDeletionStatus();
      setRequestDetails(statusResponse.requestDetails);
      
    } catch (error) {
      console.error('Error requesting deletion:', error);
      Alert.alert(
        'Error',
        'Failed to request account deletion. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelDeletion = () => {
    Alert.alert(
      'Cancel Deletion Request',
      'Are you sure you want to cancel your account deletion request?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel Request', onPress: confirmCancelDeletion }
      ]
    );
  };
  
  const confirmCancelDeletion = async () => {
    try {
      setLoading(true);
      
      const response = await cancelAccountDeletion();
      
      Alert.alert(
        'Request Cancelled',
        'Your account deletion request has been cancelled.',
        [{ text: 'OK' }]
      );
      
      setHasPendingRequest(false);
      setRequestDetails(null);
      
    } catch (error) {
      console.error('Error cancelling deletion:', error);
      Alert.alert(
        'Error',
        'Failed to cancel account deletion request. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Account Deletion',
          headerStyle: {
            backgroundColor: '#1E2B2F'
          },
          headerTintColor: '#F5F5F7',
        }}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3BAFBC" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <BlurView intensity={10} tint="dark" style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={48} color="#FF453A" />
            </View>
            
            <Text style={styles.title}>
              {hasPendingRequest ? 'Deletion Request Pending' : 'Delete Your Account'}
            </Text>
            
            {hasPendingRequest ? (
              <View style={styles.pendingContainer}>
                <Text style={styles.description}>
                  You have a pending account deletion request. We've sent an email with instructions to complete the deletion process.
                </Text>
                
                {requestDetails && (
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailLabel}>Request Expires:</Text>
                    <Text style={styles.detailValue}>{formatDate(requestDetails.expires_at)}</Text>
                  </View>
                )}
                
                <Text style={styles.warningText}>
                  Once confirmed, your account and all associated data will be permanently deleted and cannot be recovered.
                </Text>
                
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCancelDeletion}
                >
                  <Text style={styles.cancelButtonText}>Cancel Deletion Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.description}>
                  When you delete your FamlyNook account, all of your personal data will be permanently deleted, including:
                </Text>
                
                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <Ionicons name="chevron-forward" size={16} color="#3BAFBC" />
                    <Text style={styles.bulletText}>Your profile information</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="chevron-forward" size={16} color="#3BAFBC" />
                    <Text style={styles.bulletText}>Your posts and comments</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="chevron-forward" size={16} color="#3BAFBC" />
                    <Text style={styles.bulletText}>Your photos and memories</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <Ionicons name="chevron-forward" size={16} color="#3BAFBC" />
                    <Text style={styles.bulletText}>Your family connections</Text>
                  </View>
                </View>
                
                <Text style={styles.warningText}>
                  This action is permanent and cannot be undone. All your data will be removed from our systems.
                </Text>
                
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={handleRequestDeletion}
                >
                  <Text style={styles.deleteButtonText}>Request Account Deletion</Text>
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
          
          <BlurView intensity={10} tint="dark" style={styles.card}>
            <Text style={styles.privacyTitle}>Data Deletion Policy</Text>
            <Text style={styles.privacyText}>
              We take your privacy seriously. When you request account deletion, we will:
            </Text>
            
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Ionicons name="checkmark" size={16} color="#32D74B" />
                <Text style={styles.bulletText}>Delete all your personal information</Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="checkmark" size={16} color="#32D74B" />
                <Text style={styles.bulletText}>Remove your content from our active systems</Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="checkmark" size={16} color="#32D74B" />
                <Text style={styles.bulletText}>Process your request within 30 days</Text>
              </View>
            </View>
            
            <Text style={styles.privacyText}>
              In accordance with our data retention policies, some information may be kept in backup systems for up to 90 days before being permanently deleted.
            </Text>
            
            <TouchableOpacity 
              style={styles.privacyButton}
              onPress={() => router.push('/privacy-policy')}
            >
              <Text style={styles.privacyButtonText}>View Privacy Policy</Text>
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#F5F5F7',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Fallback color
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  description: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 20,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  bulletList: {
    marginBottom: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#F5F5F7',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  warningText: {
    fontSize: 15,
    color: '#FF9500',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  deleteButton: {
    backgroundColor: '#FF453A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  pendingContainer: {
    alignItems: 'center',
  },
  detailsContainer: {
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#AEAEB2',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  detailValue: {
    fontSize: 16,
    color: '#F5F5F7',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
    borderWidth: 1,
    borderColor: '#FF453A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  privacyText: {
    fontSize: 15,
    color: '#F5F5F7',
    marginBottom: 16,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  privacyButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  privacyButtonText: {
    color: '#3BAFBC',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});
// app/(screens)/family/[id].js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../../context/AuthContext';
import { useFamily } from '../../../context/FamilyContext';
import { 
  getFamilyDetails, 
  getFamilyMembers, 
  generateFamilyPasskey, 
  leaveFamilyGroup 
} from '../../api/familyService';
import { inviteToFamily } from '../../api/userService';

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams();
  const familyId = id;
  
  const { user } = useAuth();
  const { refreshFamilies } = useFamily();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState(null);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [generatingPasskey, setGeneratingPasskey] = useState(false);

  useEffect(() => {
    loadFamilyData();
  }, [familyId]);
  
  const loadFamilyData = async () => {
    if (!familyId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load family details and members in parallel
      const [familyData, membersData] = await Promise.all([
        getFamilyDetails(familyId),
        getFamilyMembers(familyId)
      ]);
      
      setFamily(familyData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading family data:', error);
      setError('Failed to load family information. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFamilyData();
    setRefreshing(false);
  };
  
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    
    try {
      setInviting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await inviteToFamily(familyId, inviteEmail);
      
      Alert.alert(
        'Success',
        `Invitation sent to ${inviteEmail}!`,
        [{ text: 'OK', onPress: () => setShowInviteModal(false) }]
      );
      
      setInviteEmail('');
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };
  
  const handleGeneratePasskey = async () => {
    try {
      setGeneratingPasskey(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await generateFamilyPasskey(familyId);
      setPasskey(result.passkey);
      setShowPasskeyModal(true);
    } catch (error) {
      console.error('Error generating passkey:', error);
      Alert.alert('Error', 'Failed to generate family passkey. Please try again.');
    } finally {
      setGeneratingPasskey(false);
    }
  };
  
  const copyPasskeyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(passkey);
      Alert.alert('Success', 'Passkey copied to clipboard!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };
  
  const handleLeaveFamily = () => {
    Alert.alert(
      'Leave Family Group',
      'Are you sure you want to leave this family group? You will no longer have access to shared content.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              
              await leaveFamilyGroup(familyId);
              
              // Refresh families list
              await refreshFamilies();
              
              // Navigate back to profile
              router.replace('/profile');
              
              // Show success message
              Alert.alert('Success', 'You have left the family group.');
            } catch (error) {
              console.error('Error leaving family:', error);
              Alert.alert('Error', 'Failed to leave family group. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const renderMemberItem = ({ item }) => {
    const isCurrentUser = user && user.id === item.id;
    
    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfoContainer}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberInitial}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.name} {isCurrentUser && '(You)'}
            </Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
          </View>
        </View>
      </View>
    );
  };
  
  // Render invite modal
  const renderInviteModal = () => (
    <Modal
      visible={showInviteModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowInviteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Family Member</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>
              Enter email address to send an invitation:
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleInviteMember}
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Send Invitation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render passkey modal
  const renderPasskeyModal = () => (
    <Modal
      visible={showPasskeyModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPasskeyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Family Passkey</Text>
            <TouchableOpacity onPress={() => setShowPasskeyModal(false)}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>
              Share this passkey with family members to join:
            </Text>
            
            <View style={styles.passkeyContainer}>
              <Text style={styles.passkey}>{passkey}</Text>
            </View>
            
            <Text style={styles.passkeyInfo}>
              This passkey will expire in 24 hours.
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={copyPasskeyToClipboard}
            >
              <Text style={styles.actionButtonText}>Copy to Clipboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  if (loading && !family) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading family information...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: family?.family_name || 'Family Details',
          headerShown: true,
        }}
      />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Family Header */}
        <View style={styles.familyHeader}>
          <View style={styles.familyIcon}>
            <Ionicons name="people" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.familyName}>{family?.family_name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButtonItem}
            onPress={() => setShowInviteModal(true)}
          >
            <View style={styles.actionButtonIcon}>
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionButtonLabel}>Invite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButtonItem}
            onPress={handleGeneratePasskey}
            disabled={generatingPasskey}
          >
            <View style={styles.actionButtonIcon}>
              <Ionicons name="key" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionButtonLabel}>Passkey</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButtonItem}
            onPress={() => router.push(`/family/${familyId}/calendar`)}
          >
            <View style={styles.actionButtonIcon}>
              <Ionicons name="calendar" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionButtonLabel}>Calendar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Members</Text>
          
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No members found.</Text>
            }
          />
        </View>
        
        {/* Leave Family Button */}
        <TouchableOpacity 
          style={styles.leaveButton}
          onPress={handleLeaveFamily}
        >
          <Ionicons name="exit-outline" size={20} color="#FF3B30" />
          <Text style={styles.leaveButtonText}>Leave Family Group</Text>
        </TouchableOpacity>
        
        {renderInviteModal()}
        {renderPasskeyModal()}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9F9F9',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  familyHeader: {
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },
  familyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  familyName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  memberCount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: -20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonItem: {
    alignItems: 'center',
  },
  actionButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#1C1C1E',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  memberInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  leaveButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  passkeyContainer: {
    backgroundColor: '#F2F2F7',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  passkey: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
    textAlign: 'center',
    letterSpacing: 1,
  },
  passkeyInfo: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 20,
  },
});
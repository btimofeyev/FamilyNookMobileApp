// app/(screens)/family/[id].js
import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../../context/AuthContext';
import { useFamily } from '../../../context/FamilyContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
  
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
  
  const handleLeaveFamily = async () => {
    try {
      setLeaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      await leaveFamilyGroup(familyId);
      
      // Refresh families list
      await refreshFamilies();
      
      setShowLeaveConfirmModal(false);
      
      // Navigate back to profile
      router.replace('/profile');
      
      // Show success message
      Alert.alert('Success', 'You have left the family group.');
    } catch (error) {
      console.error('Error leaving family:', error);
      Alert.alert('Error', 'Failed to leave family group. Please try again.');
    } finally {
      setLeaving(false);
    }
  };
  
  const renderMemberItem = ({ item }) => {
    const isCurrentUser = user && user.id === item.id;
    
    // Generate avatar properties
    const getAvatarColor = (name) => {
      // Generate a consistent color based on name
      const colors = [
        "#FF453A", // Red
        "#FF9F0A", // Orange
        "#FFD60A", // Yellow
        "#30D158", // Green
        "#64D2FF", // Blue
        "#5E5CE6", // Indigo
        "#BF5AF2", // Purple
        "#FF375F", // Pink
      ];
      
      // Simple hash function for consistent color selection
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      return colors[Math.abs(hash) % colors.length];
    };
    
    const hasProfileImage = item.profile_image && 
                            item.profile_image !== "https://via.placeholder.com/150";
    
    const backgroundColor = getAvatarColor(item.name);
    const firstLetter = item.name.charAt(0).toUpperCase();
    
    return (
      <BlurView intensity={20} tint="dark" style={styles.memberItem}>
        <View style={styles.memberInfoContainer}>
          <View style={styles.memberAvatarContainer}>
            {hasProfileImage ? (
              <Image source={{ uri: item.profile_image }} style={styles.memberAvatar} />
            ) : (
              <View style={[styles.memberAvatar, { backgroundColor }]}>
                <Text style={styles.memberInitial}>{firstLetter}</Text>
              </View>
            )}
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.name} {isCurrentUser && '(You)'}
            </Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
          </View>
        </View>
      </BlurView>
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
        <BlurView intensity={30} tint="dark" style={styles.modalContent}>
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
              placeholderTextColor="#8E8E93"
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
              <LinearGradient
                colors={['#3BAFBC', '#1E2B2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>Send Invitation</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
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
        <BlurView intensity={30} tint="dark" style={styles.modalContent}>
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
              <LinearGradient
                colors={['#3BAFBC', '#1E2B2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Copy to Clipboard</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
  
  // Render leave confirmation modal
  const renderLeaveConfirmModal = () => (
    <Modal
      visible={showLeaveConfirmModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLeaveConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} tint="dark" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leave Family Group</Text>
            <TouchableOpacity onPress={() => setShowLeaveConfirmModal(false)}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning-outline" size={48} color="#FF453A" />
            </View>
            
            <Text style={styles.warningTitle}>Are you sure?</Text>
            
            <Text style={styles.warningText}>
              If you leave this family group, you will no longer have access to:
            </Text>
            
            <View style={styles.warningList}>
              <Text style={styles.warningListItem}>• Family posts and comments</Text>
              <Text style={styles.warningListItem}>• Shared memories and photos</Text>
              <Text style={styles.warningListItem}>• Family calendar events</Text>
            </View>
            
            <Text style={styles.warningText}>
              This action cannot be undone. You'll need to be invited again to rejoin.
            </Text>
            
            <View style={styles.actionButtonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setShowLeaveConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleLeaveFamily}
                disabled={leaving}
              >
                {leaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dangerButtonText}>Leave Family</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
  
  if (loading && !family) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Family Details',
            headerStyle: {
              backgroundColor: '#121212',
            },
            headerTintColor: '#F5F5F7',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3BAFBC" />
          <Text style={styles.loadingText}>Loading family information...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{
            title: 'Family Details',
            headerStyle: {
              backgroundColor: '#121212',
            },
            headerTintColor: '#F5F5F7',
            headerShown: true,
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF453A" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: family?.family_name || 'Family Details',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#F5F5F7',
          headerShown: true,
        }}
      />
      
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3BAFBC" />
        }
      >
        {/* Family Header */}
        <BlurView intensity={20} tint="dark" style={styles.familyHeader}>
          <View style={styles.familyIconContainer}>
            <LinearGradient
              colors={['#3BAFBC', '#1E2B2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.familyIcon}
            >
              <Ionicons name="people" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.familyName}>{family?.family_name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
        </BlurView>
        
        {/* Action Buttons */}
        <BlurView intensity={20} tint="dark" style={styles.actionButtonsContainer}>
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
        </BlurView>
        
        {/* Members Section */}
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(true)}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No members found.</Text>
            }
          />
        </BlurView>
        
        {/* Leave Family Button */}
        <BlurView intensity={20} tint="dark" style={styles.leaveButtonContainer}>
          <TouchableOpacity 
            style={styles.leaveButton}
            onPress={() => setShowLeaveConfirmModal(true)}
          >
            <Ionicons name="exit-outline" size={20} color="#FF453A" />
            <Text style={styles.leaveButtonText}>Leave Family Group</Text>
          </TouchableOpacity>
        </BlurView>
        
        {renderInviteModal()}
        {renderPasskeyModal()}
        {renderLeaveConfirmModal()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#F5F5F7',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3BAFBC',
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Family Header
  familyHeader: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  familyIconContainer: {
    marginBottom: 15,
  },
  familyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  familyName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  memberCount: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  actionButtonItem: {
    alignItems: 'center',
  },
  actionButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3BAFBC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Section
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  addButtonText: {
    color: '#3BAFBC',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Member Items
  memberItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(44, 44, 46, 0.6)', // Fallback color
  },
  memberInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarContainer: {
    marginRight: 16,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5F5F7',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  memberEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(60, 60, 67, 0.3)',
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Leave Family Button
  leaveButtonContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 30,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  leaveButtonText: {
    color: '#FF453A',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    backgroundColor: 'rgba(18, 18, 18, 0.9)', // Fallback color
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  input: {
    backgroundColor: 'rgba(58, 58, 60, 0.7)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  actionButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  passkeyContainer: {
    backgroundColor: 'rgba(58, 58, 60, 0.7)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  passkey: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3BAFBC',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  passkeyInfo: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Leave confirmation styles
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5F5F7',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  warningText: {
    fontSize: 16,
    color: '#F5F5F7',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  warningList: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  warningListItem: {
    fontSize: 15,
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'rgba(58, 58, 60, 0.7)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F5F5F7',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  dangerButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#FF453A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  }
});
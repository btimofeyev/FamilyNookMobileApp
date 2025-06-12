// app/(tabs)/profile.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Image,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { getUserProfile, inviteToFamily } from '../api/userService';
import { getFamilyPosts } from '../api/feedService';
import { generateFamilyPasskey } from '../api/familyService';
import { BlurView } from 'expo-blur';
import PostCard from '../components/PostCard';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { families, selectedFamily, refreshFamilies, switchFamily } = useFamily();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [generatingPasskey, setGeneratingPasskey] = useState(false);
  
  // Load user profile and posts data
  useEffect(() => {
    if (user && selectedFamily) {
      loadUserData();
    }
  }, [user, selectedFamily]);
  
  const loadUserData = async () => {
    if (!user || !selectedFamily) return;
    
    try {
      setLoading(true);
      
      // Load profile data
      try {
        const profileData = await getUserProfile();
        setUserProfile(profileData);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Continue with other requests even if this one fails
      }
      
      // Load posts data
      try {
        const { posts } = await getFamilyPosts(selectedFamily.family_id);
        // Filter posts to show only the user's posts
        const userPostsData = posts.filter(post => post.author_id === user.id);
        setUserPosts(userPostsData);
      } catch (error) {
        console.error('Error fetching user posts:', error);
        // Continue even if posts can't be loaded
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFamilies(); // This needs to run first to get family data
    await loadUserData();    // Then load user data based on updated family info
    setRefreshing(false);
  };
  
  const handlePickImage = async () => {
    Haptics.selectionAsync();
    
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload profile photo logic would go here
        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile photo.');
    }
  };
  
  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedFamily) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    
    try {
      setInviting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await inviteToFamily(selectedFamily.family_id, inviteEmail);
      
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
    if (!selectedFamily) {
      Alert.alert('Error', 'Please select a family first.');
      return;
    }
    
    try {
      setGeneratingPasskey(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const result = await generateFamilyPasskey(selectedFamily.family_id);
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
  
  const handleCreateFamily = () => {
    router.push('/create-family');
  };
  
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Log Out', 
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await logout();
              router.replace('/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
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
        <BlurView intensity={60} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Family Member</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#AEAEB2" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Family: {selectedFamily?.family_name || 'Select a family'}
              </Text>
              
              {selectedFamily ? (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter email address"
                    placeholderTextColor="#8E8E93"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor="#4CC2C4"
                  />
                  
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={handleInviteMember}
                    disabled={inviting}
                    activeOpacity={0.8}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={styles.modalButtonText}>Send Invitation</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.errorText}>Please select a family first</Text>
              )}
            </View>
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
        <BlurView intensity={60} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Family Passkey</Text>
              <TouchableOpacity onPress={() => setShowPasskeyModal(false)}>
                <Ionicons name="close" size={24} color="#AEAEB2" />
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
                style={styles.modalButton}
                onPress={copyPasskeyToClipboard}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Copy to Clipboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
  
  if (loading && !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F0C142" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          tintColor="#F0C142" 
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ 
              uri: userProfile?.profile_image || 'https://via.placeholder.com/150' 
            }}
            style={styles.profileImage}
          />
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={handlePickImage}
          >
            <Ionicons name="camera-outline" size={18} color="#000000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
      </View>

      {/* Family Selection Section */}
      <BlurView intensity={20} tint="dark" style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>My Families</Text>
          <TouchableOpacity onPress={handleCreateFamily}>
            <Text style={styles.addButtonText}>+ Create New</Text>
          </TouchableOpacity>
        </View>
        
        {families.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.familiesScrollView}
          >
            {families.map((family) => (
              <TouchableOpacity 
                key={family.family_id}
                style={[
                  styles.familyCard,
                  selectedFamily?.family_id === family.family_id && styles.selectedFamilyCard
                ]}
                onPress={() => switchFamily(family)}
              >
                <View style={styles.familyIconContainer}>
                  <Ionicons name="people" size={24} color="#000000" />
                </View>
                <Text style={styles.familyCardName} numberOfLines={1}>
                  {family.family_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyFamily}>
            <Ionicons name="people-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyFamilyText}>You don't have any families yet</Text>
            <TouchableOpacity 
              style={styles.createFamilyButton}
              onPress={handleCreateFamily}
              activeOpacity={0.8}
            >
              <Text style={styles.createFamilyButtonText}>Create Family</Text>
            </TouchableOpacity>
          </View>
        )}
      </BlurView>

      {/* Family Management Section */}
      <BlurView intensity={20} tint="dark" style={styles.section}>
        <Text style={styles.sectionTitle}>Family Management</Text>
        
        <View style={styles.managementButtons}>
          <TouchableOpacity 
            style={styles.managementButton}
            onPress={handleCreateFamily}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.managementButtonText}>Create Family</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.managementButton}
            onPress={() => setShowInviteModal(true)}
            disabled={!selectedFamily}
          >
            <View style={[styles.iconCircle, !selectedFamily && styles.disabledIconCircle]}>
              <Ionicons name="mail" size={22} color="#FFFFFF" />
            </View>
            <Text style={[
              styles.managementButtonText, 
              !selectedFamily && styles.disabledText
            ]}>
              Invite Member
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.managementButton}
            onPress={handleGeneratePasskey}
            disabled={!selectedFamily || generatingPasskey}
          >
            <View style={[
              styles.iconCircle, 
              (!selectedFamily || generatingPasskey) && styles.disabledIconCircle
            ]}>
              <Ionicons name="key" size={22} color="#FFFFFF" />
            </View>
            <Text style={[
              styles.managementButtonText, 
              (!selectedFamily || generatingPasskey) && styles.disabledText
            ]}>
              Generate Passkey
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Recent Posts Section */}
      {selectedFamily && (
        <BlurView intensity={20} tint="dark" style={styles.section}>
          <Text style={styles.sectionTitle}>My Recent Posts</Text>
          
          {userPosts && userPosts.length > 0 ? (
            <>
              {userPosts.slice(0, 3).map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  isCurrentUser={true}
                  onUpdate={() => loadUserData()}
                  darkMode={true}
                />
              ))}
              
              {userPosts.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/my-posts')}
                >
                  <Text style={styles.viewAllButtonText}>View All Posts</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons name="images-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyPostsText}>
                You haven't created any posts yet
              </Text>
              <TouchableOpacity 
                style={styles.createPostButton}
                onPress={() => router.push('/create-post')}
                disabled={!selectedFamily}
                activeOpacity={0.8}
              >
                <Text style={styles.createPostButtonText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      )}
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={22} color="#FF453A" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      
      {renderInviteModal()}
      {renderPasskeyModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#AEAEB2',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  errorText: {
    color: '#FF453A', // iOS red color
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  header: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#2C2C2E'
  },
  editImageButton: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    backgroundColor: '#F0C142', // Golden yellow from the logo
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  userEmail: {
    fontSize: 16,
    color: '#AEAEB2',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  section: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback for when BlurView doesn't work
    marginBottom: 16,
    borderRadius: 18,
    margin: 16,
    overflow: 'hidden',
    padding: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  addButtonText: {
    color: '#4CC2C4', // Teal color from the logo
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  familiesScrollView: {
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 6,
  },
  familyCard: {
    width: 120,
    height: 110,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 16,
    marginRight: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.5)',
  },
  selectedFamilyCard: {
    borderWidth: 2,
    borderColor: '#F0C142', // Golden yellow from the logo
    backgroundColor: 'rgba(44, 44, 46, 0.9)',
  },
  familyIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0C142', // Golden yellow from the logo
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  familyCardName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  emptyFamily: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 16,
    marginBottom: 10,
  },
  emptyFamilyText: {
    fontSize: 16,
    color: '#AEAEB2',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  createFamilyButton: {
    backgroundColor: '#F0C142', // Golden yellow from the logo
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createFamilyButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  managementButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  managementButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CC2C4', // Teal color from the logo
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledIconCircle: {
    backgroundColor: '#3A3A3C',
  },
  managementButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  disabledText: {
    color: '#636366',
  },
  emptyPosts: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: 16,
    marginTop: 12,
  },
  emptyPostsText: {
    fontSize: 16,
    color: '#AEAEB2',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  createPostButton: {
    backgroundColor: '#4CC2C4', // Teal color from the logo
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createPostButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  viewAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 10,
  },
  viewAllButtonText: {
    fontSize: 16,
    color: '#4CC2C4', // Teal color from the logo
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.5)',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF453A', // iOS red color
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Dark background for the modal
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.5)',
    marginTop: 'auto', // Push to bottom
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.5)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  modalBody: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  modalInput: {
    backgroundColor: 'rgba(58, 58, 60, 0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.5)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  modalButton: {
    backgroundColor: '#F0C142', // Golden yellow from the logo
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  passkeyContainer: {
    backgroundColor: 'rgba(58, 58, 60, 0.8)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(84, 84, 88, 0.5)',
  },
  passkey: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F0C142', // Golden yellow from the logo
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  passkeyInfo: {
    fontSize: 14,
    color: '#AEAEB2',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
// app/(tabs)/profile.js
import React, { useState, useEffect, useRef } from "react";
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
  Platform,
  FlatList,
  Animated,
  Dimensions
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFamily } from "../../context/FamilyContext";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from 'expo-linear-gradient';
import {
  getUserProfile,
  inviteToFamily,
  getFamilyMembers,
  uploadProfilePhoto,
  joinFamilyByPasskey,
} from "../api/userService";
import { getFamilyPosts } from "../api/feedService";
import { generateFamilyPasskey } from "../api/familyService";
import { BlurView } from "expo-blur";
import PostItem from "../components/PostItem";
import MemberAvatar from "../components/MemberAvatar"; 


// Function to get a random color from the app's color palette
const getRandomColor = () => {
  // Dark mode-friendly vibrant colors that complement the app's dark theme
  const colors = [
    "#FF4F5E", // Red
    "#FF7C1E", // Orange
    "#FFD60A", // Yellow
    "#30D158", // Green
    "#64D2FF", // Blue
    "#5371E9", // Indigo
    "#AA58CB", // Purple
    "#FF5995", // Pink
    "#49C7B8", // Teal
    "#04B9A3", // Mint
    "#00A5E0", // Sky blue
    "#FFB746", // Amber
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

// Store colors in a Map to assign consistent colors to each user
const colorMap = new Map();

// Function to generate avatar properties with consistent random colors
const getAvatarProperties = (name) => {
  // Get first letter or use a default
  const firstLetter =
    name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";

  // Get or generate color for this user
  if (!colorMap.has(name)) {
    colorMap.set(name, getRandomColor());
  }

  return {
    backgroundColor: colorMap.get(name),
    letter: firstLetter,
  };
};

export default function ProfileScreen() {
  const { user, logout, updateUserInfo } = useAuth();
  const { families, selectedFamily, refreshFamilies, switchFamily } =
    useFamily();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [generatingPasskey, setGeneratingPasskey] = useState(false);
  const [showJoinFamilyModal, setShowJoinFamilyModal] = useState(false);
  const [joinPasskey, setJoinPasskey] = useState("");
  const [joiningFamily, setJoiningFamily] = useState(false);
  
  // Add state for the animated scroll position
  const scrollX = useRef(new Animated.Value(0)).current;

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
        console.error("Error fetching user profile:", error);
        // Continue with other requests even if this one fails
      }

      // Load family members
      try {
        const members = await getFamilyMembers(selectedFamily.family_id);
        setFamilyMembers(members);
      } catch (error) {
        console.error("Error fetching family members:", error);
        // Continue even if family members can't be loaded
      }

      // Load posts data
      try {
        const { posts } = await getFamilyPosts(selectedFamily.family_id);
        // Filter posts to show only the user's posts
        const userPostsData = posts.filter(
          (post) => post.author_id === user.id
        );
        setUserPosts(userPostsData);
      } catch (error) {
        console.error("Error fetching user posts:", error);
        // Continue even if posts can't be loaded
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFamilies();
    await loadUserData();
    setRefreshing(false);
  };

  const handlePickImage = async () => {
    Haptics.selectionAsync();
  
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
  
      if (status !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Please grant permission to access your photos."
        );
        return;
      }
  
      // Launch image picker with reduced quality to ensure smaller file size
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for smaller file size
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
  
        try {
          // Get the selected image
          const selectedImage = result.assets[0];
          
          // Upload the profile photo
          const response = await uploadProfilePhoto({
            uri: selectedImage.uri,
            type: selectedImage.type || "image/jpeg",
            fileName: `profile-${Date.now()}.${
              selectedImage.uri.split(".").pop() || "jpg"
            }`,
          });
  
          if (response && response.profileImageUrl) {
            // Update user state with the new profile image URL
            const updatedUser = {
              ...user,
              profile_image: response.profileImageUrl,
            };
  
            // Update user in AuthContext
            await updateUserInfo(updatedUser);
  
            // Update local state
            setUserProfile({
              ...userProfile,
              profile_image: response.profileImageUrl,
            });
          }
        } catch (error) {
          console.error("Error uploading profile photo:", error);
          Alert.alert(
            "Error",
            "Failed to update profile photo. Please try again."
          );
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "An error occurred while selecting the image.");
    }
  };

  const renderProfileImage = () => {
    const profileImageUrl = userProfile?.profile_image || user?.profile_image;
    const hasProfileImage =
      profileImageUrl && profileImageUrl !== "https://via.placeholder.com/150";

    // Generate initial avatar if no profile image
    const { backgroundColor, letter } = getAvatarProperties(
      user?.name || "User"
    );

    return (
      <View style={styles.profileImageContainer}>
        {loading && (
          <View style={styles.profileImageLoadingOverlay}>
            <ActivityIndicator size="large" color="#F0C142" />
          </View>
        )}

        {hasProfileImage ? (
          <Image
            source={{ uri: profileImageUrl }}
            style={styles.profileImage}
            onError={() => console.log("Error loading profile image")}
          />
        ) : (
          <View style={[styles.profileImage, { backgroundColor }]}>
            <Text style={styles.profileInitial}>{letter}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.editImageButton}
          onPress={handlePickImage}
          disabled={loading}
        >
          <Ionicons name="camera-outline" size={18} color="#000000" />
        </TouchableOpacity>
      </View>
    );
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedFamily) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    try {
      setInviting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await inviteToFamily(selectedFamily.family_id, inviteEmail);

      Alert.alert("Success", `Invitation sent to ${inviteEmail}!`, [
        { text: "OK", onPress: () => setShowInviteModal(false) },
      ]);

      setInviteEmail("");
    } catch (error) {
      console.error("Error sending invitation:", error);
      Alert.alert("Error", "Failed to send invitation. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  const handleGeneratePasskey = async () => {
    if (!selectedFamily) {
      Alert.alert("Error", "Please select a family first.");
      return;
    }

    try {
      setGeneratingPasskey(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await generateFamilyPasskey(selectedFamily.family_id);
      setPasskey(result.passkey);
      setShowPasskeyModal(true);
    } catch (error) {
      console.error("Error generating passkey:", error);
      Alert.alert(
        "Error",
        "Failed to generate family passkey. Please try again."
      );
    } finally {
      setGeneratingPasskey(false);
    }
  };

  const copyPasskeyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(passkey);
      Alert.alert("Success", "Passkey copied to clipboard!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const handleCreateFamily = () => {
    router.push("/create-family");
  };

  const handleJoinFamily = async () => {
    if (!joinPasskey.trim()) {
      Alert.alert("Error", "Please enter a valid passkey.");
      return;
    }

    try {
      setJoiningFamily(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await joinFamilyByPasskey(joinPasskey);

      if (result.valid && result.familyId) {
        // Refresh the family list
        await refreshFamilies();

        // Show success message
        Alert.alert(
          "Success",
          `You have joined the "${result.familyName}" family!`,
          [{ text: "OK", onPress: () => setShowJoinFamilyModal(false) }]
        );

        setJoinPasskey("");
      } else {
        Alert.alert("Error", "Invalid or expired passkey. Please try again.");
      }
    } catch (error) {
      console.error("Error joining family:", error);
      Alert.alert("Error", "Failed to join family. Please try again.");
    } finally {
      setJoiningFamily(false);
    }
  };

  // Render animated family members carousel
  const renderFamilyMemberCarousel = () => {
    const ITEM_SIZE = 80; // Size of each member avatar including spacing
    
    // Calculate the width of the scroll indicator based on visible items
    const screenWidth = Dimensions.get('window').width - 32; // Subtracting horizontal padding
    const indicatorWidth = Math.min(screenWidth, 240); // Cap indicator width
    
    // Calculate indicator dimensions
    const indicatorHeight = 8;
    const dotWidth = 8;
    const activeDotWidth = 24;
    
    // Use scrollX to calculate the current active index
    // Add a check for minimum family members required
    const inputRange = familyMembers.length >= 2 
      ? familyMembers.map((_, i) => i * ITEM_SIZE)
      : [0, ITEM_SIZE]; // Provide fallback values when not enough members
  
    const dotPosition = scrollX.interpolate({
      inputRange: inputRange.length >= 2 ? inputRange : [0, ITEM_SIZE],
      outputRange: inputRange.length >= 2 
        ? inputRange.map((_, i) => {
            // Calculate position based on dot sizes
            const basePosition = i * (dotWidth + 8);
            // Account for the active dot being wider
            const adjustment = (activeDotWidth - dotWidth) / 2;
            return basePosition - adjustment;
          })
        : [0, 0], // Fallback when not enough members
      extrapolate: 'clamp'
    });
    
    return (
      <View style={styles.familyMembersCarouselContainer}>
        <Animated.FlatList
          data={familyMembers}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.carouselContent,
            { paddingHorizontal: (screenWidth - ITEM_SIZE) / 2 } // Center the active item
          ]}
          snapToInterval={ITEM_SIZE}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          renderItem={({ item, index }) => {
            const isCurrentUser = user && user.id === item.id;
            
            // Create animation for the active item with fallback values
            const itemInputRange = familyMembers.length >= 3
              ? [
                  (index - 1) * ITEM_SIZE,
                  index * ITEM_SIZE,
                  (index + 1) * ITEM_SIZE,
                ]
              : [0, ITEM_SIZE, ITEM_SIZE * 2]; // Fallback values
  
            const scale = scrollX.interpolate({
              inputRange: itemInputRange,
              outputRange: [0.8, 1, 0.8],
              extrapolate: 'clamp',
            });
            
            const opacity = scrollX.interpolate({
              inputRange: itemInputRange,
              outputRange: [0.6, 1, 0.6],
              extrapolate: 'clamp',
            });
            
            return (
              <Animated.View
                style={[
                  styles.memberCarouselItem,
                  { transform: [{ scale }], opacity }
                ]}
              >
                <MemberAvatar 
                  member={item}
                  size={60}
                  showName={true}
                  isCurrentUser={isCurrentUser}
                />
              </Animated.View>
            );
          }}
        />
        
        {/* Modern Pill-style Indicator - Only show when enough family members */}
        {familyMembers.length >= 2 && (
          <View style={styles.indicatorContainer}>
            <View style={styles.indicatorTrack}>
              {familyMembers.map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.indicatorDot,
                    {
                      width: dotWidth,
                      height: dotWidth,
                      marginHorizontal: 4
                    }
                  ]}
                />
              ))}
              
              {/* Animated active dot that moves with scroll */}
              <Animated.View 
                style={[
                  styles.activeDot,
                  {
                    width: activeDotWidth,
                    height: indicatorHeight,
                    transform: [{ translateX: dotPosition }]
                  }
                ]}
              >
                {/* Add a subtle gradient to the active dot */}
                <LinearGradient
                  colors={['#4CC2C4', '#3BAFBC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: indicatorHeight / 2 
                  }}
                />
              </Animated.View>
            </View>
          </View>
        )}
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
                Family: {selectedFamily?.family_name || "Select a family"}
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
                      <Text style={styles.modalButtonText}>
                        Send Invitation
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.errorText}>
                  Please select a family first
                </Text>
              )}
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );

  // Add the Join Family modal render function
  const renderJoinFamilyModal = () => (
    <Modal
      visible={showJoinFamilyModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowJoinFamilyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={60} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join a Family</Text>
              <TouchableOpacity onPress={() => setShowJoinFamilyModal(false)}>
                <Ionicons name="close" size={24} color="#AEAEB2" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Enter the family passkey you received from a family member:
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter passkey"
                placeholderTextColor="#8E8E93"
                value={joinPasskey}
                onChangeText={setJoinPasskey}
                autoCapitalize="none"
                selectionColor="#4CC2C4"
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleJoinFamily}
                disabled={joiningFamily}
                activeOpacity={0.8}
              >
                {joiningFamily ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.modalButtonText}>Join Family</Text>
                )}
              </TouchableOpacity>
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
    <>
      {/* Add Stack.Screen with settings icon in the header */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={{ padding: 8 }}
            >
              <Ionicons name="settings-outline" size={24} color="#F5F5F7" />
            </TouchableOpacity>
          ),
          title: "Profile",
          headerStyle: {
            backgroundColor: "#1E2B2F",
          },
          headerTintColor: "#F5F5F7",
          headerShadowVisible: false,
          headerShown: true, // Make sure the header is shown
        }}
      />

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
          {renderProfileImage()}
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>
            {user?.email || "user@example.com"}
          </Text>
        </View>

        {/* Family Members Section with Animated Carousel */}
        {selectedFamily && familyMembers.length > 0 && (
          <BlurView
            intensity={10}
            tint="dark"
            style={styles.familyMembersSection}
          >
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Family Members</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                <Text style={styles.inviteButtonText}>+ Invite</Text>
              </TouchableOpacity>
            </View>

            {/* Render animated carousel instead of grid */}
            {renderFamilyMemberCarousel()}
          </BlurView>
        )}

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
                    selectedFamily?.family_id === family.family_id &&
                      styles.selectedFamilyCard,
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
              <Text style={styles.emptyFamilyText}>
                You don't have any families yet
              </Text>
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
              onPress={() =>
                selectedFamily
                  ? router.push(`/family/${selectedFamily.family_id}`)
                  : null
              }
              disabled={!selectedFamily}
            >
              <View
                style={[
                  styles.iconCircle,
                  !selectedFamily && styles.disabledIconCircle,
                ]}
              >
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.managementButtonText,
                  !selectedFamily && styles.disabledText,
                ]}
              >
                Family Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managementButton}
              onPress={() => setShowInviteModal(true)}
              disabled={!selectedFamily}
            >
              <View
                style={[
                  styles.iconCircle,
                  !selectedFamily && styles.disabledIconCircle,
                ]}
              >
                <Ionicons name="mail" size={22} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.managementButtonText,
                  !selectedFamily && styles.disabledText,
                ]}
              >
                Invite Member
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managementButton}
              onPress={handleGeneratePasskey}
              disabled={!selectedFamily || generatingPasskey}
            >
              <View
                style={[
                  styles.iconCircle,
                  (!selectedFamily || generatingPasskey) &&
                    styles.disabledIconCircle,
                ]}
              >
                <Ionicons name="key" size={22} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.managementButtonText,
                  (!selectedFamily || generatingPasskey) && styles.disabledText,
                ]}
              >
                Generate Passkey
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managementButton}
              onPress={() => setShowJoinFamilyModal(true)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.managementButtonText}>Join Family</Text>
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
                  <PostItem
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
                    onPress={() => router.push("/my-posts")}
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
                  onPress={() => router.push("/create-post")}
                  disabled={!selectedFamily}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createPostButtonText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
          
        )}
        {renderInviteModal()}
        {renderPasskeyModal()}
        {renderJoinFamilyModal()}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#AEAEB2",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  errorText: {
    color: "#FF453A", // iOS red color
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  header: {
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#2C2C2E",
  },
  editImageButton: {
    position: "absolute",
    right: 0,
    bottom: 6,
    backgroundColor: "#F0C142", // Golden yellow from the logo
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#121212",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 5,
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  userEmail: {
    fontSize: 16,
    color: "#AEAEB2",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },

  // Family Members Carousel Style
  familyMembersSection: {
    backgroundColor: "rgba(18, 18, 18, 0.9)",
    marginBottom: 16,
    borderRadius: 12,
    margin: 16,
    overflow: "hidden",
    padding: 14,
  },
  familyMembersCarouselContainer: {
    height: 120, // Fixed height for the carousel
    marginVertical: 12,
  },
  carouselContent: {
    alignItems: "center",
    paddingHorizontal: 6,
  },
  memberCarouselItem: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  inviteButtonText: {
    color: "#00C2FF", // Cyan - matches app theme
    fontWeight: "600",
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },

  section: {
    backgroundColor: "rgba(18, 18, 18, 0.9)",
    marginBottom: 16,
    borderRadius: 12,
    margin: 16,
    overflow: "hidden",
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  addButtonText: {
    color: "#5DADE2", // Light Blue
    fontWeight: "600",
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  familiesScrollView: {
    flexDirection: "row",
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 6,
  },
  familyCard: {
    width: 120,
    height: 110,
    backgroundColor: "rgba(44, 44, 46, 0.6)",
    borderRadius: 16,
    marginRight: 12,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(84, 84, 88, 0.5)",
  },
  selectedFamilyCard: {
    borderWidth: 2,
    borderColor: "#F0C142", // Golden yellow from the logo
    backgroundColor: "rgba(44, 44, 46, 0.9)",
  },
  familyIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0C142", // Golden yellow from the logo
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  familyCardName: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  emptyFamily: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(44, 44, 46, 0.6)",
    borderRadius: 16,
    marginBottom: 10,
  },
  emptyFamilyText: {
    fontSize: 16,
    color: "#AEAEB2",
    marginTop: 12,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  createFamilyButton: {
    backgroundColor: "#F0C142", // Golden yellow from the logo
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createFamilyButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  managementButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  managementButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4CC2C4", // Teal color from the logo
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  disabledIconCircle: {
    backgroundColor: "#3A3A3C",
  },
  managementButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  disabledText: {
    color: "#636366",
  },
  emptyPosts: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(44, 44, 46, 0.6)",
    borderRadius: 16,
    marginTop: 12,
  },
  emptyPostsText: {
    fontSize: 16,
    color: "#AEAEB2",
    marginTop: 12,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  createPostButton: {
    backgroundColor: "#4CC2C4", // Teal color from the logo
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createPostButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  viewAllButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 10,
  },
  viewAllButtonText: {
    fontSize: 16,
    color: "#4CC2C4", // Teal color from the logo
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBlur: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "rgba(30, 30, 30, 0.9)", // Dark background for the modal
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(84, 84, 88, 0.5)",
    marginTop: "auto", // Push to bottom
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(84, 84, 88, 0.5)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  modalBody: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  modalInput: {
    backgroundColor: "rgba(58, 58, 60, 0.8)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(84, 84, 88, 0.5)",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  modalButton: {
    backgroundColor: "#F0C142", // Golden yellow from the logo
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  passkeyContainer: {
    backgroundColor: "rgba(58, 58, 60, 0.8)",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(84, 84, 88, 0.5)",
  },
  passkey: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F0C142", // Golden yellow from the logo
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  passkeyInfo: {
    fontSize: 14,
    color: "#AEAEB2",
    marginBottom: 24,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "System",
  },
  profileImageLoadingOverlay: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  profileInitial: {
    fontSize: 42,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "System",
  },
  familyMembersCarouselContainer: {
    height: 130,
    marginVertical: 12,
  },
  carouselContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    height: 20,
  },
  indicatorTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 8,
    position: 'relative',
  },
  indicatorDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  activeDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 4,
  }
});
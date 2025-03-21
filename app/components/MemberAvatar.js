// app/components/MemberAvatar.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, Platform, Animated } from 'react-native';
import apiClient from '../api/client';

// Function to get a random color from the app's color palette
const getAvatarColor = (name) => {
  const colors = [
    "#FF4F5E", "#FF7C1E", "#FFD60A", "#30D158", "#64D2FF", 
    "#5371E9", "#AA58CB", "#FF5995", "#49C7B8", "#04B9A3", 
    "#00A5E0", "#FFB746"
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Cache to store user profile data
const profileCache = new Map();

const MemberAvatar = ({ 
  member, 
  size = 60, 
  showName = false, 
  isCurrentUser = false,
  onPress = null,
  style = {}
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isLoading, setIsLoading] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const imageLoadAttempts = useRef(0);
  
  // Fetch user profile data if needed
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!member || !member.id) return;
      
      // Check cache first
      if (profileCache.has(member.id)) {
        setProfileData(profileCache.get(member.id));
        return;
      }
      
      try {
        // Fetch user profile directly from API
        const response = await apiClient.get(`/api/dashboard/users/${member.id}`);
        if (response.data) {
          profileCache.set(member.id, response.data);
          setProfileData(response.data);
        }
      } catch (error) {
        console.log(`Failed to fetch profile data for user ID ${member.id}:`, error);
      }
    };
    
    fetchUserProfile();
  }, [member?.id]);
  
  // Reset error state when profile image changes
  useEffect(() => {
    const profileImage = profileData?.profile_image || member?.profile_image;
    if (profileImage) {
      setHasImageError(false);
      setIsLoading(true);
      imageLoadAttempts.current = 0;
    }
  }, [profileData, member?.profile_image]);

  // Generate avatar properties
  const backgroundColor = getAvatarColor(member?.name || "User");
  const firstLetter = member?.name?.charAt(0).toUpperCase() || "?";
  
  // Get profile image URL from either direct props or fetched profile data
  const profileImageUrl = profileData?.profile_image || member?.profile_image;
  
  // Check if we should show profile image
  const shouldShowProfileImage = profileImageUrl && 
                               profileImageUrl !== "https://via.placeholder.com/150" && 
                               profileImageUrl !== "null" &&
                               !hasImageError;

  // Setup pulse animation if interactive
  useEffect(() => {
    if (onPress) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [onPress]);

  // Dynamically calculate styles based on props
  const avatarContainerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: backgroundColor,
    ...style
  };
  
  const initialsStyle = {
    fontSize: size * 0.4,
    fontWeight: '600',
  };
  
  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  
  const nameContainerStyle = {
    marginTop: 6,
    maxWidth: size * 1.2,
  };
  
  const nameStyle = {
    fontSize: size * 0.22,
    textAlign: 'center',
  };
  
  const loadingIndicatorStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  };

  const handleImageLoadError = () => {
    imageLoadAttempts.current += 1;
    
    console.log(`Image load error for ${member?.name}, attempt ${imageLoadAttempts.current}`, {
      url: profileImageUrl
    });
    
    if (imageLoadAttempts.current >= 2) {
      setHasImageError(true);
    }
    
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <Animated.View 
      style={{
        alignItems: 'center',
        transform: [{ scale: onPress ? pulseAnim : 1 }]
      }}
    >
      <View style={[styles.avatarContainer, avatarContainerStyle]}>
        {shouldShowProfileImage ? (
          <>
            <Image
              source={{ uri: profileImageUrl }}
              style={imageStyle}
              onLoad={handleImageLoad}
              onLoadEnd={handleImageLoad}
              onError={handleImageLoadError}
            />
            {isLoading && (
              <View style={loadingIndicatorStyle}>
                <Text style={[styles.initial, initialsStyle]}>{firstLetter}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={[styles.initial, initialsStyle]}>{firstLetter}</Text>
        )}
        
        {/* Show a border for the current user */}
        {isCurrentUser && (
          <View style={[styles.currentUserIndicator, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]} />
        )}
      </View>
      
      {showName && (
        <View style={nameContainerStyle}>
          <Text numberOfLines={1} style={[styles.name, nameStyle]}>
            {member?.name?.split(' ')[0] || "User"}
            {isCurrentUser ? ' (You)' : ''}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  initial: {
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  name: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  currentUserIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#F0C142', // Golden yellow indicator for current user
    top: -3,
    left: -3,
  },
});

export default MemberAvatar;
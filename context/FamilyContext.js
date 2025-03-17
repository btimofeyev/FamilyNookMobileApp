// context/FamilyContext.js - Fixed version
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../app/api/client';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

const FamilyContext = createContext();

// Helper function to get user families from API
const getUserFamilies = async () => {
  try {
    const response = await apiClient.get('/api/dashboard/user/families');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user families:', error);
    
    // Check if it's an authentication error
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw error; // Re-throw auth errors to be handled by the caller
    }
    
    // Return empty array for other errors to prevent cascading failures
    return [];
  }
};

export const FamilyProvider = ({ children }) => {
  const { user, isAuthenticated, token, authInitialized, refreshUserSession, logout, updateUserInfo } = useAuth();
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [familiesInitialized, setFamiliesInitialized] = useState(false);
  
  // Use a ref to track retry attempts and prevent infinite loops
  const retryCount = useRef(0);
  const lastRetryTime = useRef(0);
  const maxRetries = 3;
  
  // Function to determine if we should retry based on time and count
  const shouldRetry = async () => {
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime.current;
    
    // Check if this is a fresh registration
    const registrationTime = await SecureStore.getItemAsync('registration_time');
    const isRecentRegistration = registrationTime && 
      (Date.now() - parseInt(registrationTime)) < 30000; // 30 seconds
    
    // Don't retry for recent registrations - it's expected they have no families yet
    if (isRecentRegistration) {
      console.log('Recent registration detected, skipping family data retry');
      return false;
    }
    
    // Only retry if it's been at least 3 seconds since the last retry
    // and we haven't exceeded max retries
    if (retryCount.current < maxRetries && timeSinceLastRetry > 3000) {
      retryCount.current += 1;
      lastRetryTime.current = now;
      console.log(`Family load retry #${retryCount.current} of ${maxRetries}`);
      return true;
    }
    
    return false;
  };
  
  // Reset retry counter when auth state changes
  useEffect(() => {
    retryCount.current = 0;
    lastRetryTime.current = 0;
  }, [isAuthenticated, token]);

  // Load families when user is authenticated
  const loadFamilies = useCallback(async (forceRefresh = false) => {
    // Skip loading if not authenticated
    if (!isAuthenticated || !token) {
      console.log('Not authenticated, skipping family load');
      setFamilies([]);
      setSelectedFamily(null);
      setLoading(false);
      setFamiliesInitialized(true);
      return;
    }
  
    try {
      console.log('Loading families for authenticated user');
      setLoading(true);
      setError(null);
      
      // Check if this is a fresh registration before trying to refresh
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isNewAccount = await SecureStore.getItemAsync('is_new_account');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000; // 5 minutes
        
      // For new accounts, handle specially
      if (isNewAccount === 'true' && isRecentRegistration) {
        console.log('New account detected, checking if family_id already exists');
        
        // Check if the user already has a family_id in storage
        const userData = await SecureStore.getItemAsync('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.family_id) {
            console.log('User already has family_id in storage:', parsedUser.family_id);
            
            // Create a synthetic family object
            const syntheticFamily = {
              family_id: parsedUser.family_id,
              family_name: 'My Family' // Default name until we load the real one
            };
            
            setFamilies([syntheticFamily]);
            setSelectedFamily(syntheticFamily);
            await SecureStore.setItemAsync('selected_family_id', syntheticFamily.family_id.toString());
            
            // Still try to get actual family data in the background
            try {
              const userFamilies = await getUserFamilies();
              if (userFamilies && userFamilies.length > 0) {
                setFamilies(userFamilies);
                
                // Update selected family with complete info
                const actualFamily = userFamilies.find(f => f.family_id.toString() === parsedUser.family_id.toString());
                if (actualFamily) {
                  setSelectedFamily(actualFamily);
                }
              }
            } catch (bgError) {
              console.log('Background family data load failed, using synthetic family');
            }
            
            setLoading(false);
            setFamiliesInitialized(true);
            return;
          }
        }
        
        console.log('New account detected, skipping family retry logic');
        retryCount.current = maxRetries; // Prevent retries
      }
      
      // Try to refresh user session if forceRefresh is true (after failed attempt)
      // But skip if it's a recent registration
      if (forceRefresh && !isRecentRegistration) {
        try {
          await refreshUserSession();
        } catch (refreshError) {
          console.log('Could not refresh session before loading families, but continuing anyway');
          // Just continue with current token, no need to report error
        }
      }
      
      // Fetch user's families
      const userFamilies = await getUserFamilies();
      console.log('Loaded families:', userFamilies);
      
      // If no families but user is authenticated, might be a temporary issue
      if (userFamilies.length === 0) {
        const shouldTryAgain = await shouldRetry();
        if (shouldTryAgain && !isRecentRegistration) {
          console.log('No families returned, will retry in a moment...');
          
          // Wait briefly before retrying
          setTimeout(() => loadFamilies(true), 1500);
          return;
        }
      }
      
      // Reset retry count on success or if we're done retrying
      retryCount.current = 0;
      
      setFamilies(userFamilies);
      
      if (userFamilies.length === 0) {
        console.log('No families returned from API');
        setSelectedFamily(null);
        await SecureStore.deleteItemAsync('selected_family_id');
        setFamiliesInitialized(true);
        setLoading(false);
        return;
      }
      
      // Get previously selected family
      const savedFamilyId = await SecureStore.getItemAsync('selected_family_id');
      console.log('Saved family ID:', savedFamilyId);
      
      if (savedFamilyId && userFamilies.some(f => f.family_id.toString() === savedFamilyId)) {
        const familyToSelect = userFamilies.find(f => f.family_id.toString() === savedFamilyId);
        console.log('Setting previously selected family:', familyToSelect);
        setSelectedFamily(familyToSelect);
      } else if (userFamilies.length > 0) {
        // Default to first family
        console.log('Setting default family (first in list):', userFamilies[0]);
        setSelectedFamily(userFamilies[0]);
        await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
        
        // Update the user info with the primary family id if updateUserInfo is available
        if (updateUserInfo && typeof updateUserInfo === 'function') {
          try {
            await updateUserInfo({ primary_family_id: userFamilies[0].family_id });
            console.log('Updated user primary_family_id to:', userFamilies[0].family_id);
          } catch (updateError) {
            console.error('Error updating user primary family ID:', updateError);
            // Continue without updating user info
          }
        }
      }
      
      setFamiliesInitialized(true);
    } catch (err) {
      console.error('Error loading families:', err);
      
      // Check if this is a fresh registration
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000; // 30 seconds
      
      // For fresh registrations, don't treat this as an error
      if (isRecentRegistration) {
        console.log('Recent registration detected, expected to have no families yet');
        setFamilies([]);
        setError(null);
        setFamiliesInitialized(true);
        setLoading(false);
        return;
      }
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        const shouldTryAgain = await shouldRetry();
        if (shouldTryAgain) {
          console.log('Auth error when loading families, will retry with refresh...');
          setTimeout(() => loadFamilies(true), 1500);
          return;
        } else {
          // If we've exceeded retries, force logout
          console.log('Auth error persists after max retries, logging out...');
          if (logout) {
            await logout(false);
          }
        }
      }
      
      setError('Failed to load your families. Please try again.');
      
      // If persistent errors, notify user
      if (retryCount.current >= maxRetries) {
        // Reset for future attempts
        retryCount.current = 0;
        
        // Show alert only if we're still authenticated
        if (isAuthenticated) {
          Alert.alert(
            "Connection Issue",
            "We're having trouble loading your family information. Please try again later.",
            [{ text: "OK" }]
          );
        }
      }
    } finally {
      setLoading(false);
      setFamiliesInitialized(true);
    }
  }, [isAuthenticated, token, refreshUserSession, logout, updateUserInfo]);

  // Load families when auth status changes
  useEffect(() => {
    // Only load families if auth is initialized
    if (authInitialized) {
      loadFamilies(false);
    }
  }, [authInitialized, isAuthenticated, token, loadFamilies]);

  // Function to switch the selected family
  const switchFamily = async (family) => {
    if (!family || !family.family_id) {
      console.error('Invalid family object passed to switchFamily:', family);
      return;
    }
    
    console.log('Switching to family:', family);
    setSelectedFamily(family);
    await SecureStore.setItemAsync('selected_family_id', family.family_id.toString());
  };

  // Refresh families list
  const refreshFamilies = async () => {
    // Reset retry counter on manual refresh
    retryCount.current = 0;
    
    if (!isAuthenticated || !token) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Check if this is a fresh registration
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000;
      
      // Skip token refresh for recent registrations
      if (!isRecentRegistration) {
        try {
          await refreshUserSession();
        } catch (error) {
          console.log('Could not refresh session during family refresh, continuing anyway');
        }
      }
      
      const userFamilies = await getUserFamilies();
      console.log('Refreshed families:', userFamilies);
      
      // Important: We need to update the families state regardless of the result
      setFamilies(userFamilies || []);
      
      if (!userFamilies || userFamilies.length === 0) {
        console.log('No families returned from API, clearing family selection');
        setSelectedFamily(null);
        await SecureStore.deleteItemAsync('selected_family_id');
        return;
      }
      
      // If selected family no longer exists in the user's accessible families,
      // default to the first family in the list
      const savedFamilyId = await SecureStore.getItemAsync('selected_family_id');
      
      // First check if the currently selected family exists and is in the user's families
      if (selectedFamily && userFamilies.some(f => 
        f.family_id.toString() === selectedFamily.family_id.toString())) {
        console.log('Currently selected family is still valid');
      } 
      // Then check if there's a saved family ID that exists in the user's families
      else if (savedFamilyId && userFamilies.some(f => 
        f.family_id.toString() === savedFamilyId)) {
        const familyToSelect = userFamilies.find(f => 
          f.family_id.toString() === savedFamilyId);
        console.log('Setting saved family:', familyToSelect);
        setSelectedFamily(familyToSelect);
      } 
      // Otherwise, default to the first family
      else if (userFamilies.length > 0) {
        console.log('Setting default (first) family:', userFamilies[0]);
        setSelectedFamily(userFamilies[0]);
        await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
      }
    } catch (err) {
      console.error('Error refreshing families:', err);
      
      // Check if this is a fresh registration
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000;
      
      // For fresh registrations, don't treat this as an error
      if (isRecentRegistration) {
        console.log('Recent registration detected, expected to have no families yet');
        setFamilies([]);
        setError(null);
        return;
      }
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          await refreshUserSession();
          // Retry after session refresh
          await refreshFamilies();
        } catch (refreshError) {
          console.error('Failed to refresh session during family refresh:', refreshError);
          setError('Failed to refresh your families. Please try logging in again.');
        }
      } else {
        setError('Failed to refresh your families. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create a new family and set it as selected
  const createAndSelectFamily = async (familyData) => {
    if (!isAuthenticated) {
      return null;
    }
    
    try {
      setLoading(true);
      
      // Create the family
      const response = await apiClient.post('/api/dashboard/families', familyData);
      const newFamily = response.data;
      console.log('Created new family:', newFamily);
      
      if (!newFamily || !newFamily.familyId) {
        throw new Error('Failed to create family: Invalid response');
      }
      
      // Get the fresh list of families
      const userFamilies = await getUserFamilies();
      setFamilies(userFamilies);
      
      // Find and select the newly created family
      const createdFamily = userFamilies.find(f => f.family_id.toString() === newFamily.familyId.toString());
      
      if (createdFamily) {
        setSelectedFamily(createdFamily);
        await SecureStore.setItemAsync('selected_family_id', createdFamily.family_id.toString());
        
        // Update the user info with the primary family id if updateUserInfo is available
        if (updateUserInfo && typeof updateUserInfo === 'function') {
          try {
            await updateUserInfo({ primary_family_id: createdFamily.family_id });
            console.log('Updated user primary_family_id to:', createdFamily.family_id);
          } catch (updateError) {
            console.error('Error updating user primary family ID:', updateError);
            // Continue without updating user info
          }
        }
        
        return createdFamily;
      } else {
        throw new Error('Created family not found in updated list');
      }
    } catch (err) {
      console.error('Error creating family:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          await refreshUserSession();
          // We don't retry the create operation automatically since it might duplicate
          setError('Please try creating the family again.');
        } catch (refreshError) {
          console.error('Failed to refresh session during family creation:', refreshError);
          setError('Authentication error. Please log in again.');
        }
      } else {
        setError('Failed to create family. Please try again.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to force refresh with a clean retry counter
  const forceRefreshFamilies = async () => {
    retryCount.current = 0;
    lastRetryTime.current = 0;
    
    // Check if this is a fresh registration
    const registrationTime = await SecureStore.getItemAsync('registration_time');
    const isRecentRegistration = registrationTime && 
      (Date.now() - parseInt(registrationTime)) < 30000;
    
    // For fresh registrations, we expect no families
    if (isRecentRegistration) {
      console.log('Recent registration detected in force refresh, not attempting token refresh');
      await loadFamilies(false);
    } else {
      await loadFamilies(true);
    }
  };

  // Helper function to determine if user has a family
  const determineUserHasFamily = () => {
    // First and most reliable check: does the user have actual families loaded in state?
    if (familiesInitialized && families && families.length > 0) {
      return true;
    }
    
    // If no families in state, check user object for families
    if (user && user.families && user.families.length > 0) {
      // Double check that we don't have state families that contradict this
      if (familiesInitialized && (!families || families.length === 0)) {
        console.log('Warning: User has families in user object but not in families state');
        // If we have initialized families and they're empty, trust that over the user object
        return false;
      }
      return true;
    }
    
    // Check if user has primary_family_id
    if (user && user.primary_family_id) {
      // Double check that we don't have state families that contradict this
      if (familiesInitialized && (!families || families.length === 0)) {
        console.log('Warning: User has primary_family_id but not in families state');
        // If we have initialized families and they're empty, trust that over the user object
        return false;
      }
      return true;
    }
    
    // Backward compatibility check for family_id
    if (user && user.family_id) {
      // Double check that we don't have state families that contradict this
      if (familiesInitialized && (!families || families.length === 0)) {
        console.log('Warning: User has family_id but not in families state');
        // If we have initialized families and they're empty, trust that over the user object
        return false;
      }
      return true;
    }
    
    return false;
  };

  return (
    <FamilyContext.Provider
      value={{
        families,
        selectedFamily,
        loading,
        error,
        switchFamily,
        refreshFamilies,
        createAndSelectFamily,
        hasFamilies: determineUserHasFamily(),
        familiesInitialized,
        retryLoadFamilies: forceRefreshFamilies,
        determineUserHasFamily
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
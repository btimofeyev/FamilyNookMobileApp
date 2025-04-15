// context/FamilyContext.js - Production optimized version
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../app/api/client';
import { useAuth } from './AuthContext';
import { Alert, Platform } from 'react-native';

// Constants
const SELECTED_FAMILY_ID_KEY = 'selected_family_id';
const REGISTRATION_TIME_KEY = 'registration_time';
const IS_NEW_ACCOUNT_KEY = 'is_new_account';
const USER_DATA_KEY = 'user';

// Create context
const FamilyContext = createContext(null);

/**
 * Helper function to get user families from the API
 * @returns {Promise<Array>} List of families the user belongs to
 */
const getUserFamilies = async () => {
  try {
    const response = await apiClient.get('/api/dashboard/user/families');
    return response.data || [];
  } catch (error) {
    // Only propagate auth errors, suppress others
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw error;
    }
    return [];
  }
};

/**
 * Family Provider component that manages family state
 */
export const FamilyProvider = ({ children }) => {
  // Get auth context
  const { 
    user, 
    isAuthenticated, 
    token, 
    authInitialized, 
    refreshUserSession, 
    logout, 
    updateUserInfo 
  } = useAuth();
  
  // State
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [familiesInitialized, setFamiliesInitialized] = useState(false);
  
  // Refs
  const retryCount = useRef(0);
  const lastRetryTime = useRef(0);
  const maxRetries = 3;
  const mountedRef = useRef(true);
  const familyLoadTimer = useRef(null);
  
  // Lifecycle
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      if (familyLoadTimer.current) {
        clearTimeout(familyLoadTimer.current);
      }
    };
  }, []);
  
  // Reset retry counters when auth state changes
  useEffect(() => {
    retryCount.current = 0;
    lastRetryTime.current = 0;
  }, [isAuthenticated, token]);

  /**
   * Determines if a retry should be attempted
   */
  const shouldRetry = async () => {
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime.current;
    
    // Check if this is a new registration
    const registrationTime = await SecureStore.getItemAsync(REGISTRATION_TIME_KEY);
    const isRecentRegistration = registrationTime && 
      (Date.now() - parseInt(registrationTime)) < 30000; // 30 seconds
    
    // Don't retry for new registrations
    if (isRecentRegistration) {
      return false;
    }
    
    // Only retry if we haven't exceeded max retries and enough time has passed
    if (retryCount.current < maxRetries && timeSinceLastRetry > 3000) {
      retryCount.current += 1;
      lastRetryTime.current = now;
      return true;
    }
    
    return false;
  };

  /**
   * Load families from the API
   * @param {boolean} forceRefresh - Whether to force a refresh of the auth token
   */
  const loadFamilies = useCallback(async (forceRefresh = false) => {
    // Don't load families if not authenticated
    if (!isAuthenticated || !token) {
      if (mountedRef.current) {
        setFamilies([]);
        setSelectedFamily(null);
        setLoading(false);
        setFamiliesInitialized(true);
      }
      return;
    }
  
    try {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      // Short delay to allow other operations to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!mountedRef.current) return;
      
      // Special handling for new accounts
      const registrationTime = await SecureStore.getItemAsync(REGISTRATION_TIME_KEY);
      const isNewAccount = await SecureStore.getItemAsync(IS_NEW_ACCOUNT_KEY);
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000; // 5 minutes
      
      // Handle new accounts with family ID
      if (isNewAccount === 'true' && isRecentRegistration) {
        try {
          const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
          if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.family_id) {
              // Try to get family details
              const response = await apiClient.get(
                `/api/dashboard/families/${parsedUser.family_id}`,
                { timeout: 5000 }
              );
              
              if (response.data && mountedRef.current) {
                // Create a synthetic family from user data
                const syntheticFamily = {
                  family_id: parsedUser.family_id,
                  family_name: response.data.family_name || 'My Family'
                };
                
                setFamilies([syntheticFamily]);
                setSelectedFamily(syntheticFamily);
                await SecureStore.setItemAsync(
                  SELECTED_FAMILY_ID_KEY, 
                  syntheticFamily.family_id.toString()
                );
                
                setLoading(false);
                setFamiliesInitialized(true);
                return;
              }
            }
          }
        } catch (error) {
          // Continue with normal flow if this fails
          console.log('Failed to get synthetic family:', error.message);
        }
      }
      
      // Refresh token if needed, but not for new registrations
      if (forceRefresh && !isRecentRegistration) {
        try {
          await refreshUserSession();
        } catch (refreshError) {
          console.log('Token refresh failed, continuing anyway:', refreshError.message);
        }
      }
      
      if (!mountedRef.current) return;
      
      // Get user families from API
      const userFamilies = await getUserFamilies();
      
      if (!mountedRef.current) return;
      
      setFamilies(userFamilies || []);
      
      // Handle case where user has no families
      if (userFamilies.length === 0 && isAuthenticated) {
        const shouldTryAgain = await shouldRetry();
        if (shouldTryAgain && !isRecentRegistration) {
          // Schedule another attempt with exponential backoff
          const backoffTime = Math.min(1500 * Math.pow(2, retryCount.current - 1), 10000);
          
          if (familyLoadTimer.current) {
            clearTimeout(familyLoadTimer.current);
          }
          
          familyLoadTimer.current = setTimeout(() => {
            if (mountedRef.current) {
              loadFamilies(true);
            }
          }, backoffTime);
          
          return;
        }
        
        if (mountedRef.current) {
          setSelectedFamily(null);
        }
        
        await SecureStore.deleteItemAsync(SELECTED_FAMILY_ID_KEY);
        
        if (mountedRef.current) {
          setFamiliesInitialized(true);
          setLoading(false);
        }
        
        return;
      }
      
      // Reset retry counter on success
      retryCount.current = 0;
      
      // If user has families, determine which one to select
      if (userFamilies.length > 0) {
        const savedFamilyId = await SecureStore.getItemAsync(SELECTED_FAMILY_ID_KEY);
        
        // Try to use saved family ID if it exists in the user's families
        if (savedFamilyId && userFamilies.some(f => f.family_id.toString() === savedFamilyId)) {
          const familyToSelect = userFamilies.find(f => f.family_id.toString() === savedFamilyId);
          
          if (mountedRef.current) {
            setSelectedFamily(familyToSelect);
          }
        } 
        // Otherwise use the first family
        else {
          if (mountedRef.current) {
            setSelectedFamily(userFamilies[0]);
          }
          
          await SecureStore.setItemAsync(
            SELECTED_FAMILY_ID_KEY, 
            userFamilies[0].family_id.toString()
          );
        }
      } 
      // No families
      else {
        if (mountedRef.current) {
          setSelectedFamily(null);
        }
      }
      
      if (mountedRef.current) {
        setFamiliesInitialized(true);
      }
    } catch (err) {
      // Handle auth errors with retry
      if (err.response?.status === 401 || err.response?.status === 403) {
        const shouldTryAgain = await shouldRetry();
        if (shouldTryAgain) {
          // Schedule retry with backoff
          const backoffTime = Math.min(1500 * Math.pow(2, retryCount.current - 1), 10000);
          
          if (familyLoadTimer.current) {
            clearTimeout(familyLoadTimer.current);
          }
          
          familyLoadTimer.current = setTimeout(() => {
            if (mountedRef.current) {
              loadFamilies(true);
            }
          }, backoffTime);
          
          return;
        }
      }
      
      // Handle failure case
      if (mountedRef.current) {
        setFamilies([]);
        setError('Failed to load your families. Please try again.');
        setFamiliesInitialized(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, token, refreshUserSession]);
  
  // Initialize families when auth is initialized
  useEffect(() => {
    if (authInitialized) {
      if (familyLoadTimer.current) {
        clearTimeout(familyLoadTimer.current);
      }
      
      familyLoadTimer.current = setTimeout(() => {
        if (mountedRef.current) {
          loadFamilies(false);
        }
      }, 500);
      
      return () => {
        if (familyLoadTimer.current) {
          clearTimeout(familyLoadTimer.current);
        }
      };
    }
  }, [authInitialized, isAuthenticated, token, loadFamilies]);

  /**
   * Switch to a different family
   * @param {Object} family - The family to switch to
   */
  const switchFamily = async (family) => {
    if (!family || !family.family_id) {
      return;
    }
    
    if (mountedRef.current) {
      setSelectedFamily(family);
    }
    
    try {
      await SecureStore.setItemAsync(SELECTED_FAMILY_ID_KEY, family.family_id.toString());
    } catch (error) {
      console.error('Failed to save selected family ID:', error);
    }
  };

  /**
   * Refresh the list of families
   */
  const refreshFamilies = async () => {
    // Reset retry counter
    retryCount.current = 0;
    
    if (!isAuthenticated || !token) {
      return;
    }
    
    try {
      if (mountedRef.current) {
        setLoading(true);
      }
      
      // Check if this is a new registration
      const registrationTime = await SecureStore.getItemAsync(REGISTRATION_TIME_KEY);
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000; // 30 seconds
      
      // Refresh token if not a new registration
      if (!isRecentRegistration) {
        try {
          await refreshUserSession();
        } catch (error) {
          console.log('Token refresh failed, continuing anyway:', error.message);
        }
      }
      
      if (!mountedRef.current) return;
      
      // Get user families
      const userFamilies = await getUserFamilies();
      
      if (!mountedRef.current) return;
      
      setFamilies(userFamilies || []);
      
      // Handle case with no families
      if (!userFamilies || userFamilies.length === 0) {
        if (mountedRef.current) {
          setSelectedFamily(null);
        }
        
        await SecureStore.deleteItemAsync(SELECTED_FAMILY_ID_KEY);
        return;
      }
      
      // Get saved family ID
      const savedFamilyId = await SecureStore.getItemAsync(SELECTED_FAMILY_ID_KEY);
      
      // If current selection is valid, keep it
      if (selectedFamily && userFamilies.some(f => 
        f.family_id.toString() === selectedFamily.family_id.toString())) {
        // Current selection is valid, keep it
      } 
      // Try to use saved selection
      else if (savedFamilyId && userFamilies.some(f => 
        f.family_id.toString() === savedFamilyId)) {
        const familyToSelect = userFamilies.find(f => 
          f.family_id.toString() === savedFamilyId);
        
        if (mountedRef.current) {
          setSelectedFamily(familyToSelect);
        }
      } 
      // Default to first family
      else if (userFamilies.length > 0) {
        if (mountedRef.current) {
          setSelectedFamily(userFamilies[0]);
        }
        
        await SecureStore.setItemAsync(
          SELECTED_FAMILY_ID_KEY, 
          userFamilies[0].family_id.toString()
        );
      }
    } catch (err) {
      // Special handling for new registrations
      const registrationTime = await SecureStore.getItemAsync(REGISTRATION_TIME_KEY);
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000; // 30 seconds
      
      if (isRecentRegistration && mountedRef.current) {
        setFamilies([]);
        setError(null);
        return;
      }
      
      // Handle auth errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          await refreshUserSession();
          await refreshFamilies();
        } catch (refreshError) {
          if (mountedRef.current) {
            setError('Failed to refresh your families. Please try logging in again.');
          }
        }
      } else if (mountedRef.current) {
        setError('Failed to refresh your families. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Create a new family and select it
   * @param {Object} familyData - Data for the new family
   * @returns {Object|null} The created family or null on failure
   */
  const createAndSelectFamily = async (familyData) => {
    if (!isAuthenticated) {
      return null;
    }
    
    try {
      if (mountedRef.current) {
        setLoading(true);
      }
      
      // Create the family
      const response = await apiClient.post('/api/dashboard/families', familyData);
      const newFamily = response.data;
      
      if (!newFamily || !newFamily.familyId) {
        throw new Error('Failed to create family: Invalid response');
      }
      
      // Get updated family list
      const userFamilies = await getUserFamilies();
      
      if (mountedRef.current) {
        setFamilies(userFamilies);
      }
      
      // Find the created family in the updated list
      const createdFamily = userFamilies.find(
        f => f.family_id.toString() === newFamily.familyId.toString()
      );
      
      if (createdFamily) {
        if (mountedRef.current) {
          setSelectedFamily(createdFamily);
        }
        
        await SecureStore.setItemAsync(
          SELECTED_FAMILY_ID_KEY, 
          createdFamily.family_id.toString()
        );
        
        // Update user data with primary family ID
        if (updateUserInfo && typeof updateUserInfo === 'function') {
          try {
            await updateUserInfo({ primary_family_id: createdFamily.family_id });
          } catch (updateError) {
            console.log('Failed to update user info with primary family ID:', updateError.message);
          }
        }
        
        return createdFamily;
      } else {
        throw new Error('Created family not found in updated list');
      }
    } catch (err) {
      // Handle auth errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          await refreshUserSession();
          
          if (mountedRef.current) {
            setError('Please try creating the family again.');
          }
        } catch (refreshError) {
          if (mountedRef.current) {
            setError('Authentication error. Please log in again.');
          }
        }
      } else if (mountedRef.current) {
        setError('Failed to create family. Please try again.');
      }
      
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Force a refresh of families data
   */
  const forceRefreshFamilies = async () => {
    // Reset retry counters
    retryCount.current = 0;
    lastRetryTime.current = 0;
    
    // Check if this is a new registration
    const registrationTime = await SecureStore.getItemAsync(REGISTRATION_TIME_KEY);
    const isRecentRegistration = registrationTime && 
      (Date.now() - parseInt(registrationTime)) < 30000; // 30 seconds
    
    // Call appropriate load method based on registration status
    if (isRecentRegistration) {
      await loadFamilies(false);
    } else {
      await loadFamilies(true);
    }
  };

  /**
   * Determine if the user has any families
   * @returns {boolean} Whether the user has any families
   */
  const determineUserHasFamily = useCallback(() => {
    // Check families in context state
    if (familiesInitialized && families && families.length > 0) {
      return true;
    }
    
    // Check user.families
    if (user && user.families && user.families.length > 0) {
      // Special case: initialized but no families found
      if (familiesInitialized && (!families || families.length === 0)) {
        return false;
      }
      return true;
    }
    
    // Check primary_family_id
    if (user && user.primary_family_id) {
      // Special case: initialized but no families found
      if (familiesInitialized && (!families || families.length === 0)) {
        return false;
      }
      return true;
    }
    
    // Check family_id
    if (user && user.family_id) {
      // Special case: initialized but no families found
      if (familiesInitialized && (!families || families.length === 0)) {
        return false;
      }
      return true;
    }
    
    // No families found
    return false;
  }, [user, families, familiesInitialized]);

  // Context value
  const contextValue = {
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
  };

  return (
    <FamilyContext.Provider value={contextValue}>
      {children}
    </FamilyContext.Provider>
  );
};

/**
 * Hook to access FamilyContext
 */
export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
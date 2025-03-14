// context/FamilyContext.js
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
  const { user, isAuthenticated, token, authInitialized, refreshUserSession, logout } = useAuth();
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
  const shouldRetry = () => {
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime.current;
    
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
      
      // Try to refresh user session if forceRefresh is true (after failed attempt)
      if (forceRefresh) {
        try {
          await refreshUserSession();
        } catch (refreshError) {
          console.error('Could not refresh session before loading families:', refreshError);
          
          // If no refresh token and retry limit exceeded, force logout
          if (refreshError.message?.includes('No refresh token') && retryCount.current >= maxRetries) {
            console.log('No refresh token available after max retries, logging out...');
            setFamiliesInitialized(true);
            setLoading(false);
            
            // Force logout to break the loop
            if (logout) {
              await logout(false);
            }
            return;
          }
          // Continue anyway with current token
        }
      }
      
      // Fetch user's families
      const userFamilies = await getUserFamilies();
      console.log('Loaded families:', userFamilies);
      
      // If no families but user is authenticated, might be a temporary issue
      if (userFamilies.length === 0 && shouldRetry()) {
        console.log('No families returned, will retry in a moment...');
        
        // Wait briefly before retrying
        setTimeout(() => loadFamilies(true), 1500);
        return;
      }
      
      // Reset retry count on success or if we're done retrying
      retryCount.current = 0;
      
      setFamilies(userFamilies);
      
      if (userFamilies.length === 0) {
        console.log('No families returned from API');
        setSelectedFamily(null);
        await SecureStore.deleteItemAsync('selected_family_id');
        setFamiliesInitialized(true);
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
      }
    } catch (err) {
      console.error('Error loading families:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (shouldRetry()) {
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
  }, [isAuthenticated, token, refreshUserSession, logout]);

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
      const userFamilies = await getUserFamilies();
      console.log('Refreshed families:', userFamilies);
      
      if (!userFamilies || userFamilies.length === 0) {
        setFamilies([]);
        setSelectedFamily(null);
        await SecureStore.deleteItemAsync('selected_family_id');
        return;
      }
      
      setFamilies(userFamilies);
      
      // If selected family no longer exists, default to first family
      if (!selectedFamily || !userFamilies.some(f => f.family_id === selectedFamily.family_id)) {
        if (userFamilies.length > 0) {
          setSelectedFamily(userFamilies[0]);
          await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
        } else {
          setSelectedFamily(null);
          await SecureStore.deleteItemAsync('selected_family_id');
        }
      }
    } catch (err) {
      console.error('Error refreshing families:', err);
      
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
    await loadFamilies(true);
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
        hasFamilies: families.length > 0,
        familiesInitialized,
        retryLoadFamilies: forceRefreshFamilies
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
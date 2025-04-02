// context/FamilyContext.js - Fixed version
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../app/api/client';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

const FamilyContext = createContext();

const getUserFamilies = async () => {
  try {
    const response = await apiClient.get('/api/dashboard/user/families');
    return response.data || [];
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw error;
    }
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
  
  const retryCount = useRef(0);
  const lastRetryTime = useRef(0);
  const maxRetries = 3;
  
  const shouldRetry = async () => {
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime.current;
    
    const registrationTime = await SecureStore.getItemAsync('registration_time');
    const isRecentRegistration = registrationTime && 
      (Date.now() - parseInt(registrationTime)) < 30000;
    
    if (isRecentRegistration) {
      return false;
    }
    
    if (retryCount.current < maxRetries && timeSinceLastRetry > 3000) {
      retryCount.current += 1;
      lastRetryTime.current = now;
      return true;
    }
    
    return false;
  };
  
  useEffect(() => {
    retryCount.current = 0;
    lastRetryTime.current = 0;
  }, [isAuthenticated, token]);

  const loadFamilies = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !token) {
      setFamilies([]);
      setSelectedFamily(null);
      setLoading(false);
      setFamiliesInitialized(true);
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isNewAccount = await SecureStore.getItemAsync('is_new_account');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 5 * 60 * 1000;
      
      if (isNewAccount === 'true' && isRecentRegistration) {
        const userData = await SecureStore.getItemAsync('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.family_id) {
            try {
              const response = await apiClient.get(`/api/dashboard/families/${parsedUser.family_id}`);
              
              if (response.data) {
                const syntheticFamily = {
                  family_id: parsedUser.family_id,
                  family_name: response.data.family_name || 'My Family'
                };
                
                setFamilies([syntheticFamily]);
                setSelectedFamily(syntheticFamily);
                await SecureStore.setItemAsync('selected_family_id', syntheticFamily.family_id.toString());
                
                setLoading(false);
                setFamiliesInitialized(true);
                return;
              }
            } catch (error) {
              // Continue with normal flow if this fails
            }
          }
        }
      }
      
      if (forceRefresh && !isRecentRegistration) {
        try {
          await refreshUserSession();
        } catch (refreshError) {
          // Continue anyway
        }
      }
      
      const userFamilies = await getUserFamilies();
      setFamilies(userFamilies || []);
      
      if (userFamilies.length === 0 && isAuthenticated) {
        const shouldTryAgain = await shouldRetry();
        if (shouldTryAgain && !isRecentRegistration) {
          setTimeout(() => loadFamilies(true), 1500);
          return;
        }
        
        setSelectedFamily(null);
        await SecureStore.deleteItemAsync('selected_family_id');
        setFamiliesInitialized(true);
        setLoading(false);
        return;
      }
      
      retryCount.current = 0;
      
      if (userFamilies.length > 0) {
        const savedFamilyId = await SecureStore.getItemAsync('selected_family_id');
        
        if (savedFamilyId && userFamilies.some(f => f.family_id.toString() === savedFamilyId)) {
          const familyToSelect = userFamilies.find(f => f.family_id.toString() === savedFamilyId);
          setSelectedFamily(familyToSelect);
        } else {
          setSelectedFamily(userFamilies[0]);
          await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
        }
      } else {
        setSelectedFamily(null);
      }
      
      setFamiliesInitialized(true);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        const shouldTryAgain = await shouldRetry();
        if (shouldTryAgain) {
          setTimeout(() => loadFamilies(true), 1500);
          return;
        }
      }
      
      setFamilies([]);
      setError('Failed to load your families. Please try again.');
      setFamiliesInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, refreshUserSession, logout, updateUserInfo]);
  
  useEffect(() => {
    if (authInitialized) {
      const timer = setTimeout(() => {
        loadFamilies(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [authInitialized, isAuthenticated, token, loadFamilies]);

  const switchFamily = async (family) => {
    if (!family || !family.family_id) {
      return;
    }
    
    setSelectedFamily(family);
    await SecureStore.setItemAsync('selected_family_id', family.family_id.toString());
  };

  const refreshFamilies = async () => {
    retryCount.current = 0;
    
    if (!isAuthenticated || !token) {
      return;
    }
    
    try {
      setLoading(true);
      
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000;
      
      if (!isRecentRegistration) {
        try {
          await refreshUserSession();
        } catch (error) {
          // Continue anyway
        }
      }
      
      const userFamilies = await getUserFamilies();
      setFamilies(userFamilies || []);
      
      if (!userFamilies || userFamilies.length === 0) {
        setSelectedFamily(null);
        await SecureStore.deleteItemAsync('selected_family_id');
        return;
      }
      
      const savedFamilyId = await SecureStore.getItemAsync('selected_family_id');
      
      if (selectedFamily && userFamilies.some(f => 
        f.family_id.toString() === selectedFamily.family_id.toString())) {
        // Currently selected family is still valid
      } 
      else if (savedFamilyId && userFamilies.some(f => 
        f.family_id.toString() === savedFamilyId)) {
        const familyToSelect = userFamilies.find(f => 
          f.family_id.toString() === savedFamilyId);
        setSelectedFamily(familyToSelect);
      } 
      else if (userFamilies.length > 0) {
        setSelectedFamily(userFamilies[0]);
        await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
      }
    } catch (err) {
      const registrationTime = await SecureStore.getItemAsync('registration_time');
      const isRecentRegistration = registrationTime && 
        (Date.now() - parseInt(registrationTime)) < 30000;
      
      if (isRecentRegistration) {
        setFamilies([]);
        setError(null);
        return;
      }
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          await refreshUserSession();
          await refreshFamilies();
        } catch (refreshError) {
          setError('Failed to refresh your families. Please try logging in again.');
        }
      } else {
        setError('Failed to refresh your families. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const createAndSelectFamily = async (familyData) => {
    if (!isAuthenticated) {
      return null;
    }
    
    try {
      setLoading(true);
      
      const response = await apiClient.post('/api/dashboard/families', familyData);
      const newFamily = response.data;
      
      if (!newFamily || !newFamily.familyId) {
        throw new Error('Failed to create family: Invalid response');
      }
      
      const userFamilies = await getUserFamilies();
      setFamilies(userFamilies);
      
      const createdFamily = userFamilies.find(f => f.family_id.toString() === newFamily.familyId.toString());
      
      if (createdFamily) {
        setSelectedFamily(createdFamily);
        await SecureStore.setItemAsync('selected_family_id', createdFamily.family_id.toString());
        
        if (updateUserInfo && typeof updateUserInfo === 'function') {
          try {
            await updateUserInfo({ primary_family_id: createdFamily.family_id });
          } catch (updateError) {
            // Continue without updating user info
          }
        }
        
        return createdFamily;
      } else {
        throw new Error('Created family not found in updated list');
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          await refreshUserSession();
          setError('Please try creating the family again.');
        } catch (refreshError) {
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

  const forceRefreshFamilies = async () => {
    retryCount.current = 0;
    lastRetryTime.current = 0;
    
    const registrationTime = await SecureStore.getItemAsync('registration_time');
    const isRecentRegistration = registrationTime && 
      (Date.now() - parseInt(registrationTime)) < 30000;
    
    if (isRecentRegistration) {
      await loadFamilies(false);
    } else {
      await loadFamilies(true);
    }
  };

  const determineUserHasFamily = () => {
    if (familiesInitialized && families && families.length > 0) {
      return true;
    }
    
    if (user && user.families && user.families.length > 0) {
      if (familiesInitialized && (!families || families.length === 0)) {
        return false;
      }
      return true;
    }
    
    if (user && user.primary_family_id) {
      if (familiesInitialized && (!families || families.length === 0)) {
        return false;
      }
      return true;
    }
    
    if (user && user.family_id) {
      if (familiesInitialized && (!families || families.length === 0)) {
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
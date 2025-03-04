// app/context/FamilyContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getUserFamilies } from '../app/api/familyService';
import { useAuth } from './AuthContext';

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load families when user is authenticated
  useEffect(() => {
    const loadFamilies = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch user's families
        const userFamilies = await getUserFamilies();
        console.log('Loaded families:', userFamilies);
        setFamilies(userFamilies);
        
        // Get previously selected family
        const savedFamilyId = await SecureStore.getItemAsync('selected_family_id');
        console.log('Saved family ID:', savedFamilyId);
        
        if (savedFamilyId && userFamilies.some(f => f.family_id.toString() === savedFamilyId)) {
          setSelectedFamily(userFamilies.find(f => f.family_id.toString() === savedFamilyId));
        } else if (userFamilies.length > 0) {
          // Default to first family
          setSelectedFamily(userFamilies[0]);
          await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
        }
      } catch (err) {
        console.error('Error loading families:', err);
        setError('Failed to load your families. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadFamilies();
  }, [isAuthenticated, user]);

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
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setLoading(true);
      const userFamilies = await getUserFamilies();
      setFamilies(userFamilies);
      
      // If selected family no longer exists, default to first family
      if (!userFamilies.some(f => f.family_id === selectedFamily?.family_id)) {
        if (userFamilies.length > 0) {
          setSelectedFamily(userFamilies[0]);
          await SecureStore.setItemAsync('selected_family_id', userFamilies[0].family_id.toString());
        } else {
          setSelectedFamily(null);
          await SecureStore.removeItemAsync('selected_family_id');
        }
      }
    } catch (err) {
      console.error('Error refreshing families:', err);
      setError('Failed to refresh your families. Please try again.');
    } finally {
      setLoading(false);
    }
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
        hasFamilies: families.length > 0
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
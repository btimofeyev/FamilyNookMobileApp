// app/utils/secureStorage.js
import * as SecureStore from 'expo-secure-store';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user',
  REGISTRATION_TIME: 'registration_time',
  IS_NEW_ACCOUNT: 'is_new_account',
  SELECTED_FAMILY_ID: 'selected_family_id'
};

export default {

  storeAuthData: async (data) => {
    const { token, user, refreshToken } = data;
    
    const promises = [
      SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token),
      SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
    ];
    
    if (refreshToken) {
      promises.push(SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken));
    }
    
    await Promise.all(promises);
    
    return true;
  },

  getAuthToken: () => SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN),

  getRefreshToken: () => SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),

  getUserData: async () => {
    const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  updateUserData: async (userData) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    return true;
  },
  
  setRegistrationInfo: async (isNewAccount = true) => {
    const now = Date.now();
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.REGISTRATION_TIME, now.toString()),
      SecureStore.setItemAsync(STORAGE_KEYS.IS_NEW_ACCOUNT, isNewAccount ? 'true' : 'false')
    ]);
    return true;
  },

  isRecentRegistration: async (timeWindowMs = 5 * 60 * 1000) => {
    const registrationTime = await SecureStore.getItemAsync(STORAGE_KEYS.REGISTRATION_TIME);
    if (!registrationTime) return false;
    
    return (Date.now() - parseInt(registrationTime)) < timeWindowMs;
  },

  isNewAccount: async () => {
    const isNewAccount = await SecureStore.getItemAsync(STORAGE_KEYS.IS_NEW_ACCOUNT);
    return isNewAccount === 'true';
  },

  setSelectedFamilyId: async (familyId) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.SELECTED_FAMILY_ID, familyId.toString());
    return true;
  },

  clearAuthStorage: async () => {
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
    return true;
  }
};
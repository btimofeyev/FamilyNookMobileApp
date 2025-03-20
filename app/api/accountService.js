// app/api/accountService.js
import apiClient from './client';

/**
 * Request account deletion for the currently authenticated user
 * This will send a confirmation email to the user's email address
 * @returns {Promise<Object>} Response data from the server
 */
export const requestAccountDeletion = async () => {
  try {
    const response = await apiClient.post('/api/account/request-deletion');
    return response.data;
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    throw error;
  }
};

/**
 * Cancel a pending account deletion request
 * @returns {Promise<Object>} Response data from the server
 */
export const cancelAccountDeletion = async () => {
  try {
    const response = await apiClient.post('/api/account/cancel-deletion');
    return response.data;
  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    throw error;
  }
};

/**
 * Check if the user has a pending account deletion request
 * @returns {Promise<Object>} Object containing hasPendingRequest boolean and requestDetails if any
 */
export const checkDeletionStatus = async () => {
  try {
    const response = await apiClient.get('/api/account/deletion-status');
    return response.data;
  } catch (error) {
    console.error('Error checking deletion status:', error);
    // Return default value on error to prevent UI crashes
    return { hasPendingRequest: false, requestDetails: null };
  }
};

/**
 * Confirm account deletion using a token received via email
 * @param {string} token The confirmation token from the email link
 * @returns {Promise<Object>} Response data from the server
 */
export const confirmAccountDeletion = async (token) => {
  try {
    const response = await apiClient.post('/api/account/confirm-deletion', { token });
    return response.data;
  } catch (error) {
    console.error('Error confirming account deletion:', error);
    throw error;
  }
};

/**
 * Download all user data before account deletion
 * This is recommended by privacy regulations like GDPR
 * @returns {Promise<Blob>} A blob containing the user's data in JSON format
 */
export const downloadUserData = async () => {
  try {
    const response = await apiClient.get('/api/account/download-data', {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading user data:', error);
    throw error;
  }
};

/**
 * Update user account settings
 * @param {Object} settings User settings to update
 * @returns {Promise<Object>} Updated user settings
 */
export const updateAccountSettings = async (settings) => {
  try {
    const response = await apiClient.put('/api/account/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating account settings:', error);
    throw error;
  }
};

/**
 * Change user password
 * @param {Object} passwordData Object containing currentPassword and newPassword
 * @returns {Promise<Object>} Response data from the server
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await apiClient.post('/api/account/change-password', passwordData);
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};
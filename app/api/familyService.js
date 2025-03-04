// app/api/familyService.js
import apiClient from './client';

export const getUserFamilies = async () => {
  try {
    console.log('Fetching user families');
    const response = await apiClient.get('/api/dashboard/user/families');
    console.log('User families response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching user families:', error);
    throw error;
  }
};

export const getFamilyDetails = async (familyId) => {
  try {
    const response = await apiClient.get(`/api/dashboard/families/${familyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching family details:', error);
    throw error;
  }
};

export const createFamily = async (data) => {
  try {
    const response = await apiClient.post('/api/dashboard/families', data);
    return response.data;
  } catch (error) {
    console.error('Error creating family:', error);
    throw error;
  }
};

export const getFamilyMembers = async (familyId) => {
  try {
    const response = await apiClient.get(`/api/dashboard/families/${familyId}/members`);
    return response.data;
  } catch (error) {
    console.error('Error fetching family members:', error);
    throw error;
  }
};

export const addFamilyMember = async (familyId, email) => {
  try {
    const response = await apiClient.post(`/api/dashboard/families/${familyId}/members`, { email });
    return response.data;
  } catch (error) {
    console.error('Error adding family member:', error);
    throw error;
  }
};

export const getFamilyCalendar = async (familyId) => {
  try {
    const response = await apiClient.get(`/api/dashboard/calendar/${familyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching family calendar:', error);
    throw error;
  }
};

export const generateFamilyPasskey = async (familyId) => {
  try {
    const response = await apiClient.post(`/api/dashboard/families/${familyId}/passkey`);
    return response.data;
  } catch (error) {
    console.error('Error generating family passkey:', error);
    throw error;
  }
};

export const validateFamilyPasskey = async (passkey) => {
  try {
    const response = await apiClient.post('/api/dashboard/families/validate-passkey', { passkey });
    return response.data;
  } catch (error) {
    console.error('Error validating family passkey:', error);
    throw error;
  }
};

export const leaveFamilyGroup = async (familyId) => {
  try {
    const response = await apiClient.delete(`/api/dashboard/families/${familyId}/leave`);
    return response.data;
  } catch (error) {
    console.error('Error leaving family group:', error);
    throw error;
  }
};
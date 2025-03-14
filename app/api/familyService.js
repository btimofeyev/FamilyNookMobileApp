// app/api/familyService.js
import apiClient from './client';

export const getUserFamilies = async () => {
  try {
    console.log('Fetching user families');
    const response = await apiClient.get('/api/dashboard/user/families');
    
    // Check if the response is an array or has a specific property containing the data
    const families = Array.isArray(response.data) ? response.data : response.data.families || [];
    
    console.log('User families response:', families);
    
    // Map response to ensure consistent format
    return families.map(family => ({
      family_id: family.family_id,
      family_name: family.family_name,
      photo_url: family.photo_url || null,
      member_count: family.member_count || null
    }));
  } catch (error) {
    console.error('Error fetching user families:', error);
    if (error.response?.status === 401) {
      console.log('Authentication error when fetching families - token may be expired');
    }
    throw error;
  }
};

export const getFamilyDetails = async (familyId) => {
  try {
    console.log(`Fetching details for family ${familyId}`);
    const response = await apiClient.get(`/api/dashboard/families/${familyId}`);
    console.log('Family details response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching family details:', error);
    throw error;
  }
};

export const createFamily = async (data) => {
  try {
    console.log('Creating new family with data:', data);
    const response = await apiClient.post('/api/dashboard/families', data);
    console.log('Create family response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating family:', error);
    throw error;
  }
};

export const getFamilyMembers = async (familyId) => {
  try {
    console.log(`Fetching members for family ${familyId}`);
    const response = await apiClient.get(`/api/dashboard/families/${familyId}/members`);
    console.log('Family members response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching family members:', error);
    throw error;
  }
};

export const addFamilyMember = async (familyId, email) => {
  try {
    console.log(`Adding member ${email} to family ${familyId}`);
    const response = await apiClient.post(`/api/dashboard/families/${familyId}/members`, { email });
    console.log('Add family member response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding family member:', error);
    throw error;
  }
};

export const inviteFamilyMember = async (familyId, email) => {
  try {
    console.log(`Inviting member ${email} to family ${familyId}`);
    const response = await apiClient.post(`/api/invitations/invite`, { 
      email,
      familyId
    });
    console.log('Invite family member response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error inviting family member:', error);
    throw error;
  }
};

export const getFamilyCalendar = async (familyId) => {
  try {
    console.log(`Fetching calendar for family ${familyId}`);
    const response = await apiClient.get(`/api/dashboard/calendar/${familyId}`);
    console.log('Family calendar response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching family calendar:', error);
    throw error;
  }
};

export const generateFamilyPasskey = async (familyId) => {
  try {
    console.log(`Generating passkey for family ${familyId}`);
    const response = await apiClient.post(`/api/dashboard/families/${familyId}/passkey`);
    console.log('Generate family passkey response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error generating family passkey:', error);
    throw error;
  }
};

export const validateFamilyPasskey = async (passkey) => {
  try {
    console.log(`Validating passkey: ${passkey}`);
    const response = await apiClient.post('/api/dashboard/families/validate-passkey', { passkey });
    console.log('Validate family passkey response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error validating family passkey:', error);
    throw error;
  }
};

export const leaveFamilyGroup = async (familyId) => {
  try {
    console.log(`Leaving family ${familyId}`);
    const response = await apiClient.delete(`/api/dashboard/families/${familyId}/leave`);
    console.log('Leave family group response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error leaving family group:', error);
    throw error;
  }
};
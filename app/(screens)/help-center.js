// app/(screens)/help-center.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// FAQs and help sections data
const helpSections = [
  {
    id: 'account',
    title: 'Account & Setup',
    icon: 'person-circle-outline',
    questions: [
      {
        question: 'How do I create a family?',
        answer: 'To create a family, go to your Profile tab and tap "Create Family". Enter your family name and tap "Create Family". You\'ll be the admin of your new family group.'
      },
      {
        question: 'How do I invite family members?',
        answer: 'You can invite family members in two ways:\n\n1. Share a family passkey: On your Profile tab, tap "Generate Passkey" and share the code with family members.\n\n2. Send email invitations: On your Profile tab, tap "Invite Member" and enter the email address of the person you want to invite.'
      },
      {
        question: 'How do I join an existing family?',
        answer: 'If you have a family passkey, go to your Profile tab and tap "Join Family". Enter the passkey to join the family instantly. If you received an email invitation, simply click the link in the email and follow the instructions.'
      },
      {
        question: 'Can I belong to multiple families?',
        answer: 'Yes! You can be a member of multiple families. Switch between families using the dropdown selector at the top of your Feed screen.'
      }
    ]
  },
  {
    id: 'posts',
    title: 'Posts & Photos',
    icon: 'images-outline',
    questions: [
      {
        question: 'How do I create a post?',
        answer: 'Tap the + button at the bottom of the Feed screen to create a new post. You can add text, photos, or both. Your post will be visible to all family members.'
      },
      {
        question: 'Who can see my posts?',
        answer: 'Your posts are only visible to members of the family you select when creating the post. FamlyNook is private by design - no public sharing or outside visibility.'
      },
      {
        question: 'How do I like or comment on posts?',
        answer: 'To like a post, tap the heart icon. To comment, tap the comment bubble icon and type your message. All family members will be able to see your likes and comments.'
      },
      {
        question: 'Can I delete my posts?',
        answer: 'Yes, you can delete any post you created. Open the post and tap the three dots menu in the top right corner, then select "Delete Post".'
      }
    ]
  },
  {
    id: 'memories',
    title: 'Memories',
    icon: 'bookmark-outline',
    questions: [
      {
        question: 'What are Memories?',
        answer: 'Memories are special collections of photos, videos and comments that help you capture important family moments like birthdays, holidays, or special events.'
      },
      {
        question: 'How do I create a Memory?',
        answer: 'Go to the Memories tab and tap the + button. Give your memory a title and description, then start adding photos and videos.'
      },
      {
        question: 'Can all family members add to Memories?',
        answer: 'Yes, all family members can add photos, videos and comments to any Memory. This makes it easy to collect everyone\'s perspective on family events.'
      },
      {
        question: 'How do I organize Memories?',
        answer: 'Memories are automatically organized by date. You can scroll through them chronologically or search for specific Memory titles.'
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications-outline',
    questions: [
      {
        question: 'What notifications will I receive?',
        answer: 'You\'ll receive notifications when family members: post new content, like or comment on your posts, add to Memories, or invite you to join events.'
      },
      {
        question: 'How do I adjust notification settings?',
        answer: 'Go to Settings > Notification Settings to customize which notifications you receive. You can toggle different types of notifications on or off.'
      },
      {
        question: 'Why am I not receiving notifications?',
        answer: 'Check your device settings to ensure notifications are enabled for FamlyNook. Also verify your in-app notification settings in Settings > Notification Settings.'
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: 'shield-checkmark-outline',
    questions: [
      {
        question: 'Who can see my family content?',
        answer: 'Only members of your family group can see the content you share. FamlyNook is completely private - there is no public sharing or outside visibility.'
      },
      {
        question: 'How is my data protected?',
        answer: 'Your data is encrypted and stored securely. We never share your personal information with third parties without your consent. Please see our Privacy Policy for more details.'
      },
      {
        question: 'Can I delete my account and data?',
        answer: 'Yes, go to Settings > Account Actions > Delete My Account. This will permanently remove your account and personal data from our systems.'
      },
      {
        question: 'How do I report inappropriate content?',
        answer: 'If you see inappropriate content within your family feed, tap the three dots menu on the post and select "Report". Our team will review your report promptly.'
      }
    ]
  }
];

export default function HelpCenterScreen() {
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState({});

  const toggleSection = (sectionId) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
      setExpandedQuestion({});
    }
  };

  const toggleQuestion = (sectionId, questionIndex) => {
    const key = `${sectionId}-${questionIndex}`;
    setExpandedQuestion(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Help Center',
          headerStyle: {
            backgroundColor: '#1E2B2F'
          },
          headerTintColor: '#F5F5F7',
          headerShown: true
        }}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={10} tint="dark" style={styles.headerCard}>
          <Text style={styles.title}>How can we help you?</Text>
          <Text style={styles.subtitle}>
            Find answers to common questions about using FamlyNook
          </Text>
        </BlurView>

        {helpSections.map(section => (
          <View key={section.id}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <BlurView intensity={10} tint="dark" style={styles.sectionHeaderBlur}>
                <View style={styles.sectionHeaderContent}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons name={section.icon} size={22} color="#F5F5F7" />
                    </View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <Ionicons 
                    name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#8E8E93" 
                  />
                </View>
              </BlurView>
            </TouchableOpacity>

            {expandedSection === section.id && (
              <BlurView intensity={10} tint="dark" style={styles.questionsContainer}>
                {section.questions.map((item, index) => {
                  const questionKey = `${section.id}-${index}`;
                  const isExpanded = expandedQuestion[questionKey];
                  
                  return (
                    <View key={index} style={styles.questionItem}>
                      <TouchableOpacity 
                        style={styles.questionHeader}
                        onPress={() => toggleQuestion(section.id, index)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.questionText}>{item.question}</Text>
                        <Ionicons 
                          name={isExpanded ? 'remove' : 'add'} 
                          size={22} 
                          color="#4CC2C4" 
                        />
                      </TouchableOpacity>
                      
                      {isExpanded && (
                        <Text style={styles.answerText}>{item.answer}</Text>
                      )}
                    </View>
                  );
                })}
              </BlurView>
            )}
          </View>
        ))}

        <BlurView intensity={10} tint="dark" style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            If you couldn't find the answer you're looking for, feel free to contact our support team.
          </Text>
          <Text style={styles.contactEmail}>support@famlynook.com</Text>
        </BlurView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Fallback color
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    lineHeight: 22,
  },
  sectionHeader: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeaderBlur: {
    backgroundColor: 'rgba(44, 44, 46, 0.9)', // Fallback color
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3BAFBC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F5F5F7',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  questionsContainer: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.7)', // Fallback color
  },
  questionItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(84, 84, 88, 0.2)',
    padding: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5F5F7',
    flex: 1,
    paddingRight: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  answerText: {
    fontSize: 15,
    color: '#AEAEB2',
    lineHeight: 22,
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  contactCard: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Fallback color
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F7',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  contactText: {
    fontSize: 15,
    color: '#AEAEB2',
    marginBottom: 16,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  contactEmail: {
    fontSize: 16,
    color: '#4CC2C4',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});
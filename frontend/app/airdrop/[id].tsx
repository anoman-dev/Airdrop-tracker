import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
  Dimensions,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const themes = {
  dark: {
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceSecondary: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    border: '#333333'
  }
};

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  url?: string;
  required: boolean;
}

interface Airdrop {
  id: string;
  name: string;
  description: string;
  blockchain: string;
  status: string;
  reward_amount?: string;
  reward_token?: string;
  deadline?: string;
  snapshot_date?: string;
  listing_date?: string;
  official_url: string;
  logo_url?: string;
  tasks: Task[];
  requirements: string[];
  social_links: { [key: string]: string };
  reputation_score: number;
}

interface EligibilityResult {
  is_eligible: boolean;
  details: {
    wallet_address: string;
    blockchain: string;
    criteria_met: string[];
    estimated_reward?: string;
  };
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AirdropDetail() {
  const { id } = useLocalSearchParams();
  const [airdrop, setAirdrop] = useState<Airdrop | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [tracking, setTracking] = useState(false);

  const theme = themes.dark;
  const userId = 'user_123';

  useEffect(() => {
    if (id) {
      fetchAirdropDetails();
      fetchUserStatus();
    }
  }, [id]);

  const fetchAirdropDetails = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/airdrops/${id}`);
      if (response.ok) {
        const data = await response.json();
        setAirdrop(data);
      } else {
        Alert.alert('Error', 'Failed to load airdrop details');
      }
    } catch (error) {
      console.error('Error fetching airdrop:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}/airdrops`);
      if (response.ok) {
        const userAirdrops = await response.json();
        const currentAirdrop = userAirdrops.find((ua: any) => ua.airdrop_id === id);
        if (currentAirdrop) {
          setTracking(true);
          setCompletedTasks(currentAirdrop.completed_tasks);
        }
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  };

  const handleTrackAirdrop = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}/airdrops/${id}/track`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setTracking(true);
        Alert.alert('Success', 'Airdrop is now being tracked!');
      } else {
        Alert.alert('Error', 'Failed to track airdrop');
      }
    } catch (error) {
      console.error('Error tracking airdrop:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/users/${userId}/airdrops/${id}/tasks/${taskId}/complete`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        const result = await response.json();
        setCompletedTasks(prev => [...prev, taskId]);
        Alert.alert('Task Completed! ✅', `Progress: ${result.progress}%`);
      } else {
        Alert.alert('Error', 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const checkEligibility = async () => {
    if (!walletAddress.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    setCheckingEligibility(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/eligibility/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet_address: walletAddress.trim(),
          airdrop_id: id
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEligibilityResult(result);
        setShowEligibilityModal(false);
        
        Alert.alert(
          result.is_eligible ? 'Eligible! 🎉' : 'Not Eligible 😔',
          result.is_eligible 
            ? `You may be eligible for ${result.details.estimated_reward || 'tokens'}!`
            : 'Your wallet doesn\'t meet the requirements for this airdrop.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to check eligibility');
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setCheckingEligibility(false);
    }
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.success;
      case 'upcoming': return theme.warning;
      case 'expired': return theme.error;
      default: return theme.textSecondary;
    }
  };

  const getTaskIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      social: 'people',
      staking: 'wallet',
      snapshot: 'camera',
      trading: 'swap-horizontal',
      other: 'checkmark-circle'
    };
    return icons[type] || 'checkmark-circle';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading airdrop details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!airdrop) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            Airdrop not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.accent }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {airdrop.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <View style={[styles.mainCard, { backgroundColor: theme.surface }]}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={[styles.airdropTitle, { color: theme.text }]}>
                {airdrop.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.blockchain, { color: theme.accent }]}>
                  {airdrop.blockchain.toUpperCase()}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(airdrop.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(airdrop.status) }]}>
                    {airdrop.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.reputationContainer}>
              <Ionicons name="star" size={16} color={theme.warning} />
              <Text style={[styles.reputationScore, { color: theme.text }]}>
                {airdrop.reputation_score}/100
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {airdrop.description}
          </Text>

          {/* Reward Info */}
          {(airdrop.reward_amount || airdrop.reward_token) && (
            <View style={[styles.rewardCard, { backgroundColor: theme.surfaceSecondary }]}>
              <Ionicons name="gift" size={20} color={theme.success} />
              <View>
                <Text style={[styles.rewardLabel, { color: theme.textSecondary }]}>
                  Estimated Reward
                </Text>
                <Text style={[styles.rewardAmount, { color: theme.success }]}>
                  {airdrop.reward_amount} {airdrop.reward_token}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Important Dates */}
        <View style={[styles.datesCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Important Dates
          </Text>
          <View style={styles.datesList}>
            {airdrop.deadline && (
              <View style={styles.dateItem}>
                <Ionicons name="alarm" size={16} color={theme.error} />
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
                  Deadline:
                </Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {formatDate(airdrop.deadline)}
                </Text>
              </View>
            )}
            {airdrop.snapshot_date && (
              <View style={styles.dateItem}>
                <Ionicons name="camera" size={16} color={theme.warning} />
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
                  Snapshot:
                </Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {formatDate(airdrop.snapshot_date)}
                </Text>
              </View>
            )}
            {airdrop.listing_date && (
              <View style={styles.dateItem}>
                <Ionicons name="calendar" size={16} color={theme.success} />
                <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
                  Listing:
                </Text>
                <Text style={[styles.dateValue, { color: theme.text }]}>
                  {formatDate(airdrop.listing_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Requirements */}
        {airdrop.requirements.length > 0 && (
          <View style={[styles.requirementsCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Requirements
            </Text>
            {airdrop.requirements.map((requirement, index) => (
              <View key={index} style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
                  {requirement}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tasks Checklist */}
        {airdrop.tasks.length > 0 && (
          <View style={[styles.tasksCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Tasks Checklist
            </Text>
            {airdrop.tasks.map((task) => {
              const isCompleted = completedTasks.includes(task.id);
              return (
                <View key={task.id} style={[styles.taskItem, { borderBottomColor: theme.border }]}>
                  <View style={styles.taskInfo}>
                    <View style={styles.taskHeader}>
                      <Ionicons 
                        name={getTaskIcon(task.type) as any} 
                        size={18} 
                        color={isCompleted ? theme.success : theme.accent} 
                      />
                      <Text style={[styles.taskTitle, { 
                        color: isCompleted ? theme.success : theme.text 
                      }]}>
                        {task.title}
                      </Text>
                      {task.required && (
                        <Text style={[styles.requiredBadge, { color: theme.error }]}>
                          Required
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.taskDescription, { color: theme.textSecondary }]}>
                      {task.description}
                    </Text>
                  </View>
                  <View style={styles.taskActions}>
                    {task.url && (
                      <TouchableOpacity
                        style={[styles.taskButton, { backgroundColor: theme.surfaceSecondary }]}
                        onPress={() => openLink(task.url!)}
                      >
                        <Ionicons name="open" size={14} color={theme.accent} />
                      </TouchableOpacity>
                    )}
                    {tracking && (
                      <TouchableOpacity
                        style={[
                          styles.taskButton,
                          { 
                            backgroundColor: isCompleted ? theme.success + '20' : theme.accent,
                            opacity: isCompleted ? 0.6 : 1 
                          }
                        ]}
                        onPress={() => !isCompleted && handleCompleteTask(task.id)}
                        disabled={isCompleted}
                      >
                        <Ionicons 
                          name={isCompleted ? "checkmark" : "add"} 
                          size={14} 
                          color={isCompleted ? theme.success : "white"} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Social Links */}
        {Object.keys(airdrop.social_links).length > 0 && (
          <View style={[styles.linksCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Official Links
            </Text>
            <View style={styles.linksContainer}>
              {Object.entries(airdrop.social_links).map(([platform, url]) => (
                <TouchableOpacity
                  key={platform}
                  style={[styles.linkButton, { backgroundColor: theme.surfaceSecondary }]}
                  onPress={() => openLink(url)}
                >
                  <Ionicons name="link" size={16} color={theme.accent} />
                  <Text style={[styles.linkText, { color: theme.text }]}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Eligibility Result */}
        {eligibilityResult && (
          <View style={[styles.eligibilityCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Eligibility Check Result
            </Text>
            <View style={styles.eligibilityResult}>
              <Ionicons 
                name={eligibilityResult.is_eligible ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={eligibilityResult.is_eligible ? theme.success : theme.error} 
              />
              <View style={styles.eligibilityDetails}>
                <Text style={[
                  styles.eligibilityStatus,
                  { color: eligibilityResult.is_eligible ? theme.success : theme.error }
                ]}>
                  {eligibilityResult.is_eligible ? 'Eligible' : 'Not Eligible'}
                </Text>
                <Text style={[styles.eligibilityWallet, { color: theme.textSecondary }]}>
                  {eligibilityResult.details.wallet_address}
                </Text>
                {eligibilityResult.details.criteria_met.map((criteria, index) => (
                  <Text key={index} style={[styles.criteriaText, { color: theme.textSecondary }]}>
                    • {criteria}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.eligibilityButton, { backgroundColor: theme.accent }]}
          onPress={() => setShowEligibilityModal(true)}
        >
          <Ionicons name="search" size={18} color="white" />
          <Text style={styles.eligibilityButtonText}>Check Eligibility</Text>
        </TouchableOpacity>
        
        {!tracking ? (
          <TouchableOpacity
            style={[styles.trackButton, { backgroundColor: theme.success }]}
            onPress={handleTrackAirdrop}
          >
            <Ionicons name="bookmark" size={18} color="white" />
            <Text style={styles.trackButtonText}>Track</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.trackingIndicator, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="bookmark" size={18} color={theme.success} />
            <Text style={[styles.trackingText, { color: theme.success }]}>Tracking</Text>
          </View>
        )}
      </View>

      {/* Eligibility Check Modal */}
      <Modal
        visible={showEligibilityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEligibilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Check Eligibility
              </Text>
              <TouchableOpacity
                onPress={() => setShowEligibilityModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
              Enter your wallet address to check if you're eligible for this airdrop:
            </Text>
            
            <TextInput
              style={[styles.walletInput, { 
                backgroundColor: theme.surfaceSecondary,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Enter wallet address..."
              placeholderTextColor={theme.textSecondary}
              value={walletAddress}
              onChangeText={setWalletAddress}
              multiline
            />
            
            <TouchableOpacity
              style={[
                styles.checkButton,
                { 
                  backgroundColor: theme.accent,
                  opacity: checkingEligibility ? 0.6 : 1
                }
              ]}
              onPress={checkEligibility}
              disabled={checkingEligibility}
            >
              <Text style={styles.checkButtonText}>
                {checkingEligibility ? 'Checking...' : 'Check Eligibility'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backIcon: {
    width: 24,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  mainCard: {
    margin: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  airdropTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  blockchain: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  reputationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reputationScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  datesCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  datesList: {
    gap: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  requirementsCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  tasksCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskInfo: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  taskButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linksCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eligibilityCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eligibilityResult: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eligibilityDetails: {
    flex: 1,
  },
  eligibilityStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eligibilityWallet: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eligibilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  eligibilityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  trackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  trackingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  walletInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  checkButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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

interface UserAirdropStatus {
  id: string;
  user_id: string;
  airdrop_id: string;
  status: string;
  completed_tasks: string[];
  progress_percentage: number;
  wallet_address?: string;
  eligibility_checked: boolean;
  is_eligible?: boolean;
  reminder_enabled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
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
  reputation_score: number;
  tasks: any[];
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function MyAirdrops() {
  const [userAirdrops, setUserAirdrops] = useState<UserAirdropStatus[]>([]);
  const [airdropDetails, setAirdropDetails] = useState<{ [key: string]: Airdrop }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const theme = themes.dark;
  const userId = 'user_123';

  useEffect(() => {
    loadUserAirdrops();
  }, []);

  const loadUserAirdrops = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}/airdrops`);
      if (response.ok) {
        const data = await response.json();
        setUserAirdrops(data);
        
        // Fetch details for each airdrop
        const details: { [key: string]: Airdrop } = {};
        await Promise.all(
          data.map(async (userAirdrop: UserAirdropStatus) => {
            try {
              const airdropResponse = await fetch(`${BACKEND_URL}/api/airdrops/${userAirdrop.airdrop_id}`);
              if (airdropResponse.ok) {
                const airdropData = await airdropResponse.json();
                details[userAirdrop.airdrop_id] = airdropData;
              }
            } catch (error) {
              console.error('Error fetching airdrop details:', error);
            }
          })
        );
        setAirdropDetails(details);
      } else {
        console.error('Failed to fetch user airdrops');
      }
    } catch (error) {
      console.error('Error fetching user airdrops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserAirdrops();
    setRefreshing(false);
  };

  const toggleReminder = async (airdropId: string, currentStatus: boolean) => {
    // In a real app, this would call an API to update reminder settings
    Alert.alert(
      'Reminder Settings',
      `Reminders ${currentStatus ? 'disabled' : 'enabled'} for this airdrop`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.success;
      case 'in_progress': return theme.warning;
      case 'not_started': return theme.textSecondary;
      default: return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'in_progress': return 'time';
      case 'not_started': return 'ellipse-outline';
      default: return 'ellipse-outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage === 100) return theme.success;
    if (percentage >= 50) return theme.warning;
    return theme.accent;
  };

  const filteredAirdrops = userAirdrops.filter(userAirdrop => {
    if (selectedFilter === 'all') return true;
    return userAirdrop.status === selectedFilter;
  });

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.surface }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          My Airdrops
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {userAirdrops.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Tracking
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.success }]}>
            {userAirdrops.filter(ua => ua.status === 'completed').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Completed
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.warning }]}>
            {userAirdrops.filter(ua => ua.status === 'in_progress').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            In Progress
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['all', 'not_started', 'in_progress', 'completed'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === filter ? theme.accent : theme.surfaceSecondary,
                borderColor: theme.border
              }
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedFilter === filter ? 'white' : theme.text
                }
              ]}
            >
              {filter === 'not_started' ? 'Not Started' : 
               filter === 'in_progress' ? 'In Progress' :
               filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderAirdropCard = (userAirdrop: UserAirdropStatus) => {
    const airdrop = airdropDetails[userAirdrop.airdrop_id];
    if (!airdrop) return null;

    return (
      <TouchableOpacity
        key={userAirdrop.id}
        style={[styles.airdropCard, { backgroundColor: theme.surface }]}
        onPress={() => router.push(`/airdrop/${userAirdrop.airdrop_id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                {airdrop.name}
              </Text>
              <Text style={[styles.cardBlockchain, { color: theme.textSecondary }]}>
                {airdrop.blockchain.toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardMeta}>
              <Ionicons
                name={getStatusIcon(userAirdrop.status) as any}
                size={20}
                color={getStatusColor(userAirdrop.status)}
              />
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              Progress
            </Text>
            <Text style={[styles.progressPercent, { color: theme.text }]}>
              {userAirdrop.progress_percentage}%
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${userAirdrop.progress_percentage}%`,
                  backgroundColor: getProgressBarColor(userAirdrop.progress_percentage)
                }
              ]}
            />
          </View>
          <Text style={[styles.progressTasks, { color: theme.textSecondary }]}>
            {userAirdrop.completed_tasks.length} of {airdrop.tasks.length} tasks completed
          </Text>
        </View>

        {/* Status and Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(userAirdrop.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(userAirdrop.status) }
              ]}>
                {userAirdrop.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            {userAirdrop.eligibility_checked && (
              <View style={[
                styles.eligibilityBadge,
                { 
                  backgroundColor: userAirdrop.is_eligible ? theme.success + '20' : theme.error + '20'
                }
              ]}>
                <Ionicons
                  name={userAirdrop.is_eligible ? "checkmark" : "close"}
                  size={12}
                  color={userAirdrop.is_eligible ? theme.success : theme.error}
                />
                <Text style={[
                  styles.eligibilityText,
                  { color: userAirdrop.is_eligible ? theme.success : theme.error }
                ]}>
                  {userAirdrop.is_eligible ? 'Eligible' : 'Not Eligible'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.surfaceSecondary }]}
              onPress={() => toggleReminder(userAirdrop.airdrop_id, userAirdrop.reminder_enabled)}
            >
              <Ionicons
                name={userAirdrop.reminder_enabled ? "notifications" : "notifications-off"}
                size={16}
                color={userAirdrop.reminder_enabled ? theme.accent : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reward Info */}
        {(airdrop.reward_amount || airdrop.reward_token) && (
          <View style={styles.rewardInfo}>
            <Ionicons name="gift" size={14} color={theme.success} />
            <Text style={[styles.rewardText, { color: theme.success }]}>
              {airdrop.reward_amount} {airdrop.reward_token}
            </Text>
          </View>
        )}

        {/* Deadline */}
        {airdrop.deadline && (
          <View style={styles.deadlineInfo}>
            <Ionicons name="time" size={14} color={theme.warning} />
            <Text style={[styles.deadlineText, { color: theme.textSecondary }]}>
              Deadline: {formatDate(airdrop.deadline)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading your airdrops...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {renderHeader()}
        {renderFilters()}
        
        <View style={styles.airdropsList}>
          {filteredAirdrops.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Tracked Airdrops
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {selectedFilter === 'all' 
                  ? "You haven't started tracking any airdrops yet."
                  : `No airdrops with ${selectedFilter.replace('_', ' ')} status.`
                }
              </Text>
              {selectedFilter === 'all' && (
                <TouchableOpacity
                  style={[styles.exploreButton, { backgroundColor: theme.accent }]}
                  onPress={() => router.push('/')}
                >
                  <Text style={styles.exploreButtonText}>Explore Airdrops</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Tracked Airdrops ({filteredAirdrops.length})
              </Text>
              {filteredAirdrops.map(renderAirdropCard)}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  airdropsList: {
    padding: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  airdropCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardBlockchain: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardMeta: {
    alignItems: 'flex-end',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressTasks: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  eligibilityText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineText: {
    fontSize: 12,
  },
});
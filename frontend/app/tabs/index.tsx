import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Theme context for dark/light mode
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
  },
  light: {
    background: '#ffffff',
    surface: '#f8f9fa',
    surfaceSecondary: '#e9ecef',
    text: '#1f2937',
    textSecondary: '#6b7280',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    border: '#e5e7eb'
  }
};

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
  logo_url?: string;
}

interface User {
  id: string;
  total_points: number;
  daily_streak: number;
  last_checkin?: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Index() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showCheckinModal, setShowCheckinModal] = useState(false);

  const theme = themes[isDarkMode ? 'dark' : 'light'];
  const userId = 'user_123'; // In real app, this would come from auth

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      fetchAirdrops(),
      fetchUser()
    ]);
    setLoading(false);
  };

  const fetchAirdrops = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/airdrops`);
      if (response.ok) {
        const data = await response.json();
        setAirdrops(data);
      } else {
        console.error('Failed to fetch airdrops');
      }
    } catch (error) {
      console.error('Error fetching airdrops:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleDailyCheckin = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}/checkin`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setUser(prev => prev ? {
          ...prev,
          total_points: result.total_points,
          daily_streak: result.streak
        } : null);
        
        Alert.alert(
          'Check-in Successful! 🎉',
          `You earned ${result.points_earned} points!\nStreak: ${result.streak} days\nTotal Points: ${result.total_points}`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Check-in Failed', error.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error during checkin:', error);
      Alert.alert('Error', 'Failed to complete check-in');
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

  const getBlockchainIcon = (blockchain: string) => {
    const icons: { [key: string]: string } = {
      ethereum: 'logo-ethereum',
      solana: 'logo-solana',
      bsc: 'logo-bitcoin',
      arbitrum: 'triangle',
      polygon: 'diamond',
      optimism: 'ellipse'
    };
    return icons[blockchain] || 'cube';
  };

  const filteredAirdrops = airdrops.filter(airdrop => {
    if (selectedFilter === 'all') return true;
    return airdrop.status === selectedFilter;
  });

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.surface }]}>
      <View style={styles.headerTop}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>
            Welcome back!
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Airdrop Tracker
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surfaceSecondary }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Ionicons 
              name={isDarkMode ? 'sunny' : 'moon'} 
              size={20} 
              color={theme.text} 
            />
          </TouchableOpacity>
          {user && (
            <TouchableOpacity
              style={[styles.checkinButton, { backgroundColor: theme.accent }]}
              onPress={handleDailyCheckin}
            >
              <Ionicons name="gift" size={18} color="white" />
              <Text style={styles.checkinText}>Check-in</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {user && (
        <View style={[styles.statsCard, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={20} color={theme.warning} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {user.total_points}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Points
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={20} color={theme.error} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {user.daily_streak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Streak
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="list" size={20} color={theme.accent} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {airdrops.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Airdrops
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['all', 'active', 'upcoming', 'expired'].map((filter) => (
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
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderAirdropCard = (airdrop: Airdrop) => (
    <TouchableOpacity
      key={airdrop.id}
      style={[styles.airdropCard, { backgroundColor: theme.surface }]}
      onPress={() => router.push(`/airdrop/${airdrop.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.blockchainBadge, { backgroundColor: theme.surfaceSecondary }]}>
            <Ionicons 
              name={getBlockchainIcon(airdrop.blockchain) as any} 
              size={16} 
              color={theme.accent} 
            />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              {airdrop.name}
            </Text>
            <Text style={[styles.cardBlockchain, { color: theme.textSecondary }]}>
              {airdrop.blockchain.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(airdrop.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(airdrop.status) }]}>
              {airdrop.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.cardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
        {airdrop.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.rewardInfo}>
          {airdrop.reward_amount && (
            <Text style={[styles.rewardText, { color: theme.success }]}>
              💰 {airdrop.reward_amount}
            </Text>
          )}
          {airdrop.reward_token && (
            <Text style={[styles.tokenText, { color: theme.textSecondary }]}>
              {airdrop.reward_token}
            </Text>
          )}
        </View>
        <View style={styles.reputationScore}>
          <Ionicons name="star" size={14} color={theme.warning} />
          <Text style={[styles.scoreText, { color: theme.textSecondary }]}>
            {airdrop.reputation_score}/100
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading airdrops...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Available Airdrops ({filteredAirdrops.length})
          </Text>
          
          {filteredAirdrops.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No airdrops found for the selected filter
              </Text>
            </View>
          ) : (
            filteredAirdrops.map(renderAirdropCard)
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  checkinText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
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
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  blockchainBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardBlockchain: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cardMeta: {
    alignItems: 'flex-end',
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
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tokenText: {
    fontSize: 12,
    marginTop: 2,
  },
  reputationScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

interface User {
  id: string;
  wallet_addresses: string[];
  daily_streak: number;
  total_points: number;
  last_checkin?: string;
  preferences: {
    theme: 'dark' | 'light';
    notifications: boolean;
    preferred_blockchains: string[];
  };
  created_at: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const theme = themes[isDarkMode ? 'dark' : 'light'];
  const userId = 'user_123';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsDarkMode(userData.preferences?.theme === 'dark');
        setNotificationsEnabled(userData.preferences?.notifications !== false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
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
          daily_streak: result.streak,
          last_checkin: new Date().toISOString()
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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, this would save to backend
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // In a real app, this would save to backend
  };

  const canCheckinToday = () => {
    if (!user?.last_checkin) return true;
    const lastCheckin = new Date(user.last_checkin);
    const today = new Date();
    return lastCheckin.toDateString() !== today.toDateString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            Failed to load profile
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Profile
          </Text>
        </View>

        {/* User Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
          <View style={styles.statsHeader}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <Ionicons name="person" size={32} color="white" />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  Crypto Enthusiast
                </Text>
                <Text style={[styles.userId, { color: theme.textSecondary }]}>
                  ID: {user.id}
                </Text>
                <Text style={[styles.memberSince, { color: theme.textSecondary }]}>
                  Member since {formatDate(user.created_at)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={24} color={theme.warning} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {user.total_points.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Points
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={24} color={theme.error} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {user.daily_streak}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Day Streak
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="wallet" size={24} color={theme.accent} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {user.wallet_addresses.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Wallets
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Check-in */}
        <View style={[styles.checkinCard, { backgroundColor: theme.surface }]}>
          <View style={styles.checkinHeader}>
            <View>
              <Text style={[styles.checkinTitle, { color: theme.text }]}>
                Daily Check-in
              </Text>
              <Text style={[styles.checkinSubtitle, { color: theme.textSecondary }]}>
                Earn points and maintain your streak
              </Text>
            </View>
            <Ionicons name="gift" size={24} color={theme.success} />
          </View>
          
          <TouchableOpacity
            style={[
              styles.checkinButton,
              {
                backgroundColor: canCheckinToday() ? theme.success : theme.surfaceSecondary,
                opacity: canCheckinToday() ? 1 : 0.6
              }
            ]}
            onPress={handleDailyCheckin}
            disabled={!canCheckinToday()}
          >
            <Text style={[
              styles.checkinButtonText,
              { color: canCheckinToday() ? 'white' : theme.textSecondary }
            ]}>
              {canCheckinToday() ? 'Check in Today' : 'Already Checked In'}
            </Text>
          </TouchableOpacity>
          
          {user.last_checkin && (
            <Text style={[styles.lastCheckin, { color: theme.textSecondary }]}>
              Last check-in: {formatDate(user.last_checkin)}
            </Text>
          )}
        </View>

        {/* Settings */}
        <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.settingsTitle, { color: theme.text }]}>
            Settings
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name={isDarkMode ? "moon" : "sunny"} size={20} color={theme.accent} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.accent + '40' }}
              thumbColor={isDarkMode ? theme.accent : theme.textSecondary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={20} color={theme.accent} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Push Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: theme.border, true: theme.accent + '40' }}
              thumbColor={notificationsEnabled ? theme.accent : theme.textSecondary}
            />
          </View>
        </View>

        {/* Preferred Blockchains */}
        <View style={[styles.blockchainsCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.blockchainsTitle, { color: theme.text }]}>
            Preferred Blockchains
          </Text>
          <View style={styles.blockchainsList}>
            {user.preferences?.preferred_blockchains?.map((blockchain) => (
              <View key={blockchain} style={[styles.blockchainChip, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.blockchainText, { color: theme.text }]}>
                  {blockchain.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Wallet Addresses */}
        {user.wallet_addresses.length > 0 && (
          <View style={[styles.walletsCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.walletsTitle, { color: theme.text }]}>
              Wallet Addresses
            </Text>
            {user.wallet_addresses.map((address, index) => (
              <View key={index} style={styles.walletItem}>
                <Ionicons name="wallet" size={16} color={theme.accent} />
                <Text style={[styles.walletAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                  {address}
                </Text>
                <TouchableOpacity>
                  <Ionicons name="copy" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* About */}
        <View style={[styles.aboutCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.aboutTitle, { color: theme.text }]}>
            About Airdrop Tracker
          </Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            Stay updated with the latest crypto airdrops, track your progress, and never miss an opportunity. 
            Built with security in mind - we never ask for your private keys.
          </Text>
          <Text style={[styles.version, { color: theme.textSecondary }]}>
            Version 1.0.0
          </Text>
        </View>

        <View style={{ height: 100 }} />
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
  errorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsHeader: {
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkinCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkinTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkinSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  checkinButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkinButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastCheckin: {
    fontSize: 12,
    textAlign: 'center',
  },
  settingsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  blockchainsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blockchainsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  blockchainsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  blockchainChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  blockchainText: {
    fontSize: 12,
    fontWeight: '500',
  },
  walletsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  walletsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  walletAddress: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  aboutCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  version: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, TextInput, Platform, Alert, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { getMyLoyaltyPoints, getLoyaltyLeaderboard, getMyReferralCode, applyReferralCode, getReferralLeaderboard } from '../src/utils/api';
import * as Clipboard from 'expo-clipboard';

const LEVEL_CONFIG: Record<string, { color: string; icon: string; minPoints: number; nextLevel?: string; nextPoints?: number }> = {
  Bronze: { color: '#CD7F32', icon: 'shield', minPoints: 0, nextLevel: 'Silver', nextPoints: 500 },
  Silver: { color: '#C0C0C0', icon: 'shield-half', minPoints: 500, nextLevel: 'Gold', nextPoints: 2000 },
  Gold: { color: '#FFD700', icon: 'shield-checkmark', minPoints: 2000, nextLevel: 'Platinum', nextPoints: 5000 },
  Platinum: { color: '#E5E4E2', icon: 'diamond', minPoints: 5000 },
};

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'referral'>('overview');
  const [pointsData, setPointsData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Referral
  const [referralData, setReferralData] = useState<any>(null);
  const [referralCode, setReferralCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [referralLeaderboard, setReferralLeaderboard] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [pts, lb, ref, refLb] = await Promise.all([
        getMyLoyaltyPoints().catch(() => null),
        getLoyaltyLeaderboard().catch(() => []),
        getMyReferralCode().catch(() => null),
        getReferralLeaderboard().catch(() => []),
      ]);
      setPointsData(pts);
      setLeaderboard(lb);
      setReferralData(ref);
      setReferralLeaderboard(refLb);
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleCopyCode = async () => {
    if (referralData?.code) {
      try {
        await Clipboard.setStringAsync(referralData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for web
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(referralData.code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    }
  };

  const handleShareCode = async () => {
    if (!referralData?.code) return;
    const msg = `Incearca RestaurantApp! Foloseste codul meu ${referralData.code} si primesti ${referralData.welcome_bonus} puncte bonus! 🎉`;
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  const handleApplyCode = async () => {
    if (!referralCode.trim()) return;
    setApplyingCode(true);
    try {
      const result = await applyReferralCode(referralCode.trim());
      const msg = result.message || 'Cod aplicat!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Succes', msg);
      setReferralCodeInput('');
      loadData();
    } catch (error: any) {
      const msg = error.message || 'Eroare';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Eroare', msg);
    } finally {
      setApplyingCode(false);
    }
  };

  const levelConfig = LEVEL_CONFIG[pointsData?.level || 'Bronze'];
  const progress = pointsData && levelConfig.nextPoints
    ? Math.min(((pointsData.lifetime_points - levelConfig.minPoints) / (levelConfig.nextPoints - levelConfig.minPoints)) * 100, 100)
    : 100;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} data-testid="loyalty-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} data-testid="loyalty-back-btn">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Puncte & Referral</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'leaderboard', 'referral'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            data-testid={`loyalty-tab-${tab}`}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Puncte' : tab === 'leaderboard' ? 'Clasament' : 'Referral'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' ? (
          <>
            {/* Points Card */}
            <View style={[styles.pointsCard, { borderColor: levelConfig.color + '60' }]} data-testid="loyalty-points-card">
              <View style={styles.pointsCardTop}>
                <View>
                  <Text style={styles.pointsLabel}>Puncte disponibile</Text>
                  <Text style={[styles.pointsValue, { color: levelConfig.color }]}>{pointsData?.total_points || 0}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: levelConfig.color + '20', borderColor: levelConfig.color + '60' }]}>
                  <Ionicons name={levelConfig.icon as any} size={24} color={levelConfig.color} />
                  <Text style={[styles.levelText, { color: levelConfig.color }]}>{pointsData?.level || 'Bronze'}</Text>
                </View>
              </View>
              {levelConfig.nextLevel && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progres spre {levelConfig.nextLevel}</Text>
                    <Text style={styles.progressValue}>{pointsData?.lifetime_points || 0} / {levelConfig.nextPoints}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: levelConfig.color }]} />
                  </View>
                </View>
              )}
            </View>

            {/* How it works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cum functioneaza?</Text>
              <View style={styles.howItWorksGrid}>
                <View style={styles.howCard}>
                  <Ionicons name="restaurant" size={24} color={COLORS.primary} />
                  <Text style={styles.howCardTitle}>Comanda</Text>
                  <Text style={styles.howCardDesc}>1 punct / RON</Text>
                </View>
                <View style={styles.howCard}>
                  <Ionicons name="people" size={24} color={COLORS.secondary} />
                  <Text style={styles.howCardTitle}>Invita</Text>
                  <Text style={styles.howCardDesc}>+50 puncte/prieten</Text>
                </View>
                <View style={styles.howCard}>
                  <Ionicons name="gift" size={24} color={COLORS.gold} />
                  <Text style={styles.howCardTitle}>Beneficii</Text>
                  <Text style={styles.howCardDesc}>Reduceri speciale</Text>
                </View>
              </View>
            </View>

            {/* Level tiers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Niveluri</Text>
              {Object.entries(LEVEL_CONFIG).map(([name, cfg]) => (
                <View
                  key={name}
                  style={[styles.tierRow, pointsData?.level === name && { borderColor: cfg.color + '80', backgroundColor: cfg.color + '10' }]}
                >
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                  <Text style={[styles.tierName, { color: cfg.color }]}>{name}</Text>
                  <Text style={styles.tierPoints}>{cfg.minPoints}+ puncte</Text>
                </View>
              ))}
            </View>

            {/* History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Istoric</Text>
              {(pointsData?.history || []).length === 0 ? (
                <Text style={styles.emptyText}>Niciun punct castigat inca. Comanda pentru a castiga puncte!</Text>
              ) : (
                pointsData.history.map((h: any) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Ionicons
                        name={h.type === 'earned' ? 'add-circle' : h.type === 'referral_welcome' || h.type === 'referral_bonus' ? 'people-circle' : 'remove-circle'}
                        size={20}
                        color={h.type === 'earned' || h.type === 'referral_welcome' || h.type === 'referral_bonus' ? COLORS.success : COLORS.error}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyDesc}>{h.description}</Text>
                        <Text style={styles.historyDate}>{new Date(h.created_at).toLocaleDateString('ro-RO')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.historyPoints, { color: COLORS.success }]}>+{h.points}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : activeTab === 'leaderboard' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Utilizatori</Text>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyText}>Clasamentul este gol. Fii primul care castiga puncte!</Text>
            ) : (
              leaderboard.map((entry: any, index: number) => {
                const isMe = entry.user_id === user?.user_id;
                const medalColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : COLORS.textMuted;
                return (
                  <View key={entry.user_id} style={[styles.leaderboardRow, isMe && styles.leaderboardRowMe]}>
                    <View style={styles.leaderboardRank}>
                      {index < 3 ? (
                        <Ionicons name="medal" size={24} color={medalColor} />
                      ) : (
                        <Text style={styles.rankNumber}>#{entry.rank}</Text>
                      )}
                    </View>
                    <View style={styles.leaderboardAvatar}>
                      {entry.picture ? (
                        <Image source={{ uri: entry.picture }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: LEVEL_CONFIG[entry.level]?.color + '30' }]}>
                          <Text style={styles.avatarInitial}>{entry.name?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>{isMe ? 'Tu' : entry.name}</Text>
                      <Text style={[styles.leaderboardLevel, { color: LEVEL_CONFIG[entry.level]?.color }]}>{entry.level}</Text>
                    </View>
                    <Text style={[styles.leaderboardPoints, { color: LEVEL_CONFIG[entry.level]?.color }]}>{entry.lifetime_points} pts</Text>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* Referral Tab */
          <>
            {/* My Referral Code */}
            <View style={styles.referralCard} data-testid="referral-card">
              <View style={styles.referralIconRow}>
                <View style={styles.referralIconCircle}>
                  <Ionicons name="gift" size={32} color={COLORS.primary} />
                </View>
              </View>
              <Text style={styles.referralTitle}>Invita prieteni, castiga puncte!</Text>
              <Text style={styles.referralSubtitle}>
                Primesti <Text style={{ color: COLORS.gold, fontFamily: FONTS.bold }}>{referralData?.referral_bonus || 50}</Text> puncte cand prietenul plaseaza prima comanda.
                Prietenul primeste <Text style={{ color: COLORS.gold, fontFamily: FONTS.bold }}>{referralData?.welcome_bonus || 25}</Text> puncte la inscriere!
              </Text>
              
              {/* Code display */}
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Codul tau de referral</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.codeValue} data-testid="referral-code">{referralData?.code || '...'}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} data-testid="referral-copy-btn">
                    <Ionicons name={copied ? 'checkmark' : 'copy'} size={18} color={copied ? COLORS.success : COLORS.text} />
                    <Text style={[styles.copyBtnText, copied && { color: COLORS.success }]}>{copied ? 'Copiat!' : 'Copiaza'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Share button */}
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode} data-testid="referral-share-btn">
                <Ionicons name="share-social" size={20} color="#fff" />
                <Text style={styles.shareBtnText}>Trimite prietenilor</Text>
              </TouchableOpacity>

              {/* Stats */}
              <View style={styles.referralStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{referralData?.total_referrals || 0}</Text>
                  <Text style={styles.statLabel}>Prieteni invitati</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{referralData?.total_points_earned || 0}</Text>
                  <Text style={styles.statLabel}>Puncte castigate</Text>
                </View>
              </View>
            </View>

            {/* Apply Code */}
            <View style={styles.applySection}>
              <Text style={styles.sectionTitle}>Ai un cod de referral?</Text>
              <View style={styles.applyRow}>
                <TextInput
                  style={styles.applyInput}
                  value={referralCode}
                  onChangeText={setReferralCodeInput}
                  placeholder="Introdu codul"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  data-testid="referral-apply-input"
                />
                <TouchableOpacity
                  style={[styles.applyBtn, (!referralCode.trim() || applyingCode) && { opacity: 0.5 }]}
                  onPress={handleApplyCode}
                  disabled={!referralCode.trim() || applyingCode}
                  data-testid="referral-apply-btn"
                >
                  {applyingCode ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.applyBtnText}>Aplica</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Referral History */}
            {(referralData?.history || []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prieteni invitati</Text>
                {referralData.history.map((h: any) => (
                  <View key={h.id} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Ionicons
                        name={h.status === 'completed' ? 'checkmark-circle' : 'time'}
                        size={20}
                        color={h.status === 'completed' ? COLORS.success : COLORS.warning}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyDesc}>{h.referred_name}</Text>
                        <Text style={styles.historyDate}>
                          {h.status === 'completed' ? 'A plasat o comanda' : 'In asteptare'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.historyPoints, { color: h.status === 'completed' ? COLORS.success : COLORS.textMuted }]}>
                      {h.status === 'completed' ? '+50 pts' : 'Pending'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Referral Leaderboard */}
            {referralLeaderboard.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Referreri</Text>
                {referralLeaderboard.map((entry: any) => (
                  <View key={entry.rank} style={styles.leaderboardRow}>
                    <View style={styles.leaderboardRank}>
                      {entry.rank <= 3 ? (
                        <Ionicons name="medal" size={24} color={entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : '#CD7F32'} />
                      ) : (
                        <Text style={styles.rankNumber}>#{entry.rank}</Text>
                      )}
                    </View>
                    <View style={styles.leaderboardAvatar}>
                      {entry.picture ? (
                        <Image source={{ uri: entry.picture }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.primary + '30' }]}>
                          <Text style={styles.avatarInitial}>{entry.name?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>{entry.name}</Text>
                      <Text style={styles.leaderboardLevel}>{entry.total_referrals} referral(s)</Text>
                    </View>
                    <Text style={[styles.leaderboardPoints, { color: COLORS.gold }]}>{entry.total_points_earned} pts</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  tabs: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  tabTextActive: { color: '#fff' },
  scrollView: { flex: 1, paddingHorizontal: SPACING.lg },
  pointsCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  pointsCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  pointsValue: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.gold },
  levelBadge: {
    alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1,
  },
  levelText: { fontFamily: FONTS.bold, fontSize: 12, marginTop: 4 },
  progressSection: { marginTop: SPACING.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  progressLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  progressValue: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  progressBar: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: SPACING.md },
  howItWorksGrid: { flexDirection: 'row', gap: SPACING.sm },
  howCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.xs,
  },
  howCardTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  howCardDesc: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  tierName: { fontFamily: FONTS.semiBold, fontSize: 14, flex: 1 },
  tierPoints: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  historyDesc: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  historyDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  historyPoints: { fontFamily: FONTS.bold, fontSize: 16 },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  leaderboardRowMe: { borderColor: COLORS.primary + '60', backgroundColor: COLORS.primary + '10' },
  leaderboardRank: { width: 32, alignItems: 'center' },
  rankNumber: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.textMuted },
  leaderboardAvatar: {},
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  leaderboardLevel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  leaderboardPoints: { fontFamily: FONTS.bold, fontSize: 16 },
  // Referral styles
  referralCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.primary + '40',
    alignItems: 'center',
  },
  referralIconRow: { marginBottom: SPACING.md },
  referralIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  referralTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.xs },
  referralSubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: 20 },
  codeBox: {
    width: '100%', backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  codeLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.xs },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeValue: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.gold, letterSpacing: 3 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm },
  copyBtnText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg,
  },
  shareBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
  referralStats: { flexDirection: 'row', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  applySection: { marginBottom: SPACING.lg },
  applyRow: { flexDirection: 'row', gap: SPACING.sm },
  applyInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border, letterSpacing: 2,
  },
  applyBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
  },
  applyBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
});

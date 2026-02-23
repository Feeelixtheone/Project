import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { getCheckoutStatus, confirmReservationPayment } from '../../src/utils/api';

export default function PaymentSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { session_id, reservation_id } = useLocalSearchParams<{ session_id: string; reservation_id?: string }>();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (session_id) {
      checkPaymentStatus();
    }
  }, [session_id]);

  const checkPaymentStatus = async () => {
    try {
      const result = await getCheckoutStatus(session_id as string);
      setPaymentInfo(result);

      if (result.payment_status === 'paid') {
        setStatus('success');
        
        // Confirm reservation if we have reservation_id
        if (reservation_id) {
          await confirmReservationPayment(reservation_id, session_id as string);
        }
      } else if (result.status === 'expired') {
        setStatus('error');
      } else {
        // Continue polling if pending
        if (pollCount < 5) {
          setPollCount(pollCount + 1);
          setTimeout(checkPaymentStatus, 2000);
        } else {
          setStatus('pending');
        }
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      setStatus('error');
    }
  };

  const handleGoToReservations = () => {
    router.replace('/(tabs)/rezervari');
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/acasa');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.xl }]}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Se verifică plata...</Text>
            <Text style={styles.loadingSubtext}>Te rugăm să aștepți</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={100} color={COLORS.success} />
            </View>
            <Text style={styles.title}>Plată reușită!</Text>
            <Text style={styles.subtitle}>
              Rezervarea ta a fost confirmată cu succes.
            </Text>
            
            {paymentInfo && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sumă plătită</Text>
                  <Text style={styles.infoValue}>
                    {(paymentInfo.amount_total / 100).toFixed(2)} {paymentInfo.currency?.toUpperCase()}
                  </Text>
                </View>
                {paymentInfo.metadata?.restaurant_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Restaurant</Text>
                    <Text style={styles.infoValue}>{paymentInfo.metadata.restaurant_name}</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleGoToReservations}>
              <Ionicons name="calendar" size={20} color={COLORS.text} />
              <Text style={styles.primaryButtonText}>Vezi rezervările</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
              <Text style={styles.secondaryButtonText}>Înapoi acasă</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'pending' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="time" size={100} color={COLORS.warning} />
            </View>
            <Text style={styles.title}>Plata în procesare</Text>
            <Text style={styles.subtitle}>
              Plata ta este în curs de procesare. Vei primi o confirmare în curând.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={handleGoToReservations}>
              <Text style={styles.primaryButtonText}>Vezi rezervările</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={100} color={COLORS.error} />
            </View>
            <Text style={styles.title}>Plată eșuată</Text>
            <Text style={styles.subtitle}>
              Ne pare rău, plata nu a putut fi procesată. Te rugăm să încerci din nou.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
              <Text style={styles.primaryButtonText}>Înapoi acasă</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  loadingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  loadingSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { getRestaurants } from '../../src/utils/api';
import { router } from 'expo-router';
import * as Location from 'expo-location';

// Placeholder for Google Maps - will show a styled container
// Real map integration requires Google Maps API key

export default function HartaScreen() {
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);

  useEffect(() => {
    loadData();
    requestLocationPermission();
  }, []);

  const loadData = async () => {
    try {
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = (lat: number, lng: number) => {
    if (!userLocation) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat - userLocation.latitude) * Math.PI / 180;
    const dLon = (lng - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Caută pe hartă..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={80} color={COLORS.textMuted} />
          <Text style={styles.mapPlaceholderText}>Hartă Google Maps</Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Adaugă cheia API Google Maps pentru vizualizare
          </Text>
        </View>

        {/* Restaurant Markers (Visual representation) */}
        <View style={styles.markersOverlay}>
          {filteredRestaurants.slice(0, 5).map((restaurant, index) => (
            <TouchableOpacity
              key={restaurant.id}
              style={[
                styles.markerButton,
                { top: 100 + (index * 60), left: 50 + (index * 40) }
              ]}
              onPress={() => setSelectedRestaurant(restaurant)}
            >
              <Ionicons name="location" size={32} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Button */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={requestLocationPermission}
        >
          <Ionicons name="navigate" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Selected Restaurant Card */}
      {selectedRestaurant && (
        <View style={styles.selectedCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{selectedRestaurant.name}</Text>
              <Text style={styles.cardSubtitle}>{selectedRestaurant.cuisine_type}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedRestaurant(null)}
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{selectedRestaurant.address}</Text>
            </View>
            {userLocation && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.detailText, { color: COLORS.primary }]}>
                  {calculateDistance(selectedRestaurant.latitude, selectedRestaurant.longitude)} distanță
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="star" size={16} color={COLORS.gold} />
              <Text style={styles.detailText}>
                {selectedRestaurant.rating.toFixed(1)} ({selectedRestaurant.review_count} recenzii)
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push(`/restaurant/${selectedRestaurant.id}`)}
          >
            <Text style={styles.viewButtonText}>Vezi restaurant</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Restaurant List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Restaurante în apropiere</Text>
        <View style={styles.restaurantList}>
          {filteredRestaurants.slice(0, 3).map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.restaurantItem}
              onPress={() => {
                setSelectedRestaurant(restaurant);
              }}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{restaurant.name}</Text>
                <Text style={styles.itemAddress} numberOfLines={1}>{restaurant.address}</Text>
              </View>
              {userLocation && (
                <Text style={styles.itemDistance}>
                  {calculateDistance(restaurant.latitude, restaurant.longitude)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchWrapper: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  mapPlaceholderSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  markersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  markerButton: {
    position: 'absolute',
  },
  locationButton: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  selectedCard: {
    position: 'absolute',
    bottom: 120,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
  },
  cardSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  cardDetails: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  viewButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  listSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  listTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  restaurantList: {
    gap: SPACING.sm,
  },
  restaurantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  itemAddress: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemDistance: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
});

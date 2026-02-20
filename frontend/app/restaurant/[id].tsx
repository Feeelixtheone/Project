import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { getRestaurant, getReviews, createReview, createReservation, toggleLike, checkLiked } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

type TabType = 'meniu' | 'galerie' | 'recenzii';
type ViewMode = '2d' | '3d' | 'video';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('meniu');
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [isLiked, setIsLiked] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Modals
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Reservation form
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [reservationGuests, setReservationGuests] = useState('2');
  const [reservationNotes, setReservationNotes] = useState('');
  
  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    loadData();
    getLocation();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [restaurantData, reviewsData] = await Promise.all([
        getRestaurant(id!),
        getReviews(id!),
      ]);
      setRestaurant(restaurantData);
      setReviews(reviewsData);
      
      // Check if liked
      try {
        const likedResult = await checkLiked(id!);
        setIsLiked(likedResult.liked);
      } catch (e) {
        // User might not be logged in
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Eroare', 'Nu s-a putut încărca restaurantul');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = async () => {
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

  const calculateDistance = () => {
    if (!userLocation || !restaurant) return null;
    
    const R = 6371;
    const dLat = (restaurant.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (restaurant.longitude - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(restaurant.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const handleLike = async () => {
    try {
      const result = await toggleLike(id!);
      setIsLiked(result.liked);
      loadData();
    } catch (error) {
      Alert.alert('Eroare', 'Trebuie să fii autentificat');
    }
  };

  const handleReservation = async () => {
    if (!reservationDate || !reservationTime) {
      Alert.alert('Eroare', 'Completează data și ora');
      return;
    }
    
    try {
      await createReservation({
        restaurant_id: id,
        date: reservationDate,
        time: reservationTime,
        guests: parseInt(reservationGuests),
        special_requests: reservationNotes || undefined,
      });
      setShowReservationModal(false);
      Alert.alert('Succes', 'Rezervarea a fost creată!');
      // Reset form
      setReservationDate('');
      setReservationTime('');
      setReservationGuests('2');
      setReservationNotes('');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut crea rezervarea');
    }
  };

  const handleReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Eroare', 'Scrie un comentariu');
      return;
    }
    
    try {
      await createReview({
        restaurant_id: id!,
        rating: reviewRating,
        comment: reviewComment,
      });
      setShowReviewModal(false);
      loadData();
      Alert.alert('Succes', 'Recenzia a fost adăugată!');
      setReviewRating(5);
      setReviewComment('');
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-a putut adăuga recenzia');
    }
  };

  if (isLoading || !restaurant) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const menuCategories = [...new Set(restaurant.menu.map((item: any) => item.category))];

  const renderMenuItem = ({ item }: { item: any }) => (
    <View style={styles.menuItem}>
      <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={styles.menuItemDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.menuItemFooter}>
          <Text style={styles.menuItemQuantity}>{item.quantity}</Text>
          <Text style={styles.menuItemPrice}>{item.price.toFixed(2)} RON</Text>
        </View>
      </View>
    </View>
  );

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        {item.user_picture ? (
          <Image source={{ uri: item.user_picture }} style={styles.reviewerImage} />
        ) : (
          <View style={styles.reviewerImagePlaceholder}>
            <Ionicons name="person" size={20} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.user_name}</Text>
          <View style={styles.reviewRating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating ? 'star' : 'star-outline'}
                size={14}
                color={COLORS.gold}
              />
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: 'meniu', label: 'Meniu' },
    { key: 'galerie', label: 'Galerie' },
    { key: 'recenzii', label: `Recenzii (${reviews.length})` },
  ];

  const viewModes: { key: ViewMode; label: string; icon: string }[] = [
    { key: '2d', label: '2D', icon: 'images-outline' },
    { key: '3d', label: '3D', icon: 'cube-outline' },
    { key: 'video', label: 'Video', icon: 'videocam-outline' },
  ];

  const renderGalleryContent = () => {
    if (viewMode === '2d') {
      // 2D Images - interior images
      const images = restaurant.interior_images || [];
      if (images.length === 0) {
        return (
          <View style={styles.emptyGallery}>
            <Ionicons name="images-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyGalleryText}>Nu sunt imagini 2D disponibile</Text>
          </View>
        );
      }
      return (
        <ScrollView contentContainerStyle={styles.galleryGrid}>
          {images.map((image: string, index: number) => (
            <Image key={index} source={{ uri: image }} style={styles.galleryImage} />
          ))}
        </ScrollView>
      );
    } else if (viewMode === '3d') {
      // 3D Images
      const images3d = restaurant.images_3d || [];
      if (images3d.length === 0) {
        return (
          <View style={styles.emptyGallery}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyGalleryText}>Nu sunt imagini 3D disponibile</Text>
            <Text style={styles.emptyGallerySubtext}>
              Restaurantul nu a încărcat încă imagini 3D ale preparatelor
            </Text>
          </View>
        );
      }
      return (
        <ScrollView contentContainerStyle={styles.galleryGrid}>
          {images3d.map((image: string, index: number) => (
            <View key={index} style={styles.image3dContainer}>
              <Image source={{ uri: image }} style={styles.galleryImage} />
              <View style={styles.badge3dOverlay}>
                <Ionicons name="cube" size={16} color={COLORS.text} />
                <Text style={styles.badge3dText}>3D</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      );
    } else {
      // Video
      const videoUrl = restaurant.video_url;
      return (
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={64} color={COLORS.textMuted} />
            <Text style={styles.videoPlaceholderText}>
              {videoUrl ? 'Video disponibil' : 'Nu există video pentru acest restaurant'}
            </Text>
            {videoUrl && (
              <TouchableOpacity style={styles.playButton}>
                <Ionicons name="play" size={32} color={COLORS.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Image */}
      <View style={styles.headerImage}>
        <Image source={{ uri: restaurant.cover_image }} style={styles.coverImage} />
        <View style={styles.headerOverlay} />
        
        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        {/* Action Buttons */}
        <View style={[styles.actionButtons, { top: insets.top + 10 }]}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowMapModal(true)}>
            <Ionicons name="location" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? COLORS.primary : COLORS.text}
            />
          </TouchableOpacity>
        </View>
        
        {/* Restaurant Info */}
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.restaurantMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={16} color={COLORS.gold} />
              <Text style={styles.metaText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble" size={16} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{restaurant.review_count}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="heart" size={16} color={COLORS.primary} />
              <Text style={styles.metaText}>{restaurant.likes}</Text>
            </View>
            <Text style={styles.priceRange}>{restaurant.price_range}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <TouchableOpacity style={styles.quickInfoItem} onPress={() => setShowMapModal(true)}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.quickInfoText} numberOfLines={1}>{restaurant.address}</Text>
            {calculateDistance() && (
              <Text style={styles.distanceText}>{calculateDistance()}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.quickInfoItem}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.quickInfoText}>{restaurant.opening_hours}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'meniu' && (
          <FlatList
            data={restaurant.menu}
            renderItem={renderMenuItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.menuList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Meniul nu este disponibil</Text>
              </View>
            }
          />
        )}

        {activeTab === 'interior' && (
          <ScrollView contentContainerStyle={styles.interiorGrid} showsVerticalScrollIndicator={false}>
            {restaurant.interior_images.length > 0 ? (
              restaurant.interior_images.map((image: string, index: number) => (
                <Image key={index} source={{ uri: image }} style={styles.interiorImage} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nu sunt imagini disponibile</Text>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'recenzii' && (
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.reviewsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => setShowReviewModal(true)}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addReviewText}>Adaugă o recenzie</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nu sunt recenzii</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Reserve Button */}
      <View style={[styles.reserveContainer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={styles.reserveButton}
          onPress={() => setShowReservationModal(true)}
        >
          <Ionicons name="calendar" size={22} color={COLORS.text} />
          <Text style={styles.reserveButtonText}>Rezervă o masă</Text>
        </TouchableOpacity>
      </View>

      {/* Reservation Modal */}
      <Modal
        visible={showReservationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReservationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rezervare masă</Text>
              <TouchableOpacity onPress={() => setShowReservationModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Data (ex: 2025-01-15)</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationDate}
                  onChangeText={setReservationDate}
                  placeholder="AAAA-LL-ZZ"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ora</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationTime}
                  onChangeText={setReservationTime}
                  placeholder="19:00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Număr persoane</Text>
                <TextInput
                  style={styles.formInput}
                  value={reservationGuests}
                  onChangeText={setReservationGuests}
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cereri speciale (opțional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={reservationNotes}
                  onChangeText={setReservationNotes}
                  placeholder="Alergii, loc preferat, etc."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleReservation}>
                <Text style={styles.submitButtonText}>Confirmă rezervarea</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adaugă recenzie</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingSelector}>
              <Text style={styles.formLabel}>Rating</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                    <Ionicons
                      name={star <= reviewRating ? 'star' : 'star-outline'}
                      size={36}
                      color={COLORS.gold}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Comentariu</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Scrie părerea ta..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleReview}>
              <Text style={styles.submitButtonText}>Trimite recenzia</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Locație</Text>
              <TouchableOpacity onPress={() => setShowMapModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={64} color={COLORS.textMuted} />
              <Text style={styles.mapPlaceholderText}>Hartă Google Maps</Text>
            </View>

            <View style={styles.locationDetails}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={24} color={COLORS.primary} />
                <Text style={styles.locationAddress}>{restaurant.address}</Text>
              </View>
              {calculateDistance() && (
                <View style={styles.locationRow}>
                  <Ionicons name="navigate" size={24} color={COLORS.secondary} />
                  <Text style={styles.locationDistance}>
                    {calculateDistance()} de la locația ta
                  </Text>
                </View>
              )}
              <View style={styles.locationRow}>
                <Ionicons name="call" size={24} color={COLORS.success} />
                <Text style={styles.locationPhone}>{restaurant.phone}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    height: 280,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    position: 'absolute',
    right: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInfo: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  restaurantName: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  priceRange: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    marginTop: -20,
  },
  quickInfo: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quickInfoText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  distanceText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  menuList: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.sm,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'space-between',
  },
  menuItemName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  menuItemDescription: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  menuItemQuantity: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  menuItemPrice: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
  },
  interiorGrid: {
    padding: SPACING.md,
    gap: SPACING.sm,
    paddingBottom: 100,
  },
  interiorImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  reviewsList: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addReviewText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
  },
  reviewItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInfo: {
    marginLeft: SPACING.sm,
  },
  reviewerName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  reviewRating: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reviewComment: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  reserveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  reserveButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
  ratingSelector: {
    marginBottom: SPACING.md,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mapPlaceholderText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  locationDetails: {
    gap: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  locationAddress: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  locationDistance: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.secondary,
  },
  locationPhone: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.success,
  },
});

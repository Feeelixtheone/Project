import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { apiRequest } from '../../src/utils/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

export default function FloorPlanManager() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [floorPlan, setFloorPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const rest = await apiRequest<any>(`/api/restaurants/${id}`);
      setRestaurant(rest);
    } catch (e) {
      console.error('Error loading restaurant:', e);
    }
    try {
      const fp = await apiRequest<any>(`/api/restaurants/${id}/floorplan`);
      setFloorPlan(fp);
    } catch (e) {
      // No floor plan yet
    }
    setLoading(false);
  };

  const handleUploadFloorPlan = async () => {
    if (!imageUrl) {
      const msg = 'Introdu URL-ul imaginii planului';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Eroare', msg);
      return;
    }
    try {
      await apiRequest(`/api/restaurants/${id}/floorplan`, {
        method: 'POST',
        body: { image_url: imageUrl, tables: [] },
      });
      setShowUploadModal(false);
      await loadData();
      const msg = 'Planul a fost încărcat! Acum folosește AI pentru a detecta mesele.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Succes', msg);
    } catch (e: any) {
      const msg = e.message || 'Eroare la încărcare';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Eroare', msg);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const resp = await apiRequest<any>('/api/upload/image-url', {
            method: 'POST',
            body: { image_data: asset.base64, mime_type: 'image/jpeg' },
          });
          setImageUrl(resp.url);
        } else if (asset.uri) {
          setImageUrl(asset.uri);
        }
      }
    } catch (e) {
      console.error('Image picker error:', e);
    }
  };

  const handleAiDetect = async () => {
    setAiLoading(true);
    try {
      const result = await apiRequest<any>(`/api/restaurants/${id}/floorplan/ai-detect`, {
        method: 'POST',
      });
      const msg = `AI a detectat ${result.count} mese!`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Succes', msg);
      await loadData();
    } catch (e: any) {
      const msg = e.message || 'Eroare la detecția AI';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Eroare', msg);
    }
    setAiLoading(false);
  };

  const handleAssignPhoto = async (tableNumber: string) => {
    // Use image picker or URL input
    const photoUrl = Platform.OS === 'web'
      ? window.prompt('Introdu URL-ul fotografiei pentru masa ' + tableNumber)
      : null;
    
    if (!photoUrl) return;
    
    try {
      await apiRequest(`/api/restaurants/${id}/floorplan/table-photo`, {
        method: 'POST',
        body: { table_number: tableNumber, photo_url: photoUrl },
      });
      await loadData();
      const msg = `Fotografia a fost atribuită mesei ${tableNumber}`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Succes', msg);
    } catch (e: any) {
      const msg = e.message || 'Eroare';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Eroare', msg);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Plan 2D</Text>
          <Text style={styles.headerSubtitle}>{restaurant?.name || 'Restaurant'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowUploadModal(true)} style={styles.uploadBtn}>
          <Ionicons name="cloud-upload" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Floor Plan View */}
        {floorPlan?.image_url ? (
          <>
            <View style={styles.floorPlanSection}>
              <View style={styles.floorPlanWrapper}>
                <Image
                  source={{ uri: floorPlan.image_url }}
                  style={styles.floorPlanImage}
                  resizeMode="contain"
                />
                {/* Table Markers */}
                {(floorPlan.tables || []).map((table: any, index: number) => (
                  <Pressable
                    key={`table-${table.table_number}-${index}`}
                    onPress={() => {
                      setSelectedTable(table);
                      setShowPhotoModal(true);
                    }}
                    style={[
                      styles.tableMarker,
                      {
                        left: `${table.x}%` as any,
                        top: `${table.y}%` as any,
                      },
                      table.photo_url ? styles.markerWithPhoto : styles.markerEmpty,
                    ]}
                    data-testid={`biz-table-${table.table_number}`}
                  >
                    <Text style={[
                      styles.markerText,
                      table.photo_url && { color: '#fff' }
                    ]}>{table.table_number}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.aiBtn]}
                onPress={handleAiDetect}
                disabled={aiLoading}
                data-testid="ai-detect-tables-btn"
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="sparkles" size={22} color="#fff" />
                )}
                <Text style={styles.aiBtnText}>
                  {aiLoading ? 'AI analizează...' : 'Detectare AI mese'}
                </Text>
              </TouchableOpacity>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Ionicons name="grid" size={20} color={COLORS.primary} />
                  <Text style={styles.statNumber}>{floorPlan.tables?.length || 0}</Text>
                  <Text style={styles.statLabel}>Mese detectate</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="camera" size={20} color={COLORS.success} />
                  <Text style={styles.statNumber}>
                    {floorPlan.tables?.filter((t: any) => t.photo_url).length || 0}
                  </Text>
                  <Text style={styles.statLabel}>Cu fotografii</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                  <Text style={styles.statNumber}>
                    {floorPlan.tables?.filter((t: any) => !t.photo_url).length || 0}
                  </Text>
                  <Text style={styles.statLabel}>Fără foto</Text>
                </View>
              </View>
            </View>

            {/* Table List */}
            <View style={styles.tableListSection}>
              <Text style={styles.sectionTitle}>Mese ({floorPlan.tables?.length || 0})</Text>
              {(floorPlan.tables || []).map((table: any, index: number) => (
                <View key={`list-${table.table_number}-${index}`} style={styles.tableRow}>
                  <View style={styles.tableRowLeft}>
                    <View style={[
                      styles.tableIndicator,
                      { backgroundColor: table.photo_url ? COLORS.success : COLORS.warning }
                    ]} />
                    <Text style={styles.tableRowNumber}>Masa {table.table_number}</Text>
                  </View>
                  <View style={styles.tableRowRight}>
                    {table.photo_url ? (
                      <Image source={{ uri: table.photo_url }} style={styles.tableRowThumb} />
                    ) : (
                      <Text style={styles.noPhotoText}>Fără foto</Text>
                    )}
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => handleAssignPhoto(table.table_number)}
                    >
                      <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* No Floor Plan Yet */
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={80} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Niciun plan încărcat</Text>
            <Text style={styles.emptySubtitle}>
              Încarcă o imagine 2D a restaurantului tău, iar AI-ul nostru va detecta automat mesele.
            </Text>
            <TouchableOpacity
              style={styles.uploadMainBtn}
              onPress={() => setShowUploadModal(true)}
              data-testid="upload-floorplan-btn"
            >
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.uploadMainBtnText}>Încarcă planul restaurantului</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Încarcă plan 2D</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Încarcă o imagine cu planul restaurantului (văzut de sus). AI-ul va detecta automat numerele meselor.
            </Text>

            <View style={styles.uploadOptions}>
              <TouchableOpacity style={styles.uploadOption} onPress={handlePickImage}>
                <Ionicons name="image" size={36} color={COLORS.primary} />
                <Text style={styles.uploadOptionText}>Alege din galerie</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.orText}>sau introdu URL</Text>

            <TextInput
              style={styles.urlInput}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://exemplu.ro/plan.png"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              data-testid="floorplan-url-input"
            />

            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="contain" />
            ) : null}

            <TouchableOpacity
              style={[styles.uploadMainBtn, { marginTop: SPACING.md }]}
              onPress={handleUploadFloorPlan}
              data-testid="submit-floorplan-btn"
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.uploadMainBtnText}>Salvează planul</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Table Photo Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent onRequestClose={() => setShowPhotoModal(false)}>
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity style={styles.photoCloseBtn} onPress={() => setShowPhotoModal(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedTable && (
            <View style={styles.photoModalContent}>
              <View style={styles.photoModalHeader}>
                <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                <Text style={styles.photoModalTitle}>Masa {selectedTable.table_number}</Text>
              </View>
              {selectedTable.photo_url ? (
                <Image source={{ uri: selectedTable.photo_url }} style={styles.photoModalImage} resizeMode="contain" />
              ) : (
                <View style={styles.photoModalEmpty}>
                  <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.photoModalEmptyText}>Nicio fotografie atribuită</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.assignPhotoBtn}
                onPress={() => {
                  setShowPhotoModal(false);
                  handleAssignPhoto(selectedTable.table_number);
                }}
              >
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.assignPhotoBtnText}>
                  {selectedTable.photo_url ? 'Schimbă fotografia' : 'Adaugă fotografie'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  floorPlanSection: {
    padding: SPACING.md,
  },
  floorPlanWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  floorPlanImage: {
    width: '100%',
    height: '100%',
  },
  tableMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -15,
    marginTop: -15,
    zIndex: 10,
  },
  markerWithPhoto: {
    backgroundColor: COLORS.primary + 'DD',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  markerEmpty: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  markerText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  actionsSection: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  aiBtn: {
    backgroundColor: '#7C3AED',
  },
  aiBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tableListSection: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tableIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tableRowNumber: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  tableRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tableRowThumb: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
  },
  noPhotoText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  assignBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingTop: height * 0.15,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  uploadMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
  },
  uploadMainBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  modalDesc: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  uploadOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderStyle: 'dashed',
  },
  uploadOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
  },
  orText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: SPACING.sm,
  },
  urlInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  // Photo Modal
  photoModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  photoCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  photoModalContent: {
    width: width * 0.9,
    maxHeight: height * 0.75,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  photoModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },
  photoModalImage: {
    width: '100%',
    height: width * 0.65,
  },
  photoModalEmpty: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  photoModalEmptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  assignPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  assignPhotoBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#fff',
  },
});

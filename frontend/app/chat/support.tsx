import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';
import { apiRequest } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';

export default function ChatSupportScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newFirstMessage, setNewFirstMessage] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<any[]>('/api/chat/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await apiRequest<any[]>(`/api/chat/conversations/${conversationId}/messages`);
      setMessages(data);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleStartConversation = async () => {
    if (!newSubject.trim() || !newFirstMessage.trim()) {
      return;
    }

    try {
      const result = await apiRequest<any>(`/api/chat/conversations?subject=${encodeURIComponent(newSubject)}&message=${encodeURIComponent(newFirstMessage)}`, {
        method: 'POST',
      });
      
      setConversations([result.conversation, ...conversations]);
      setSelectedConversation(result.conversation);
      setMessages([result.message]);
      setShowNewConversation(false);
      setNewSubject('');
      setNewFirstMessage('');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) {
      return;
    }

    try {
      const result = await apiRequest<any>(
        `/api/chat/conversations/${selectedConversation.id}/messages?message=${encodeURIComponent(newMessage)}`,
        { method: 'POST' }
      );
      
      setMessages([...messages, result]);
      setNewMessage('');
      
      // Update conversation in list
      setConversations(conversations.map(c => 
        c.id === selectedConversation.id 
          ? { ...c, last_message: newMessage, updated_at: new Date().toISOString() }
          : c
      ));
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderConversationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation?.id === item.id && styles.conversationItemActive,
      ]}
      onPress={() => setSelectedConversation(item)}
    >
      <View style={styles.conversationIcon}>
        <Ionicons
          name={item.status === 'resolved' ? 'checkmark-circle' : 'chatbubbles'}
          size={24}
          color={item.status === 'resolved' ? COLORS.success : COLORS.primary}
        />
      </View>
      <View style={styles.conversationContent}>
        <Text style={styles.conversationSubject} numberOfLines={1}>{item.subject}</Text>
        <Text style={styles.conversationLastMessage} numberOfLines={1}>
          {item.last_message || 'Niciun mesaj'}
        </Text>
      </View>
      {item.status === 'open' && item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.sender_type === 'user';
    const isAdmin = item.sender_type === 'admin';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.messageUser : styles.messageOther,
      ]}>
        {!isUser && (
          <View style={styles.messageSenderBadge}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'person'}
              size={12}
              color={isAdmin ? COLORS.success : COLORS.secondary}
            />
            <Text style={[
              styles.messageSender,
              { color: isAdmin ? COLORS.success : COLORS.secondary }
            ]}>
              {isAdmin ? 'Admin' : 'Suport'}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.messageBubbleUser : styles.messageBubbleOther,
        ]}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Asistență Chat</Text>
          <Text style={styles.headerSubtitle}>Suntem aici să te ajutăm</Text>
        </View>
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={() => setShowNewConversation(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Conversations List */}
        <View style={styles.conversationsList}>
          <Text style={styles.sectionTitle}>Conversații</Text>
          {conversations.length === 0 ? (
            <View style={styles.emptyConversations}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Nu ai conversații</Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => setShowNewConversation(true)}
              >
                <Text style={styles.startChatText}>Începe o conversație</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Chat Area */}
        {selectedConversation ? (
          <KeyboardAvoidingView
            style={styles.chatArea}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
          >
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <TouchableOpacity
                style={styles.chatBackBtn}
                onPress={() => setSelectedConversation(null)}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <View style={styles.chatHeaderContent}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {selectedConversation.subject}
                </Text>
                <View style={[
                  styles.statusBadge,
                  selectedConversation.status === 'resolved' ? styles.statusResolved : styles.statusOpen
                ]}>
                  <Text style={styles.statusText}>
                    {selectedConversation.status === 'resolved' ? 'Rezolvat' : 'Deschis'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
            />

            {/* Input */}
            {selectedConversation.status !== 'resolved' && (
              <View style={[styles.inputContainer, { paddingBottom: insets.bottom + SPACING.sm }]}>
                <TextInput
                  style={styles.input}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Scrie un mesaj..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Ionicons name="send" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.noChatSelected}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.noChatText}>Selectează o conversație</Text>
            <Text style={styles.noChatSubtext}>sau începe una nouă</Text>
          </View>
        )}
      </View>

      {/* New Conversation Modal */}
      <Modal visible={showNewConversation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conversație nouă</Text>
              <TouchableOpacity onPress={() => setShowNewConversation(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subiect</Text>
              <TextInput
                style={styles.formInput}
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="Ex: Problemă cu rezervarea"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mesaj</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={newFirstMessage}
                onChangeText={setNewFirstMessage}
                placeholder="Descrie problema ta..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.quickTopics}>
              <Text style={styles.quickTopicsTitle}>Subiecte frecvente:</Text>
              {['Problemă cu rezervarea', 'Întrebare despre plată', 'Sugestie', 'Altele'].map((topic) => (
                <TouchableOpacity
                  key={topic}
                  style={styles.quickTopic}
                  onPress={() => setNewSubject(topic)}
                >
                  <Text style={styles.quickTopicText}>{topic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, (!newSubject.trim() || !newFirstMessage.trim()) && styles.submitButtonDisabled]}
              onPress={handleStartConversation}
              disabled={!newSubject.trim() || !newFirstMessage.trim()}
            >
              <Text style={styles.submitButtonText}>Trimite</Text>
            </TouchableOpacity>
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
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  conversationsList: {
    width: '40%',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    padding: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  conversationItemActive: {
    backgroundColor: COLORS.primary + '20',
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  conversationContent: {
    flex: 1,
  },
  conversationSubject: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  conversationLastMessage: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.text,
  },
  emptyConversations: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  startChatButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  startChatText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },
  chatArea: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatBackBtn: {
    marginRight: SPACING.sm,
  },
  chatHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chatTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusOpen: {
    backgroundColor: COLORS.primary + '20',
  },
  statusResolved: {
    backgroundColor: COLORS.success + '20',
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.text,
  },
  messagesList: {
    padding: SPACING.md,
  },
  messageContainer: {
    marginBottom: SPACING.md,
    maxWidth: '80%',
  },
  messageUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageSenderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  messageSender: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  messageBubble: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  messageTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.surface,
  },
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChatText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  noChatSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quickTopics: {
    marginTop: SPACING.md,
  },
  quickTopicsTitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  quickTopic: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  quickTopicText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
  },
});

import ChatBubble from '@/components/ChatBubble';
import ChatHistoryModal from '@/components/ChatHistoryModal';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ id: string; text: string; isUser: boolean; attachmentUrl?: string | null }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [attachment, setAttachment] = useState<{ uri: string; type: string; name: string; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const { xp, level, streak } = useGamificationStore();
  const { user } = useAuthStore();

  // Load most recent session on mount
  useEffect(() => {
    if (!user) return;
    loadMostRecentSession();
  }, [user]);

  const loadMostRecentSession = async () => {
    if (!user) return;

    // Get most recent session
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      loadSession(sessions[0].id);
    } else {
      // No sessions exist, show welcome message
      setMessages([{
        id: 'welcome',
        text: "Hello! I'm VitalQuest, your AI Health Coach. How can I help you today?",
        isUser: false
      }]);
    }
  };

  const loadSession = async (sessionId: string) => {
    if (!user) return;

    setCurrentSessionId(sessionId);
    setMessages([]); // Clear current messages while loading

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching session messages:', error);
      return;
    }

    const history = (data || []).map(msg => {
      // Find attachment for this message
      // Since we didn't fetch attachments in the initial join, we need to fix the query.
      // But wait, the previous query was just `select('*')`.
      // We need to join with chat_attachments or fetch them.
      // For now, let's assume we can fetch them separately or update the query.
      return {
        id: msg.id,
        text: msg.text,
        isUser: msg.role === 'user',
        // attachmentUrl: ... need to fetch these
      };
    });

    // Actually, let's update the query to fetch attachments
    const { data: messagesWithAttachments, error: msgError } = await supabase
      .from('chat_messages')
      .select(`
            *,
            chat_attachments (
                file_path,
                file_type
            )
        `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return;
    }

    const formattedHistory = messagesWithAttachments.map((msg: any) => {
      let attachmentUrl = null;
      if (msg.chat_attachments && msg.chat_attachments.length > 0) {
        // Construct public URL
        const filePath = msg.chat_attachments[0].file_path;
        const { data } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
        attachmentUrl = data.publicUrl;
      }
      return {
        id: msg.id,
        text: msg.text,
        isUser: msg.role === 'user',
        attachmentUrl
      };
    });

    if (formattedHistory.length > 0) {
      setMessages(formattedHistory);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    } else {
      setMessages([{
        id: 'welcome',
        text: "Hello! I'm VitalQuest, your AI Health Coach. How can I help you today?",
        isUser: false
      }]);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([{
      id: 'welcome',
      text: "Hello! I'm VitalQuest, your AI Health Coach. How can I help you today?",
      isUser: false
    }]);
  };

  const handleSelectSession = (sessionId: string) => {
    loadSession(sessionId);
  };

  const handlePickAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        type: 'image',
        name: asset.uri.split('/').pop() || 'image.jpg',
        mimeType: asset.mimeType || 'image/jpeg'
      });
    }
  };

  const uploadAttachment = async (userId: string) => {
    if (!attachment) return null;

    try {
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const response = await fetch(attachment.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, arrayBuffer, {
          contentType: attachment.mimeType,
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return { path: fileName, publicUrl, type: attachment.mimeType };

    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || !user) return;

    const userMsgText = message;
    const tempId = Date.now().toString();

    // 1. Optimistic Update
    setMessages(prev => [...prev, {
      id: tempId,
      text: userMsgText || (attachment ? '' : ''),
      isUser: true,
      attachmentUrl: attachment?.uri
    }]);
    setMessage('');
    // Keep attachment in local state for upload logic, but maybe clear preview? 
    // Better to clear attachment preview after successful add to optimistic list? 
    // But we need it for upload. Let's keep it until uploaded.

    setIsTyping(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      let sessionId = currentSessionId;

      // 2. Create new session if needed
      if (!sessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: 'New Chat'
          })
          .select('id')
          .single();

        if (sessionError) throw sessionError;
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);

        // Generate AI title
        if (userMsgText) {
          supabase.functions.invoke('chat-agent', {
            body: { message: userMsgText, mode: 'title' }
          }).then(({ data }) => {
            if (data?.title) {
              supabase.from('chat_sessions')
                .update({ title: data.title })
                .eq('id', sessionId!)
                .then(() => console.log('Session title updated:', data.title));
            }
          }).catch(console.error);
        }
      }

      // 3. Upload Attachment if exists
      let attachmentData = null;
      if (attachment) {
        setIsUploading(true);
        attachmentData = await uploadAttachment(user.id);
        setIsUploading(false);
        setAttachment(null);
      }

      // 4. Save User Message
      const { data: messageData, error: msgError } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: sessionId,
        role: 'user',
        text: userMsgText || (attachmentData ? 'Shared an image' : '')
      }).select().single();

      if (msgError) throw msgError;

      // 5. Save Attachment Metadata if uploaded
      if (attachmentData && messageData) {
        await supabase.from('chat_attachments').insert({
          message_id: messageData.id,
          file_path: attachmentData.path,
          file_type: attachmentData.type
        });
      }

      // 6. Prepare History for AI (Last 30 messages)
      const recentHistory = messages
        .slice(-30)
        .map(msg => ({
          role: msg.isUser ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      // 7. Call AI
      const { data, error } = await supabase.functions.invoke('chat-agent', {
        body: {
          message: userMsgText,
          history: recentHistory,
          attachments: attachmentData ? [attachmentData] : [],
          context: {
            userId: user.id, // Explicitly pass for memory storage
            userName: user?.user_metadata?.full_name || 'User',
            xp,
            level,
            streak
          },
          userId: user.id // Top level for convenience
        }
      });

      if (error) throw error;

      const aiResponse = data.text || "I received your message.";

      // 8. Update UI with AI Response
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false
      }]);

      // 9. Save AI Message to DB
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: sessionId,
        role: 'model',
        text: aiResponse
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't reach the server. Please try again.",
        isUser: false
      }]);
    } finally {
      setIsTyping(false);
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
        {/* Header */}
        <View className="bg-white p-4 border-b border-gray-100 flex-row items-center justify-between shadow-sm">
          <View className="flex-row items-center space-x-3">
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
              <Ionicons name="sparkles" size={20} color="#4285F4" />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">Health Coach</Text>
              <View className="flex-row items-center">
                <View className={`w-2 h-2 rounded-full mr-1 ${isTyping ? 'bg-blue-500' : 'bg-green-500'}`} />
                <Text className="text-xs text-gray-500 font-medium">{isTyping ? 'Thinking...' : 'Online'}</Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center">
            <Pressable onPress={handleNewChat} className="p-2 mr-1">
              <Ionicons name="add" size={28} color="#4285F4" />
            </Pressable>
            <Pressable onPress={() => setShowHistory(true)} className="p-2">
              <Ionicons name="time-outline" size={24} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              text={item.text}
              isUser={item.isUser}
              attachmentUrl={item.attachmentUrl}
              onImagePress={setFullScreenImage}
            />
          )}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Attachment Preview (Sticky above input) */}
        {attachment && (
          <View className="bg-white px-4 pt-2 border-t border-gray-100">
            <View className="bg-gray-100 rounded-lg p-2 flex-row items-center self-start">
              <Image source={{ uri: attachment.uri }} style={{ width: 40, height: 40, borderRadius: 6 }} />
              <View className="ml-2 mr-2">
                <Text className="text-xs font-medium text-gray-900" numberOfLines={1}>{attachment.name}</Text>
                <Text className="text-xs text-gray-500">Image</Text>
              </View>
              <Pressable onPress={() => setAttachment(null)} className="p-1">
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </Pressable>
            </View>
          </View>
        )}

        {/* Upload Loading Indicator */}
        {isUploading && (
          <View className="absolute inset-0 bg-black/10 items-center justify-center z-50">
            <View className="bg-white p-4 rounded-xl items-center shadow-lg">
              <ActivityIndicator size="large" color="#4285F4" />
              <Text className="text-gray-700 mt-2 font-medium">Uploading...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View className="bg-white border-t border-gray-100 p-4">
          <View className="flex-row items-center space-x-3">
            {/* Attachment Button */}
            <Pressable
              onPress={handlePickAttachment}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="attach" size={24} color="#6B7280" />
            </Pressable>

            <TextInput
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-base text-gray-900"
              placeholder="Ask or share a photo..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              onPress={handleSend}
              className={`w-12 h-12 rounded-full items-center justify-center ${message.trim() || attachment ? 'bg-blue-500' : 'bg-gray-200'}`}
              disabled={!message.trim() && !attachment}
            >
              <Ionicons name="send" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* History Modal */}
      <ChatHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleNewChat}
        currentSessionId={currentSessionId}
      />

      {/* Full Screen Image Modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View className="flex-1 bg-black/90 items-center justify-center">
          <Pressable
            onPress={() => setFullScreenImage(null)}
            className="absolute top-12 right-6 z-50 p-2 bg-black/50 rounded-full"
          >
            <Ionicons name="close" size={30} color="white" />
          </Pressable>

          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

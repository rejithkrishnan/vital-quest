import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View, ActivityIndicator, Alert } from 'react-native';

interface ChatSession {
    id: string;
    title: string;
    created_at: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    onDeleteSession: (sessionId: string) => void;
    currentSessionId: string | null;
}

export default function ChatHistoryModal({ visible, onClose, onSelectSession, onNewChat, onDeleteSession, currentSessionId }: Props) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        if (visible && user) {
            fetchSessions();
        }
    }, [visible, user]);

    const fetchSessions = async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('chat_sessions')
            .select('id, title, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching sessions:', error);
        } else {
            setSessions(data || []);
        }
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const handleNewChat = () => {
        onNewChat();
        onClose();
    };

    const handleSelectSession = (sessionId: string) => {
        onSelectSession(sessionId);
        onClose();
    };

    const handleDeleteSession = (sessionId: string, title: string) => {
        Alert.alert(
            'Delete Chat',
            `Are you sure you want to delete "${title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('chat_sessions')
                            .delete()
                            .eq('id', sessionId);

                        if (error) {
                            console.error('Error deleting session:', error);
                            Alert.alert('Error', 'Could not delete chat');
                        } else {
                            setSessions(prev => prev.filter(s => s.id !== sessionId));
                            if (currentSessionId === sessionId) {
                                onDeleteSession(sessionId);
                            }
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-gray-50">
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
                    <Text className="text-xl font-bold text-gray-900">Chat History</Text>
                    <Pressable onPress={onClose} className="p-2">
                        <Ionicons name="close" size={24} color="#6B7280" />
                    </Pressable>
                </View>

                {/* New Chat Button */}
                <Pressable
                    onPress={handleNewChat}
                    className="flex-row items-center mx-4 mt-4 p-4 bg-blue-500 rounded-xl"
                >
                    <Ionicons name="add-circle" size={24} color="white" />
                    <Text className="text-white font-semibold ml-3 text-base">Start New Chat</Text>
                </Pressable>

                {/* Sessions List */}
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#4285F4" />
                    </View>
                ) : sessions.length === 0 ? (
                    <View className="flex-1 items-center justify-center p-8">
                        <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                        <Text className="text-gray-400 text-center mt-4">No chat history yet.</Text>
                        <Text className="text-gray-400 text-center">Start a new conversation!</Text>
                    </View>
                ) : (
                    <FlatList
                        data={sessions}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => handleSelectSession(item.id)}
                                className={`p-4 mb-3 rounded-xl ${currentSessionId === item.id ? 'bg-blue-100 border border-blue-300' : 'bg-white'}`}
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1
                                }}
                            >
                                <View className="flex-row items-center">
                                    <Ionicons
                                        name={currentSessionId === item.id ? 'chatbubble' : 'chatbubble-outline'}
                                        size={20}
                                        color={currentSessionId === item.id ? '#4285F4' : '#6B7280'}
                                    />
                                    <View className="flex-1 ml-3">
                                        <Text className={`font-semibold ${currentSessionId === item.id ? 'text-blue-700' : 'text-gray-900'}`}>
                                            {item.title}
                                        </Text>
                                        <Text className="text-gray-400 text-xs mt-1">{formatDate(item.created_at)}</Text>
                                    </View>
                                    {currentSessionId === item.id && (
                                        <View className="bg-blue-500 px-2 py-1 rounded-full mr-2">
                                            <Text className="text-white text-xs font-medium">Active</Text>
                                        </View>
                                    )}
                                    {/* Delete Button */}
                                    <Pressable
                                        onPress={() => handleDeleteSession(item.id, item.title)}
                                        className="p-2"
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </Pressable>
                                </View>
                            </Pressable>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
}

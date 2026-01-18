import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';

interface MemoryListModalProps {
    visible: boolean;
    onClose: () => void;
}

interface Memory {
    id: string;
    fact_text: string;
    category: string;
    created_at: string;
}

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'diet': return 'bg-green-100 text-green-700';
        case 'medical': return 'bg-red-100 text-red-700';
        case 'fitness': return 'bg-orange-100 text-orange-700';
        case 'personal': return 'bg-blue-100 text-blue-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

export default function MemoryListModal({ visible, onClose }: MemoryListModalProps) {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        if (visible && user) {
            loadMemories();
        }
    }, [visible, user]);

    const loadMemories = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('user_memory')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            Alert.alert('Error', 'Failed to load memories');
        } else {
            setMemories(data || []);
        }
        setLoading(false);
    };

    const deleteMemory = async (id: string) => {
        const { error } = await supabase
            .from('user_memory')
            .delete()
            .eq('id', id);

        if (error) {
            Alert.alert('Error', 'Failed to delete memory');
        } else {
            setMemories(prev => prev.filter(m => m.id !== id));
        }
    };

    const confirmDelete = (id: string) => {
        Alert.alert(
            'Forget Fact',
            'Are you sure you want the AI to forget this?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Forget', style: 'destructive', onPress: () => deleteMemory(id) }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View className="flex-1 bg-gray-50">
                {/* Header */}
                <View className="bg-white p-4 border-b border-gray-100 flex-row items-center justify-between">
                    <Text className="text-xl font-bold text-gray-900">AI Memory</Text>
                    <Pressable onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                        <Ionicons name="close" size={24} color="#374151" />
                    </Pressable>
                </View>

                <View className="flex-1 p-4">
                    <Text className="text-gray-500 mb-4 text-sm">
                        These are the facts the AI has learned about you. You can delete incorrect or outdated facts.
                    </Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#4285F4" className="mt-10" />
                    ) : (
                        <FlatList
                            data={memories}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            renderItem={({ item }) => (
                                <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm flex-row items-center justify-between">
                                    <View className="flex-1 pr-4">
                                        <View className="flex-row items-center mb-2">
                                            <View className={`px-2 py-1 rounded-md self-start ${getCategoryColor(item.category)}`}>
                                                <Text className="text-[10px] font-bold uppercase tracking-wider">
                                                    {item.category || 'General'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="text-gray-900 text-base leading-6">{item.fact_text}</Text>
                                        <Text className="text-gray-400 text-xs mt-1">
                                            Learned {new Date(item.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => confirmDelete(item.id)}
                                        className="p-3 bg-red-50 rounded-lg"
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </Pressable>
                                </View>
                            )}
                            ListEmptyComponent={
                                <View className="items-center justify-center py-20">
                                    <Ionicons name="bulb-outline" size={48} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-4 text-center">
                                        No memories yet.{'\n'}Chat with the AI to teach it about you!
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

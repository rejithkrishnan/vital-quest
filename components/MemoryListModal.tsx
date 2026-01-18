import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SectionList, Text, View } from 'react-native';

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

interface GroupedMemory {
    title: string;
    data: Memory[];
}

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'diet': return 'text-green-600';
        case 'medical': return 'text-red-600';
        case 'fitness': return 'text-orange-600';
        case 'personal': return 'text-blue-600';
        default: return 'text-gray-600';
    }
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'diet': return 'nutrition';
        case 'medical': return 'medkit';
        case 'fitness': return 'barbell';
        case 'personal': return 'person';
        default: return 'bookmark';
    }
};

export default function MemoryListModal({ visible, onClose }: MemoryListModalProps) {
    const [sections, setSections] = useState<GroupedMemory[]>([]);
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
            const grouped = (data || []).reduce((acc: any, memory: Memory) => {
                const category = memory.category || 'General';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(memory);
                return acc;
            }, {});

            const sectionsData = Object.keys(grouped).map(key => ({
                title: key.charAt(0).toUpperCase() + key.slice(1),
                data: grouped[key]
            })).sort((a, b) => a.title.localeCompare(b.title));

            setSections(sectionsData);
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
            // Re-load or optimistically update
            loadMemories();
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
                        <SectionList
                            sections={sections}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            stickySectionHeadersEnabled={false}
                            renderSectionHeader={({ section: { title } }) => (
                                <View className="mt-4 mb-2 flex-row items-center">
                                    <Ionicons name={getCategoryIcon(title.toLowerCase()) as any} size={16} className="mr-2" color="#6B7280" />
                                    <Text className={`font-bold text-lg ml-2 ${getCategoryColor(title.toLowerCase())}`}>{title}</Text>
                                </View>
                            )}
                            renderItem={({ item, index }) => (
                                <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm flex-row items-center justify-between">
                                    <View className="flex-1 pr-4 flex-row items-start">
                                        <View className="mr-3 mt-1 bg-gray-100 w-6 h-6 rounded-full items-center justify-center">
                                            <Text className="text-xs font-bold text-gray-500">{index + 1}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 text-base leading-6">{item.fact_text}</Text>
                                            <Text className="text-gray-400 text-xs mt-1">
                                                Learned {new Date(item.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
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

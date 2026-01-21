import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Image, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { CustomAlert as Alert } from '@/utils/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useGoalsStore, PlanTask } from '@/stores/goalsStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    imageUri?: string; // For displaying user-attached images
    suggestion?: {
        suggestion: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        notes: string;
    };
}

interface MealUpdateModalProps {
    visible: boolean;
    onClose: () => void;
    task: PlanTask | null;
}

export default function MealUpdateModal({ visible, onClose, task }: MealUpdateModalProps) {
    const { analyzeMeal, updateTaskMeal, dailyPlan, activeGoal, isLoading: storeLoading } = useGoalsStore();
    const { profile } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Initial message when modal opens
    useEffect(() => {
        if (visible && task) {
            setMessages([
                {
                    id: '1',
                    role: 'assistant',
                    content: `Hi! I see you have "${task.description}" planned for ${task.meal_type || 'this meal'}. Would you like to log this, suggest an alternative, or show me what's in your fridge?`
                }
            ]);
            setImageUri(null);
            setInputText('');
        }
    }, [visible, task]);

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleSend = async (text?: string, isIngredientImage = false) => {
        const messageText = text || inputText;
        console.log('[MealUpdateModal] handleSend called:', { messageText, imageUri, isIngredientImage });

        if (!messageText.trim() && !imageUri) {
            console.log('[MealUpdateModal] No input, returning early');
            return;
        }

        // Capture imageUri before clearing it
        const sentImageUri = imageUri;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText || (sentImageUri ? (isIngredientImage ? "Here are my ingredients..." : "Here is my food...") : ""),
            imageUri: sentImageUri || undefined // Include the image in the message
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setImageUri(null); // Clear preview immediately after adding to message
        setIsLoading(true);
        scrollToBottom();

        try {
            // Prepare context for AI
            const remainingBudget = {
                calories: (dailyPlan?.calorie_target || activeGoal?.daily_calorie_target || 2000),
                protein: (dailyPlan?.protein_target || activeGoal?.protein_target || 150),
                carbs: (dailyPlan?.carbs_target || activeGoal?.carbs_target || 200),
                fat: (dailyPlan?.fat_target || activeGoal?.fat_target || 60)
            };

            const context = {
                plannedMeal: task?.description,
                mealType: task?.meal_type,
                remainingCalories: remainingBudget.calories,
                remainingProtein: remainingBudget.protein,
                remainingCarbs: remainingBudget.carbs,
                remainingFat: remainingBudget.fat,
                goalDescription: activeGoal?.ai_summary || activeGoal?.goal_type || 'General Health',
                userName: profile?.full_name || 'User'
            };

            let aiResponse: any;
            if (imageUri) {
                console.log('[MealUpdateModal] Processing image:', imageUri.substring(0, 50) + '...');
                // Photo analysis - use existing analyzeMeal which handles upload + AI call
                aiResponse = await analyzeMeal({ uri: imageUri }, context);
                console.log('[MealUpdateModal] analyzeMeal response:', JSON.stringify(aiResponse).substring(0, 200));
            } else {
                console.log('[MealUpdateModal] Processing text suggestion:', messageText);
                // Text suggestion
                const { data, error } = await supabase.functions.invoke('chat-agent', {
                    body: {
                        mode: 'meal_suggest',
                        message: messageText,
                        context,
                        userId: (await supabase.auth.getSession()).data.session?.user?.id
                    }
                });
                if (error) throw error;
                console.log('[MealUpdateModal] chat-agent response:', data.text?.substring(0, 200));

                // Parse response safely
                try {
                    aiResponse = typeof data.text === 'string' ? JSON.parse(data.text) : data.text;
                } catch {
                    // If parsing fails, AI returned plain text - use it as notes
                    aiResponse = { notes: data.text };
                }
            }

            // Normalize response: analyze_meal returns `detected_food`, meal_suggest returns `suggestion`
            console.log('[MealUpdateModal] Normalizing response. detected_food:', aiResponse?.detected_food, 'suggestion:', aiResponse?.suggestion);

            const normalizedSuggestion = (aiResponse?.detected_food || aiResponse?.suggestion)
                ? {
                    suggestion: aiResponse.detected_food || aiResponse.suggestion,
                    description: aiResponse.description || aiResponse.notes || '',
                    calories: aiResponse.calories || 0,
                    protein: aiResponse.protein || 0,
                    carbs: aiResponse.carbs || 0,
                    fat: aiResponse.fat || 0,
                    notes: aiResponse.notes || ''
                }
                : null;

            console.log('[MealUpdateModal] normalizedSuggestion:', normalizedSuggestion);

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse?.notes || aiResponse?.description || (normalizedSuggestion ? `Here's what I found: ${normalizedSuggestion.suggestion}` : "I couldn't analyze that. Please try again."),
                suggestion: normalizedSuggestion || undefined
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error: any) {
            console.error('[MealUpdateModal] Error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Sorry, I ran into an error: ${error.message || 'Unknown error'}. Please try again.`
            }]);
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    const pickImage = async (useCamera: boolean, isIngredient = false) => {
        try {
            let result;
            if (useCamera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) return;
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    allowsEditing: true,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    allowsEditing: true,
                });
            }

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
                // Automatically send if it's an ingredient photo
                if (isIngredient) {
                    // We need to wait for state to update or pass uri directly
                    // To be safe, let's just show it first and let user tap send, or handle here.
                    // For a better UX, let's just set it and let them send what they want.
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleConfirmSuggestion = async (suggestion: any) => {
        if (!task) return;
        try {
            await updateTaskMeal(task.id, {
                description: suggestion.suggestion || suggestion.detected_food,
                metadata: {
                    calories: suggestion.calories,
                    protein: suggestion.protein,
                    carbs: suggestion.carbs,
                    fat: suggestion.fat
                }
            });
            Alert.alert("Updated!", "Your meal has been updated to " + (suggestion.suggestion || suggestion.detected_food));
            onClose();
        } catch (error) {
            Alert.alert("Error", "Failed to update meal.");
        }
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View className={`mb-4 max-w-[85%] ${item.role === 'user' ? 'self-end' : 'self-start'}`}>
            {/* User's attached image */}
            {item.imageUri && (
                <Image
                    source={{ uri: item.imageUri }}
                    className="w-full h-40 rounded-2xl mb-2"
                    resizeMode="cover"
                />
            )}

            <View className={`p-4 rounded-2xl ${item.role === 'user' ? 'bg-blue-600' : 'bg-gray-100'}`}>
                <Text className={`${item.role === 'user' ? 'text-white' : 'text-gray-800'} text-[15px]`}>
                    {item.content}
                </Text>
            </View>

            {item.suggestion && (
                <View className="mt-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-900 mb-1">{item.suggestion.suggestion}</Text>
                    <Text className="text-sm text-gray-600 mb-3">{item.suggestion.description}</Text>

                    <View className="flex-row justify-between bg-gray-50 p-3 rounded-xl mb-4">
                        <View className="items-center">
                            <Text className="text-[10px] text-gray-400 uppercase font-bold">Kcal</Text>
                            <Text className="text-sm font-bold text-gray-900">{item.suggestion.calories}</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-[10px] text-gray-400 uppercase font-bold">Prot</Text>
                            <Text className="text-sm font-bold text-gray-900">{item.suggestion.protein}g</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-[10px] text-gray-400 uppercase font-bold">Carbs</Text>
                            <Text className="text-sm font-bold text-gray-900">{item.suggestion.carbs}g</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-[10px] text-gray-400 uppercase font-bold">Fat</Text>
                            <Text className="text-sm font-bold text-gray-900">{item.suggestion.fat}g</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => handleConfirmSuggestion(item.suggestion)}
                        className="bg-blue-600 py-3 rounded-xl items-center"
                    >
                        <Text className="text-white font-bold">Update to this meal</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View className="flex-1 bg-black/50 justify-end">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="bg-white rounded-t-[32px] h-[90%]"
                >
                    {/* Header */}
                    <View className="p-6 border-b border-gray-100 flex-row justify-between items-center">
                        <View>
                            <Text className="text-xl font-bold text-gray-900">Meal Planning</Text>
                            <Text className="text-xs text-blue-600 font-bold uppercase tracking-wider">{task?.meal_type || 'Nutrition'}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* Chat Area */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 20 }}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={() => isLoading ? (
                            <View className="flex-row items-center p-4 bg-gray-50 rounded-2xl self-start mb-4">
                                <ActivityIndicator size="small" color="#4285F4" />
                                <Text className="ml-2 text-gray-500 text-sm">VitalQuest is thinking...</Text>
                            </View>
                        ) : null}
                    />

                    {/* Controls & Input */}
                    <View className="p-6 pt-2 border-t border-gray-100">
                        {imageUri && (
                            <View className="mb-3 relative">
                                <Image source={{ uri: imageUri }} className="w-full h-32 rounded-2xl" />
                                <TouchableOpacity
                                    onPress={() => setImageUri(null)}
                                    className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                                >
                                    <Ionicons name="close" size={16} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View className="flex-row gap-2 mb-4">
                            <TouchableOpacity
                                onPress={() => pickImage(true)}
                                className="flex-1 bg-gray-50 py-3 rounded-xl flex-row justify-center items-center border border-gray-100"
                            >
                                <Ionicons name="camera-outline" size={20} color="#374151" />
                                <Text className="ml-2 text-sm font-medium text-gray-700">Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => pickImage(false)}
                                className="flex-1 bg-gray-50 py-3 rounded-xl flex-row justify-center items-center border border-gray-100"
                            >
                                <Ionicons name="images-outline" size={20} color="#374151" />
                                <Text className="ml-2 text-sm font-medium text-gray-700">Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => pickImage(false, true)}
                                className="flex-1 bg-blue-50 py-3 rounded-xl flex-row justify-center items-center border border-blue-100"
                            >
                                <Ionicons name="basket-outline" size={20} color="#2563EB" />
                                <Text className="ml-2 text-sm font-bold text-blue-700">Fridge</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center gap-2">
                            <TextInput
                                className="flex-1 bg-gray-100 p-4 rounded-2xl text-gray-900 max-h-32"
                                placeholder="Change meal or ask for help..."
                                multiline
                                value={inputText}
                                onChangeText={setInputText}
                            />
                            <TouchableOpacity
                                onPress={() => handleSend()}
                                disabled={isLoading || (!inputText.trim() && !imageUri)}
                                className={`p-4 rounded-2xl ${(!inputText.trim() && !imageUri) ? 'bg-gray-200' : 'bg-blue-600'}`}
                            >
                                <Ionicons name="arrow-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

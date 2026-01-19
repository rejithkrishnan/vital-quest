import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useGoalsStore, PlanTask } from '@/stores/goalsStore';

interface MealLogModalProps {
    visible: boolean;
    onClose: () => void;
    task: PlanTask | null;
}

export default function MealLogModal({ visible, onClose, task }: MealLogModalProps) {
    const { analyzeMeal, logMeal, isLoading } = useGoalsStore();
    const [mode, setMode] = useState<'input' | 'analyzing' | 'review'>('input');
    const [textInput, setTextInput] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    // Reset state when modal opens
    React.useEffect(() => {
        if (visible) {
            setMode('input');
            setTextInput('');
            setImageUri(null);
            setImageBase64(null);
            setAnalysisResult(null);
        }
    }, [visible]);

    const pickImage = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert("Permission Required", "Camera access is needed to take photos of your meal.");
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    base64: true, // We need base64 for AI analysis if not uploading first, but our store handles uri upload now
                    allowsEditing: true,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.7,
                    base64: true,
                    allowsEditing: true,
                });
            }

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
                setImageBase64(result.assets[0].base64 || null);
            }
        } catch (error) {
            console.log("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image.");
        }
    };

    const handleAnalyze = async () => {
        if (!textInput && !imageUri) {
            Alert.alert("Input Required", "Please enter a description or take a photo.");
            return;
        }

        setMode('analyzing');
        try {
            // Priority: Image > Text
            const input = imageUri ? { uri: imageUri, base64: imageBase64 || undefined } : textInput;
            const context = {
                plannedMeal: task?.description,
                mealType: task?.meal_type
            };

            const result = await analyzeMeal(input, context);
            setAnalysisResult(result);
            setMode('review');
        } catch (error) {
            console.error(error);
            Alert.alert("Analysis Failed", "Could not analyze the meal. Please try again.");
            setMode('input');
        }
    };

    const handleConfirmLog = async () => {
        if (!task || !analysisResult) return;

        try {
            await logMeal(task.id, analysisResult, analysisResult.photo_url);
            onClose();
            Alert.alert("Success", "Meal logged successfully! Good job!");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to log meal.");
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[85%] p-6">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-gray-900">
                            {mode === 'review' ? 'Verify Log' : 'Log Meal'}
                        </Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {mode === 'analyzing' ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#4285F4" />
                            <Text className="mt-4 text-gray-500 font-medium">Analyzing your meal...</Text>
                        </View>
                    ) : mode === 'review' ? (
                        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                            {imageUri && (
                                <Image source={{ uri: imageUri }} className="w-full h-48 rounded-2xl mb-6 bg-gray-100" resizeMode="cover" />
                            )}

                            <View className="bg-blue-50 p-5 rounded-2xl mb-6 border border-blue-100">
                                <Text className="text-blue-800 font-bold text-lg mb-2">{analysisResult.detected_food || "Meal Detected"}</Text>
                                <Text className="text-blue-600 mb-4">{analysisResult.notes || "Looks delicious!"}</Text>

                                <View className="flex-row flex-wrap gap-4">
                                    <View>
                                        <Text className="text-gray-500 text-xs uppercase mb-1">Calories</Text>
                                        <Text className="text-2xl font-bold text-gray-900">{analysisResult.calories} <Text className="text-sm font-normal text-gray-500">kcal</Text></Text>
                                    </View>
                                    <View className="w-px h-10 bg-blue-200" />
                                    <View>
                                        <Text className="text-gray-500 text-xs uppercase mb-1">Protein</Text>
                                        <Text className="text-xl font-bold text-gray-900">{analysisResult.protein}g</Text>
                                    </View>
                                    <View>
                                        <Text className="text-gray-500 text-xs uppercase mb-1">Carbs</Text>
                                        <Text className="text-xl font-bold text-gray-900">{analysisResult.carbs}g</Text>
                                    </View>
                                    <View>
                                        <Text className="text-gray-500 text-xs uppercase mb-1">Fat</Text>
                                        <Text className="text-xl font-bold text-gray-900">{analysisResult.fat}g</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleConfirmLog}
                                disabled={isLoading}
                                className="w-full bg-blue-600 py-4 rounded-xl items-center shadow-lg shadow-blue-200 mb-4"
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Confirm & Log</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setMode('input')}
                                className="w-full bg-gray-100 py-4 rounded-xl items-center"
                            >
                                <Text className="text-gray-700 font-semibold">Edit / Retake</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    ) : (
                        <View className="flex-1">
                            <Text className="text-gray-500 mb-6">
                                Logging for: <Text className="font-bold text-gray-900">{task?.description}</Text>
                            </Text>

                            {/* Image Picker */}
                            <View className="flex-row gap-4 mb-6">
                                <TouchableOpacity
                                    onPress={() => pickImage(true)}
                                    className="flex-1 bg-blue-50 h-32 rounded-2xl border-2 border-dashed border-blue-200 justify-center items-center active:bg-blue-100"
                                >
                                    <Ionicons name="camera" size={32} color="#4285F4" />
                                    <Text className="text-blue-600 font-medium mt-2">Take Photo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => pickImage(false)}
                                    className="flex-1 bg-purple-50 h-32 rounded-2xl border-2 border-dashed border-purple-200 justify-center items-center active:bg-purple-100"
                                >
                                    <Ionicons name="images" size={32} color="#9333EA" />
                                    <Text className="text-purple-600 font-medium mt-2">Gallery</Text>
                                </TouchableOpacity>
                            </View>

                            {imageUri ? (
                                <View className="mb-6 relative">
                                    <Image source={{ uri: imageUri }} className="w-full h-48 rounded-2xl" resizeMode="cover" />
                                    <TouchableOpacity
                                        onPress={() => { setImageUri(null); setImageBase64(null); }}
                                        className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                                    >
                                        <Ionicons name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View className="mb-6">
                                    <Text className="text-gray-700 font-medium mb-2">Or describe your meal</Text>
                                    <TextInput
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900 h-32"
                                        placeholder="e.g. 2 fried eggs with 2 slices of whole wheat toast and an apple..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        textAlignVertical="top"
                                        value={textInput}
                                        onChangeText={setTextInput}
                                    />
                                </View>
                            )}

                            <View className="flex-1 justify-end mb-6">
                                <TouchableOpacity
                                    onPress={handleAnalyze}
                                    disabled={!textInput && !imageUri}
                                    className={`w-full py-4 rounded-xl items-center shadow-sm ${(!textInput && !imageUri) ? 'bg-gray-300' : 'bg-black'}`}
                                >
                                    <Text className="text-white font-bold text-lg">Analyze Meal</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

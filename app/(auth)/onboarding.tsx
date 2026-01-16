import { View, Text, TextInput, Pressable, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { Ionicons } from '@expo/vector-icons';

type OnboardingStep = 'basic' | 'goals' | 'equipment';

// Reusable Modern Select Component
const ModernSelect = ({
    label,
    value,
    options,
    onSelect,
    placeholder
}: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onSelect: (val: string) => void;
    placeholder: string;
}) => {
    const [visible, setVisible] = useState(false);

    return (
        <View className="flex-1">
            <Text className="text-gray-700 ml-1 mb-1 font-medium">{label}</Text>
            <Pressable
                onPress={() => setVisible(true)}
                className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex-row justify-between items-center"
            >
                <Text className={value ? "text-gray-900" : "text-gray-400"}>
                    {value ? options.find(o => o.value === value)?.label || value : placeholder}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </Pressable>

            <Modal visible={visible} transparent animationType="fade">
                <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setVisible(false)}>
                    <View className="bg-white rounded-t-3xl h-[50%] p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900">Select {label}</Text>
                            <Pressable onPress={() => setVisible(false)}>
                                <Ionicons name="close-circle" size={28} color="#E5E7EB" />
                            </Pressable>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable
                                    className={`p-4 border-b border-gray-100 ${item.value === value ? 'bg-blue-50 rounded-lg' : ''}`}
                                    onPress={() => {
                                        onSelect(item.value);
                                        setVisible(false);
                                    }}
                                >
                                    <Text className={`text-center text-lg ${item.value === value ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                                        {item.label}
                                    </Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

export default function OnboardingScreen() {
    const { user, initialize } = useAuthStore();
    const [step, setStep] = useState<OnboardingStep>('basic');
    const [loading, setLoading] = useState(false);

    // Form Data
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [weight, setWeight] = useState(''); // kg
    const [height, setHeight] = useState(''); // cm
    const [goal, setGoal] = useState('');
    const [equipment, setEquipment] = useState<string[]>([]);

    // Generation Helpers
    const ageOptions = Array.from({ length: 83 }, (_, i) => ({ label: `${18 + i}`, value: `${18 + i}` }));
    const heightOptions = Array.from({ length: 101 }, (_, i) => ({ label: `${120 + i} cm`, value: `${120 + i}` }));
    const weightOptions = Array.from({ length: 161 }, (_, i) => ({ label: `${40 + i} kg`, value: `${40 + i}` }));

    const genderOptions = [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' },
    ];

    // Selection Options
    const goals = [
        { id: 'lose_weight', label: 'Lose Weight', icon: '🔥' },
        { id: 'build_muscle', label: 'Build Muscle', icon: '💪' },
        { id: 'improve_stamina', label: 'Improve Stamina', icon: '🏃' },
        { id: 'stay_fit', label: 'Stay Fit', icon: '🧘' },
    ];

    const equipmentOptions = [
        { id: 'gym', label: 'Full Gym', icon: 'ad' },
        { id: 'dumbbells', label: 'Dumbbells', icon: '🏋️' },
        { id: 'bodyweight', label: 'Bodyweight Only', icon: '🤸' },
        { id: 'yoga_mat', label: 'Yoga Mat', icon: '🧘' },
    ];

    const toggleEquipment = (id: string) => {
        if (equipment.includes(id)) {
            setEquipment(equipment.filter(e => e !== id));
        } else {
            setEquipment([...equipment, id]);
        }
    };

    const nextStep = () => {
        if (step === 'basic') setStep('goals');
        else if (step === 'goals') setStep('equipment');
        else finishOnboarding();
    };

    const prevStep = () => {
        if (step === 'goals') setStep('basic');
        else if (step === 'equipment') setStep('goals');
    };

    const finishOnboarding = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const profileData = {
                age: parseInt(age),
                gender,
                weight: parseFloat(weight),
                height: parseFloat(height),
                goal,
                equipment,
                onboarding_completed: true,
            };

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    profile_data: profileData,
                })
                .eq('id', user.id);

            if (error) throw error;

            await initialize();
            router.replace('/(tabs)');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <View className="flex-row justify-center mb-8 space-x-2">
            {['basic', 'goals', 'equipment'].map((s, i) => (
                <View
                    key={s}
                    className={`h-2 w-16 rounded-full ${(s === step) ? 'bg-blue-500' :
                            (['basic', 'goals', 'equipment'].indexOf(step) > i) ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                />
            ))}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 p-6">
                <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">Setup Profile</Text>
                {renderStepIndicator()}

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {step === 'basic' && (
                        <View className="space-y-4">
                            <Text className="text-xl font-semibold mb-2">Basic Info</Text>

                            <View>
                                <Text className="text-gray-700 ml-1 mb-1 font-medium">Full Name</Text>
                                <TextInput
                                    value={fullName}
                                    onChangeText={setFullName}
                                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900"
                                    placeholder="John Doe"
                                />
                            </View>

                            <View className="flex-row space-x-4">
                                <ModernSelect
                                    label="Age"
                                    value={age}
                                    onSelect={setAge}
                                    options={ageOptions}
                                    placeholder="Select"
                                />
                                <ModernSelect
                                    label="Gender"
                                    value={gender}
                                    onSelect={setGender}
                                    options={genderOptions}
                                    placeholder="Select"
                                />
                            </View>

                            <View className="flex-row space-x-4">
                                <ModernSelect
                                    label="Height"
                                    value={height}
                                    onSelect={setHeight}
                                    options={heightOptions}
                                    placeholder="cm"
                                />
                                <ModernSelect
                                    label="Weight"
                                    value={weight}
                                    onSelect={setWeight}
                                    options={weightOptions}
                                    placeholder="kg"
                                />
                            </View>
                        </View>
                    )}

                    {step === 'goals' && (
                        <View>
                            <Text className="text-xl font-semibold mb-4">What's your primary goal?</Text>
                            <View className="space-y-3">
                                {goals.map((g) => (
                                    <Pressable
                                        key={g.id}
                                        onPress={() => setGoal(g.id)}
                                        className={`p-5 rounded-xl border-2 flex-row items-center ${goal === g.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                                    >
                                        <Text className="text-2xl mr-4">{g.icon}</Text>
                                        <Text className={`text-lg font-medium ${goal === g.id ? 'text-blue-700' : 'text-gray-700'}`}>{g.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    )}

                    {step === 'equipment' && (
                        <View>
                            <Text className="text-xl font-semibold mb-4">What equipment do you have?</Text>
                            <View className="flex-row flex-wrap justify-between">
                                {equipmentOptions.map((e) => (
                                    <Pressable
                                        key={e.id}
                                        onPress={() => toggleEquipment(e.id)}
                                        className={`w-[48%] p-4 rounded-xl border-2 mb-4 items-center ${equipment.includes(e.id) ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50'}`}
                                    >
                                        <Text className="text-3xl mb-2">{e.icon}</Text>
                                        <Text className={`font-medium ${equipment.includes(e.id) ? 'text-green-700' : 'text-gray-700'}`}>{e.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View className="flex-row space-x-4 mt-4 pt-2 border-t border-gray-100">
                    {step !== 'basic' && (
                        <Pressable onPress={prevStep} className="flex-1 bg-gray-200 p-4 rounded-xl items-center">
                            <Text className="font-semibold text-gray-700">Back</Text>
                        </Pressable>
                    )}
                    <Pressable
                        onPress={nextStep}
                        disabled={loading}
                        className={`flex-1 bg-blue-500 p-4 rounded-xl items-center ${loading ? 'opacity-70' : ''}`}
                    >
                        <Text className="font-semibold text-white">
                            {step === 'equipment' ? (loading ? 'Saving...' : 'Finish') : 'Next'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

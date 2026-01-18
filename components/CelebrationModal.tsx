import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

interface CelebrationModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CelebrationModal({ visible, onClose }: CelebrationModalProps) {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View className="flex-1 bg-black/50 items-center justify-center">
                <View className="bg-white m-8 p-8 rounded-3xl items-center shadow-lg w-[85%]">
                    <ConfettiCannon
                        count={200}
                        origin={{ x: -10, y: 0 }}
                        autoStart={true}
                        fadeOut={true}
                    />

                    <View className="w-20 h-20 bg-yellow-100 rounded-full items-center justify-center mb-4">
                        <Text className="text-4xl">🏆</Text>
                    </View>

                    <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                        Quest Complete!
                    </Text>

                    <Text className="text-gray-500 text-center mb-8">
                        You've crushed all your daily tasks. Keep up the streak!
                    </Text>

                    <TouchableOpacity
                        onPress={onClose}
                        className="bg-blue-500 w-full py-4 rounded-xl active:opacity-90"
                    >
                        <Text className="text-white font-bold text-center text-lg">Awesome!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

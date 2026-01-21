import React from 'react';
import { Modal, Text, View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore } from '@/stores/alertStore';

export default function CustomAlertModal() {
    const { visible, title, message, buttons, hideAlert } = useAlertStore();

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={hideAlert}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-6">
                <View className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[24px] overflow-hidden shadow-xl transform transition-all p-6">
                    {/* Content */}
                    <View className="mb-6">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            {title}
                        </Text>
                        {message ? (
                            <Text className="text-gray-600 dark:text-gray-300 text-center text-base leading-6">
                                {message}
                            </Text>
                        ) : null}
                    </View>

                    {/* Buttons Logic */}
                    <View className="flex-row border-t border-gray-100 dark:border-gray-700 pt-4">
                        {buttons.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';
                            const isLast = index === buttons.length - 1;

                            // Map simple icons based on text or explicit icon prop
                            let iconName = btn.icon;
                            let iconColor = isDestructive ? '#EF4444' : isCancel ? '#6B7280' : '#2563EB'; // blue-600 default

                            if (!iconName) {
                                if (isCancel) iconName = 'close-circle-outline';
                                else if (isDestructive) iconName = 'trash-outline';
                                else iconName = 'ellipse-outline'; // default bullet
                            }

                            // Normalize names for Ionicons
                            if (iconName === 'camera') iconName = 'camera-outline';
                            if (iconName === 'image') iconName = 'image-outline';

                            return (
                                <Pressable
                                    key={index}
                                    onPress={() => {
                                        hideAlert();
                                        if (btn.onPress) btn.onPress();
                                    }}
                                    className={`flex-1 items-center justify-center active:bg-gray-50 dark:active:bg-gray-700 ${!isLast ? 'border-r border-gray-100 dark:border-gray-700' : ''}`}
                                    style={{ paddingVertical: 16 }}
                                >
                                    {iconName ? (
                                        <Ionicons name={iconName as any} size={28} color={iconColor} style={{ marginBottom: 4 }} />
                                    ) : null}

                                    <Text
                                        className={`text-xs font-medium ${isDestructive ? 'text-red-500' :
                                            isCancel ? 'text-gray-500 dark:text-gray-400' :
                                                'text-blue-600 dark:text-blue-400'
                                            }`}
                                    >
                                        {btn.text || 'OK'}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

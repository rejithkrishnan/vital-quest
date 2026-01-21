import React from 'react';
import { Modal, Text, View, Pressable, StyleSheet, Platform } from 'react-native';
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
                <View className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[24px] overflow-hidden shadow-xl transform transition-all">
                    {/* Content */}
                    <View className="p-6">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            {title}
                        </Text>
                        {message ? (
                            <Text className="text-gray-600 dark:text-gray-300 text-center text-base leading-6">
                                {message}
                            </Text>
                        ) : null}
                    </View>

                    {/* Buttons */}
                    <View className={`border-t border-gray-100 dark:border-gray-700 ${buttons.length > 2 ? 'flex-col' : 'flex-row'}`}>
                        {buttons.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';

                            const borderStyle = buttons.length > 2 || index === buttons.length - 1
                                ? ''
                                : 'border-r border-gray-100 dark:border-gray-700';

                            return (
                                <Pressable
                                    key={index}
                                    onPress={() => {
                                        hideAlert();
                                        if (btn.onPress) btn.onPress();
                                    }}
                                    className={`flex-1 p-4 active:bg-gray-50 dark:active:bg-gray-700 justify-center items-center ${borderStyle}`}
                                >
                                    <Text
                                        className={`text-base font-semibold ${isDestructive ? 'text-red-500' :
                                                isCancel ? 'text-gray-900 font-normal dark:text-gray-300' :
                                                    'text-blue-500'
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

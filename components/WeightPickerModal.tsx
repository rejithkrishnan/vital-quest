import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface WeightPickerModalProps {
    visible: boolean;
    currentWeight: number;
    onClose: () => void;
    onSave: (weight: number) => void;
}

export default function WeightPickerModal({ visible, currentWeight, onClose, onSave }: WeightPickerModalProps) {
    const [selectedInt, setSelectedInt] = useState(70);
    const [selectedDec, setSelectedDec] = useState(0);

    // Ranges
    const integers = Array.from({ length: 271 }, (_, i) => i + 30); // 30 to 300 kg
    const decimals = Array.from({ length: 10 }, (_, i) => i); // .0 to .9

    // Refs for flatlists to scroll to position
    const intListRef = useRef<FlatList>(null);
    const decListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible) {
            const intPart = Math.floor(currentWeight);
            const decPart = Math.round((currentWeight - intPart) * 10);

            setSelectedInt(intPart);
            setSelectedDec(decPart);

            // Wait for modal animation to settle before scrolling
            setTimeout(() => {
                const intIndex = integers.indexOf(intPart);
                const decIndex = decimals.indexOf(decPart);

                if (intIndex !== -1 && intListRef.current) {
                    intListRef.current.scrollToOffset({ offset: intIndex * ITEM_HEIGHT, animated: false });
                }
                if (decIndex !== -1 && decListRef.current) {
                    decListRef.current.scrollToOffset({ offset: decIndex * ITEM_HEIGHT, animated: false });
                }
            }, 100);
        }
    }, [visible, currentWeight]);

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const finalWeight = parseFloat(`${selectedInt}.${selectedDec}`);
        onSave(finalWeight);
        onClose();
    };

    const renderItem = (item: number, isSelected: boolean) => (
        <View style={styles.itemContainer}>
            <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
                {item}
            </Text>
        </View>
    );

    const onScrollInt = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const value = integers[index];
        if (value !== undefined && value !== selectedInt) {
            setSelectedInt(value);
            Haptics.selectionAsync();
        }
    };

    const onScrollDec = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const value = decimals[index];
        if (value !== undefined && value !== selectedDec) {
            setSelectedDec(value);
            Haptics.selectionAsync();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Update Weight</Text>
                        <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                            <Text style={styles.saveText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.pickerContainer}>
                        {/* Selection Highlight Bar */}
                        <View style={styles.selectionOverlay} pointerEvents="none" />

                        {/* Integer Wheel */}
                        <View style={styles.column}>
                            <FlatList
                                ref={intListRef}
                                data={integers}
                                keyExtractor={(item) => `int-${item}`}
                                renderItem={({ item }) => renderItem(item, item === selectedInt)}
                                snapToInterval={ITEM_HEIGHT}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }} // Buffer for center
                                onMomentumScrollEnd={onScrollInt}
                                onScrollEndDrag={onScrollInt}
                                getItemLayout={(_, index) => ({
                                    length: ITEM_HEIGHT,
                                    offset: ITEM_HEIGHT * index,
                                    index,
                                })}
                            />
                        </View>

                        <Text style={styles.decimalPoint}>.</Text>

                        {/* Decimal Wheel */}
                        <View style={styles.column}>
                            <FlatList
                                ref={decListRef}
                                data={decimals}
                                keyExtractor={(item) => `dec-${item}`}
                                renderItem={({ item }) => renderItem(item, item === selectedDec)}
                                snapToInterval={ITEM_HEIGHT}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                                onMomentumScrollEnd={onScrollDec}
                                onScrollEndDrag={onScrollDec}
                                getItemLayout={(_, index) => ({
                                    length: ITEM_HEIGHT,
                                    offset: ITEM_HEIGHT * index,
                                    index,
                                })}
                            />
                        </View>

                        <Text style={styles.unitLabel}>kg</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        height: 400, // Fixed height for picker area
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    headerBtn: {
        padding: 8,
    },
    cancelText: {
        fontSize: 16,
        color: '#6B7280',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0EA5E9',
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: ITEM_HEIGHT * VISIBLE_ITEMS, // 5 items visible
        marginTop: 20,
    },
    column: {
        height: '100%',
        width: 80,
    },
    itemContainer: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 24,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    selectedItemText: {
        fontSize: 28,
        color: '#111827',
        fontWeight: '700',
    },
    selectionOverlay: {
        position: 'absolute',
        height: ITEM_HEIGHT,
        width: '100%',
        backgroundColor: '#F3F4F6',
        top: ITEM_HEIGHT * 2, // Center it (2 items above)
        borderRadius: 12,
        opacity: 0.5,
    },
    decimalPoint: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        alignSelf: 'center',
        marginBottom: 8,
    },
    unitLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9CA3AF',
        marginLeft: 12,
        marginBottom: 8,
    }
});

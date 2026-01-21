import React, { useRef, useEffect, useState } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';

interface TabIconProps {
    focused: boolean;
    color: string;
    lottieSource?: any;
    fallbackIcon: any;
}

export default function TabIcon({ focused, color, lottieSource, fallbackIcon }: TabIconProps) {
    const lottieRef = useRef<LottieView>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (focused && lottieRef.current && !hasError) {
            lottieRef.current.play();
        } else if (!focused && lottieRef.current) {
            lottieRef.current.reset();
        }
    }, [focused, hasError]);

    if (lottieSource && !hasError) {
        return (
            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                <LottieView
                    ref={lottieRef}
                    source={lottieSource}
                    style={{ width: 24, height: 24 }}
                    loop={true}
                    autoPlay={focused}
                    onAnimationFailure={() => setHasError(true)}
                    // web needs some help sometimes
                    cacheComposition={true}
                />
            </View>
        );
    }

    return <Ionicons name={fallbackIcon} size={24} color={color} />;
}

// app/components/MediaViewer.js
import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Animated,
    Platform,
    FlatList,
    Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
    PinchGestureHandler,
    PanGestureHandler,
    State,
    GestureHandlerRootView
} from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function MediaViewer({ visible, media, initialIndex = 0, onClose }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const videoRef = useRef(null);

    // All original gesture logic is preserved
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const lastScale = useRef(1);
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);
    const lastTapRef = useRef(0);
    const lastTapTimeoutRef = useRef(null);

    const mediaArray = Array.isArray(media) ? media : media ? [media] : [];

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            resetTransformations();
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            }, 100);
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
        return () => { if (lastTapTimeoutRef.current) clearTimeout(lastTapTimeoutRef.current); };
    }, [visible, initialIndex]);

    const resetTransformations = () => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true })
        ]).start();
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
    };

    const handleClose = () => {
        if (videoRef.current) videoRef.current.stopAsync().catch(err => {});
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
    };
    
    // --- All original logic is preserved ---
    const handleImageTap = () => { 
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (lastTapTimeoutRef.current) clearTimeout(lastTapTimeoutRef.current);
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            if (lastScale.current > 1) {
                resetTransformations();
            } else {
                scale.setValue(2);
                lastScale.current = 2;
            }
        } else {
            lastTapTimeoutRef.current = setTimeout(() => {
                // Handle single tap if needed in the future
            }, DOUBLE_TAP_DELAY);
        }
        lastTapRef.current = now;
    };
    const onPinchGestureEvent = Animated.event([{ nativeEvent: { scale } }], { useNativeDriver: true, listener: (event) => { const newScale = event.nativeEvent.scale; if (newScale >= 0.5 && newScale <= 5) { scale.setValue(newScale) } }});
    const onPinchHandlerStateChange = (event) => { if (event.nativeEvent.oldState === State.ACTIVE) { lastScale.current *= event.nativeEvent.scale; scale.setValue(lastScale.current); if (lastScale.current < 1) { resetTransformations(); } } };
    const onPanGestureEvent = Animated.event([{ nativeEvent: { translationX: translateX, translationY: translateY } }], { useNativeDriver: true, listener: (event) => { if (lastScale.current <= 1) return; const maxTranslateX = (width * (lastScale.current - 1)) / (2 * lastScale.current); const maxTranslateY = (height * (lastScale.current - 1)) / (2 * lastScale.current); let newTranslateX = lastTranslateX.current + event.nativeEvent.translationX / lastScale.current; let newTranslateY = lastTranslateY.current + event.nativeEvent.translationY / lastScale.current; newTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX)); newTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY)); translateX.setValue(newTranslateX); translateY.setValue(newTranslateY); } });
    const onPanHandlerStateChange = (event) => { if (event.nativeEvent.oldState === State.ACTIVE) { lastTranslateX.current += event.nativeEvent.translationX / lastScale.current; lastTranslateY.current += event.nativeEvent.translationY / lastScale.current; translateX.setValue(lastTranslateX.current); translateY.setValue(lastTranslateY.current); } };
    const handleScrollEnd = (e) => { const newIndex = Math.round(e.nativeEvent.contentOffset.x / width); if (newIndex !== currentIndex) { setCurrentIndex(newIndex); resetTransformations(); if (isPlaying && videoRef.current) { videoRef.current.stopAsync().catch(err => {}); setIsPlaying(false); } Haptics.selectionAsync(); } };

    const renderImage = (item) => (
        <GestureHandlerRootView style={styles.mediaContainer}>
            <PinchGestureHandler onGestureEvent={onPinchGestureEvent} onHandlerStateChange={onPinchHandlerStateChange}>
                <Animated.View style={styles.mediaWrapper}>
                    <PanGestureHandler onGestureEvent={onPanGestureEvent} onHandlerStateChange={onPanHandlerStateChange} enabled={lastScale.current > 1} avgTouches>
                        <Animated.View style={styles.mediaWrapper}>
                            <TouchableOpacity activeOpacity={1} onPress={handleImageTap} style={styles.touchableImage}>
                                <Animated.Image source={{ uri: item.url }} style={[styles.media, { transform: [{ scale }, { translateX }, { translateY }] }]} resizeMode="contain"/>
                            </TouchableOpacity>
                        </Animated.View>
                    </PanGestureHandler>
                </Animated.View>
            </PinchGestureHandler>
        </GestureHandlerRootView>
    );

    const renderItem = ({ item, index }) => {
        if (index !== currentIndex) resetTransformations();
        const isVideo = item.type === 'video' || item.url?.endsWith('.mp4') || item.url?.endsWith('.mov');
        if (isVideo) {
            return (
                <TouchableOpacity activeOpacity={1} style={styles.mediaContainer} onPress={() => {
                    if (index === currentIndex && videoRef.current) {
                        const newPlayingState = !isPlaying;
                        if (newPlayingState) videoRef.current.playAsync().catch(err => {});
                        else videoRef.current.pauseAsync().catch(err => {});
                        setIsPlaying(newPlayingState);
                    }
                }}>
                    <Video ref={videoRef} source={{ uri: item.url }} style={styles.media} resizeMode="contain" shouldPlay={false} isLooping={true} onPlaybackStatusUpdate={(status) => { if (index === currentIndex) setIsPlaying(status.isPlaying); }} useNativeControls={false}/>
                    {!isPlaying && (
                        <View style={styles.playButtonContainer} pointerEvents="none">
                            <Ionicons name="play-circle" size={80} color="rgba(255, 255, 255, 0.9)" style={styles.playIcon} />
                        </View>
                    )}
                </TouchableOpacity>
            );
        }
        return renderImage(item);
    };

    if (mediaArray.length === 0) return null;

    return (
        <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
            <StatusBar barStyle="light-content" animated />
            <GestureHandlerRootView style={{ flex: 1 }}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                    <SafeAreaView style={styles.safeArea}>
                        {/* --- UPDATED HEADER CONTROLS --- */}
                        <View style={styles.headerControls}>
                            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <BlurView style={styles.controlButton} intensity={80} tint='light'>
                                    <Ionicons name="close" size={24} color="#000000" />
                                </BlurView>
                            </TouchableOpacity>

                            {mediaArray.length > 1 && (
                                <BlurView style={styles.mediaCounter} intensity={80} tint='light'>
                                    <Text style={styles.mediaCounterText}>{currentIndex + 1} / {mediaArray.length}</Text>
                                </BlurView>
                            )}
                        </View>
                        
                        <FlatList
                            ref={flatListRef}
                            data={mediaArray}
                            horizontal
                            pagingEnabled
                            scrollEnabled={lastScale.current <= 1}
                            showsHorizontalScrollIndicator={false}
                            initialScrollIndex={initialIndex}
                            getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
                            onMomentumScrollEnd={handleScrollEnd}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => `media-${index}-${item.url}`}
                            onScrollToIndexFailed={(info) => { const wait = new Promise(resolve => setTimeout(resolve, 500)); wait.then(() => { flatListRef.current?.scrollToIndex({ index: info.index, animated: false }); }); }}
                        />
                    </SafeAreaView>
                </Animated.View>
            </GestureHandlerRootView>
        </Modal>
    );
}


// --- REFACTORED STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    safeArea: {
        flex: 1,
    },
    headerControls: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    mediaCounter: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    mediaCounterText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: 'bold',
    },
    mediaContainer: {
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaWrapper: {
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    touchableImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    playButtonContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});
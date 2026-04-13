import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip?: () => void;
  backgroundColor?: string;
  onResult?: (result: 'learned' | 'not_learned') => void;
  recording?: boolean;
}

export function FlipCard({
  front,
  back,
  isFlipped,
  onFlip,
  backgroundColor = '#fff',
  onResult,
  recording = false,
}: FlipCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const THRESHOLD = screenWidth * 0.3;

  const flipAnim = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  // Refs to avoid stale closures in gesture callbacks
  const isFlippedRef = useRef(isFlipped);
  const recordingRef = useRef(recording);
  useEffect(() => { isFlippedRef.current = isFlipped; }, [isFlipped]);
  useEffect(() => { recordingRef.current = recording; }, [recording]);

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 180 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 10,
    }).start();
  }, [isFlipped]);

  // Flip face transforms
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: 'clamp' });
  const backOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: 'clamp' });

  // Drag transforms (applied to outer container, always present for native driver consistency)
  const cardRotate = dragX.interpolate({
    inputRange: [-150, 0, 150],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  // Colored overlays — visible only on back face (which is already opacity 0 when not flipped)
  const learnedOverlayOpacity = dragX.interpolate({
    inputRange: [0, THRESHOLD],
    outputRange: [0, 0.5],
    extrapolate: 'clamp',
  });
  const notLearnedOverlayOpacity = dragX.interpolate({
    inputRange: [-THRESHOLD, 0],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: dragX, translationY: dragY } }],
    { useNativeDriver: true },
  );

  const snapBack = () => {
    Animated.parallel([
      Animated.spring(dragX, { toValue: 0, useNativeDriver: true, friction: 8, tension: 40 }),
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 40 }),
    ]).start();
  };

  const flyOff = (direction: 'learned' | 'not_learned') => {
    const targetX = direction === 'learned' ? screenWidth * 1.5 : -screenWidth * 1.5;
    Animated.parallel([
      Animated.timing(dragX, { toValue: targetX, useNativeDriver: true, duration: 300 }),
      Animated.timing(dragY, { toValue: 0, useNativeDriver: true, duration: 300 }),
    ]).start(() => {
      onResult?.(direction);
    });
  };

  const onHandlerStateChange = ({ nativeEvent }: any) => {
    if (
      nativeEvent.state === State.CANCELLED ||
      nativeEvent.state === State.FAILED
    ) {
      snapBack();
      return;
    }

    if (nativeEvent.state !== State.END) return;

    const tx: number = nativeEvent.translationX;
    const ty: number = nativeEvent.translationY;
    const dist = Math.sqrt(tx * tx + ty * ty);

    if (dist < 10) {
      // Tap — toggle flip on either face
      onFlip?.();
      snapBack();
    } else if (isFlippedRef.current && !recordingRef.current && Math.abs(tx) >= THRESHOLD) {
      // Swipe past threshold on back face — fly off then commit result
      flyOff(tx > 0 ? 'learned' : 'not_learned');
    } else {
      snapBack();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      enabled={!recording}
      minDist={0}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor },
          {
            transform: [
              { rotate: cardRotate },
              { translateX: dragX },
              { translateY: dragY },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.face,
            { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
          ]}
        >
          {front}
        </Animated.View>

        <Animated.View
          style={[
            styles.face,
            styles.back,
            { transform: [{ rotateY: backRotate }], opacity: backOpacity },
          ]}
        >
          {back}
          <Animated.View
            pointerEvents="none"
            style={[styles.overlay, { backgroundColor: '#21ba45', opacity: learnedOverlayOpacity }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.overlay, { backgroundColor: '#db2828', opacity: notLearnedOverlayOpacity }]}
          />
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  face: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  back: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
});

import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme';

const DRAWER_WIDTH = 240;
const ANIMATION_DURATION = 220;

const NAV_ITEMS = [
  { label: 'Cards', path: '/', icon: 'albums' as const, iconOutline: 'albums-outline' as const },
  { label: 'Collections', path: '/collections', icon: 'folder' as const, iconOutline: 'folder-outline' as const },
];

export function NavMenu() {
  const [visible, setVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  function open() {
    setVisible(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function close(callback?: () => void) {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      callback?.();
    });
  }

  function navigate(path: string) {
    close(() => router.push(path as never));
  }

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={open}
        accessibilityLabel="Navigation menu"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="menu" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => close()}
      >
        {/* Dimmed overlay */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => close()} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
            { transform: [{ translateX }] },
          ]}
        >
          <Text style={styles.drawerHeading}>Navigate</Text>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.path || (item.path === '/' && pathname === '');
            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => navigate(item.path)}
              >
                <Ionicons
                  name={active ? item.icon : item.iconOutline}
                  size={22}
                  color={active ? COLORS.primary : COLORS.text}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: '#e8f1fb',
  },
  navLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

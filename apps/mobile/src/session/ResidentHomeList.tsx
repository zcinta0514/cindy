import { useHomeMode } from './useHomeMode';
import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { HomeModeProgressContext, useHomeModeProgress } from './HomeModeTransition';
import { useSegments } from 'expo-router';
import { useAdaptiveWindow } from '@/platform/AdaptiveWindowContext';
import { useReduceMotionEnabled } from '@/hooks/useReduceMotion';
import { motionDuration } from '@/theme/tokens';
import { RemoteSessionStoreSubscriptionGate } from './remoteSessionStore';
import { sessionPaneLayout } from './sessionPaneLayout';

type Frame = { left: number; top: number; width: number; height: number };
/** Which visible route owns the shared list: the full-width Home screen or the
 * wide-layout sidebar of a task. */
export type ResidentHomeSlot = 'home' | 'sidebar';
type Entry = { owner: string; slot: ResidentHomeSlot; frame: Frame; children: ReactNode };
const Context = createContext<{
  enabled: boolean;
  mounted: { current: boolean };
  publish(entry: Entry): void;
  host: React.RefObject<View | null>;
} | null>(null);

/** Only the route that is actually on screen may size the shared list. A pushed
 * task leaves the Home screen mounted with a still-focused `useIsFocused()`, so
 * the native route, not that lagging flag, decides who owns the frame. */
export function visibleResidentHomeSlot(segments: string[]): ResidentHomeSlot | null {
  if (segments.length === 0 || segments[0] === 'index'
    || (segments[0] === 'devices' && (segments.length === 1 || segments[1] === 'index'))) return 'home';
  if (segments[0] === 'sessions' && segments[1] === '[sessionId]') return 'sidebar';
  return null;
}

export function useResidentHomeList() {
  const context = useContext(Context);
  return { enabled: context?.enabled ?? false, mounted: context?.mounted };
}

/** Preserve the resident-list owner when route content is re-hosted above this
 * provider. React context follows the render destination, so an explicit bridge
 * is required for Android root overlays that otherwise fall back to an inline
 * Home list. */
export function useResidentHomeListContextBridge(children: ReactNode) {
  const context = useContext(Context);
  return useMemo(
    () => <Context.Provider value={context}>{children}</Context.Provider>,
    [children, context],
  );
}

/** The list lives above route lifetimes. Owners only supply its frame and props;
 * never key the host by route, session, or presentation width. */
export function ResidentHomeListProvider({ children }: { children: ReactNode }) {
  const geometry = useAdaptiveWindow();
  const enabled = sessionPaneLayout(geometry).persistent;
  const segments = useSegments() as string[];
  const slot = visibleResidentHomeSlot(segments);
  const { mode, hydrated } = useHomeMode();
  const homeRoute = segments.length === 0 || segments[0] === 'index'
    || (segments[0] === 'devices' && (segments.length === 1 || segments[1] === 'index'));
  // Android pages draw their own bar inside each pane, so sliding them would move it; they switch in place.
  const progress = useHomeModeProgress(mode, homeRoute && Platform.OS === 'ios', hydrated);
  // Keep the outgoing resident list drawn during the slide, but never interactive over the new tab.
  const visible = enabled && ((mode === 'tasks' && homeRoute)
    || (segments[0] === 'sessions' && segments[1] === '[sessionId]'));
  const slide = useAnimatedStyle(() => ({
    opacity: homeRoute ? (progress.value < 1 ? 1 : 0) : (visible ? 1 : 0),
    transform: [{ translateX: homeRoute ? -progress.value * geometry.width : 0 }],
  }));
  const host = useRef<View>(null);
  const mounted = useRef(false);
  const [entry, setEntry] = useState<Entry | null>(null);
  const reduceMotion = useReduceMotionEnabled();
  // Late measurement callbacks cross route boundaries: a slot that is no longer
  // the visible one must never resize or replace the list, or its window-sized
  // frame stays painted over the task panes until the visible slot happens to
  // measure again (Android wide layout, foldable landscape).
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const publish = useCallback((next: Entry) => {
    if (next.slot !== slotRef.current) return;
    setEntry(next);
  }, []);
  const context = useMemo(() => ({ enabled, mounted, publish, host }), [enabled, publish]);
  useLayoutEffect(() => {
    mounted.current = enabled && !!entry;
    if (!enabled) setEntry(null);
  }, [enabled, entry]);
  return <HomeModeProgressContext.Provider value={progress}><Context.Provider value={context}>
    <View ref={host} collapsable={false} style={styles.root}>
      {children}
      {entry ? <Animated.View pointerEvents={visible ? 'box-none' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        style={[styles.host, entry.frame, {
          transitionProperty: ['left', 'top', 'width', 'height'],
          transitionDuration: reduceMotion === false ? motionDuration.fast : 0,
        }, slide]}>
        <RemoteSessionStoreSubscriptionGate enabled={visible}>{entry.children}</RemoteSessionStoreSubscriptionGate>
      </Animated.View> : null}
    </View>
  </Context.Provider></HomeModeProgressContext.Provider>;
}

/** A route supplies a measuring slot, not another native list. Its header stays
 * in the native navigation hierarchy, outside the list's touch bounds. */
export function ResidentHomeList({ slot, children, focused, top, left, right }: {
  slot: ResidentHomeSlot; children: ReactNode; focused: boolean; top: number; left: number; right: number;
}) {
  const context = useContext(Context);
  const owner = useId();
  const segments = useSegments() as string[];
  const anchor = useRef<View>(null);
  const latest = useRef({ children, focused });
  latest.current = { children, focused };
  const measureRevision = useRef(0);
  const measure = useCallback(() => {
    const revision = ++measureRevision.current;
    const ownsList = visibleResidentHomeSlot(segments) === slot;
    if (!context?.enabled || !ownsList || !latest.current.focused || !context.host.current) return;
    const publish = (left: number, top: number, width: number, height: number) => {
      if (revision !== measureRevision.current || !latest.current.focused || width <= 0 || height <= 0) return;
      context.publish({ owner, slot, frame: { left, top, width, height }, children: latest.current.children });
    };
    // Layout coordinates ignore transient native transforms (route push, drawer
    // slide). Android re-hosts some drawers outside the host's native subtree,
    // where there is no common ancestor left to measure against; fall back to the
    // window delta for those.
    anchor.current?.measureLayout(context.host.current, publish, () => {
      anchor.current?.measureInWindow((x, y, width, height) => {
        context.host.current?.measureInWindow((hostX, hostY) => publish(x - hostX, y - hostY, width, height));
      });
    });
  }, [context, owner, segments, slot]);
  useLayoutEffect(() => {
    measure();
    return () => { ++measureRevision.current; };
  }, [measure, children, focused, top, left, right]);
  return <View ref={anchor} collapsable={false} pointerEvents="none" onLayout={measure}
    style={{ flex: 1, marginTop: top, marginLeft: -left, marginRight: -right }} />;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  host: { position: 'absolute' },
});

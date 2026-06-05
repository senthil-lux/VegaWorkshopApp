/*
 * Copyright (c) 2024 Amazon.com, Inc. or its affiliates.  All rights reserved.
 *
 * PROPRIETARY/CONFIDENTIAL.  USE IS SUBJECT TO LICENSE TERMS.
 */

// Import the required components from react and react-native packages
import React, {useRef, useEffect, useState} from 'react';
import {View, StyleSheet, ActivityIndicator, Platform, AppState} from 'react-native';
import type {NativeStackNavigationProp} from '@amazon-devices/react-native-screens/native-stack';
import type {RootStackParamList} from '../App';

// W3C Media components from @amazon-devices/react-native-w3cmedia NPM package.
import {
  VideoPlayer,
  KeplerVideoSurfaceView,
  KeplerCaptionsView,
} from '@amazon-devices/react-native-w3cmedia';

// Shaka MSE player (built via shaka-setup) for adaptive HLS/DASH playback.
import {ShakaPlayer, ShakaPlayerSettings} from '../shakaplayer/ShakaPlayer';

type VideoPlayerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VideoPlayer'
>;

interface VideoPlayerScreenProps {
  route: {
    params: {
      videoUrl: string;
      title: string;
    };
  };
  navigation: VideoPlayerScreenNavigationProp;
}

// ABR ceiling for adaptive streaming.
const DEFAULT_ABR_WIDTH: number = Platform.isTV ? 3840 : 1919;
const DEFAULT_ABR_HEIGHT: number = Platform.isTV ? 2160 : 1079;

// Adaptive manifests (HLS/DASH) must go through MSE mode (Shaka).
// Progressive files (mp4/mkv/mp3/...) play directly in URL mode.
const isAdaptiveSource = (url: string): boolean =>
  /\.(m3u8|mpd)(\?.*)?$/i.test(url);

export const VideoPlayerScreen = ({
  route,
  navigation,
}: VideoPlayerScreenProps) => {
  const {videoUrl, title} = route.params;

  const videoPlayer = useRef<VideoPlayer | null>(null);
  const shakaPlayer = useRef<ShakaPlayer | null>(null);
  const surfaceHandleRef = useRef<string | null>(null);
  const initializedRef = useRef<boolean>(false);

  const [isBuffering, setIsBuffering] = useState(true);

  const useMse = isAdaptiveSource(videoUrl);

  useEffect(() => {
    console.log('VideoPlayerScreen mounting:', title);
    console.log('Video URL:', videoUrl, '| MSE mode:', useMse);
    initializePlayer();

    // Pause on background to avoid decoder crash when leaving the foreground.
    const appStateSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        videoPlayer.current?.pause();
      }
    });

    return () => {
      appStateSubscription?.remove();
      teardownPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlaying = () => {
    setIsBuffering(false);
  };

  const onWaiting = () => {
    setIsBuffering(true);
  };

  const onEnded = () => {
    console.log('Playback ended, navigating back');
    navigation.goBack();
  };

  const onError = (e: any) => {
    console.error('VideoPlayer error event:', e?.detail ?? e);
  };

  const setUpEventListeners = (): void => {
    videoPlayer.current?.addEventListener('playing', onPlaying);
    videoPlayer.current?.addEventListener('waiting', onWaiting);
    videoPlayer.current?.addEventListener('ended', onEnded);
    videoPlayer.current?.addEventListener('error', onError);
  };

  const removeEventListeners = (): void => {
    videoPlayer.current?.removeEventListener('playing', onPlaying);
    videoPlayer.current?.removeEventListener('waiting', onWaiting);
    videoPlayer.current?.removeEventListener('ended', onEnded);
    videoPlayer.current?.removeEventListener('error', onError);
  };

  const initializePlayer = async () => {
    const player = new VideoPlayer();
    videoPlayer.current = player;
    // Shaka polyfills resolve the active media element via global.gmedia.
    // @ts-ignore
    global.gmedia = player;

    await player.initialize();
    initializedRef.current = true;

    setUpEventListeners();
    player.autoplay = false;

    if (useMse) {
      // MSE mode: Shaka parses the manifest and feeds segments via MSE/EME.
      const settings: ShakaPlayerSettings = {
        secure: false,
        abrEnabled: true,
        abrMaxWidth: DEFAULT_ABR_WIDTH,
        abrMaxHeight: DEFAULT_ABR_HEIGHT,
      };
      const shaka = new ShakaPlayer(player, settings);
      shakaPlayer.current = shaka;
      shaka.load(
        {
          secure: 'false',
          uri: videoUrl,
          drm_scheme: '',
          drm_license_uri: '',
        },
        true,
      );
    } else {
      // URL mode: VideoPlayer plays the progressive file directly.
      player.src = videoUrl;
    }

    // Surface may already be ready (race) — attach now if so.
    attachSurface();
  };

  const attachSurface = () => {
    if (!initializedRef.current) {
      return;
    }
    if (!surfaceHandleRef.current) {
      return;
    }
    videoPlayer.current?.setSurfaceHandle(surfaceHandleRef.current);
    videoPlayer.current?.play();
  };

  const onSurfaceViewCreated = (surfaceHandle: string): void => {
    surfaceHandleRef.current = surfaceHandle;
    attachSurface();
  };

  const onSurfaceViewDestroyed = (surfaceHandle: string): void => {
    videoPlayer.current?.clearSurfaceHandle(surfaceHandle);
    surfaceHandleRef.current = null;
  };

  const onCaptionViewCreated = (captionsHandle: string): void => {
    videoPlayer.current?.setCaptionViewHandle(captionsHandle);
  };

  const teardownPlayer = async () => {
    console.log('VideoPlayerScreen unmounting, tearing down player');
    const player = videoPlayer.current;
    const shaka = shakaPlayer.current;
    videoPlayer.current = null;
    shakaPlayer.current = null;
    initializedRef.current = false;

    try {
      player?.pause();
    } catch {}
    try {
      shaka?.unload();
    } catch {}
    try {
      await player?.deinitialize();
    } catch {}
    try {
      removeEventListenersOn(player);
    } catch {}
    // @ts-ignore
    global.gmedia = null;
  };

  // removeEventListeners bound to a specific (already-nulled-from-ref) player.
  const removeEventListenersOn = (player: VideoPlayer | null): void => {
    player?.removeEventListener('playing', onPlaying);
    player?.removeEventListener('waiting', onWaiting);
    player?.removeEventListener('ended', onEnded);
    player?.removeEventListener('error', onError);
  };

  return (
    <View style={styles.container}>
      <KeplerVideoSurfaceView
        style={styles.surface}
        onSurfaceViewCreated={onSurfaceViewCreated}
        onSurfaceViewDestroyed={onSurfaceViewDestroyed}
      />
      <KeplerCaptionsView
        style={styles.captions}
        show={true}
        onCaptionViewCreated={onCaptionViewCreated}
      />
      {isBuffering && (
        <View style={styles.bufferingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  surface: {
    flex: 1,
    zIndex: 0,
  },
  captions: {
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    position: 'absolute',
    backgroundColor: 'transparent',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
});

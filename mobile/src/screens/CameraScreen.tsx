import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../lib/navigation';
import { persistCapture } from '../lib/imageOps';
import { ScanPage } from '../lib/types';
import { useTheme } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

/**
 * Plain camera capture: snap one photo at a time, keep shooting, then send
 * every shot to Review as its own page. This is the fallback/parallel path to
 * the auto-cropping document scanner for anyone who just wants to point and shoot.
 */
export default function CameraScreen({ navigation }: Props) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [capturing, setCapturing] = useState(false);

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>
          EazyScanner needs camera access to take photos.
        </Text>
        <Pressable style={[styles.permissionButton, { backgroundColor: theme.accent }]} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera access</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelText, { color: theme.textMuted }]}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo) return;
      const id = Crypto.randomUUID();
      const { uri, width, height } = await persistCapture(photo.uri, id);
      setPages((prev) => [...prev, { id, uri, originalUri: uri, rotation: 0, width, height }]);
    } catch (err) {
      console.warn('Capture failed', err);
    } finally {
      setCapturing(false);
    }
  }

  function handleDone() {
    if (pages.length === 0) {
      navigation.goBack();
      return;
    }
    navigation.replace('Review', { pages });
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topButton}>
          <Text style={styles.topButtonText}>Cancel</Text>
        </Pressable>
        <Text style={styles.pageCount}>{pages.length} page{pages.length === 1 ? '' : 's'}</Text>
        <Pressable onPress={handleDone} style={styles.topButton} disabled={pages.length === 0}>
          <Text style={[styles.topButtonText, pages.length === 0 && styles.disabledText]}>Done</Text>
        </Pressable>
      </View>

      {pages.length > 0 && (
        <FlatList
          horizontal
          data={pages}
          keyExtractor={(item) => item.id}
          style={styles.filmstrip}
          contentContainerStyle={styles.filmstripContent}
          renderItem={({ item }) => <Image source={{ uri: item.uri }} style={styles.filmstripThumb} />}
        />
      )}

      <View style={styles.shutterRow}>
        <Pressable
          onPress={handleCapture}
          disabled={capturing}
          style={[styles.shutter, capturing && styles.shutterBusy]}
        >
          {capturing ? <ActivityIndicator color="#000" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  camera: { flex: 1 },
  permissionText: { fontSize: 16, textAlign: 'center' },
  permissionButton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  permissionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelText: { fontSize: 14 },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topButton: { padding: 8 },
  topButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledText: { opacity: 0.4 },
  pageCount: { color: '#fff', fontSize: 14, fontWeight: '500' },
  filmstrip: { position: 'absolute', bottom: 130, left: 0, right: 0 },
  filmstripContent: { paddingHorizontal: 16, gap: 8 },
  filmstripThumb: { width: 48, height: 64, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: '#fff' },
  shutterRow: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterBusy: { opacity: 0.7 },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});

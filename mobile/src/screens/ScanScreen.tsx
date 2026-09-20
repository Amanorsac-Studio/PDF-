import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import * as Crypto from 'expo-crypto';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../lib/navigation';
import { persistCapture } from '../lib/imageOps';
import { ScanPage } from '../lib/types';
import { useTheme } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({ navigation }: Props) {
  const theme = useTheme();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runScan();
  }, []);

  async function runScan() {
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        croppedImageQuality: 90,
        responseType: ResponseType.ImageFilePath,
      });

      if (status !== 'success' || !scannedImages || scannedImages.length === 0) {
        navigation.goBack();
        return;
      }

      const pages: ScanPage[] = [];
      for (const uri of scannedImages) {
        const id = Crypto.randomUUID();
        const { uri: savedUri, width, height } = await persistCapture(uri, id);
        pages.push({ id, uri: savedUri, originalUri: savedUri, rotation: 0, width, height });
      }

      navigation.replace('Review', { pages });
    } catch (err) {
      console.warn('Document scan failed', err);
      navigation.goBack();
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.text, { color: theme.textMuted }]}>Opening scanner…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 15 },
});

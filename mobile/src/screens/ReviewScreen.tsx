import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import { RootStackParamList } from '../lib/navigation';
import { ScanPage, DocumentRecord } from '../lib/types';
import { persistCapture, rotatePage, deletePageFiles } from '../lib/imageOps';
import { buildPdfFromPages } from '../lib/pdf';
import { saveDocument } from '../lib/library';
import { useTheme } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

export default function ReviewScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const [pages, setPages] = useState<ScanPage[]>(route.params.pages);
  const [title, setTitle] = useState(defaultTitle());
  const [busy, setBusy] = useState(false);

  function defaultTitle() {
    const now = new Date();
    return `Scan ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    setPages(next);
  }

  async function handleRotate(index: number) {
    const updated = await rotatePage(pages[index]);
    setPages((prev) => prev.map((p, i) => (i === index ? updated : p)));
  }

  function handleRemove(index: number) {
    const page = pages[index];
    Alert.alert('Remove page', 'Remove this page from the document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setPages((prev) => prev.filter((_, i) => i !== index));
          await deletePageFiles(page).catch(() => {});
        },
      },
    ]);
  }

  async function handleAddMore() {
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        croppedImageQuality: 90,
        responseType: ResponseType.ImageFilePath,
      });
      if (status !== 'success' || !scannedImages) return;
      const added: ScanPage[] = [];
      for (const uri of scannedImages) {
        const id = Crypto.randomUUID();
        const { uri: savedUri, width, height } = await persistCapture(uri, id);
        added.push({ id, uri: savedUri, originalUri: savedUri, rotation: 0, width, height });
      }
      setPages((prev) => [...prev, ...added]);
    } catch (err) {
      console.warn('Add more pages failed', err);
    }
  }

  async function handleSave() {
    if (pages.length === 0) {
      Alert.alert('No pages', 'Add at least one page before saving.');
      return;
    }
    setBusy(true);
    try {
      const id = Crypto.randomUUID();
      const docsDir = `${FileSystem.documentDirectory}eazyscanner-pdfs/`;
      await FileSystem.makeDirectoryAsync(docsDir, { intermediates: true }).catch(() => {});
      const pdfUri = `${docsDir}${id}.pdf`;
      await buildPdfFromPages(pages, pdfUri);

      const thumbSource = await ImageManipulator.manipulateAsync(pages[0].uri, [{ resize: { width: 160 } }], {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const thumbDest = `${docsDir}${id}-thumb.jpg`;
      await FileSystem.copyAsync({ from: thumbSource.uri, to: thumbDest });

      const info = await FileSystem.getInfoAsync(pdfUri);
      const record: DocumentRecord = {
        id,
        title: title.trim() || defaultTitle(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pageCount: pages.length,
        pdfUri,
        thumbnailUri: thumbDest,
        fileSizeBytes: (info.exists && 'size' in info ? info.size : 0) || 0,
      };
      await saveDocument(record);
      navigation.popToTop();
    } catch (err) {
      console.error(err);
      Alert.alert('Could not save PDF', 'Something went wrong while building the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TextInput
        style={[styles.titleInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Document name"
        placeholderTextColor={theme.textMuted}
      />

      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        horizontal={false}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <View style={[styles.pageCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Image source={{ uri: item.uri }} style={styles.pageImage} resizeMode="cover" />
            <Text style={[styles.pageNumber, { color: theme.textMuted }]}>{index + 1}</Text>
            <View style={styles.pageActions}>
              <Pressable onPress={() => move(index, -1)} style={styles.pageActionBtn} disabled={index === 0}>
                <Text style={[styles.pageActionText, index === 0 && styles.disabled]}>⬅︎</Text>
              </Pressable>
              <Pressable onPress={() => handleRotate(index)} style={styles.pageActionBtn}>
                <Text style={styles.pageActionText}>⟳</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(index)} style={styles.pageActionBtn}>
                <Text style={[styles.pageActionText, { color: theme.danger }]}>🗑</Text>
              </Pressable>
              <Pressable
                onPress={() => move(index, 1)}
                style={styles.pageActionBtn}
                disabled={index === pages.length - 1}
              >
                <Text style={[styles.pageActionText, index === pages.length - 1 && styles.disabled]}>➡︎</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.footerButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={handleAddMore}
        >
          <Text style={[styles.footerButtonText, { color: theme.text }]}>+ Add page</Text>
        </Pressable>
        <Pressable
          style={[styles.footerButton, styles.saveButton, { backgroundColor: theme.accent }]}
          onPress={handleSave}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save PDF</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 16 },
  titleInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  grid: { paddingBottom: 16 },
  pageCard: { flex: 1, margin: 6, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  pageImage: { width: '100%', aspectRatio: 0.72, backgroundColor: '#ddd' },
  pageNumber: { position: 'absolute', top: 6, left: 8, fontSize: 12, fontWeight: '700' },
  pageActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  pageActionBtn: { padding: 4 },
  pageActionText: { fontSize: 16 },
  disabled: { opacity: 0.25 },
  footer: { flexDirection: 'row', gap: 12, paddingVertical: 16 },
  footerButton: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  footerButtonText: { fontSize: 15, fontWeight: '600' },
  saveButton: { borderWidth: 0 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

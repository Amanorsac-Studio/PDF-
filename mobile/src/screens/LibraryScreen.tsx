import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { RootStackParamList } from '../lib/navigation';
import { deleteDocument, listDocuments, renameDocument } from '../lib/library';
import { persistCapture } from '../lib/imageOps';
import { DocumentRecord, ScanPage } from '../lib/types';
import { useTheme } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

export default function LibraryScreen({ navigation }: Props) {
  const theme = useTheme();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const refresh = useCallback(() => {
    listDocuments().then(setDocuments);
  }, []);

  useFocusEffect(refresh);

  async function handleImportPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to import pictures as a PDF.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 0,
    });

    if (result.canceled || result.assets.length === 0) return;

    const pages: ScanPage[] = [];
    for (const asset of result.assets) {
      const id = Crypto.randomUUID();
      const { uri, width, height } = await persistCapture(asset.uri, id);
      pages.push({
        id,
        uri,
        originalUri: uri,
        rotation: 0,
        width: asset.width || width,
        height: asset.height || height,
      });
    }

    navigation.navigate('Review', { pages });
  }

  async function handleShare(doc: DocumentRecord) {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      return;
    }
    await Sharing.shareAsync(doc.pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: doc.title,
      UTI: 'com.adobe.pdf',
    });
  }

  function confirmDelete(doc: DocumentRecord) {
    Alert.alert('Delete PDF', `Delete "${doc.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(doc.id);
          refresh();
        },
      },
    ]);
  }

  function startRename(doc: DocumentRecord) {
    setRenamingId(doc.id);
    setRenameText(doc.title);
  }

  async function commitRename() {
    if (renamingId && renameText.trim()) {
      await renameDocument(renamingId, renameText.trim());
      refresh();
    }
    setRenamingId(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>EazyScanner</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Scan documents, IDs, and receipts — export clean, edge-cropped PDFs.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.primaryAction, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.primaryActionText}>📷  Scan document</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryAction, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={handleImportPhotos}
        >
          <Text style={[styles.secondaryActionText, { color: theme.text }]}>🖼  Import photos</Text>
        </Pressable>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            No PDFs yet. Scan a document or import photos to get started.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Image source={{ uri: item.thumbnailUri }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.cardBody}>
              {renamingId === item.id ? (
                <TextInput
                  style={[styles.renameInput, { color: theme.text, borderColor: theme.accent }]}
                  value={renameText}
                  onChangeText={setRenameText}
                  onSubmitEditing={commitRename}
                  onBlur={commitRename}
                  autoFocus
                />
              ) : (
                <Pressable onPress={() => startRename(item)}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
              <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
                {item.pageCount} page{item.pageCount === 1 ? '' : 's'} · {formatBytes(item.fileSizeBytes)}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => handleShare(item)} style={styles.iconButton}>
                <Text style={styles.iconButtonText}>⤴</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} style={styles.iconButton}>
                <Text style={[styles.iconButtonText, { color: theme.danger }]}>🗑</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  primaryAction: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryAction: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  secondaryActionText: { fontSize: 15, fontWeight: '600' },
  listContent: { paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  thumb: { width: 52, height: 68, borderRadius: 8, backgroundColor: '#ddd' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  renameInput: { fontSize: 16, fontWeight: '600', borderBottomWidth: 1, paddingVertical: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconButton: { padding: 8 },
  iconButtonText: { fontSize: 18 },
});

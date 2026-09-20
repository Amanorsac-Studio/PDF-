import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    background: '#F4F6FB',
    surface: '#FFFFFF',
    surfaceAlt: '#ECEFF6',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E2E5EE',
    accent: '#0B5FFF',
    accentSoft: '#E5EEFF',
    danger: '#DC2626',
    success: '#16A34A',
  },
  dark: {
    background: '#0B0D12',
    surface: '#161922',
    surfaceAlt: '#1E222D',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    border: '#272C38',
    accent: '#4C8DFF',
    accentSoft: '#1B2A4A',
    danger: '#F87171',
    success: '#4ADE80',
  },
};

export type Theme = typeof palette.light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}

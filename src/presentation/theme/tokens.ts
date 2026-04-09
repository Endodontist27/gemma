export const themeColors = {
  background: '#eef3f8',
  surface: '#ffffff',
  surfaceMuted: '#f7f9fc',
  surfaceAccent: '#f0f6ff',
  border: '#d7e1ec',
  borderStrong: '#b9cadc',
  primary: '#185adb',
  primaryDeep: '#103a8b',
  primarySoft: '#dbeafe',
  text: '#0f172a',
  textMuted: '#526173',
  textSubtle: '#708197',
  success: '#166534',
  successSoft: '#dcfce7',
  warning: '#92400e',
  warningSoft: '#fef3c7',
  danger: '#b42318',
  dangerSoft: '#fee2e2',
} as const;

export const cardShadow = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: {
    width: 0,
    height: 10,
  },
  elevation: 3,
} as const;

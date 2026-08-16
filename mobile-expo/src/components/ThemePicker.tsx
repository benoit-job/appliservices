import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { DEFAULT_THEME_ID, getTheme, themes, type ThemeColors, type ThemeId } from "../../themes";

type Props = {
  open: boolean;
  activeId: ThemeId;
  colors: ThemeColors;
  t: (key: string) => string;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (id: ThemeId) => void;
};

export function ThemePicker({ open, activeId, colors, t, onToggle, onClose, onSelect }: Props) {
  const slide = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: open ? 0 : 320,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  }, [open, slide]);

  const styles = createStyles(colors);

  return (
    <>
      {open && <Pressable style={styles.backdrop} onPress={onClose} />}
      <Pressable style={styles.toggle} onPress={onToggle} accessibilityLabel={t("themePicker")}>
        <View style={styles.togglePalette}>
          <View style={[styles.toggleDot, { backgroundColor: colors.onPrimary }]} />
          <View style={[styles.toggleDot, { backgroundColor: colors.gold }]} />
          <View style={[styles.toggleDot, { backgroundColor: colors.green }]} />
        </View>
      </Pressable>
      <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}>
        <View style={styles.head}>
          <Text style={styles.title}>{t("themePicker")}</Text>
          <Text style={styles.desc}>{t("themePickerDesc")}</Text>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>x</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {themes.map((theme) => (
            <Pressable
              key={theme.id}
              style={[styles.card, activeId === theme.id && styles.cardActive]}
              onPress={() => onSelect(theme.id)}
            >
              <View style={styles.swatches}>
                {theme.preview.map((color) => (
                  <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
                ))}
              </View>
              <Text style={styles.label}>
                {theme.emoji} {t(theme.nameKey)}
              </Text>
              {activeId === theme.id && <Text style={styles.check}>OK</Text>}
            </Pressable>
          ))}
        </View>
        <Text style={styles.foot}>
          {t("themeActive")}: {t(getTheme(activeId).nameKey)}
        </Text>
      </Animated.View>
    </>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
      zIndex: 2000,
    },
    toggle: {
      position: "absolute",
      right: 0,
      top: "50%",
      marginTop: -24,
      width: 44,
      height: 48,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
      backgroundColor: c.blue,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2001,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    togglePalette: {
      width: 22,
      height: 22,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleDot: { width: 8, height: 8, borderRadius: 4 },
    panel: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 308,
      backgroundColor: c.surface,
      borderLeftWidth: 1,
      borderLeftColor: c.line,
      zIndex: 2002,
      padding: 18,
      gap: 14,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 16,
    },
    head: { gap: 4, paddingRight: 28 },
    title: { fontSize: 18, fontWeight: "900", color: c.text },
    desc: { color: c.muted, fontSize: 13, lineHeight: 18 },
    close: { position: "absolute", top: 0, right: 0, padding: 6 },
    closeText: { color: c.muted, fontSize: 16, fontWeight: "800" },
    grid: { gap: 10, flex: 1 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: c.bg,
    },
    cardActive: { borderColor: c.blue, backgroundColor: c.primaryLight },
    swatches: { flexDirection: "row", gap: 4 },
    swatch: { width: 16, height: 16, borderRadius: 999 },
    label: { flex: 1, color: c.text, fontWeight: "700", fontSize: 13 },
    check: { color: c.blue, fontWeight: "900", fontSize: 12 },
    foot: { color: c.muted, fontSize: 12, fontWeight: "700" },
  });
}

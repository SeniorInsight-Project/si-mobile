import { SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';

export default function ScreenWrapper({ children, style }) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 6 : 30) : 0,
  },
});
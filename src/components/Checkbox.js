import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

export default function Checkbox({ isChecked, onToggle, children }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.box, isChecked && styles.boxChecked]}>
        {isChecked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.textContainer}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 20,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1', // Borda cinza quando desmarcado
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2, // Alinha a caixinha com a primeira linha do texto
  },
  boxChecked: {
    backgroundColor: '#E5534B', // Fica vermelho quando marcado!
    borderColor: '#E5534B',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
});
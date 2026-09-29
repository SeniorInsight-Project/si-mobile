import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

export default function InputField({ label, placeholder, icon, isPassword }) {
  // Estado para controlar se a senha está oculta ou visível
  const [isPasswordHidden, setIsPasswordHidden] = useState(isPassword);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.inputArea}>
        <Text style={styles.icon}>{icon}</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPasswordHidden} // Usa o estado atual para esconder ou mostrar
        />

        {/* Se for um campo de senha, mostramos o botão do olhinho! */}
        {isPassword && (
          <TouchableOpacity onPress={() => setIsPasswordHidden(!isPasswordHidden)}>
            <Text style={styles.eyeIcon}>{isPasswordHidden ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E2E69',
    marginBottom: 8,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  icon: {
    marginRight: 10,
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  eyeIcon: {
    fontSize: 16,
    marginLeft: 10,
  }
});
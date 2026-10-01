import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';

export default function InputField({ label, placeholder, icon, isPassword, ...rest }) {
  const [isPasswordHidden, setIsPasswordHidden] = useState(isPassword);

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return <View style={styles.iconContainer}>{icon}</View>;
    }
    if (typeof icon === 'string') {
      if (icon === 'mail' || icon.includes('mail')) return <Mail size={18} color="#94A3B8" style={styles.icon} />;
      if (icon === 'lock' || icon.includes('lock')) return <Lock size={18} color="#94A3B8" style={styles.icon} />;
      if (icon === 'user' || icon.includes('user')) return <User size={18} color="#94A3B8" style={styles.icon} />;
      return null;
    }
    const IconComp = icon;
    return <IconComp size={18} color="#94A3B8" style={styles.icon} />;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputArea}>
        {renderIcon()}

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPasswordHidden}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsPasswordHidden(!isPasswordHidden)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            {isPasswordHidden ? (
              <EyeOff size={18} color="#94A3B8" />
            ) : (
              <Eye size={18} color="#031753" />
            )}
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
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  iconText: {
    marginRight: 10,
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  eyeButton: {
    padding: 6,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
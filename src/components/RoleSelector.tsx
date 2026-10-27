import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { typography } from '../theme';

export interface RoleSelectorProps {
  selectedRole: string;
  onSelectRole: (roleId: string) => void;
}

export default function RoleSelector({ selectedRole, onSelectRole }: RoleSelectorProps) {
  const roles = [
    {
      id: 'Idoso',
      label: 'Idoso',
      subLabel: 'Assistido',
      icon: 'elderly',
    },
    {
      id: 'Familiar',
      label: 'Familiar',
      subLabel: 'Responsável',
      icon: 'favorite',
    },
    {
      id: 'Cuidador',
      label: 'Cuidador',
      subLabel: 'Profissional',
      icon: 'medical_services',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.mainLabel}>Qual é o seu perfil?</Text>

      <View style={styles.row}>
        {roles.map((role) => {
          const isActive = selectedRole === role.id;

          return (
            <TouchableOpacity
              key={role.id}
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => onSelectRole(role.id)}
              activeOpacity={0.8}
            >
              {isActive && (
                <View style={styles.checkBadge}>
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
              )}

              <View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
                <Icon
                  name={role.icon}
                  size={22}
                  color={isActive ? '#031753' : '#64748B'}
                />
              </View>

              <Text style={[styles.cardText, isActive && styles.textActive]}>
                {role.label}
              </Text>
              <Text style={[styles.subText, isActive && styles.subTextActive]}>
                {role.subLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    width: '100%',
  },
  mainLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131E3D',
    textAlign: 'center',
    marginBottom: 14,
    fontFamily: typography.fontFamily.heading,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
    minHeight: 112,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardActive: {
    borderColor: '#031753',
    backgroundColor: '#EBF5FF',
    borderWidth: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircleActive: {
    backgroundColor: '#FFFFFF',
  },
  cardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  textActive: {
    color: '#031753',
  },
  subText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: typography.fontFamily.body,
  },
  subTextActive: {
    color: '#1E2E69',
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { HelpCircle, Check } from 'lucide-react-native';

export default function RoleSelector({ selectedRole, onSelectRole }) {
  const roles = [
    { 
      id: 'Idoso', 
      label: 'Idoso', 
      subLabel: 'Assistido', 
      image: require('../../assets/idoso.png') 
    },
    { 
      id: 'Familiar', 
      label: 'Familiar', 
      subLabel: 'Responsável', 
      image: require('../../assets/familiar.png') 
    },
    { 
      id: 'Cuidador', 
      label: 'Cuidador', 
      subLabel: 'Profissional', 
      image: require('../../assets/cuidador.png') 
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.mainLabel}>Qual é o seu papel no cuidado?</Text>
        <HelpCircle size={16} color="#64748B" />
      </View>
      
      <View style={styles.row}>
        {roles.map((role) => {
          const isActive = selectedRole === role.id;
          
          return (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.card,
                isActive && styles.cardActive
              ]}
              onPress={() => onSelectRole(role.id)}
              activeOpacity={0.7}
            >
              {/* O símbolo de OK (Check) flutuando no canto superior direito */}
              {isActive && (
                <View style={styles.checkBadge}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}

              <Image 
                source={role.image} 
                style={styles.imageIcon}
                resizeMode="contain"
              />
              
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
    marginBottom: 20,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#031753',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  cardActive: {
    borderColor: '#031753',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#031753',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIcon: {
    width: 44,
    height: 44,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  textActive: {
    color: '#031753',
  },
  subText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  subTextActive: {
    color: '#64748B',
    fontWeight: '600',
  },
});
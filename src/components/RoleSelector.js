import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

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
        <Text style={styles.helpIcon}>❓</Text>
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
                  <Text style={styles.checkText}>✓</Text>
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
              
              <Text style={[styles.subText, isActive && styles.textActive]}>
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E2E69', 
  },
  helpIcon: {
    fontSize: 14,
    color: '#94A3B8',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8, 
  },
  card: {
    flex: 1,
    height: 124,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    // position relative para segurar o selo de check dentro do card
    position: 'relative', 
  },
  cardActive: {
    borderColor: '#1E2E69', 
    backgroundColor: '#EBF5FF', 
  },
  // --- ESTILOS DO NOVO SELO DE OK ---
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#1E2E69',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // -----------------------------------
  imageIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 2,
  },
  subText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
  },
  textActive: {
    color: '#1E2E69', 
  },
});
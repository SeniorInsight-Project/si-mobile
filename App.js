import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ElderlyModeScreen from './src/screens/ElderlyModeScreen';
import HomeScreen from './src/screens/HomeScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import FamilyScreen from './src/screens/FamilyScreen';

export default function App() {
  const [telaAtual, setTelaAtual] = useState('Onboarding');

  const renderScreen = () => {
    switch (telaAtual) {
      case 'Onboarding':
        return <OnboardingScreen onNavigate={setTelaAtual} />;
      case 'Register':
        return <RegisterScreen onNavigate={setTelaAtual} />;
      case 'Login':
        return <LoginScreen onNavigate={setTelaAtual} />;
      case 'ForgotPassword':
        return <ForgotPasswordScreen onNavigate={setTelaAtual} />;
      case 'ElderlyMode':
        return <ElderlyModeScreen onNavigate={setTelaAtual} />;
      case 'Home':
        return <HomeScreen onNavigate={setTelaAtual} />;
      case 'Medicines':
        return <MedicinesScreen onNavigate={setTelaAtual} />;
      case 'Family':
        return <FamilyScreen onNavigate={setTelaAtual} />;
      default:
        return <OnboardingScreen onNavigate={setTelaAtual} />;
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      {renderScreen()}
    </>
  );
}

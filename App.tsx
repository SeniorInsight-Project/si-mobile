import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import TwoFactorAuthScreen from './src/screens/TwoFactorAuthScreen';
import ElderlyModeScreen from './src/screens/ElderlyModeScreen';
import ElderlyProfileScreen from './src/screens/ElderlyProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import AcceptInviteScreen, { UsuarioLogado } from './src/screens/AcceptInviteScreen';

export default function App() {
  const [telaAtual, setTelaAtual] = useState<string>('Onboarding');
  const [idosoSelecionadoId, setIdosoSelecionadoId] = useState<string>('e3b0c442-98fc-1c14-9afc-432100000001');
  const [papelAcessoAtual] = useState<string>('ADMIN');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLogado | null>(null);

  useEffect(() => {
    const processUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const path = parsed.path || '';
        const hostname = parsed.hostname || '';
        const full = `${hostname}/${path}`;

        if (full.includes('convite')) {
          const segments = full.split('/').filter(Boolean);
          const conviteIndex = segments.indexOf('convite');
          if (conviteIndex !== -1 && segments[conviteIndex + 1]) {
            const token = segments[conviteIndex + 1];
            setInviteToken(token);
            setTelaAtual('AcceptInvite');
            return;
          }
        }

        const tokenQuery = parsed.queryParams?.token;
        if (typeof tokenQuery === 'string' && tokenQuery) {
          setInviteToken(tokenQuery);
          setTelaAtual('AcceptInvite');
        }
      } catch (err) {
        console.warn('[App] Erro ao processar deep link:', err instanceof Error ? err.message : err);
      }
    };

    Linking.getInitialURL().then(processUrl);
    const subscription = Linking.addEventListener('url', (event) => {
      processUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      case 'TwoFactorAuth':
        return <TwoFactorAuthScreen onNavigate={setTelaAtual} />;
      case 'ElderlyMode':
        return <ElderlyModeScreen onNavigate={setTelaAtual} />;
      case 'ElderlyProfile':
        return (
          <ElderlyProfileScreen
            onNavigate={setTelaAtual}
            idosoId={idosoSelecionadoId}
            accessRole={papelAcessoAtual}
          />
        );
      case 'Home':
        return (
          <HomeScreen
            onNavigate={setTelaAtual}
            onSelectElderly={setIdosoSelecionadoId}
          />
        );
      case 'Medicines':
        return <MedicinesScreen onNavigate={setTelaAtual} />;
      case 'Family':
        return <FamilyScreen onNavigate={setTelaAtual} idosoId={idosoSelecionadoId} />;
      case 'EmergencyContacts':
        return <EmergencyContactsScreen onNavigate={setTelaAtual} />;
      case 'AcceptInvite':
        return (
          <AcceptInviteScreen
            onNavigate={setTelaAtual}
            inviteToken={inviteToken || 'token-exemplo'}
            isAuthenticated={Boolean(usuarioLogado)}
            currentUser={usuarioLogado}
          />
        );
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

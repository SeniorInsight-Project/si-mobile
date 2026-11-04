import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import OnboardingScreen from './src/screens/OnboardingScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import ElderlyModeScreen from './src/screens/ElderlyModeScreen';
import ElderlyProfileScreen from './src/screens/ElderlyProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import AcessoRestritoScreen from './src/screens/AcessoRestritoScreen';
import AcceptInviteScreen, { UsuarioLogado } from './src/screens/AcceptInviteScreen';
import {
  aoEncerrarSessao,
  decodificarJwt,
  obterAccessTokenValido,
  papeisDoToken,
  sair,
  telaInicialPorPapeis,
} from './src/services/authSession';
import { apiClient, ApiError } from './src/services/apiClient';

/** Schema Perfil do contrato identity-v1 (GET /api/v1/identity/me). */
interface PerfilIdentity {
  id: string;
  tipo: string;
  nome: string;
  email: string | null;
}

export default function App() {
  const [telaAtual, setTelaAtual] = useState<string>('Onboarding');
  const [restaurandoSessao, setRestaurandoSessao] = useState<boolean>(true);
  const [idosoSelecionadoId, setIdosoSelecionadoId] = useState<string>('e3b0c442-98fc-1c14-9afc-432100000001');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLogado | null>(null);
  const conviteRef = useRef<string | null>(null);

  // TODO: o papel do usuário em relação ao idoso (ADMIN, membro...) vem do si-care.
  // Por ora deriva do token: familiar -> ADMIN.
  const papeis: string[] = usuarioLogado?.papeis ?? [];
  const papelAcessoAtual = papeis.includes('familiar') ? 'ADMIN' : papeis.includes('idoso') ? 'IDOSO' : '';

  /**
   * Com token válido: busca o perfil e abre a tela do papel. Retorna false se não há sessão.
   */
  const entrarComSessaoSalva = useCallback(async (): Promise<boolean> => {
    const token = await obterAccessTokenValido();
    if (!token) return false;

    const claims = decodificarJwt(token) ?? {};
    const papeisToken = papeisDoToken(token);

    let perfil: PerfilIdentity | null = null;
    try {
      perfil = await apiClient.get<PerfilIdentity>('/api/v1/identity/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      // 404 (idoso ainda sem perfil), sem rede etc.: segue com os dados do token.
      console.warn('[App] Não foi possível carregar o perfil:', (err as Error)?.message);
    }

    setUsuarioLogado({
      id: perfil?.id ?? claims.sub,
      tipo: perfil?.tipo,
      nome: perfil?.nome ?? claims.name ?? claims.preferred_username,
      email: perfil?.email ?? claims.email ?? null,
      papeis: papeisToken,
    });
    setTelaAtual(conviteRef.current ? 'AcceptInvite' : telaInicialPorPapeis(papeisToken));
    return true;
  }, []);

  useEffect(() => {
    entrarComSessaoSalva()
      .catch((err) => console.warn('[App] Falha ao restaurar a sessão:', err?.message))
      .finally(() => setRestaurandoSessao(false));
  }, [entrarComSessaoSalva]);

  // Logout ou refresh token recusado: volta ao Login.
  useEffect(
    () =>
      aoEncerrarSessao(() => {
        conviteRef.current = null;
        setInviteToken(null);
        setUsuarioLogado(null);
        setTelaAtual('Login');
      }),
    [],
  );

  const handleLogout = useCallback(() => {
    sair().catch((err) => console.warn('[App] Falha ao sair:', err?.message));
  }, []);

  const handleLoginConcluido = useCallback(() => {
    entrarComSessaoSalva()
      .then((ok) => {
        if (!ok) setTelaAtual('Login');
      })
      .catch((err) => console.warn('[App] Falha ao carregar a sessão após o login:', err?.message));
  }, [entrarComSessaoSalva]);

  useEffect(() => {
    const abrirConvite = (token: string) => {
      conviteRef.current = token;
      setInviteToken(token);
      setTelaAtual('AcceptInvite');
    };

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
            abrirConvite(segments[conviteIndex + 1]);
            return;
          }
        }

        const tokenQuery = parsed.queryParams?.token;
        if (typeof tokenQuery === 'string' && tokenQuery) {
          abrirConvite(tokenQuery);
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
        return <LoginScreen onNavigate={setTelaAtual} onLoginConcluido={handleLoginConcluido} />;
      case 'AcessoRestrito':
        return <AcessoRestritoScreen onLogout={handleLogout} />;
      case 'ElderlyMode':
        return <ElderlyModeScreen onNavigate={setTelaAtual} onLogout={handleLogout} />;
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
            onLogout={handleLogout}
          />
        );
      case 'Medicines':
        return <MedicinesScreen onNavigate={setTelaAtual} />;
      case 'Family':
        return (
          <FamilyScreen
            onNavigate={setTelaAtual}
            idosoId={idosoSelecionadoId}
            isFamiliarAdmin={papelAcessoAtual === 'ADMIN'}
            papelAcesso={papelAcessoAtual}
          />
        );
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
      {restaurandoSessao ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#D83729" />
        </View>
      ) : (
        renderScreen()
      )}
    </>
  );
}

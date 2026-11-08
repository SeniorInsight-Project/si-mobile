import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ConfirmarEmailScreen from './src/screens/ConfirmarEmailScreen';
import ElderlyModeScreen from './src/screens/ElderlyModeScreen';
import ElderlyProfileScreen from './src/screens/ElderlyProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import AcessoRestritoScreen from './src/screens/AcessoRestritoScreen';
import AcceptInviteScreen, { UsuarioLogado } from './src/screens/AcceptInviteScreen';
import EntryAppScreen from './src/screens/EntryAppScreen';
import ElderlyQrScanScreen from './src/screens/ElderlyQrScanScreen';
import ElderlyEnterCodeScreen from './src/screens/ElderlyEnterCodeScreen';
import ElderlyConnectedScreen from './src/screens/ElderlyConnectedScreen';
import RegisterElderlyScreen from './src/screens/RegisterElderlyScreen';
import PairingCodeScreen from './src/screens/PairingCodeScreen';
import AlertsCenterScreen from './src/screens/AlertsCenterScreen';
import SosReceivedScreen from './src/screens/SosReceivedScreen';
import DeleteAccountScreen from './src/screens/DeleteAccountScreen';
import ElderlyDataScreen from './src/screens/ElderlyDataScreen';
import ElderlyWatchScreen from './src/screens/ElderlyWatchScreen';
import { PapelProvider } from './src/context/PapelContext';
import { IdosoProvider } from './src/context/IdosoContext';
import { PapelApp, resolverNavegacao } from './src/services/acessoService';
import { ResultadoPareamento, codigoDoDeepLink } from './src/services/pareamentoService';
import { obterAparelhoPareado } from './src/services/aparelhoPareadoService';
import { Idoso } from './src/services/elderlyService';
import {
  aoEncerrarSessao,
  decodificarJwt,
  obterAccessTokenValido,
  papeisDoToken,
  sair,
  telaInicialPorPapeis,
  type DesfechoAutenticacao,
} from './src/services/authSession';
import { apiClient, ApiError } from './src/services/apiClient';

/** Schema Perfil do contrato identity-v1 (GET /api/v1/identity/me). */
interface PerfilIdentity {
  id: string;
  tipo: string;
  nome: string;
  email: string | null;
}

// Planos Free/Premium ficam fora desta entrega; sem tela de assinatura, nenhuma assinatura está ativa.
const ASSINATURA_ATIVA = false;

export default function App() {
  const [telaAtual, setTelaAtual] = useState<string>('Onboarding');
  const [restaurandoSessao, setRestaurandoSessao] = useState<boolean>(true);
  const [idosoSelecionadoId, setIdosoSelecionadoId] = useState<string | null>(null);
  const [nomeIdosoSelecionado, setNomeIdosoSelecionado] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLogado | null>(null);
  const conviteRef = useRef<string | null>(null);
  // Há sessão neste aparelho? Um link de pareamento nunca troca uma sessão existente (ex.: celular do familiar).
  const sessaoAtivaRef = useRef<boolean>(false);
  // Código vindo do deep link seniorinsight://pareamento?codigo=..., resgatado pela tela de código.
  const [codigoDoLink, setCodigoDoLink] = useState<string | null>(null);

  // TODO: o papel do usuário em relação ao idoso (ADMIN, membro...) vem do si-care.
  // Por ora deriva do token: familiar -> ADMIN.
  const papeis: string[] = usuarioLogado?.papeis ?? [];
  const papelAcessoAtual = papeis.includes('familiar') ? 'ADMIN' : papeis.includes('idoso') ? 'IDOSO' : '';
  // Papel de visão (RN-011): vem sempre do token, nunca de um botão. Mesma prioridade de telaInicialPorPapeis.
  const papel: PapelApp | null = papeis.includes('idoso') ? 'IDOSO' : papeis.includes('familiar') ? 'FAMILIAR' : null;
  const [pareamento, setPareamento] = useState<ResultadoPareamento | null>(null);
  const [idosoRecemCadastrado, setIdosoRecemCadastrado] = useState<Idoso | null>(null);
  const [primeiroUsoIdoso, setPrimeiroUsoIdoso] = useState<boolean>(false);
  const [alarmeSelecionadoId, setAlarmeSelecionadoId] = useState<string | null>(null);

  /**
   * Com token válido: busca o perfil e abre a tela do papel. Retorna false se não há sessão.
   */
  const entrarComSessaoSalva = useCallback(async (): Promise<boolean> => {
    const token = await obterAccessTokenValido();
    if (!token) return false;

    const claims = decodificarJwt(token) ?? {};
    const papeisToken = papeisDoToken(token);
    // Aparelho do idoso já pareado (HU-007): abre sempre no Modo Idoso; o papel continua vindo do token.
    const pareado = papeisToken.includes('idoso') ? await obterAparelhoPareado() : null;

    let perfil: PerfilIdentity | null = null;
    try {
      perfil = await apiClient.get<PerfilIdentity>('/api/v1/identity/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      // 404 (idoso ainda sem perfil), sem rede etc.: segue com os dados do token.
      console.warn('[App] Não foi possível carregar o perfil:', (err as Error)?.message);
    }

    sessaoAtivaRef.current = true;
    setCodigoDoLink(null);

    setUsuarioLogado({
      id: perfil?.id ?? pareado?.perfilId ?? claims.sub,
      tipo: perfil?.tipo ?? (pareado ? 'IDOSO' : undefined),
      nome: perfil?.nome ?? pareado?.nome ?? claims.name ?? claims.preferred_username,
      email: perfil?.email ?? claims.email ?? null,
      papeis: papeisToken,
    });
    if (pareado) {
      conviteRef.current = null;
      setIdosoSelecionadoId(pareado.idosoId || pareado.perfilId);
      setNomeIdosoSelecionado(pareado.nome);
      setTelaAtual('ElderlyMode');
      return true;
    }
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
        sessaoAtivaRef.current = false;
        setCodigoDoLink(null);
        setInviteToken(null);
        setUsuarioLogado(null);
        setPareamento(null);
        setPrimeiroUsoIdoso(false);
        setIdosoSelecionadoId(null);
        setNomeIdosoSelecionado(null);
        setTelaAtual('EntryApp');
      }),
    [],
  );

  const handleLogout = useCallback(() => {
    sair().catch((err) => console.warn('[App] Falha ao sair:', err?.message));
  }, []);

  // Aparelho do idoso pareado: a sessão já foi salva (resgate devolve os tokens) e o papel vem do token.
  const handlePareado = useCallback((resultado: ResultadoPareamento) => {
    sessaoAtivaRef.current = true;
    setCodigoDoLink(null);
    setPareamento(resultado);
    setIdosoSelecionadoId(resultado.idosoId || resultado.perfilId);
    setNomeIdosoSelecionado(resultado.nomeIdoso);
    setUsuarioLogado({
      id: resultado.perfilId,
      tipo: 'IDOSO',
      nome: resultado.nomeIdoso,
      email: null,
      papeis: resultado.papeis,
    });
    setPrimeiroUsoIdoso(true);
  }, []);

  // Telas chamam onNavigate('Logout') para sair; a saída de verdade é o sair() da sessão.
  const navegar = useCallback(
    (destino: string) => {
      if (destino === 'Logout') {
        handleLogout();
        return;
      }
      setTelaAtual(destino);
    },
    [handleLogout],
  );

  const handleLoginConcluido = useCallback(() => {
    entrarComSessaoSalva()
      .then((ok) => {
        if (!ok) setTelaAtual('Login');
      })
      .catch((err) => console.warn('[App] Falha ao carregar a sessão após o login:', err?.message));
  }, [entrarComSessaoSalva]);

  // Volta do Keycloak (login ou cadastro). Com sessão, o GET /identity/me cria o perfil no
  // primeiro acesso (user.created) e leva à tela do papel; sem e-mail confirmado, pede a confirmação.
  const handleDesfechoAutenticacao = useCallback(
    (desfecho: DesfechoAutenticacao) => {
      if (desfecho === 'sessao') handleLoginConcluido();
      else if (desfecho === 'confirmar-email') setTelaAtual('ConfirmarEmail');
    },
    [handleLoginConcluido],
  );

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

        // QR lido pela câmera do sistema: seniorinsight://pareamento?codigo=XXXXXX (HU-007).
        const codigoPareamento = codigoDoDeepLink(parsed);
        if (codigoPareamento) {
          if (sessaoAtivaRef.current) {
            console.warn('[App] Link de pareamento ignorado: este aparelho já tem uma sessão.');
            return;
          }
          setCodigoDoLink(codigoPareamento);
          setTelaAtual('ElderlyEnterCode');
          return;
        }

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
    // A guarda roda na renderização: o idoso nunca vê telas do familiar (nem por botão ou deep link).
    const telaEfetiva = resolverNavegacao(papel, telaAtual);
    switch (telaEfetiva) {
      case 'Onboarding':
        return <OnboardingScreen onNavigate={navegar} />;
      case 'Login':
        return <LoginScreen onDesfecho={handleDesfechoAutenticacao} />;
      case 'ConfirmarEmail':
        return <ConfirmarEmailScreen onNavigate={navegar} onDesfecho={handleDesfechoAutenticacao} />;
      case 'EntryApp':
        return <EntryAppScreen onNavigate={navegar} onDesfecho={handleDesfechoAutenticacao} />;
      case 'ElderlyQrScan':
        return <ElderlyQrScanScreen onNavigate={navegar} onPareado={handlePareado} />;
      case 'ElderlyEnterCode':
        return (
          <ElderlyEnterCodeScreen
            onNavigate={navegar}
            onPareado={handlePareado}
            codigoInicial={codigoDoLink}
            onCodigoInicialUsado={() => setCodigoDoLink(null)}
          />
        );
      case 'ElderlyConnected':
        return <ElderlyConnectedScreen onNavigate={navegar} pareamento={pareamento} />;
      case 'ElderlyData':
        return <ElderlyDataScreen onNavigate={navegar} primeiroUso={primeiroUsoIdoso} />;
      case 'ElderlyWatch':
        return (
          <ElderlyWatchScreen
            onNavigate={(destino) => {
              if (destino === 'ElderlyMode') setPrimeiroUsoIdoso(false);
              navegar(destino);
            }}
            primeiroUso={primeiroUsoIdoso}
          />
        );
      case 'RegisterElderly':
        return (
          <RegisterElderlyScreen
            onNavigate={navegar}
            onCadastrado={(idoso) => {
              setIdosoRecemCadastrado(idoso);
              setIdosoSelecionadoId(idoso.idosoId);
              setNomeIdosoSelecionado(idoso.nome);
            }}
          />
        );
      case 'PairingCode':
        return (
          <PairingCodeScreen
            onNavigate={navegar}
            idosoId={idosoRecemCadastrado?.idosoId ?? idosoSelecionadoId ?? undefined}
            nomeIdoso={idosoRecemCadastrado?.nome ?? nomeIdosoSelecionado ?? ''}
          />
        );
      case 'Alerts':
        return (
          <AlertsCenterScreen
            onNavigate={navegar}
            idosoId={idosoSelecionadoId ?? undefined}
            onAbrirSos={(alarmeId) => {
              setAlarmeSelecionadoId(alarmeId);
              setTelaAtual('SosReceived');
            }}
          />
        );
      case 'SosReceived':
        return (
          <SosReceivedScreen
            onNavigate={navegar}
            idosoId={idosoSelecionadoId ?? undefined}
            alarmeId={alarmeSelecionadoId}
          />
        );
      case 'DeleteAccount':
        return <DeleteAccountScreen onNavigate={navegar} assinaturaAtiva={ASSINATURA_ATIVA} />;
      case 'AcessoRestrito':
        return <AcessoRestritoScreen onLogout={handleLogout} />;
      case 'ElderlyMode':
        return <ElderlyModeScreen onNavigate={navegar} onLogout={handleLogout} idosoId={idosoSelecionadoId ?? undefined} />;
      case 'ElderlyProfile':
        return (
          <ElderlyProfileScreen
            onNavigate={navegar}
            idosoId={idosoSelecionadoId ?? undefined}
            accessRole={papelAcessoAtual}
            familiarId={usuarioLogado?.id}
          />
        );
      case 'Home':
        return (
          <HomeScreen
            onNavigate={navegar}
            onSelectElderly={(id) => setIdosoSelecionadoId(id)}
            onLogout={handleLogout}
            familiarId={usuarioLogado?.id}
          />
        );
      case 'Medicines':
        return <MedicinesScreen onNavigate={navegar} idosoId={idosoSelecionadoId ?? undefined} />;
      case 'Family':
        return (
          <FamilyScreen
            onNavigate={navegar}
            idosoId={idosoSelecionadoId ?? undefined}
            isFamiliarAdmin={papelAcessoAtual === 'ADMIN'}
            papelAcesso={papelAcessoAtual}
          />
        );
      case 'EmergencyContacts':
        return <EmergencyContactsScreen onNavigate={navegar} idosoId={idosoSelecionadoId ?? undefined} />;
      case 'AcceptInvite':
        return (
          <AcceptInviteScreen
            onNavigate={navegar}
            inviteToken={inviteToken || 'token-exemplo'}
            isAuthenticated={Boolean(usuarioLogado)}
            currentUser={usuarioLogado}
            onDesfecho={handleDesfechoAutenticacao}
          />
        );
      default:
        return <OnboardingScreen onNavigate={navegar} />;
    }
  };

  return (
    <PapelProvider value={papel}>
      <IdosoProvider
        value={{
          idosoId: idosoSelecionadoId,
          setIdosoId: setIdosoSelecionadoId,
          nomeIdoso: nomeIdosoSelecionado,
          setNomeIdoso: setNomeIdosoSelecionado,
        }}
      >
        <StatusBar style="auto" />
        {restaurandoSessao ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#D83729" />
          </View>
        ) : (
          renderScreen()
        )}
      </IdosoProvider>
    </PapelProvider>
  );
}

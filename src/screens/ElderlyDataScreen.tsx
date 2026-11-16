import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import ToggleSwitch from '../components/ToggleSwitch';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, typography, shadows, font, rounded } from '../theme';
import { useIdoso } from '../context/IdosoContext';
import { usePapel } from '../context/PapelContext';
import {
  CONSENTIMENTO_PADRAO,
  ConsentimentoError,
  Consentimentos,
  TipoDado,
  mensagemParaFamilia,
  obterConsentimentos,
  salvarConsentimentos,
  statusMonitoramento,
} from '../services/consentimentoService';

export interface ElderlyDataScreenProps {
  onNavigate: (screen: string) => void;
  /** Logo após parear: o botão segue para o passo do relógio. */
  primeiroUso?: boolean;
}

interface LinhaDado {
  tipo: TipoDado;
  titulo: string;
  detalhe: string;
  icon: string;
}

const LINHAS_SAUDE: LinhaDado[] = [
  { tipo: 'BATIMENTOS', titulo: 'Batimentos', detalhe: 'Frequência cardíaca', icon: 'favorite' },
  { tipo: 'PASSOS', titulo: 'Passos', detalhe: 'Quanto você anda no dia', icon: 'directions_walk' },
  { tipo: 'SONO', titulo: 'Sono', detalhe: 'Horas dormidas', icon: 'bedtime' },
  { tipo: 'OXIGENACAO', titulo: 'Oxigenação', detalhe: 'SpO2 do sangue', icon: 'water_drop' },
];

/** Figma: "Idoso - Autorizar meus dados" (HU-018, HU-019, RN-001). Só o idoso chega aqui. */
export default function ElderlyDataScreen({ onNavigate, primeiroUso = false }: ElderlyDataScreenProps) {
  const papel = usePapel();
  // TODO(care#111): cadastro de curatela — quando existir no back, liberar edição para familiar curador autorizado
  const isFamiliar = papel !== 'IDOSO';
  const [consentimentos, setConsentimentos] = useState<Consentimentos>(CONSENTIMENTO_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  // Idoso do care-service (do pareamento). Sem ele, o service devolve o pedido de novo pareamento.
  const { idosoId } = useIdoso();

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga('');
    try {
      setConsentimentos(await obterConsentimentos(idosoId));
    } catch (e) {
      setErroCarga(e instanceof ConsentimentoError ? e.message : 'Não foi possível carregar suas escolhas agora.');
    } finally {
      setCarregando(false);
    }
  }, [idosoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternar = (tipo: TipoDado, valor: boolean) => {
    setConsentimentos((atual) => ({ ...atual, [tipo]: valor }));
    setAviso('');
  };

  const confirmar = async () => {
    if (salvando) return;
    setSalvando(true);
    setAviso('');
    try {
      await salvarConsentimentos(idosoId, consentimentos);
    } catch (e) {
      // não segue em frente: escolha de dados que não foi gravada não vale
      setAviso(e instanceof ConsentimentoError ? e.message : 'Não foi possível salvar suas escolhas agora.');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    if (primeiroUso) {
      onNavigate('ElderlyWatch');
      return;
    }
    setAviso('Escolhas salvas. Sua família já vê o que está desligado.');
  };

  const pausado = statusMonitoramento(consentimentos) === 'PAUSADO';

  return (
    <ScreenWrapper>
      <AppHeader title="Meus Dados" onNavigate={onNavigate} onPressLogo={() => onNavigate('ElderlyData')} />
      <ScrollView contentContainerStyle={styles.content}>
        {isFamiliar && (
          <View style={styles.curatelaBanner} testID="aviso-curatela-familiar">
            <Icon name="gavel" size={20} color={colors.coralDark} />
            <Text style={styles.curatelaBannerText}>
              Somente o idoso pode autorizar o uso dos próprios dados. Familiares sem curatela registrada não podem alterar essas escolhas.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.title}>Você decide o que compartilhar</Text>
          <Text style={styles.body}>
            Só o que você ligar aqui é lido do seu relógio. Você pode mudar quando quiser.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>DADOS DE SAÚDE</Text>
          {carregando ? (
            <ActivityIndicator color={colors.primary} />
          ) : erroCarga ? (
            <View style={styles.erroCarga} testID="dados-erro">
              <Text style={styles.erroCargaTexto}>{erroCarga}</Text>
              <Button
                title="Tentar de novo"
                variant="secondary"
                iconLeft="refresh"
                fullWidth={false}
                onPress={carregar}
                testID="dados-tentar-de-novo"
              />
            </View>
          ) : (
            LINHAS_SAUDE.map((linha) => (
              <View key={linha.tipo} style={styles.row}>
                <View style={[styles.rowIcon, consentimentos[linha.tipo] ? styles.rowIconOn : styles.rowIconOff]}>
                  <Icon
                    name={linha.icon}
                    size={22}
                    color={consentimentos[linha.tipo] ? colors.successDark : colors.textSecondary}
                  />
                </View>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>{linha.titulo}</Text>
                  <Text style={styles.rowSub}>{linha.detalhe}</Text>
                </View>
                <ToggleSwitch
                  value={consentimentos[linha.tipo]}
                  onValueChange={(v) => alternar(linha.tipo, v)}
                  accessibilityLabel={`${linha.titulo}: ${consentimentos[linha.tipo] ? 'ligado' : 'desligado'}`}
                  testID={`dados-${linha.tipo.toLowerCase()}`}
                />
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>LOCALIZAÇÃO</Text>
          <View style={styles.row}>
            <View style={[styles.rowIcon, consentimentos.LOCALIZACAO ? styles.rowIconOn : styles.rowIconOff]}>
              <Icon
                name="location_on"
                size={22}
                color={consentimentos.LOCALIZACAO ? colors.successDark : colors.textSecondary}
              />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Compartilhar sempre</Text>
              <Text style={styles.rowSub}>Sua família vê onde você está o tempo todo</Text>
            </View>
            <ToggleSwitch
              value={consentimentos.LOCALIZACAO}
              onValueChange={(v) => alternar('LOCALIZACAO', v)}
              accessibilityLabel={`Localização sempre: ${consentimentos.LOCALIZACAO ? 'ligada' : 'desligada'}`}
              testID="dados-localizacao"
              disabled={carregando || Boolean(erroCarga)}
            />
          </View>
          {!consentimentos.LOCALIZACAO && (
            <View style={styles.sosNote}>
              <Text style={styles.sosTag}>SOS</Text>
              <Text style={styles.sosNoteText}>
                Desligada: sua localização só é enviada quando você aciona o SOS e para de ser enviada quando o
                chamado termina.
              </Text>
            </View>
          )}
        </View>

        {pausado && !carregando && (
          <View style={styles.pauseNote} testID="dados-pausado">
            <Icon name="info" size={18} color={colors.amber.textDark} />
            <Text style={styles.pauseText}>{mensagemParaFamilia(consentimentos)}. Ligue um dado para voltar.</Text>
          </View>
        )}

        <View style={styles.info}>
          <Icon name="shield_check" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Só você pode autorizar o uso dos seus dados. Sua família vê aqui o que está desligado.
          </Text>
        </View>

        {Boolean(aviso) && (
          <Text style={styles.saved} testID="dados-aviso">
            {aviso}
          </Text>
        )}

        <Button
          title={primeiroUso ? 'Confirmar e continuar' : 'Salvar escolhas'}
          variant="success"
          size="xl"
          loading={salvando}
          disabled={salvando || carregando || Boolean(erroCarga)}
          onPress={confirmar}
          testID="dados-confirmar"
        />

        <Button
          title="Excluir minha conta e meus dados"
          variant="ghost"
          iconLeft="delete"
          onPress={() => onNavigate('DeleteAccount')}
          testID="dados-excluir-conta"
        />

        <Button
          title="Sair deste celular"
          variant="ghost"
          iconLeft="logout"
          onPress={() => onNavigate('Logout')}
          testID="dados-sair"
        />
      </ScrollView>
      <BottomNavBar currentScreen="ElderlyData" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  curatelaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.peachBg,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: rounded.lg,
    padding: 16,
  },
  curatelaBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.coralDark,
    ...font('body', 700),
  },
  card: { backgroundColor: colors.white, borderRadius: rounded.xl, padding: 20, gap: 4, ...shadows.tier1 },
  title: { fontSize: 24, lineHeight: 30,  color: colors.primary, ...font('heading', 800) },
  body: { marginTop: 6, fontSize: 16, lineHeight: 24, color: colors.textPrimary, ...font('body', 400) },
  eyebrow: { fontSize: 14,  color: colors.textSecondary, marginBottom: 8, ...font('body', 600) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  rowIcon: { width: 48, height: 48, borderRadius: rounded.full, alignItems: 'center', justifyContent: 'center' },
  rowIconOn: { backgroundColor: colors.mintBg },
  rowIconOff: { backgroundColor: colors.surfaceSubtle },
  rowTexts: { flex: 1 },
  rowTitle: { fontSize: 18,  color: colors.primary, ...font('heading', 700) },
  rowSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, ...font('body', 400) },
  sosNote: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.md, backgroundColor: colors.peachBg, marginTop: 8 },
  sosTag: { fontSize: 14,  color: colors.coralDark, ...font('heading', 800) },
  sosNoteText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.coralDark, ...font('body', 400) },
  pauseNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  pauseText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.amber.textDark, ...font('body', 400) },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.skyBg },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primary, ...font('body', 400) },
  saved: { fontSize: 16,  color: colors.successDark, ...font('body', 700) },
  primary: { minHeight: 56, borderRadius: rounded.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  disabled: { opacity: 0.7 },
  erroCarga: { gap: 12, alignItems: 'center', paddingVertical: 8 },
  erroCargaTexto: { fontSize: 16, lineHeight: 24,  textAlign: 'center', color: colors.coralDark, ...font('body', 700) },
  tentar: { minHeight: 48, paddingHorizontal: 24, borderRadius: rounded.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tentarTexto: { fontSize: 16,  color: colors.white, ...font('heading', 700) },
  logout: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 16,  color: colors.textSecondary, ...font('body', 600) },
});

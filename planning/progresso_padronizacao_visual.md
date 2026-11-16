# Progresso — Padronização Visual (`si-mobile`)

> **Branch:** `ui-padronizacao-visual`
> **Plano de referência:** [plano_padronizacao_visual.md](./plano_padronizacao_visual.md)

## Observação sobre `DESIGN.md`

- O arquivo `DESIGN.md` referenciado no `../AGENTS.md` (caminho de Windows) **não existe** neste repositório.
- Conforme definido na Etapa 1, não foi criado um `DESIGN.md` novo; até o usuário decidir em contrário, **`src/theme/index.ts` é a referência oficial dos tokens visuais**.

---

## Etapa 1 — Tema consolidado (`16/11/2026`)

- **Status:** Concluída
- **Arquivos alterados/criados:**
  - `src/theme/index.ts`:
    - Mantidos os valores canônicos (`primary` `#072369`, `primaryNavy` `#253B80`, `coral` `#FA5D4B`, `coralDark` `#B32A1E`, `error` `#BA1A1A`).
    - Resolvida a divergência `peach.text` (`#991B1B`) e `peachText` (`#991B1B`, contraste `7.23:1` sobre `#FFEBE5`), além de ajustados `mint.text` (`#047857`, `4.99:1`), `sky.text` (`#0369A1`, `5.25:1`), `amber.text` (`#92400E`, `6.70:1`) e `successDark` (`#047857`, `5.48:1` sobre branco) para garantir contraste WCAG AA (`>= 4.5:1`), com os aliases planos sincronizados.
    - Adicionados `overlay` (`rgba(7, 35, 105, 0.45)`), `infoSurface` (`#EBF5FF`) e `disabled` (`#CBD5E1`).
    - Aliases duplicados (`navy`, `navyLight`, `primaryContainer`, `secondary`, `secondaryCoral`, `secondaryCoralBright`, `secondaryContainer`, `canvasCard`, `onSurface`, `slate400`, `slate100`, `borderLight`, `errorBright`) marcados com `/** @deprecated use colors.X */` sem remoção.
    - Tipografia: `labelMd` (`14 px`) e `labelSm` (`14 px`, `textTransform: 'uppercase'`, `letterSpacing: 0.5`).
    - Raios: `rounded.sm = 8`, `rounded.sheet = rounded.xl` (`20`), comentários de uso em cada token.
    - Sombras: `tier1`–`tier3` com `shadowColor: '#072369'` e `shadows.sos` coral (`#FA5D4B`).
    - Tamanhos: `sizes = { touchMin: 48, button: { md: 52, lg: 56, xl: 64 }, iconButton: 48, input: 52 }`.
  - `src/theme/legacyColorMap.ts`: mapa de referência cobrindo todos os hex de `src/screens` e `src/components` (sem import em runtime nas telas).
  - `src/services/__tests__/temaDesign.test.ts`: testes de tipografia >= 14 px, contraste WCAG AA, sincronização dos pastéis e `sizes.touchMin >= 48`.
- **Pendências para próximas etapas:**
  - Etapa 2: instalar `@expo-google-fonts/plus-jakarta-sans`, `@expo-google-fonts/inter` e `expo-font`, carregar fontes no `App.tsx` e rodar codemod de `fontWeight`.
  - Nenhuma tela foi alterada nesta etapa.

---

## Etapa 2 — Fontes e tipografia por peso (`16/11/2026`)

- **Status:** Concluída
- **Arquivos alterados/criados:**
  - `package.json` / `package-lock.json` / `app.json` (se atualizado pelo Expo): instalados `expo-font`, `@expo-google-fonts/plus-jakarta-sans` e `@expo-google-fonts/inter`.
  - `App.tsx`: carregamento das fontes com `useFonts` (Plus Jakarta Sans 600, 700, 800 e Inter 400, 500, 600, 700), reaproveitando o `ActivityIndicator` durante o carregamento e seguindo com a fonte do sistema em caso de erro (`RN-014`).
  - `src/theme/index.ts`: exportados `fonts` e `font(kind, weight)`, e atualizados os estilos de `typography` (`displayLg` a `metricDisplay`) para usar `font(...)`.
  - `scripts/codemod-fontes.mjs`: codemod AST em TypeScript que transformou 522 estilos em 48 arquivos `.tsx` (23 aproximações de peso anotadas, 0 casos ambíguos), adicionando `import { font } from '.../theme'`.
- **Pendências para próximas etapas:**
  - Etapa 3: criar componentes base (`Button`, `IconButton`, `ModalSheet`, `TextField`).

---

## Etapa 3 — Componentes base (`16/11/2026`)

- **Status:** Concluída
- **Arquivos criados/alterados:**
  - `src/components/buttonStyles.ts`: resolução pura de variantes (`primary`, `secondary`, `outline`, `ghost`, `danger`, `sos`, `success`), tamanhos (`md` 52, `lg` 56, `xl` 64, `ghost` >= 48) e estado `disabled` (`opacity: 0.5`).
  - `src/components/Button.tsx`: botão em pílula (`rounded.full`), `activeOpacity: 0.85`, `accessibilityRole="button"`, suporte a `loading` sem perder largura, `iconLeft`/`iconRight`.
  - `src/components/IconButton.tsx`: botão somente ícone `48×48` (`sizes.iconButton`), variantes `neutral`, `primary`, `danger`, `ghost`, `accessibilityLabel` obrigatório.
  - `src/components/ModalSheet.tsx`: folha inferior padrão com `colors.overlay`, `rounded.sheet`, `shadows.tier3`, `IconButton` de fechar 48 px, `ScrollView`, `KeyboardAvoidingView` no iOS e `SafeAreaView`.
  - `src/components/TextField.tsx`: campo de texto `52 dp` (`multiline` `minHeight: 96`), `rounded.input`, borda 1.5 (`colors.border` / foco `colors.primary` / erro `colors.error`), label `14 px` e texto `16 px`.
  - `src/components/InputField.tsx`: mantido como re-export de `TextField` para preservar `RegisterElderlyScreen`.
  - `src/services/__tests__/buttonStyles.test.ts`: testes de contraste WCAG AA (`>= 4.5:1`), alturas e comportamento de `disabled`.
- **Pendências para próximas etapas:**
  - Etapa 4: migrar as 7 telas de autenticação e onboarding.

---

## Etapa 4 — Autenticação e onboarding (`16/11/2026`)

- **Status:** Concluída
- **Arquivos migrados:**
  - `src/screens/OnboardingScreen.tsx`
  - `src/screens/LoginScreen.tsx`
  - `src/screens/TwoFactorAuthScreen.tsx`
  - `src/screens/ConfirmarEmailScreen.tsx`
  - `src/screens/AcessoRestritoScreen.tsx`
  - `src/screens/EntryAppScreen.tsx`
  - `src/screens/AcceptInviteScreen.tsx`
- **O que foi feito:** todos os hex/rgba substituídos por tokens do `src/theme`, CTAs migrados para `<Button variant="primary" size="lg">`, links para `<Button variant="ghost">`, voltar para `<IconButton>`, botão do idoso mantido em `variant="success" size="xl"`, títulos unificados em `typography.headlineLg` (26 px), nenhum texto < 14 px e nenhum `borderRadius` literal.
- **Pendências para próximas etapas:**
  - Etapa 5: migrar os 8 modais para `<ModalSheet>` e componentes base.

---

## Etapa 5 — Modais (`16/11/2026`)

- **Status:** Concluída
- **Arquivos migrados:**
  - `src/components/InviteMemberModal.tsx`
  - `src/components/InviteDoctorModal.tsx`
  - `src/components/AddMedicineModal.tsx`
  - `src/components/AddComorbidityModal.tsx`
  - `src/components/DeviceStatusModal.tsx`
  - `src/components/SemaforoMotivoModal.tsx` (exceção §2.10: card central com `colors.overlay`, `rounded.card` e `IconButton` 48 px)
  - `src/components/SosActiveModal.tsx` (exceção §2.10: tela cheia de emergência; "Ligar" em `primary`/`sos` `xl`, "Foi engano" em `outline` `xl`, sem alterar temporizadores)
  - Modal de novo contato em `src/screens/EmergencyContactsScreen.tsx` (o restante da tela permanece para a Etapa 6c)
- **Pendências para próximas etapas:**
  - Etapas 6a–6e: migração das telas principais e componentes restantes.

---

## Etapa 6a — Rede Familiar (`16/11/2026`)

- **Status:** Concluída
- **Arquivos alterados/removidos:**
  - `src/screens/FamilyScreen.tsx`: hex/rgba migrados para tokens (`176 → 0`), `fontSize < 14` corrigidos (`31 → 0`), raios e sombras migrados para `rounded.*` e `shadows.tier1`/`tier2`, CTAs de convite unificados em `<Button variant="primary">`, limites RN-012 com `disabled` (opacidade) e texto explicativo em `14 px colors.textSecondary`, ações pendentes em `<IconButton>` 48 px (`neutral`/`neutral`/`danger`), botões debug atrás de `__DEV__` com `variant="outline"`, `doctorRejectedBtn*` em `secondary`/`ghost` e `retryButton` em `secondary` com ícone `refresh`.
  - `src/components/FamilyMemberCard.tsx`: removido após confirmar com `grep` que não era importado em nenhum arquivo.
- **Pendências para próximas etapas:**
  - Etapas 6b–6e: Home, Remédios/Contatos, Modo Idoso/SOS e telas/componentes restantes.

---

## Etapa 6b — Home e navegação (`16/11/2026`)

- **Status:** Concluída
- **Arquivos migrados:**
  - `src/screens/HomeScreen.tsx` (`paywallButton` → `<Button variant="primary">`, `addElderlyButton` → `<Button variant="outline">`, removido emoji `🚨` de "Comando Assumido!", hex/rgba `142 → 0`, `fontSize < 14`: `29 → 0`).
  - `src/components/AppHeader.tsx` (`notificationButton` e `logoutButton` → `<IconButton>` 48 px, `logoButton` 48×48, subtítulo com `typography.labelSm`, hex `15 → 0`).
  - `src/components/BottomNavBar.tsx` (abas com toque >= 48×48, rótulos `14 px`, cor ativa `colors.primary` e inativa `colors.textMuted`, hex/rgba `9 → 0`).
  - `src/components/LiveGpsMap.tsx` e `src/components/LiveGpsMap.native.tsx` (`targetButton` → `<IconButton>` 48 px, hex/rgba `18 → 0`, `fontSize < 14`: `3 → 0`).
  - `src/components/RescueCommandCard.tsx` (`rescueButton` → `<Button size="xl" variant={resgateAtivo ? 'sos' : 'primary'}>`, hex `24 → 0`, `fontSize < 14`: `5 → 0`).
  - `src/components/SemIdosoCard.tsx` (botões → `<Button variant="primary">` + `<Button variant="ghost">`, hex `4 → 0`).
  - `src/components/WatchStatusCard.tsx` (hex `7 → 0`, `fontSize < 14`: `2 → 0`).
- **Pendências para próximas etapas:**
  - Etapas 6c–6e: Remédios/Contatos, Modo Idoso/SOS e telas/componentes restantes.

---

## Etapa 6c — Remédios e Contatos de emergência (`16/11/2026`)

- **Status:** Concluída
- **Arquivos migrados:**
  - `src/screens/MedicinesScreen.tsx` (removido `#F7F9FC`, `newMedicinePillBtn` → `<Button variant="primary" size="md" iconLeft="add" fullWidth={false}>`, hex `23 → 0`, `fontSize < 14`: `6 → 0`).
  - `src/components/MedicineTimelineCard.tsx` (editar/pausar/excluir → `<IconButton>` 48 px `neutral`/`neutral`/`danger`, pausado com `colors.mint.background`, status `TOMADO`/`PENDENTE`/`ATRASADO` com `mint`/`amber`/`peach`, hex/rgba `63 → 0`, `fontSize < 14`: `9 → 0`).
  - `src/components/TolerancePicker.tsx` (opções 10/15/30 min em chips de 48 px `rounded.full`, hex `11 → 0`, `fontSize < 14`: `3 → 0`).
  - `src/components/DayOfWeekSelector.tsx` (alvo `>= 48` e texto `>= 14 px`, hex `8 → 0`, `fontSize < 14`: `1 → 0`).
  - `src/screens/EmergencyContactsScreen.tsx` (`actionCallButton`/`actionDeleteButton` → `<IconButton>` 48 px `primary`/`danger`, `samuCallBtn` → `<Button variant="sos">`, `btnHeaderNovoContato` → `<Button variant="primary" size="md">`, ordenação/escalonamento SOS preservados, hex `20 → 0`, `fontSize < 14`: `19 → 0`).
- **Pendências para próximas etapas:**
  - Etapas 6d–6e: Modo Idoso/SOS e telas/componentes restantes.

---

## Etapa 6d — Modo Idoso, Perfil do Idoso e SOS (`16/11/2026`)

- **Status:** Concluída
- **Arquivos criados/alterados:**
  - `src/theme/index.ts`: adicionado `colors.coralPressed` (`#8C120A`).
  - `src/components/ChoiceChip.tsx`: componente reutilizável de seleção (48 dp, `rounded.full`, `colors.primary`/`colors.white`), usado em `TolerancePicker.tsx` e `ElderlyProfileScreen.tsx`.
  - `src/screens/ElderlyModeScreen.tsx`: `takenButton` → `<Button variant="success" size="xl">`, `viewRoutineButton` → `<Button variant="primary" size="xl">`, `audioButton` → `<IconButton>` 48 px, removidos emojis `🎉` e `🗣️`, hex/rgba `82 → 0`, `fontSize < 14`: `16 → 0`.
  - `src/components/SosHoldButton.tsx`: apenas cores e tamanhos via token (`coralDark`, `coralPressed`, `shadows.sos`, `disabled` via `opacity: 0.5`), sem alterar duração de 2 s, feedback tátil nem animação; hex/rgba `16 → 0`, `fontSize < 14`: `1 → 0`.
  - `src/screens/ElderlyProfileScreen.tsx`: `primarySaveButton` → `<Button variant="primary" size="lg">`, `secondaryHistoryButton` → `<Button variant="outline" size="lg">`, `addPillButton` (Adicionar/Editar) → `<Button variant="secondary" size="md">`, `sexButton` → `<ChoiceChip>`, inputs → `<TextField>`, hex/rgba `90 → 0`, `fontSize < 14`: `16 → 0`.
  - `src/components/ComorbidityChip.tsx`: botão fechar → `<IconButton variant="ghost">` 48 px, chip com `minHeight: 48`, hex `21 → 0`, `fontSize < 14`: `1 → 0`.
- **Pendências para próximas etapas:**
  - Etapa 6e: revisão das telas novas e componentes restantes.

---

## Etapa 6e — Revisão das telas novas e componentes restantes (`16/11/2026`)

- **Status:** Concluída
- **Arquivos atualizados:**
  - `src/components/Icon.tsx` (`color = colors.primary`) e `src/screens/ElderlyModeScreen.tsx` (`sosInnerButton` sem `rgba` literal).
  - `src/components/Checkbox.tsx` e `src/components/ToggleSwitch.tsx`: alvo `>= 48 dp` e tokens do tema.
  - `src/screens/PremiumScreen.tsx`, `AlertsCenterScreen.tsx`, `SosReceivedScreen.tsx`, `DeleteAccountScreen.tsx`, `ElderlyDataScreen.tsx`, `ElderlyWatchScreen.tsx`, `RegisterElderlyScreen.tsx`, `ElderlyConnectedScreen.tsx`, `ElderlyEnterCodeScreen.tsx`, `ElderlyQrScanScreen.tsx`, `src/components/CodigoPareamentoPainel.tsx`, `QrScanner.tsx`, `PairingCodeInput.tsx`: botões migrados para `<Button>`/`<IconButton>`/`<ChoiceChip>`, inputs migrados para `<TextField>` e aliases `@deprecated` substituídos.
  - `src/theme/index.ts`: removidos todos os aliases `@deprecated` sem uso (`navy`, `navyLight`, `primaryContainer`, `secondary`, `secondaryCoral`, `secondaryCoralBright`, `secondaryContainer`, `canvasCard`, `onSurface`, `slate400`, `slate100`, `borderLight`, `errorBright`, `typography.fontFamily`).
- **Pendências para próximas etapas:**
  - Etapa 7: guarda-corpo automático (`lint:estilo`).

---

## Etapa 7 — Guarda-corpo automático e documentação (`16/11/2026`)

- **Status:** Concluída
- **Arquivos criados/atualizados:**
  - `scripts/auditar-estilos.mjs`: auditor Node puro verificando 7 regras em `src/screens` e `src/components` (`hex-rgba-literal`, `font-size-min`, `border-radius-literal`, `font-family-literal`, `touch-target-min`, `emoji-ui`, `icon-import`), com suporte a `// estilo-ok: <motivo>` e resumo por regra.
  - `package.json`: adicionado script `"lint:estilo": "node scripts/auditar-estilos.mjs"`.
  - `.github/workflows/ci.yml`: adicionado passo `npm run lint:estilo` após `npm test`.
  - `README.md`: adicionada seção `## Padronização de UI`.
  - Limpeza final nas telas e componentes restantes para zerar todas as 92 ocorrências apontadas na primeira execução do auditor (hex remanescente em `ElderlyDataScreen.tsx`, estilos mortos de botões migrados, `borderRadius` literais → `rounded.*` e exceção comentada para badge informativo em `CodigoPareamentoPainel.tsx`).

---

## Etapa 8 — Verificação visual no aparelho (`16/11/2026`, parcial)

- **Ambiente:** build de desenvolvimento (`npx expo run:android`) num Galaxy SM-S942B por USB, Metro em `localhost:8089`, back local (gateway 8080, care 8082, identity 8083, Keycloak 8180) e `EXPO_PUBLIC_USAR_MOCK=true`. Usuário de teste em `planning/credenciais_teste_local.md` (fora do git).
- **Corrigido nesta etapa (sem commit):**

| Tela / componente | Problema visto no aparelho | Correção |
|---|---|---|
| `ModalSheet` (todos os modais) | Corpo não rolava até o fim e o rodapé (Salvar/Enviar) ficava fora da tela: não dava para salvar um remédio | `sheet`/`safeArea`/`body` com `flexShrink: 1` e `flexGrow: 0` no corpo |
| 17 cartões (Modo Idoso, Perfil, Família, Home, Remédios) | Raio 32 virou `rounded.full`: cartões viraram "estádios" e cortavam conteúdo | `rounded.card` |
| `Button` compacto (19 usos) | `alignSelf: 'flex-start'` fixo: links do Login à esquerda, botões de cabeçalho colados no topo | `alignSelf: 'center'`; "Salvar" do alarme falso mantém `flex-start` explícito |
| `Icon` | 12 nomes sem mapa caíam no "?" (Enviar Convite, Premium, SOS, 2FA…) | Mapeados + teste `iconesMapeados.test.ts` |
| Contatos de Emergência | Badge "Nº a ligar" invadido pelos botões de 48 dp | Linha do nome com `flexWrap` + `gap` nas ações |
| Família | Ações dos membros com 36 dp (lint não pegava `actionCircle`) | 48 dp (`sizes.iconButton`); lint passa a checar estilos `Action` |
| Modo Idoso / Comando de Resgate | Siglas de 14 px vazando de avatares de 24/28 px | Avatares de 32 px |
| Perfil do idoso | "TIPO SANGUÍNEO" em 2 linhas desalinhava os valores; chip selecionado apagado em modo leitura | `space-between` nos blocos; `ChoiceChip` só esmaece não selecionados |
| `AddMedicineModal`, `InviteMemberModal` | 3 estilos de seleção diferentes | Mesmo visual do `ChoiceChip` (navy sólido) |
| `TolerancePicker` | Ícone em pêssego | Âmbar (tolerância, AGENTS.md) |
| `authService` | `scheme` forçava `seniorinsight://auth` no Expo Go | `makeRedirectUri({ native: 'seniorinsight://auth', path: 'auth' })` (sugerido em commit separado) |

- **Telas vistas:** Onboarding, Login, Home, Remédios, Modo Idoso (SOS Idoso), Família, Cadastrar Idoso, Perfil do idoso, Central de Alertas, Premium, Contatos de Emergência; modais Novo Medicamento, Convidar Membro e Semáforo.
- **Não vistas:** 2FA, Confirmar e-mail, Aceitar convite, telas de pareamento do idoso (código/QR/conectado), Excluir conta, Dados do idoso, Relógio, SOS recebido, modais Convidar Médico, Comorbidade, Status do aparelho e SOS ativo (não disparei SOS).
- **Pendências (decisão de produto/design):**
  - Setas ↑↓ e alça de arrastar em Contatos com bem menos de 48 dp.
  - Erros de carga em alerta nativo do Android (Remédios mostra o UUID do idoso; Perfil) x erro inline (Central de Alertas).
  - Pastéis da Home: "Passos" em pêssego e "Batimento" em azul-céu (guia: pêssego = cardíaco). Já era assim antes da branch.
  - Textos: "Família Perfil" no Perfil do idoso, "Modo Idoso Alarme Sos", "Rotina De Remédios", "(HU-016)" visível na Família, "Perfil atual: ADMIN"; mistura de Title Case e frase nos botões; filtros da Central de Alertas em caixa alta x Família.
  - Badge "Especialista" em vermelho e cores de avatar/badge vindas de hex em `redeProtecaoService.ts`/mocks (fora do alcance do `lint:estilo`).
  - Modo Idoso mostra "Cadastrar Medicamento" para o idoso (RN-004: só o Familiar Administrador cadastra).

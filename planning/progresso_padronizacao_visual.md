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

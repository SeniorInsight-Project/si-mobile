#!/usr/bin/env bash
# Publica no Maven Local o SDK nativo Android do Open Wearables (com.openwearables.health:sdk).
#
# O SDK não está no Maven Central: o pacote open-wearables (React Native) declara a dependência
# e espera encontrá-la em ~/.m2. O plugin plugins/withMavenLocal.js põe mavenLocal() no
# android/build.gradle. Este script roda como hook eas-build-post-install, porque o servidor de
# build da EAS começa com o ~/.m2 vazio. Também serve para preparar uma máquina local.
#
# A versão é lida do build.gradle do pacote, para não sair de sincronia quando ele for atualizado.
set -euo pipefail

if [[ -n "${EAS_BUILD_PLATFORM:-}" && "${EAS_BUILD_PLATFORM}" != "android" ]]; then
  echo "[open-wearables] Build de ${EAS_BUILD_PLATFORM}: nada a publicar."
  exit 0
fi

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
gradle_pacote="${raiz}/node_modules/open-wearables/android/build.gradle"

versao="$(grep -oE 'com\.openwearables\.health:sdk:[0-9]+\.[0-9]+\.[0-9]+' "${gradle_pacote}" | head -1 | cut -d: -f3)"
if [[ -z "${versao}" ]]; then
  echo "[open-wearables] Não achei a versão do SDK em ${gradle_pacote}." >&2
  exit 1
fi

destino_m2="${HOME}/.m2/repository/com/openwearables/health/sdk/${versao}"
if [[ -d "${destino_m2}" ]]; then
  echo "[open-wearables] SDK ${versao} já está no Maven Local."
  exit 0
fi

trabalho="$(mktemp -d)"
trap 'rm -rf "${trabalho}"' EXIT

echo "[open-wearables] Publicando o SDK Android ${versao} no Maven Local..."
git clone --quiet --depth 1 --branch "v${versao}" \
  https://github.com/the-momentum/open_wearables_android_sdk "${trabalho}/sdk"
(cd "${trabalho}/sdk" && ./gradlew publishToMavenLocal --no-daemon --console=plain -q \
  "-Dmaven.repo.local=${HOME}/.m2/repository")

test -d "${destino_m2}"
echo "[open-wearables] SDK ${versao} publicado em ${destino_m2}."

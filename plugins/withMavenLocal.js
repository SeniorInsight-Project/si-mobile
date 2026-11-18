// Config plugin: põe mavenLocal() como primeiro repositório do android/build.gradle.
//
// O SDK nativo do Open Wearables (com.openwearables.health:sdk) não está no Maven Central;
// ele é publicado na máquina com `./gradlew publishToMavenLocal`. Sem este plugin, cada
// `expo prebuild --clean` regenera o android/build.gradle sem mavenLocal() e o build falha
// com "Could not find com.openwearables.health:sdk".
const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARCA = '// mavenLocal: SDK do Open Wearables';

function adicionarMavenLocal(conteudo) {
  if (conteudo.includes(MARCA)) return conteudo;

  const blocoRepositorios = /allprojects\s*\{\s*repositories\s*\{/;
  if (blocoRepositorios.test(conteudo)) {
    return conteudo.replace(
      blocoRepositorios,
      (trecho) => `${trecho}\n    mavenLocal() ${MARCA}`,
    );
  }

  return `${conteudo}\nallprojects {\n  repositories {\n    mavenLocal() ${MARCA}\n  }\n}\n`;
}

module.exports = function withMavenLocal(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withMavenLocal: só sei editar android/build.gradle em Groovy.');
    }
    cfg.modResults.contents = adicionarMavenLocal(cfg.modResults.contents);
    return cfg;
  });
};

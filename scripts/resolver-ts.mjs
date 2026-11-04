// Permite que `node --test` resolva imports relativos sem extensão
// (ex.: '../tokenStorageService') para o arquivo .ts correspondente,
// como o Metro faz no app.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // segue para o resolvedor padrão
      }
    }
    return nextResolve(specifier, context);
  },
});

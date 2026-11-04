// Copia os tipos gerados do si-contracts (generated/ts) para src/types/contracts.
// Uso: npm run contratos:sincronizar -- ../si-contracts
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const origem = resolve(process.argv[2] ?? '../si-contracts', 'generated', 'ts');
const destino = resolve('src', 'types', 'contracts');

if (!existsSync(origem)) {
  console.error(`Não achei ${origem}. Passe o caminho do checkout do si-contracts.`);
  process.exit(1);
}

mkdirSync(destino, { recursive: true });
const arquivos = readdirSync(origem).filter((nome) => nome.endsWith('.ts'));
for (const nome of arquivos) copyFileSync(join(origem, nome), join(destino, nome));
console.log(`Copiados ${arquivos.length} arquivos de ${origem} para ${destino}.`);

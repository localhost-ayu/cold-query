/**
 * Gera o hash de uma resposta para o resolution.json.
 * Uso: bun scripts/case-hash.ts <caso> <slot> <opção>   (ex.: 001 who w1)
 */
import { answerHash } from '../src/core/resolution';

const [caseId, slotId, optionId] = process.argv.slice(2);
if (!caseId || !slotId || !optionId) {
  console.error('uso: bun scripts/case-hash.ts <caso> <slot> <opção>');
  process.exit(1);
}
console.log(await answerHash(caseId, slotId, optionId));

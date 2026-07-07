# CLAUDE.md — mockai (código real do Entrevistador.IA)

Este diretório é a raiz do repositório git e do deploy na Vercel. A
documentação completa do projeto (stack, regras críticas, convenções)
vive no `CLAUDE.md` da pasta pai deste diretório.

## PENDÊNCIAS CONHECIDAS

- **Upgrade do Next.js adiado (decisão deliberada).** `npm audit`
  reporta 4 high / 2 moderate no `next@14.2.35` (DoS em Server
  Components, cache poisoning, SSRF via WebSocket). Correção exige
  `next@15/16` (breaking change). Decisão deliberada: adiar até o fim
  da fase de validação. Reavaliar antes de escalar tráfego pago. Não
  executar o upgrade sem planejamento — testar auth, pagamento e a
  tela de entrevista (9 Regras Críticas) em preview antes de mergear.

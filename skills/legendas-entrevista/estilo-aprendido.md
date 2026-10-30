# Estilo de legenda aprendido com o usuário

Regras tiradas comparando a legenda final do usuário com a do Premiere e a do agente (`scripts/aprender.mjs`).
Quando valem para tudo, estão em "Regras"; o que só apareceu em um tipo de vídeo está marcado.
**Siga estas regras em vez do texto/divisão do Premiere.** Se uma regra conflitar com um pedido do usuário, o pedido vence.

Base: 1 vídeo — Caio Xavier, Sequência 01, monólogo (30/10/2026, 564 legendas). Confiança cresce a cada vídeo novo.

## Regras

### Divisão (o que mais muda: ~25% dos cortes do Premiere foram mexidos)
- 1 linha só, **1 a 3 palavras** (42% têm 2, 28% têm 3, 21% têm 1; no máximo 5), **até ~20 caracteres** (mediana 11).
- Cada legenda é um pedaço de frase com sentido. **Nunca quebre entre artigo/preposição/possessivo e a palavra
  seguinte**: `Se a sua | empresa` ✗ → `Se a sua empresa` ✓; `mas no final | do mês` ✗ → `mas no final do mês` ✓;
  `fazendo | empréstimo` ✗ → `fazendo empréstimo` ✓; `pagar as suas | contas!` ✗ → `pagar as suas contas!` ✓.
- A legenda começa com a palavra de ligação (`e`, `que`, `o`, `de`, `a`, `pra`, `então`, `mas`, `com`, `não`, `ou`)
  e termina numa palavra de conteúdo (`juro`, `empresa`, `banco`, `contrato`, `dívida`, `você`…).
  Não deixe palavra de ligação pendurada no fim: `R$ 1 para | você` ✗ → `R$1 | pra você!` ✓.
- **Valor em dinheiro fica sozinho na legenda** (ou só com a preposição): `era | R$15 mil`, `é | R$12 mil`,
  `lá | R$500 mil`, `de R$500 mil`, `de R$130 mil`.
- **Toda vez que a timeline tem um corte (jump cut), começa uma legenda nova exatamente no frame do corte**
  (208 de 216 cortes). Divida o texto onde o corte cai.

### Escrita
- **Escreva como a pessoa fala, não como o Premiere "corrige"**: `pra` (não `para`) quando ela fala "pra", `pro`,
  `tá`, `tão`, `num`, `a tua`. Se ela fala "para", fica `para`. Mantenha repetições faladas (`agora minha | minha parcela`).
- **Pontuação**: sem vírgula, sem ponto final, nada no meio da legenda. **`!` no fim de cada frase afirmativa**
  (fecha a ideia: `da sua empresa!`, `pagar as suas contas!`) e **`?` no fim das perguntas** (`fiz um bom negócio?`,
  `pra quê?`). Legenda no meio da frase não leva nada.
- **Maiúsculas**: quase tudo em minúscula (87%). Maiúscula só em nomes próprios (`Caio`, `Selic`, `Pronampe`,
  `Americanas`) e às vezes na primeira legenda depois de `!`/`?` (57% das vezes) — na dúvida, minúscula.
- **Números sempre em algarismos**: `Sinal 1`, `3 dias`, `10 anos`, `4 passos`, `Em 6 meses`, `70%`, `2%`.
- **Dinheiro**: `R$` colado no número e `mil`/`milhões`/`bilhões` por extenso: `R$15 mil`, `R$1`, `R$500 mil`,
  `R$250 bilhões`. (Em 3 de 9 casos ele deixou espaço, `R$ 280 mil` — preferir colado até confirmar.)
- Termos que o Premiere erra neste assunto (finanças/empresas): `Selic` (não "link"), `Pronampe` (não "pronome"/
  "academia"), `inadimplência` (não "na dispensa"), `juro` (não "giro"), `Americanas`, `pandemia`.

### Tempo
- **Use o tempo do Premiere, não o do Whisper**: o início do usuário fica a ~1 frame do início do Premiere
  (erro mediano 0,03 s), enquanto o ajuste pelo Whisper ficou 0,13 s longe. → `captions.ps1 -Retime none`.
- Legendas encostadas umas nas outras (fim = início da próxima); só fica buraco em pausa de 1 s ou mais.
- Início no frame exato do corte quando há corte perto (o `captions.ps1` faz isso com `-Snap 0.25`).

### Cor
- Monólogo (uma pessoa, uma câmera): tudo branco; ele não pintou as perguntas de cliente que o Caio lê.

## A confirmar com o usuário
- Legendas que ele deixou vazias ou só com `f` (6 casos, ex.: no lugar de "muito complexo", "imóveis", "corrente"):
  sobras de edição ou de propósito (ex.: onde entra uma animação)? Até saber, **não imite**.
- `R$15 mil` (colado) x `R$ 280 mil` (com espaço).
- Nos vídeos do Perrengues do Brás o usuário tinha gostado do tempo alinhado ao Whisper; aqui ele ficou com o do
  Premiere. Confirmar se `-Retime none` vale para todos os clientes.

## Histórico
- 30/10/2026 — Caio Xavier, Sequência 01 (monólogo). Relatório: `D:\EDIÇÃO\Caio Xavier\29-10\9 VIDEOS\legendas-trabalho\sequencia01\aprendizado\`.

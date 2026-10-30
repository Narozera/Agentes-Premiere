# Legenda do usuário: o que aprender e o que deixar com ele

Regras tiradas comparando a legenda final do usuário com a do Premiere e a do agente (`scripts/aprender.mjs`).
Se uma regra conflitar com um pedido do usuário, o pedido vence.

Base: 1 vídeo — Caio Xavier (advogado), Sequência 01, monólogo (30/10/2026, 564 legendas). Confiança cresce a cada vídeo novo.
O usuário legenda monólogos e entrevistas do mesmo jeito; a única diferença é a cor por falante.

## Foco (pedido do usuário em 30/10/2026)
**O que importa: palavras certas e tempo certo.** O visual da legenda (pontuação, maiúsculas, fonte, estilo) o
usuário faz à mão — não gaste esforço nisso e não "enfeite": **não acrescente pontuação nem mude maiúsculas**
além do que o Premiere já trouxe. A divisão das legendas entra no foco porque é ela que decide quando cada palavra
aparece na tela.

## 1. Palavras certas
- **Escreva exatamente o que a pessoa fala**, não o que o Premiere "corrige": `pra` (não `para`) quando ela fala
  "pra", `pro`, `tá`, `tão`, `num`, `a tua`. Se ela fala "para", fica `para`. Mantenha repetições faladas
  (`agora minha | minha parcela`). Complete palavras que o Premiere engoliu (`a gente conversar`, `do que um juro`).
- **Números sempre em algarismos**: `Sinal 1`, `3 dias`, `10 anos`, `Em 6 meses`, `70%`, `2%`.
- **Dinheiro**: `R$` colado no número e `mil`/`milhões`/`bilhões` por extenso: `R$15 mil`, `R$1`, `R$500 mil`,
  `R$250 bilhões` (o Premiere escreve `15000 R$`). Em 3 de 9 casos ele deixou espaço — preferir colado até confirmar.
- Termos que o Premiere erra (assunto: finanças/empresas/direito): `Selic` (não "link"), `Pronampe` (não
  "pronome"/"academia"), `inadimplência` (não "na dispensa"), `juro` (não "giro"), `Americanas`, `pandemia`.
- Erros típicos do Premiere: palavra parecida no lugar da certa (`altas`→`altos`, `continue`→`continua`,
  `passa`→`passe`, `12%`→`2%`, `parcelas`→`parceiras`): confira cada número e cada palavra estranha no áudio/Whisper.

## 2. Tempo certo
- **Use o tempo do Premiere, não o do Whisper**: o início do usuário fica a ~1 frame do início do Premiere
  (erro mediano 0,03 s); o ajuste pelo Whisper ficou 0,13 s longe. → `captions.ps1 -Retime none`.
- **Toda vez que a timeline tem um corte (jump cut), começa uma legenda nova exatamente no frame do corte**
  (208 de 216 cortes). O `captions.ps1` encaixa com `-Snap 0.25` e lista os cortes sem legenda: divida o texto ali.
- Legendas encostadas umas nas outras (fim = início da próxima); só fica buraco em pausa de 1 s ou mais.
- Teste com o texto do próprio usuário: 60% das legendas a até 2 frames do tempo dele; os erros maiores ficam nos
  pontos onde a legenda foi dividida no meio de uma legenda do Premiere (tempo estimado por proporção).

## 3. Divisão (porque define o tempo de cada palavra)
- 1 linha, **1 a 3 palavras** (no máximo 5), **até ~20 caracteres**.
- Pedaço de frase com sentido: **não quebre entre artigo/preposição/possessivo e a palavra seguinte**
  (`Se a sua | empresa` ✗ → `Se a sua empresa` ✓; `mas no final | do mês` ✗ → `mas no final do mês` ✓).
  A legenda começa na palavra de ligação (`e`, `que`, `pra`, `mas`...) e termina numa palavra de conteúdo.
- **Valor em dinheiro fica sozinho na legenda** (ou só com a preposição): `era | R$15 mil`, `de R$130 mil`.

## Não é foco (o usuário faz à mão)
- Pontuação (ele usa `!` no fim das frases e `?` nas perguntas, sem vírgula/ponto) e maiúsculas — só para referência.
- Fonte, tamanho, posição, estilo de trilha.
- Cor: o `captions.ps1` continua pintando por câmera nas entrevistas (automático); em monólogo, tudo branco.

## A confirmar com o usuário
- Legendas vazias ou só com `f` (6 casos): sobras de edição ou de propósito? Até saber, **não imite**.
- `R$15 mil` (colado) x `R$ 280 mil` (com espaço).
- Se o tempo do Premiere (`-Retime none`) vale também para as entrevistas do Perrengues do Brás.

## Histórico
- 30/10/2026 — Caio Xavier, Sequência 01 (monólogo). Relatório: `D:\EDIÇÃO\Caio Xavier\29-10\9 VIDEOS\legendas-trabalho\sequencia01\aprendizado\`.
- 30/10/2026 — usuário definiu o foco: palavras e tempo; visual é com ele.

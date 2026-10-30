# Legenda do usuário: o que aprender e o que deixar com ele

Regras tiradas comparando a legenda final do usuário com a do Premiere e a do agente (`scripts/aprender.mjs`).
Se uma regra conflitar com um pedido do usuário, o pedido vence.

Base: 2 vídeos — Caio Xavier (advogado, monólogo, 564 legendas) e GUALDEZI "Mãe Vitin + Bispo + Aposentada"
(3 entrevistas de rua, 348 legendas). Confiança cresce a cada vídeo novo.
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
  Confirmado nas entrevistas: `tá` (Whisper `está`, 9×), `tô` (`estou`), `tava` (`estava`), `pra` (`para`/`para a`, 10×).
- **Números sempre em algarismos**: `Sinal 1`, `3 dias`, `10 anos`, `Em 6 meses`, `70%`, `2%`, `Os 2`, `1 semana`.
  Quantidade grande que não é dinheiro vai com ponto de milhar: `500.000 vagas` (o Whisper escreve `500 mil`).
- **Dinheiro**: `R$` colado no número e `mil`/`milhões`/`bilhões` por extenso: `R$15 mil`, `R$1`, `R$500 mil`,
  `R$250 bilhões` (o Premiere escreve `15000 R$`). Em 3 de 9 casos ele deixou espaço — preferir colado até confirmar.
- Termos que o Premiere erra (assunto: finanças/empresas/direito): `Selic` (não "link"), `Pronampe` (não
  "pronome"/"academia"), `inadimplência` (não "na dispensa"), `juro` (não "giro"), `Americanas`, `pandemia`.
- Erros típicos do Premiere: palavra parecida no lugar da certa (`altas`→`altos`, `continue`→`continua`,
  `passa`→`passe`, `12%`→`2%`, `parcelas`→`parceiras`): confira cada número e cada palavra estranha no áudio/Whisper.
- **Nas entrevistas o Premiere perde fala rápida e curta**, principalmente a troca pergunta/resposta e o "né":
  faltou `Ah trabalho ou a passeio? A`, `E`, `Eu`, `Faz o estudo`, `né`, `ou tá a`. Leia o Whisper inteiro e
  coloque toda fala que o Premiere pulou. Também erra feio: `mandinga`→`muito dinheiro`, `Meia Oito`→`68 anos`,
  `Depois do`→`e fui nomeado`, `vinha`→`Vim`, `ganhar`→`ganhava`, gênero (`especializado`→`especializada`).
- O Whisper também erra nome e termo raro (`apresentado`→`aposentado`, `Piscopal`→`Episcopal`, `fui no Iado
  Dispo`→`fui nomeado bispo`, `passaporto`→`passaporte`): use o contexto e o texto do Premiere, não confie em um só.
- **Valor que vira animação fica FORA da legenda.** Nas entrevistas, onde a pessoa fala um valor que ganhou
  animação (dinheiro, anos) **ou gráfico/meme**, o usuário deixou um buraco sem legenda exatamente do tamanho do
  clipe: `eu ganhava mais de | [5 mil euros] |`, `tá na casa | [5 mil euros] |`, `Até | [3 anos] | em média!`
  (animações na V3) e `[Valeu a pena]`, `[e como que]` (`Gráfico` na V4). No Caio (sem animação) o valor entrou.
  → Escreva a fala inteira no `texto.txt`; o `captions.ps1` tira sozinho o que começa embaixo de qualquer clipe
  das trilhas acima das câmeras (`dump.overlay`) e lista em "TIRADAS". Se a animação ainda não estiver na timeline,
  legende normalmente.

## 2. Tempo certo
- **Use o tempo do Premiere 2 frames mais cedo, não o do Whisper**: o usuário entra 1 frame (Caio) a 3 frames
  (entrevistas) antes do Premiere; o ajuste pelo Whisper ficou 0,08–0,13 s longe. → `captions.ps1 -Retime none`
  (no modo `-Texto`, o `-Lead 0.033` padrão já adianta os 2 frames). Testado com o texto do próprio usuário:
  Caio 63% e entrevistas 54% das legendas a até 2 frames do tempo dele (erro mediano 0,017 s e 0,034 s).
- **Toda vez que a timeline tem um corte (jump cut), começa uma legenda nova exatamente no frame do corte**
  (Caio: 208 de 216 cortes; entrevistas: 98 de 104). **Corte também é troca de câmera** (entrada/saída do clipe
  da câmera 2), não só corte no áudio: `Lisboa!` começa em 1,066 s, onde entra a câmera 2. O `captions.ps1` encaixa com `-Snap 0.25` e lista os cortes
  sem legenda: divida o texto ali.
- Em relação à fala, a legenda entra ~0,08–0,10 s **depois** do início da palavra marcado pelo Whisper (igual nos
  dois vídeos — o Whisper marca cedo). Só com o Whisper (sem tempo do Premiere) o melhor é início = Whisper + 0,1 s
  + encaixe nos cortes, mas fica pior (erro mediano 0,07 s) que partir do tempo do Premiere (0,02 s).
- Legendas encostadas umas nas outras (fim = início da próxima); só fica buraco em pausa de 1 s ou mais.
- Os erros maiores ficam onde a legenda foi dividida no meio de uma legenda do Premiere (tempo estimado por
  proporção das palavras) e onde o Premiere pulou a fala (sem tempo próprio).

## 3. Divisão (porque define o tempo de cada palavra)
- 1 linha, **1 a 3 palavras** (no máximo 5), **até ~20 caracteres**. Nas entrevistas, ainda mais curto: 88% com
  1–2 palavras, mediana de 9 caracteres (fala rápida de rua). Monólogo: 2–3 palavras, mediana de 11 caracteres.
- Pedaço de frase com sentido: **não quebre entre artigo/preposição/possessivo e a palavra seguinte**
  (`Se a sua | empresa` ✗ → `Se a sua empresa` ✓; `mas no final | do mês` ✗ → `mas no final do mês` ✓).
  A legenda começa na palavra de ligação (`e`, `que`, `pra`, `mas`...) e termina numa palavra de conteúdo.
- **Valor em dinheiro fica sozinho na legenda** (ou só com a preposição): `era | R$15 mil`, `de R$130 mil`.

## Não é foco (o usuário faz à mão)
- Pontuação (ele usa `!` no fim das frases e `?` nas perguntas, sem vírgula/ponto) e maiúsculas — só para referência.
- Fonte, tamanho, posição, estilo de trilha.
- Cor: o `captions.ps1` continua pintando por câmera nas entrevistas (automático); em monólogo, tudo branco.

## A confirmar com o usuário
- Legendas vazias ou só com `f` no Caio (6 casos): provavelmente lugares de animação/gráfico (como os buracos das
  entrevistas), mas o projeto do Caio não tem nada acima de V1 nesses pontos — confirmar. Até saber, **não imite**.
- Erros de digitação do usuário que **não** são regra: `cá pra viver` (é "dá pra"), `atoa` (é "à toa").
- `R$15 mil` (colado) x `R$ 280 mil` (com espaço).
- Se o tempo do Premiere (`-Retime none`) vale também para as entrevistas do Perrengues do Brás.

## Histórico
- 30/10/2026 — Caio Xavier, Sequência 01 (monólogo). Relatório: `D:\EDIÇÃO\Caio Xavier\29-10\9 VIDEOS\legendas-trabalho\sequencia01\aprendizado\`.
- 30/10/2026 — usuário definiu o foco: palavras e tempo; visual é com ele.
- 30/10/2026 — GUALDEZI, Mãe Vitin + Bispo + Aposentada (3 entrevistas numa sequência; SRT do Premiere + timeline lida no
  Premiere: cortes, câmeras e animações). Relatório: `D:EDIÇÃOGUALDEZIMÃE VITIN + BISPO + APOSENTADAlegendas-trabalhosequencia01aprendizado`.

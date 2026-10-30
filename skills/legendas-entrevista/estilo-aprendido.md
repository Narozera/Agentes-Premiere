# Legenda do usuário: o que aprender e o que deixar com ele

Regras tiradas comparando a legenda final do usuário com a do Premiere e a do agente (`scripts/aprender.mjs`).
Se uma regra conflitar com um pedido do usuário, o pedido vence.

Base: 4 vídeos — GUALDEZI "Médico + Pinfer" (2 entrevistas, 410 legendas), Caio Xavier (advogado, monólogo, 564 legendas), GUALDEZI "Mãe Vitin + Bispo + Aposentada"
(3 entrevistas de rua, 348 legendas) e MACHADO "Kilter + Armamento + 2 Esquerda" (4 entrevistas de política, 567).
Confiança cresce a cada vídeo novo. **Leia também `glossario.md`** (nomes e termos por cliente/assunto).

## Taxa de acerto medida (`aprender.mjs`, seção "Taxa de acerto")
| vídeo | versão | palavras | divisão | início a ≤ 2 frames |
|---|---|---|---|---|
| Caio | Premiere | 92,3% | 85,4% | 60,2% |
| Caio | agente antigo (antes de aprender) | 96,8% | 87,1% | 39,8% |
| MACHADO | Premiere | 94,3% | 83,0% | 79,0% |
| MACHADO | **agente às cegas** (só com Caio + GUALDEZI) | **97,3%** | **86,6%** | 78,4% |
| Médico + Pinfer | Premiere | 89,5% | 84,6% | 82,7% |
| Médico + Pinfer | Whisper turbo | 91,6% | – | – |
| Médico + Pinfer | **agente às cegas** (Caio + GUALDEZI + MACHADO) | **94,1%** | 80,2% ⚠ | 77,1% |
| Médico + Pinfer | mesmo texto + regra da troca de câmera | 94,1% | 80,4% | **83,0%** |
| Médico + Pinfer | agente com SRT + Whisper large-v3 + regras novas* | **97,0%** | **86,1%** | **83,2%** |
| Médico + Pinfer | agente com a transcrição JSON (sem SRT)* | 97,2% | 66,3% ⚠ | 47% (tempo do JSON) |

* regras e glossário já tinham aprendido com este vídeo → valores otimistas; a comparação SRT × JSON é justa.

**SRT x transcrição JSON do Premiere (teste de 30/10/2026, Médico + Pinfer):** use o **SRT das legendas** como base.
O JSON traz o tempo de cada palavra e quem fala, mas sem a divisão em legendas o agente dividiu mal (66% x 86%), e o
tempo das palavras dele ficou longe do tempo do usuário (o usuário segue o início das legendas do Premiere: 83% a
≤ 2 frames com o SRT). O texto do JSON é de outra transcrição e acertou um pouco mais que o SRT sozinho (91,3% x
89,5%), mas depois que o agente junta com o Whisper a diferença some (97,2% x 97,0%). O JSON testado veio de outra
versão da timeline (ordem e cortes diferentes) e precisou ser realinhado pelo áudio; o "quem fala" dele errou o Médico
inteiro (tudo "Orador 1") — as câmeras continuam melhores para separar as pessoas.

No Médico a divisão do agente ficou **pior** que a do Premiere (80,2% x 84,6%) porque ele redividiu pela gramática.
Conclusão dos 4 vídeos (abaixo, "Divisão"): mexer pouco na divisão do Premiere. Meta: subir palavras a cada vídeo novo. O tempo depende de quanto o usuário mexe em cada vídeo (ele varia
0–3 frames em relação ao Premiere), então ~65–80% a até 2 frames é perto do teto.
O usuário legenda monólogos e entrevistas do mesmo jeito; a única diferença é a cor por falante.

## Foco (pedido do usuário em 30/10/2026)
**O que importa: palavras certas e tempo certo.** O visual da legenda (pontuação, maiúsculas, fonte, estilo) o
usuário faz à mão — não gaste esforço nisso e não "enfeite": **não acrescente pontuação nem mude maiúsculas**
além do que o Premiere já trouxe. A divisão das legendas entra no foco porque é ela que decide quando cada palavra
aparece na tela.

## 1. Palavras certas
- **Transcritor**: o `transcribe.ps1` usa o **Whisper large-v3 completo** (padrão desde 30/10/2026). Nos 4 vídeos ele
  acertou 94,9% das palavras contra 92,7% do turbo (Caio 95,7/95,3 · Mãe Vitin 93,3/88,6 · MACHADO 94,8/95,3 · Médico
  95,6/91,6): 24% menos erros. Leva ~0,6× o tempo do vídeo (14 núcleos). `-Model turbo` se tiver pressa.
  O large-v3 às vezes escreve fala em silêncio/ruído (no Caio, 115 palavras a mais): palavra que só ele ouviu e o
  Premiere não, num trecho sem fala clara, **não entra**. WhisperX daria o mesmo texto (mesmo modelo) e só acelera com
  placa NVIDIA — a do usuário é AMD RX 6800 XT —, então não vale instalar Python por ele.
- **Escreva exatamente o que a pessoa fala**, não o que o Premiere "corrige": `pra` (não `para`) quando ela fala
  "pra", `pro`, `tá`, `tão`, `num`, `a tua`. Se ela fala "para", fica `para`. Mantenha repetições faladas
  (`agora minha | minha parcela`). Complete palavras que o Premiere engoliu (`a gente conversar`, `do que um juro`).
  **Na dúvida, use a forma falada** — contagem dos 4 vídeos (o que o Premiere escreveu → o que o usuário deixou):
  `estou` → **`tô` 7 de 7** · `está` → **`tá` 16 de 21** · `para` → **`pra` 30 de 45** (fora "para de" = verbo
  parar, que fica) · `estava` → `tava` 1 de 2 · `estão` → `estão` 5 de 6 (este fica). No Médico o agente às cegas
  manteve `para/está/estou` do Premiere e perdeu ~15 palavras só nisso.
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
- **Use o tempo do Premiere 1 frame mais cedo, não o do Whisper**: o usuário entra 0 (MACHADO), 1 (Caio) ou
  3 frames (GUALDEZI) antes do Premiere; o ajuste pelo Whisper ficou 0,08–0,13 s longe. → `captions.ps1 -Retime
  none` (no modo `-Texto`, o `-Lead 0.017` padrão adianta 1 frame — o melhor no conjunto dos 3 vídeos: 63,9% a
  até 2 frames; com 0 ou 2 frames, 62–63%).
- **Troca de câmera = troca de pessoa: legenda nunca atravessa.** Câmera 1 = entrevistador, câmera 2 = entrevistado.
  O usuário começa legenda em 97–98% das trocas de câmera e **nunca** deixa uma legenda passar por cima (0 casos em 3
  vídeos: Mãe Vitin 94/97, Médico 103/105, MACHADO 134/137); o agente deixava 10–19. O `captions.ps1` agora resolve sozinho: encaixa o início na troca (prioridade sobre
  os cortes de áudio) e divide a legenda que atravessa, pondo cada palavra do lado em que o Whisper a ouviu
  ("DIVIDIDAS NA TROCA DE CAMERA"). Médico às cegas: início a ≤ 2 frames 77,1% → 83,0%; atravessando 19 → 0.
- **Toda vez que a timeline tem um corte (jump cut), começa uma legenda nova exatamente no frame do corte**
  (Caio: 208 de 216 cortes; GUALDEZI: 98 de 104; MACHADO: 143 de 159). **Corte também é troca de câmera** (entrada/saída do clipe
  da câmera 2), não só corte no áudio: `Lisboa!` começa em 1,066 s, onde entra a câmera 2. O `captions.ps1` encaixa com `-Snap 0.25` e lista os cortes
  sem legenda: divida o texto ali.
- Em relação à fala, a legenda entra ~0,08–0,10 s **depois** do início da palavra marcado pelo Whisper (igual nos
  dois vídeos — o Whisper marca cedo). Só com o Whisper (sem tempo do Premiere) o melhor é início = Whisper + 0,1 s
  + encaixe nos cortes, mas fica pior (erro mediano 0,07 s) que partir do tempo do Premiere (0,02 s).
- Legendas encostadas umas nas outras (fim = início da próxima); só fica buraco em pausa de 1 s ou mais.
- Os erros maiores ficam onde a legenda foi dividida no meio de uma legenda do Premiere (tempo estimado por
  proporção das palavras) e onde o Premiere pulou a fala (sem tempo próprio).

## 3. Divisão (porque define o tempo de cada palavra)
- **Parta da divisão do Premiere e mexa pouco.** Medido em 3.965 vãos entre palavras dos 4 vídeos: onde o Premiere
  corta, o usuário mantém 81%; onde não corta, ele corta só 13%. Testei regras automáticas (cortar em todo corte de
  clipe, em toda pausa, juntar palavra de ligação, juntar legenda curtinha, "verbo + que no fim"): **nenhuma superou
  a divisão do Premiere** (F1 81,3); cada uma acerta uns casos e erra outros tantos. O que muda é decisão dele, caso a caso.
- **Mude só quando:**
  1. **Nome próprio/termo composto ficou dividido** — sempre junte (`Flávio Bolsonaro`, `Estados Unidos`, `Banco Master`,
     `Lava Jato`, `governo Lula`, `primeiro turno`, `Pequeno Príncipe`); é a única regra que melhorou (F1 81,6).
  2. Você **acrescentou ou tirou fala** (o que o Premiere pulou entra numa legenda própria ou junto da vizinha, 1–3 palavras).
  3. Lista em que o Premiere quebrou no meio dos nomes: um item por legenda (`Petrolão | Lava Jato | Banco Master | INSS`).
- Não use as regras de gramática que apareceram no MACHADO ("verbo + que fica no fim", "não deixar pronome sozinho"):
  no Médico o usuário fez o contrário (`eu acho que o maior diferencial`, `de mais de 3 dias` juntos).
- Para a fala que você acrescentar (item 2), use o tamanho dele como referência: 1 linha, **1 a 3 palavras** (no
  máximo 5), **até ~20 caracteres**; entrevista mais curto (88% com 1–2 palavras), monólogo 2–3 palavras.
- Tendências (só para desempatar, não para redividir o que o Premiere fez): quebrar entre artigo/preposição e a
  palavra seguinte ele junta ~metade das vezes (`Se a sua empresa`); valor em dinheiro costuma ficar sozinho
  (`era | R$15 mil`).

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
- 30/10/2026 — MACHADO, Kilter + Armamento + 2 Esquerda (4 entrevistas, política; SRT do Premiere + Whisper + cortes
  dos vídeos finais). Teste às cegas do agente (texto feito sem ver a legenda do usuário): palavras 97,3%, divisão
  86,6%. Relatórios na pasta `legendas-trabalho/sequencia01` do projeto.
- 30/10/2026 — GUALDEZI, Mãe Vitin + Bispo + Aposentada (3 entrevistas numa sequência; SRT do Premiere + timeline lida no
  Premiere: cortes, câmeras e animações). Relatório: `D:EDIÇÃOGUALDEZIMÃE VITIN + BISPO + APOSENTADAlegendas-trabalhosequencia01aprendizado`.

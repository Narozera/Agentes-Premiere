---
name: legendas-entrevista
description: Revisa legendas de entrevista exportadas do Premiere Pro (SRT) — transcreve o áudio da timeline com Whisper, corrige o texto, pinta cada legenda pela câmera no ar (entrevistador/DJI amarelo, entrevistado/iPhone branco), ajusta o tempo e importa de volta como trilha de legendas. Use sempre que o usuário mandar um SRT do Premiere para corrigir/arrumar/colorir/sincronizar, pedir para "fazer as legendas", legendar, transcrever o vídeo ou a entrevista, mesmo sem citar SRT. Também aprende o estilo do usuário: quando ele mandar a legenda que corrigiu ("aprende com essa"), compara com a do Premiere/agente e atualiza estilo-aprendido.md. Não serve para animações de texto/valores (skill animacoes-texto) nem para posição da câmera.
---

# Legendas de entrevista (SRT do Premiere)

Ferramentas: MCP `premiere-pro` (`execute_extendscript`, `import_captions`), PowerShell, ffmpeg e whisper.cpp
(em `%LOCALAPPDATA%\claude-premiere-tools`, baixados sozinhos se faltarem). Skill em
`~/.claude/skills/legendas-entrevista/` (abaixo, `$SK`; scripts em `$SK\scripts\`). Pasta de trabalho (`$W`): uma pasta de caminho
curto, ex. `%TEMP%\claude\leg-<nome>` — o scratchpad pode passar de 260 caracteres e o Whisper falha calado.
No fim, copie `dump.json`, `words.csv`, `sent.srt` e `texto.txt` para `<pasta do projeto>\legendas-trabalho\<nome>\`.
Script nenhum consegue ler/editar legendas já existentes no Premiere 26.5 — o caminho é exportar SRT → corrigir → importar.

## Antes de tudo: o que o usuário quer
Leia **`estilo-aprendido.md`** e **`glossario.md`** (nesta pasta) inteiros. Ele foi tirado das legendas que o próprio usuário corrigiu.
**Foco: palavras certas e tempo certo** (e a divisão, porque ela decide o tempo). Pontuação, maiúsculas e visual o
usuário faz à mão — não acrescente. As regras abaixo só valem onde esse arquivo não disser outra coisa.

## Padrões do usuário (confirme se o projeto for diferente)
- Áudio de diálogo = **A1** (DJI). Câmera do entrevistado = **V2** (iPhone). Entrevistador aparece na DJI (V1).
  Monólogo (uma pessoa, uma câmera, ex.: Caio Xavier): ver "Lições aprendidas".
- Cores: entrevistador `#FCFC00FF`, entrevistado `#FFFFFFFF` (o Premiere lê/escreve `<font color=#RRGGBBAA>` no SRT).
- Estilo (o usuário aplica no Premiere como estilo de trilha): DK Longreach 110 px, espaçamento 164, posição -662, stroke 4.
- Tempo: o do Premiere, com início encaixado no frame de cada corte (`-Retime none`, `-Snap 0.25`) — ver o estilo.

## Passo a passo
1. Peça/receba o SRT exportado (painel Texto → ⋯ → Exportar → Exportar para arquivo SRT). Leia-o inteiro.
2. **Dados da timeline** → `$W\dump.json`:
   `var ARGS={audioTrack:0, camTrack:1}; var s=$.evalFile("<$SK>/scripts/dump_timeline.jsx"); var f=new File("<$W>/dump.json"); f.encoding="UTF-8"; f.open("w"); f.write(s); f.close(); s;`
   (`<$SK>`/`<$W>` = caminhos absolutos com `/`.) Traz os clipes do áudio, a câmera do entrevistado, `cuts` (cortes da
   imagem que aparece na tela) e `overlay` (animações/gráficos nas trilhas a partir de `overlayFrom`, padrão: a trilha
   acima da câmera 2). Se uma trilha acima tem cópia da câmera (punch-in) e não gráfico, passe `overlayFrom` maior.
3. **Transcrever**: `& "$SK\scripts\transcribe.ps1" -Dump "$W\dump.json" -OutDir $W` → `edit.wav` (áudio da timeline
   editada, em tempo de timeline), `words.csv` (palavra a palavra) e `sent.srt` (frases). Confira que `words.csv`
   existe e leia o `sent.srt` procurando **frase repetida ou esticada por um buraco de silêncio** (o large-v3 entra
   em laço e inventa fala depois de buracos entre entrevistas): se houver, retranscreva só aquele trecho (ver
   "Lições aprendidas"). Antes do passo 5, troque no `words.csv` os erros fixos do Whisper pela forma do texto
   (Braço→Brás, Story→Store), senão a palavra não alinha.
4. **Reescrever as legendas** em `$W\texto.txt` (UTF-8): **uma legenda por linha, na ordem**, o vídeo inteiro.
   Parta do texto **e da divisão** do Premiere + transcrição + contexto e aplique `estilo-aprendido.md` e
   `glossario.md`: palavras como foram faladas (na dúvida `tô`/`tá`/`pra`), algarismos, `R$15 mil`, nomes inteiros.
   **Mexa pouco na divisão** (junte nome dividido; encaixe a fala que você acrescentar). Sem acrescentar pontuação.
   Regras de texto:
   - não invente fala: toda palavra tem que estar no áudio (Premiere ou Whisper); na dúvida mantenha e liste;
   - nomes de lugares/termos do contexto (Brás, Selic, Pronampe...); complete palavras engolidas;
   - quando Whisper e Premiere discordam e o áudio é ambíguo, escolha a mais plausível e **liste para o usuário conferir**.
   (Modo antigo, só trocar texto mantendo a divisão do Premiere: `fixes.json` `{"6":"aqui no Brás"}` + `-Fixes`.)
5. **Tempo + cores**: `& "$SK\scripts\captions.ps1" -Srt "<srt do Premiere>" -Out "<pasta do projeto>\<nome> - corrigida.srt" -WorkDir $W -Texto "$W\texto.txt" -Retime none`
   O tempo de cada linha vem das palavras do Premiere que ela cobre, 1 frame mais cedo (`-Lead`); o início que cai
   a ≤ 0,25 s de um corte (clipe do áudio ou troca de câmera) vai para o frame do corte; o que começa embaixo de uma
   animação/gráfico sai (**TIRADAS**); legenda que atravessa um corte visível (troca de câmera = troca de pessoa, ou corte
   do mesmo take na tela) é dividida no corte (**DIVIDIDAS NO CORTE**); cortes do V1 escondidos embaixo da câmera 2 não contam — por isso o `camTrack` do dump precisa ser a câmera do entrevistado. A saída lista cada legenda (falante, início antigo → novo) e os **CORTES SEM
   LEGENDA NOVA**: em cada um, divida a linha do `texto.txt` ali (se fizer sentido) e rode de novo. Em entrevista,
   confira as perguntas do entrevistador: devem estar como `other`.
   **Checagem final antes de importar** (sempre): para cada legenda, a câmera no meio dela (`dump.cam`) bate com a
   cor; nenhuma atravessa `dump.cuts`; fim > início; inícios em ordem, sem sobreposição; legendas de 1 palavra
   (respostas curtas) com a cor do falante certo. Corrija à mão o que falhar, com as palavras do Whisper.
6. **Antes de importar, tire um dump novo** (`dump-agora.json`) e compare o A1 com o `dump.json`: a legenda leva
   20+ min e o usuário corta enquanto isso. Se mudou, `remap.mjs dump.json dump-agora.json <corrigida.srt> <saída>`,
   refaça à mão as legendas que caíram no trecho cortado, tire as que começam embaixo de gráfico novo (regra do
   `captions.ps1`) e rode a checagem com o `dump-agora.json`. Sem isso, tudo depois do corte entra atrasado.
   **Importar**: `var ARGS={srt:"<caminho do SRT corrigido>"}; $.evalFile("<$SK>/scripts/import_srt.jsx");`
   (se falhar, use a ferramenta `import_captions` + `createCaptionTrack`). Uma trilha nova é criada; a antiga continua lá.
   **Animações que entrarem depois**: as legendas embaixo delas ficam. Quando o agente de animações terminar, rode o
   passo 2 de novo (dump novo) e o passo 5 com o mesmo `texto.txt`, e importe de novo.
7. Relate: o que mudou no texto (exemplos antes/depois e o que foi redividido), quais ficaram para conferir, que é
   preciso desativar a trilha antiga e aplicar o estilo de trilha na nova, e que o projeto não foi salvo.
   Lembre o usuário: depois de corrigir, exportar a trilha dele como `<nome> - final.srt` e pedir "aprende com essa".

## Aprender com a correção do usuário ("aprende com essa legenda")
O usuário exporta a legenda que ele mesmo arrumou. Compare com o Premiere (e com a do agente, se houver):
1. Ache os arquivos: SRT final do usuário, SRT cru do Premiere, `<nome> - corrigida.srt` do agente e a pasta
   `legendas-trabalho\<nome>\` (tem `words.csv` e `dump.json` da época). Sem `words.csv`, transcreva (passos 2–3).
2. **Ele costuma mexer nos cortes depois de exportar.** Tire um dump da timeline atual (`dump-agora.json`, passo 2)
   e passe os dois, senão as comparações de tempo saem erradas. Para levar um SRT (ou o `spec.json` das animações)
   da timeline antiga para a atual: `node "$SK\scripts\remap.mjs" dump.json dump-agora.json <entrada.srt|.json> <saída>`
   (casa pela mídia original pelo nome do arquivo, porque ele também move as pastas; lista o que saiu da edição).
3. `node "$SK\scripts\aprender.mjs" --final <final.srt> --premiere <premiere.srt> --agente <corrigida.srt> --words words.csv --dump dump.json --dump-agora dump-agora.json --out <legendas-trabalho\<nome>\aprendizado>`
   → `relatorio.md` (tamanho, divisão, pontuação, números, trocas de texto, tempo) e `lado-a-lado.txt`
   (cada legenda dele × a do Premiere e a do agente). Leia os dois.
4. Copie a linha da **Taxa de acerto** do relatório para a tabela do `estilo-aprendido.md` (é assim que se vê
   se o agente está melhorando). Nomes/termos novos e erros de audição vão para **`glossario.md`**.
   Atualize **`estilo-aprendido.md`**: confirme, corrija ou acrescente regras, com exemplos reais e números; some o
   vídeo à "Base" e ao "Histórico". Regra que só apareceu num tipo de vídeo (entrevista/monólogo, cliente) fica
   marcada assim. Coisa estranha (legenda vazia, letra solta) vai para "A confirmar", não vira regra.
5. **Teste às cegas** (a melhor medida): antes de ler a legenda do usuário a fundo, peça a um subagente que escreva o
   `texto.txt` só com o SRT do Premiere, `sent.srt`/`words.csv` e as regras (sem acesso à legenda do usuário nem
   ao Premiere), monte o SRT com o passo 5 e rode o `aprender.mjs` com `--agente`. A linha "agente" da Taxa de
   acerto é o quanto ele acertaria de verdade; as listas "Fronteiras vs agente" e "Trocas de texto: agente" mostram
   o que ensinar.
6. Para testar o tempo: rode o passo 5 com as linhas do usuário como `texto.txt` e compare com o final dele.
7. **Sem a sequência aberta** (só o SRT final + áudios renderizados + vídeos finais): monte um áudio único com cada
   áudio na posição do seu bloco na sequência (os buracos grandes do SRT mostram onde cada entrevista começa;
   ffmpeg `adelay` + `amix`), transcreva com `whisper-cli ... -ml 1 -sow -ocsv -dtw large.v3`, e ache os
   cortes nos vídeos finais com `ffmpeg -vf "scale=270:-2,select='gt(scene,0.08)',metadata=print:file=-" -f null -`.
   Com os cortes, escreva um `dump.json` (`audio`: um trecho entre cada par de cortes) e rode o `aprender.mjs` sem
   `--premiere`. Não abra outro projeto no Premiere sem o usuário pedir: o que estiver aberto pode ter alteração não salva.


## Lições aprendidas (regras; os casos com data e números estão em `LICOES.md`)
- **Pasta curta** (`$W`): com caminho > 260 caracteres o `whisper-cli` falha calado e o `transcribe.ps1` termina sem
  `words.csv`. Confira se o SRT exportado tem o nome que o usuário disse (`Get-ChildItem`) e a duração da sequência.
- PowerShell 5.1: variáveis não diferenciam maiúsculas (`$o` apaga `$Out`); scripts com acento em UTF-8 com BOM;
  `Select-Object -First N` num pipeline interrompe o script antes de gravar.
- **Quando o Whisper erra** (large-v3):
  - depois de um buraco de silêncio ele entra em laço (frase repetida), inventa fala no silêncio e estica a 1ª frase
    do bloco pelo buraco inteiro → olhe o `sent.srt`; corte do `edit.wav` só o começo do bloco (8–12 s) e transcreva
    com `-mc 0`, somando o início aos tempos; tire do `words.csv` palavras onde não há clipe no `dump.audio`;
  - as marcas de tempo variam entre rodadas e às vezes erram ~1 s (por isso o limite de 0,6 s e a lista REVISAR);
  - nas emendas das janelas de 30 s (30, 60, 90... s do `edit.wav`) ele pula fala ou repete palavra: compare o
    Premiere com o Whisper perto desses tempos e retranscreva o trecho com `-mc 0`;
  - palavra escrita diferente do `texto.txt` não alinha (Braço × Brás; números por extenso e `está/tá` o `captions.ps1`
    já iguala) → troque no `words.csv` (guarde `words-orig.csv`);
  - palavra de um lado ou do outro de um jump cut: transcreva **cada clipe do áudio sozinho** (`ffmpeg -ss -to` do
    `dump.audio`, `whisper-cli -mc 0 -nt`) e divida a linha no corte. Trechos de 2–4 s também desempatam uma palavra.
- **Cor**: deve seguir o tempo real das palavras (Whisper), não o da legenda do Premiere (0,2–0,5 s atrasada), senão a
  última palavra da pergunta vira branca no corte. Respostas de 1 palavra entre perguntas saem amarelas pela regra
  "legenda curta segue as vizinhas": confira toda legenda de 1 palavra em pergunta-resposta rápida.
- **Câmera 1 em plano aberto com os dois** (ERIC): a entrevistada fala com V1 no ar e a cor por câmera erra. Confira um
  quadro de cada câmera e, se for assim, pinte pelo falante (perguntas amarelas). Para saber quem fala: altura da voz
  (f0 mediana; homem 110–140 Hz, mulher 220–260 Hz; `pitch.mjs` em `legendas-trabalho\video-urgente\`).
- **Monólogo (uma pessoa, uma câmera)**: `camTrack:0` e `cam` = `[[0, end]]` no dump (guarde `dump-V1.json`) — tudo
  branco; falas em que ele lê a pergunta de um cliente são da mesma pessoa.
- **`overlay` pode ser a própria câmera** (cópia do clipe em V3 para punch-in): o `captions.ps1` tiraria as legendas de
  baixo. Use `overlayFrom` no dump (ou tire do `overlay`, guardando `dump-orig.json`) e avise.
- **Dump antigo sem `cam`/`cuts`**: o script avisa e pinta tudo de uma cor; pinte pelo falante e confira que cada
  troca de falante cai num corte.
- Premiere escreve dinheiro como `15000 R$` / `2 milhões R$`: troque pelo formato do estilo (`R$15 mil`, `R$2 milhões`).
- **Checagem final** (passo 5) sempre, mesmo quando o script não reclama: em pergunta-resposta rápida ~20 legendas já
  saíram com cor/tempo trocados perto dos cortes. Olhe também as listas TIRADAS, TEMPO DO WHISPER e INICIO x WHISPER,
  e procure legendas com menos de 0,1 s (o script deixa `É`/`e` com 10–50 ms perto de corte: dê o tempo do Premiere).
- **Pasta de trabalho com sobra de outro vídeo**: `leg-<nome>` pode já existir com `words.csv`/`sent.srt`/`texto.txt`
  antigos. Confira as datas (ou use pasta vazia) antes de esperar ou ler a transcrição.
- **Várias entrevistas numa sequência**: transcreva **cada bloco do `edit.wav` separado** (`-mc 0`, entre os buracos do
  `dump.audio`) e monte o `words.csv` com eles (guarde `words-orig.csv`). Some o laço no buraco e o atraso de ~0,5 s
  que o arquivo inteiro deixou no bloco seguinte.
- **Entrevistador repetindo com a câmera 2 no ar** (`R$100 mil?`, `6 sessões?`): pela câmera sai branco. Com
  entrevistada mulher, confira a voz (f0) das repetições e respostas curtas e pinte pelo falante; liste para o usuário.
- Teste às cegas de 01/11/2026 (3 vídeos) achou e consertou no `captions.ps1`: 1ª palavra trocada atrasava a legenda,
  snap levava a legenda para o corte errado ou para dentro de gráfico, linha sem par no Premiere ficava com 10 ms.
  Detalhes e números em `LICOES.md`.

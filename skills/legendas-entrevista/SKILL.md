---
name: legendas-entrevista
description: Revisa legendas de entrevista exportadas do Premiere Pro (SRT) — transcreve o áudio da timeline com Whisper, corrige o texto, pinta cada legenda pela câmera no ar (entrevistador/DJI amarelo, entrevistado/iPhone branco), ajusta o tempo e importa de volta como trilha de legendas. Use quando o usuário mandar um SRT do Premiere para corrigir/arrumar/colorir/sincronizar, ou pedir para transcrever o vídeo. Também aprende o estilo do usuário: quando ele mandar a legenda que corrigiu ("aprende com essa"), compara com a do Premiere/agente e atualiza estilo-aprendido.md.
---

# Legendas de entrevista (SRT do Premiere)

Ferramentas: MCP `premiere-pro` (`execute_extendscript`, `import_captions`), PowerShell, ffmpeg e whisper.cpp
(em `%LOCALAPPDATA%\claude-premiere-tools`, baixados sozinhos se faltarem). Scripts em
`~/.claude/skills/legendas-entrevista/scripts/` (abaixo, `$SK`). Pasta de trabalho: o scratchpad da sessão (`$W`).
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
   Traz os clipes do áudio, a câmera do entrevistado e `overlay` (animações/gráficos nas trilhas acima das câmeras).
3. **Transcrever**: `& "$SK\transcribe.ps1" -Dump "$W\dump.json" -OutDir $W` → `edit.wav` (áudio da timeline
   editada, em tempo de timeline), `words.csv` (palavra a palavra) e `sent.srt` (frases). Leia o `sent.srt`.
4. **Reescrever as legendas** em `$W\texto.txt` (UTF-8): **uma legenda por linha, na ordem**, o vídeo inteiro.
   Parta do texto do Premiere + transcrição + contexto e aplique `estilo-aprendido.md` e `glossario.md` (palavras como foram faladas, nomes inteiros,
   `pra`, algarismos, `R$15 mil`; redividir/juntar/separar). Sem acrescentar pontuação. Regras de texto:
   - não invente fala: toda palavra tem que estar no áudio (Premiere ou Whisper); na dúvida mantenha e liste;
   - nomes de lugares/termos do contexto (Brás, Selic, Pronampe...); complete palavras engolidas;
   - quando Whisper e Premiere discordam e o áudio é ambíguo, escolha a mais plausível e **liste para o usuário conferir**.
   (Modo antigo, só trocar texto mantendo a divisão do Premiere: `fixes.json` `{"6":"aqui no Brás"}` + `-Fixes`.)
5. **Tempo + cores**: `& "$SK\captions.ps1" -Srt <srt do Premiere> -Out <pasta do projeto>\<nome> - corrigida.srt -WorkDir $W -Texto "$W\texto.txt" -Retime none`
   O tempo de cada linha vem das palavras do Premiere que ela cobre, 1 frame mais cedo (`-Lead`); o início que cai
   a ≤ 0,25 s de um corte (clipe do áudio ou troca de câmera) vai para o frame do corte; o que começa embaixo de uma
   animação/gráfico sai (**TIRADAS**). A saída lista cada legenda (falante, início antigo → novo) e os **CORTES SEM
   LEGENDA NOVA**: em cada um, divida a linha do `texto.txt` ali (se fizer sentido) e rode de novo. Em entrevista,
   confira as perguntas do entrevistador: devem estar como `other`.
6. **Importar**: `var ARGS={srt:"<caminho do SRT corrigido>"}; $.evalFile("<$SK>/scripts/import_srt.jsx");`
   (se falhar, use a ferramenta `import_captions` + `createCaptionTrack`). Uma trilha nova é criada; a antiga continua lá.
7. Relate: o que mudou no texto (exemplos antes/depois e o que foi redividido), quais ficaram para conferir, que é
   preciso desativar a trilha antiga e aplicar o estilo de trilha na nova, e que o projeto não foi salvo.
   Lembre o usuário: depois de corrigir, exportar a trilha dele como `<nome> - final.srt` e pedir "aprende com essa".

## Aprender com a correção do usuário ("aprende com essa legenda")
O usuário exporta a legenda que ele mesmo arrumou. Compare com o Premiere (e com a do agente, se houver):
1. Ache os arquivos: SRT final do usuário, SRT cru do Premiere, `<nome> - corrigida.srt` do agente e a pasta
   `legendas-trabalho\<nome>\` (tem `words.csv` e `dump.json` da época). Sem `words.csv`, transcreva (passos 2–3).
2. **Ele costuma mexer nos cortes depois de exportar.** Tire um dump da timeline atual (`dump-agora.json`, passo 2)
   e passe os dois, senão as comparações de tempo saem erradas.
3. `node "$SK\aprender.mjs" --final <final.srt> --premiere <premiere.srt> --agente <corrigida.srt> --words words.csv --dump dump.json --dump-agora dump-agora.json --out <legendas-trabalho\<nome>\aprendizado>`
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
   ffmpeg `adelay` + `amix`), transcreva com `whisper-cli ... -ml 1 -sow -ocsv -dtw large.v3.turbo`, e ache os
   cortes nos vídeos finais com `ffmpeg -vf "scale=270:-2,select='gt(scene,0.08)',metadata=print:file=-" -f null -`.
   Com os cortes, escreva um `dump.json` (`audio`: um trecho entre cada par de cortes) e rode o `aprender.mjs` sem
   `--premiere`. Não abra outro projeto no Premiere sem o usuário pedir: o que estiver aberto pode ter alteração não salva.


## Lições aprendidas
- As marcações de tempo do Whisper variam entre rodadas e às vezes erram ~1 s (ex.: "para nascer"); por isso o
  limite de 0,6 s e a lista REVISAR. O volume do áudio (`edit.wav`) ajuda a decidir quem está certo.
- A cor deve seguir o tempo real das palavras (alinhado ao Whisper), não o da legenda do Premiere, que costuma
  entrar 0,2–0,5 s atrasada — senão a última palavra de uma pergunta vira branca no corte.
- PowerShell 5.1: variáveis não diferenciam maiúsculas (`$o` apaga `$Out`); scripts com acento em UTF-8 com BOM;
  `Select-Object -First N` num pipeline interrompe o script antes de ele gravar os arquivos.
- **Caminho longo quebra o Whisper em silêncio**: o scratchpad pode passar de 260 caracteres; aí o `whisper-cli`
  não acha o `edit.wav` e o `transcribe.ps1` termina sem `words.csv`/`sent.srt` (só "exit 2"). Use uma pasta curta
  (ex.: `%TEMP%\claude\leg-<nome>`) como `$W` e confira se `words.csv` existe antes de seguir.
- **Vídeo de uma pessoa só (monólogo, uma câmera)** — ex.: Caio Xavier, 9 vídeos de iPhone só em V1/A1, V2 vazia:
  não existe entrevistador. Com `camTrack:1` vazio tudo sairia amarelo. Use `camTrack:0` e, como o Whisper costuma
  jogar as primeiras palavras de cada bloco no buraco antes do clipe (viram `other`), troque `cam` do dump.json por
  `[[0, end]]` (guarde o original como `dump-V1.json`) — tudo fica branco. Falas em que ele lê a pergunta de um
  cliente ("Caio, fui até o banco...") são da mesma pessoa/câmera: deixe brancas e avise o usuário.
- O SRT exportado pode ter outro nome que o informado (ex.: pediram `sequencia01.srt`, no disco era
  `Sequência 01.srt`): confira com `Get-ChildItem` e compare com a duração da sequência ativa.
- Premiere escreve dinheiro como `15000 R$` / `1 R$` / `2 milhões R$`: troque pelo formato do estilo (`R$15 mil`, `R$1`, `R$2 milhões`).
- `captions.ps1` (corrigido em 30/10/2026): a checagem de 0,6 s agora roda antes de prender o início em
  `anterior + 0,1` (antes, um início muito errado era "preso" e aceito), legendas em REVISAR mantêm também o fim
  original, e nenhuma legenda sai com fim ≤ início (antes saíam coisas como `39,200 --> 32,570`). Sempre valide
  o SRT final (fim > início, inícios em ordem) antes de importar.

---
name: legendas-entrevista
description: Revisa legendas de entrevista exportadas do Premiere Pro (SRT) — transcreve o áudio da timeline com Whisper, corrige o texto, pinta cada legenda pela câmera no ar (entrevistador/DJI amarelo, entrevistado/iPhone branco), ajusta o tempo ao início das palavras e importa de volta como trilha de legendas. Use quando o usuário mandar um SRT do Premiere para corrigir/arrumar/colorir/sincronizar, ou pedir para transcrever o vídeo.
---

# Legendas de entrevista (SRT do Premiere)

Ferramentas: MCP `premiere-pro` (`execute_extendscript`, `import_captions`), PowerShell, ffmpeg e whisper.cpp
(em `%LOCALAPPDATA%\claude-premiere-tools`, baixados sozinhos se faltarem). Scripts em
`~/.claude/skills/legendas-entrevista/scripts/` (abaixo, `$SK`). Pasta de trabalho: o scratchpad da sessão (`$W`).
Script nenhum consegue ler/editar legendas já existentes no Premiere 26.5 — o caminho é exportar SRT → corrigir → importar.

## Padrões do usuário (confirme se o projeto for diferente)
- Áudio de diálogo = **A1** (DJI). Câmera do entrevistado = **V2** (iPhone). Entrevistador aparece na DJI (V1).
- Cores: entrevistador `#FCFC00FF`, entrevistado `#FFFFFFFF` (o Premiere lê/escreve `<font color=#RRGGBBAA>` no SRT).
- Estilo (o usuário aplica no Premiere como estilo de trilha): DK Longreach 110 px, espaçamento 164, posição -662, stroke 4.
- Ajuste de tempo só nas legendas do **entrevistado** (`-Retime cam`), 1 frame de antecedência.

## Passo a passo
1. Peça/receba o SRT exportado (painel Texto → ⋯ → Exportar → Exportar para arquivo SRT). Leia-o inteiro.
2. **Dados da timeline** → `$W\dump.json`:
   `var ARGS={audioTrack:0, camTrack:1}; var s=$.evalFile("<$SK>/scripts/dump_timeline.jsx"); var f=new File("<$W>/dump.json"); f.encoding="UTF-8"; f.open("w"); f.write(s); f.close(); s;`
3. **Transcrever**: `& "$SK\transcribe.ps1" -Dump "$W\dump.json" -OutDir $W` → `edit.wav` (áudio da timeline
   editada, em tempo de timeline), `words.csv` (palavra a palavra) e `sent.srt` (frases). Leia o `sent.srt`.
4. **Corrigir o texto** comparando cada legenda do SRT com a transcrição e o contexto. Escreva só as que mudam em
   `$W\fixes.json` (UTF-8): `{"6":"aqui no Brás","22":"até R$ 2"}` (número da legenda → texto novo). Regras:
   - mantenha a divisão e os tempos das legendas do Premiere (só troque o texto);
   - nomes de lugares/regiões do contexto (Brás, Embu das Artes...), números e moeda (`R$ 2`, `R$ 30`);
   - complete palavras engolidas ("O que", "eu junto", "E há quantos anos"); maiúscula no início de frase;
   - quando Whisper e Premiere discordam e o áudio é ambíguo, escolha a mais plausível e **liste para o usuário conferir**.
5. **Cores + tempo**: `& "$SK\captions.ps1" -Srt <srt> -Out <pasta do projeto>\<nome> - corrigida.srt -WorkDir $W -Fixes "$W\fixes.json"`
   A saída lista cada legenda (falante, início antigo → novo). Confira as perguntas do entrevistador: devem estar
   como `other`. Legendas em "REVISAR" mantiveram o tempo original (Whisper discordou > 0,6 s).
6. **Importar**: `var ARGS={srt:"<caminho do SRT corrigido>"}; $.evalFile("<$SK>/scripts/import_srt.jsx");`
   (se falhar, use a ferramenta `import_captions` + `createCaptionTrack`). Uma trilha nova é criada; a antiga continua lá.
7. Relate: o que mudou no texto (tabela antes/depois), quais ficaram para conferir, que é preciso desativar a
   trilha antiga e aplicar o estilo de trilha na nova, e que o projeto não foi salvo.

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
- Premiere escreve dinheiro como `15000 R$` / `1 R$` / `2 milhões R$`: troque por `R$ 15 mil`, `R$ 1`, `R$ 2 milhões`.
- `captions.ps1` (corrigido em 30/10/2026): a checagem de 0,6 s agora roda antes de prender o início em
  `anterior + 0,1` (antes, um início muito errado era "preso" e aceito), legendas em REVISAR mantêm também o fim
  original, e nenhuma legenda sai com fim ≤ início (antes saíam coisas como `39,200 --> 32,570`). Sempre valide
  o SRT final (fim > início, inícios em ordem) antes de importar.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

Skills e agentes do Claude Code para editar entrevistas verticais no Premiere Pro (cliente principal: Perrengues do
Brás; também Caio Xavier, GUALDEZI, ERIC, MACHADO). Não é um app: são instruções (`SKILL.md`, `agents/*.md`) e
scripts que o Claude roda. O usuário fala português; responda em português.

- `skills/legendas-entrevista`: corrige o SRT exportado do Premiere com Whisper, pinta pela câmera e importa de
  volta. Também aprende com a legenda que o usuário corrigiu.
- `skills/reenquadrar-entrevistado`: keyframes de Posição na câmera 2 (entrevistado) seguindo o rosto.
- `skills/animacoes-texto`: animações de dinheiro/quantidades/anos (MOGRT editável) e "quadro de contas".
- `agents/`: `revisor-legendas`, `posicionador-video`, `animador-textos`. Cada um só lê e segue o `SKILL.md` da sua skill.
- `projects/.../memory/`: memória antiga de preferências de edição.

## Duas cópias que precisam ficar iguais

As versões que o Claude realmente usa ficam em `C:\Users\Gustavo\.claude\skills\` e `...\.claude\agents\`. Este
repositório é a cópia versionada. Toda mudança deve ser feita nas duas, e a igualdade conferida por hash, antes de
commitar. O usuário pede para commitar ("commita e envia"); não commite sem ele pedir. Commits vão direto na `main`.

O `.gitignore` é uma lista do que entra (`/*` ignorado, depois `!` para cada pasta). **Arquivo novo na raiz ou
skill nova precisa de uma linha `!` no `.gitignore`**, senão o git não vê.

## Como as peças se encaixam

- **Premiere** é controlado pelo MCP `premiere-pro` (`execute_extendscript`). Os `.jsx` das skills rodam assim:
  `var ARGS={...}; $.evalFile("<skill>/scripts/x.jsx")`, e devolvem JSON. O painel MCP Bridge precisa estar aberto.
  Só um servidor MCP pega a porta 8097: duas sessões do Claude abertas = uma sem Premiere.
- **Ferramentas externas** em `%LOCALAPPDATA%\claude-premiere-tools`: `ffmpeg.exe`, `ffprobe.exe`, `whisper\`
  (whisper.cpp CPU + `ggml-large-v3.bin`), `whisper-gpu\` (whisper.cpp compilado com Vulkan, usado por padrão),
  `whisper-src\` (fonte para recompilar), `motion\` (projeto Remotion instalado pelo `render-motion.ps1`). Não vão para o git.
- **GPU (AMD RX 6800 XT)**: Whisper via Vulkan (~3× mais rápido, mesmo resultado) e render do Remotion via ANGLE
  (~2,8×). Decodificação de vídeo no ffmpeg fica na CPU (a GPU foi mais lenta). Compilar C++ nesta máquina: no
  terminal do app e com `-j 1`/`-j 2` (o processador dá erro interno do compilador com muitos núcleos).
- **`dump_timeline.jsx`** (legendas) é a base comum: exporta a trilha de áudio do diálogo, as faixas da câmera 2,
  os cortes visíveis e os overlays, tudo em tempo de timeline. `transcribe.ps1` remonta o áudio editado a partir dele
  e roda o Whisper (`words.csv` com o tempo de cada palavra). A skill de animações também usa esses arquivos.
- **`reenquadrar-entrevistado/scripts/common.ps1`** é dot-sourced por todos os `.ps1`
  (`. "$PSScriptRoot\common.ps1"`; nunca caminho fixo). Tem `Read-Job`, `Get-FFmpeg`, `Fmt`, `Get-Src` (prefere o
  proxy do clipe) e `Get-WH` (tamanho da fonte por clipe). Fluxo do posicionador: dump dos clipes → job.json →
  `track.ps1` → `keys.ps1` → `verify_head.ps1` (olhar as folhas) → `apply_checked.jsx`.
- **Animações**: os templates `mogrt/*.mogrt` saem do After Effects por `build_mogrts.jsx`. As animações são
  expressões (molas `spr(t,f,z)`), e os campos editáveis no Premiere vêm do Essential Graphics. O `build-mogrts.ps1`
  roda o AE e confirma os diálogos sozinho. Depois o `patch_definition.mjs` edita o `definition.json` dentro do
  `.mogrt` (zip): libera a troca de fonte e as faixas dos sliders, que o script do AE não consegue.
  `place_mogrt.jsx` coloca os templates e `update_mogrts.jsx` troca os da timeline pela versão nova mantendo os
  ajustes do usuário. `motion/` (Remotion: `Texto.jsx`, `Quadro.jsx`) renderiza `.mov` ProRes 4444 com alfa.
- **Aprendizado das legendas**: `aprender.mjs` compara o SRT do Premiere, o do agente e o final do usuário e gera a
  taxa de acerto. O resultado vai para `estilo-aprendido.md` e `glossario.md`. `remap.mjs` leva tempos da timeline
  antiga para a atual quando o usuário reedita: casa pela mídia, pelo nome do arquivo.

## Comandos

```powershell
# transcrever a timeline (depois de gravar dump.json com dump_timeline.jsx)
& "$SK\legendas-entrevista\scripts\transcribe.ps1" -Dump dump.json -OutDir <pasta>
# medir legenda do agente x correção do usuário
node "$SK\legendas-entrevista\scripts\aprender.mjs" --final f.srt --premiere p.srt --agente a.srt --words words.csv --dump dump.json --out <pasta>
# remontar os templates MOGRT (After Effects precisa permitir que scripts gravem arquivos)
& "$SK\animacoes-texto\mogrt\build-mogrts.ps1"
# renderizar animações/quadro com Remotion
& "$SK\animacoes-texto\scripts\render-motion.ps1" -Spec spec.json -OutDir "<pasta do projeto>\animacoes"
```

Não há testes automáticos. A conferência é visual: folhas `verify_head`/`preview.png`, `aerender` dos templates e
taxa de acerto do `aprender.mjs`. Sempre olhe a imagem antes de aplicar no Premiere.

## Regras que valem para todas as skills

- **Agentes separados**: cada um mexe só no que é seu. O de animações nunca cria nem importa legenda.
- Nunca salve o projeto do Premiere, e não sobrescreva clipes do usuário (confira a trilha antes).
- Saídas que o Premiere vai usar (`.mov`, SRT) ficam na pasta do projeto, nunca no scratchpad.
- O usuário reedita depois: antes de usar tempos antigos, compare o A1 atual com o `dump.json` (`remap.mjs`).
- **Não exporte frame do Premiere** (`export_frame`/`exportFramePNG`) com MOGRT na sequência: trava o Premiere.
- PowerShell 5.1: variáveis não diferenciam maiúsculas (`$out` = `$Out`, `$model` = `$Model`); arquivos com acento
  precisam de BOM; o pipe para programas nativos é ASCII (use arquivos temporários). Scripts `.jsx` do AE ficam só em
  ASCII (use `\u00f3`).
- Cada `SKILL.md` tem "Lições aprendidas" com as **regras**; o caso que deu origem (data, projeto, números) vai para o
  `LICOES.md` da skill. Ao aprender algo novo: regra curta no `SKILL.md`, história no `LICOES.md`.
- Ordem de trabalho num vídeo: posição → animações → legenda final (a legenda embaixo de animação só é tirada se a
  animação já estava na timeline). Se as legendas vieram antes, o agente de legendas roda o `captions.ps1` de novo.

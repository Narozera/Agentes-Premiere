---
name: skill-reenquadrar-entrevistado
description: Skill global criada para reenquadrar o entrevistado no Premiere com rastreamento + keyframes; ferramentas locais persistentes
metadata:
  node_type: memory
  type: reference
  originSessionId: b03761bf-dfd8-4a13-a7af-44d3bbc3dcaa
  modified: 2026-10-29T16:57:58.610Z
---

Skill `reenquadrar-entrevistado` em `C:\Users\Gustavo\.claude\skills\reenquadrar-entrevistado\` (SKILL.md + scripts:
dump_clips.jsx, measure_sheet.ps1, track.ps1, keys.ps1, verify.ps1, apply_keys.jsx). Criada em 2026-10-29 a pedido
do usuário ("agente treinado para fazer esses ajustes"). Ao aprender algo novo sobre enquadramento, atualize a seção
"Lições aprendidas" do SKILL.md. ffmpeg/ffprobe ficam em `%LOCALAPPDATA%\claude-premiere-tools`. Não há Python na máquina.
Ver [[edicao-preferencias-perrengues]].

Também criados (2026-10-29): agente `posicionador-video` (só posição, mantém escala) e agente `revisor-legendas` +
skill `legendas-entrevista` (SRT do Premiere → Whisper → texto/cor/tempo → importa). Agentes em
`C:\Users\Gustavo\.claude\agents\`. Agente `animador-textos` + skill `animacoes-texto` (dinheiro Digital-7 #00ff12,
quantidades DK Longreach, anos DK Longreach vermelho; números sempre em algarismos; renderiza ProRes 4444 com alfa
na pasta `animacoes` do projeto e coloca na V3). DK Longreach desenha 4 e 5 como rabisco (inclusive nas legendas). whisper.cpp + modelo large-v3-turbo-q5 em `%LOCALAPPDATA%\claude-premiere-tools\whisper`.

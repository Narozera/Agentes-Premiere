---
name: edicao-preferencias-perrengues
description: "Padrões de edição aprovados pelo usuário (sync, legenda, enquadramento) para os vídeos Perrengues do Brás"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b03761bf-dfd8-4a13-a7af-44d3bbc3dcaa
  modified: 2026-10-29T17:08:01.912Z
---

- Sync: só o áudio da DJI (A1); iPhone na V2 por cima, sem áudio. Corte: entrevistador → DJI, entrevistado → iPhone.
- Legendas: DK Longreach 110 px, espaçamento 164, posição -662, stroke 4; DJI/entrevistador #FCFC00, iPhone/entrevistado #FFFFFF.
  Premiere grava a cor no SRT como `<font color=#RRGGBBAA>` e respeita na importação; o usuário gostou do tempo
  das legendas alinhado ao início da palavra (Whisper word timestamps).
- Enquadramento do entrevistado: rosto no centro (x=540), topo da cabeça na régua y=384, escala base 146,
  punch-in 175–185 nas frases de ênfase, zoom lento nos trechos longos, keyframes de posição seguindo o rosto.

- Animações de texto: dinheiro Digital-7 #00ff12; quantidades DK Longreach; anos DK Longreach vermelho;
  **números sempre em algarismos** (pedido explícito); o agente escolhe a animação por fala.
  Dinheiro: bounce suave (mola), sem piscar. NUNCA animar opacidade (o usuário faz fades no Controle de efeitos).
  Animações sem "fim": mídia longa (10 s, texto parado) cortada na timeline, para o usuário poder estender.
  O usuário ajusta à mão a posição das animações na V3 — ao substituir, respeite a posição atual.

**Why:** aprovado explicitamente pelo usuário em 2026-10-29 ("ficou bom", "146 de escala ... é bom").
**How to apply:** use como padrão nos próximos vídeos da série; confirme réguas/escala se o projeto mudar.
Ferramentas: script não lê legendas nem réguas do Premiere 26.5, nem exporta frame — verificar com ffmpeg.

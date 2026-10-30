---
name: animacoes-texto
description: Cria animações de texto para entrevistas no Premiere Pro quando a pessoa fala de dinheiro (Digital-7 verde), quantidades (X pessoas, X mercadorias... em DK Longreach) e anos (DK Longreach vermelho) — encontra as menções na transcrição, escolhe a melhor animação para cada caso (pop, stamp, slide, led, bounce, contagem), renderiza como vídeo com transparência e coloca na timeline. Fontes e cores podem ser trocadas a pedido.
---

# Animações de texto (dinheiro, quantidades, anos)

Ferramentas: PowerShell + ffmpeg (`%LOCALAPPDATA%\claude-premiere-tools`), MCP `premiere-pro` (`execute_extendscript`).
Scripts em `~/.claude/skills/animacoes-texto/scripts/` (`$SK`). Transcrição: use a skill `legendas-entrevista`
(`dump_timeline.jsx` + `transcribe.ps1` → `words.csv` com tempo de cada palavra **em tempo de timeline**).
O Premiere não cria texto estilizado por script; por isso cada animação é **renderizada** (ProRes 4444 com alfa,
1080×1920, 60 fps) e colocada numa trilha de vídeo. Para mudar um texto: altere o spec e renderize de novo.

## Estilos padrão do usuário (fonte e cor podem ser trocadas quando ele pedir — `font` aceita o nome instalado)
| Categoria | Exemplos | Fonte | Cor |
|---|---|---|---|
| dinheiro | "R$ 2", "30 reais", "R$ 1.500", "mil reais" | `digital-7` | `#00ff12` |
| quantidade | "146 crianças", "300 pessoas", "50 peças" | `DK Longreach` | `#ffffff` |
| anos | "40 anos", "há 12 anos", "desde 1985" | `DK Longreach` | `#ff1a1a` |
Contorno preto 6 px em tudo. **Números sempre em algarismos** ("40 ANOS", nunca "QUARENTA ANOS").
Dinheiro sempre como `R$ N` (com espaço). Rótulos (ANOS, CRIANÇAS, E POUCO) em MAIÚSCULAS.
DK Longreach desenha **4 e 5 como rabisco**: o render troca automaticamente a linha que tem 4/5 para
`Montserrat Black` (avisa no relatório). Por isso, separe número e rótulo em **linhas diferentes** (número
grande em cima, rótulo menor embaixo) — o rótulo continua em DK Longreach.

## Biblioteca de animações — escolha a melhor para cada fala
- `bounce` — cai de cima como mola amortecida (passa ~30 px do ponto e assenta em ~0,5 s).
  **Padrão para dinheiro** (pedido do usuário: bounce suave, nada de piscar/flicker em dinheiro).
  Também serve para coisas leves (brinquedos, sacolinhas, comida).
- `pop` — cresce até 115% e assenta. Neutro e enérgico; padrão para quantidades.
- `led` — acende piscando como display digital. Não use em dinheiro; só se o usuário pedir esse efeito.
- `stamp` — bate na tela vindo de 220% e treme. Impacto: anos de dedicação, valores absurdos, recordes.
- `slide` — sobe suave com fade. Falas emotivas/afetivas (famílias ajudadas, idade, lembranças).
**Opacidade nunca é animada** (sem fade-in/fade-out): o usuário faz fades no Controle de efeitos quando quiser.
**Sem "fim"**: a mídia tem 10 s (`-Hold`) — animação de entrada e depois o texto parado — e o clipe entra na
timeline cortado em `dur`, para o usuário poder puxar a ponta e estender. Passe sempre `dur` no `place.jsx`.
- `count` (por linha, combina com qualquer uma) — o número conta de 0 até o valor (`"count":{"to":146,"prefix":"","suffix":"","dur":0.6}`).
  Use quando o número é grande o bastante para impressionar (≥ 10) e o item dura ≥ 1,3 s. Não use com decimais;
  para ≥ 1000 prefira `"R$ 1,5 MIL"`/sem contagem (a contagem não põe ponto de milhar).
Varie: não repita a mesma animação em menções seguidas da mesma categoria, a não ser que o usuário peça consistência.
Animação por linha: `"anim"` no item vale para todas as linhas; uma linha pode ter `"anim"` próprio.

## Passo a passo
1. Transcrição (`words.csv`) e `dump.json` da timeline (skill `legendas-entrevista`, passos 2–3).
2. Liste as menções (dinheiro / quantidade / anos) com o texto exato falado e o tempo da 1ª palavra do número.
   Ignore números que não são quantidade (horas, endereços) e perguntas sem número.
3. Escreva `spec.json` (UTF-8):
   ```json
   {"width":1080,"height":1920,"fps":60,"items":[
     {"id":"dinheiro_01","start":13.0,"dur":1.35,"anim":"led","y":1050,
      "lines":[{"text":"R$ 2","font":"digital-7","color":"#00ff12","size":240},
               {"text":"E POUCO","font":"digital-7","color":"#00ff12","size":110}]},
     {"id":"quantidade_01","start":22.65,"dur":1.75,"anim":"pop","y":1050,
      "lines":[{"text":"146","font":"DK Longreach","color":"#ffffff","size":260,"count":{"to":146,"dur":0.6}},
               {"text":"CRIANÇAS","font":"DK Longreach","color":"#ffffff","size":140}]}]}
   ```
   - `start` = início da palavra do número − 0,05 s; `dur` 1,0–2,2 s (até o fim da frase + 0,3 s), sem sobrepor o próximo item.
   - `y` = centro do bloco. Padrão 1050 (peito do entrevistado: abaixo do rosto, que fica no topo com a cabeça
     em y≈384, e acima da legenda). Tamanhos: número 220–270, rótulo 110–150.
4. Renderize **na pasta do projeto** (nunca no scratchpad — a mídia ficaria offline):
   `& "$SK\render.ps1" -Spec spec.json -OutDir "<pasta do projeto>\animacoes"` e **olhe o `preview.png`**
   (4 momentos de cada item): texto legível, sem cortar nas bordas, números certos, contagem terminando no valor.
5. Antes de colocar, confira a trilha de destino (padrão V3, `trackIndex:2`) para não sobrescrever nada do usuário
   (ex.: imagens que ele já colocou): liste os clipes dela e, se houver conflito, use a trilha de cima (o script cria se faltar).
6. Coloque: `var ARGS={trackIndex:2, bin:"Animações de texto", items:[{file:"D:/.../animacoes/dinheiro_01.mov", start:13.0, dur:1.35}, ...]}; $.evalFile("<$SK>/scripts/place.jsx");`
7. Relate: tabela (tempo, fala, texto, animação escolhida e por quê), avisos de fonte, onde estão os arquivos, que
   para ajustar texto/posição/animação é só pedir, e que o projeto não foi salvo.

## Refazer/substituir uma animação já colocada
O usuário costuma ajustar à mão a posição das animações. Antes de substituir, liste a trilha e use o **início
atual** do clipe antigo (não o `start` do spec). Renderize com nome novo (`_v2`), coloque nesse início e, se o
antigo for maior que o novo, remova a sobra que ficar depois (`clip.remove(false,false)`).

## Lições aprendidas
- PowerShell: um parâmetro tipado `[string]$Spec` e a variável `$spec` são a mesma — atribuir um objeto o converte em texto.
  `"$color:alpha"` é lido como variável com escopo: use `${color}`.
- Prévia de vídeo com alfa: use `trim=start=` no filtro, não `-ss` no input (dessincroniza com o fundo).
- `fontsize`, `x`, `y` e `alpha` do drawtext aceitam expressões de `t`; contagem via `%{eif:...:d}` num `textfile`
  (evita escapar `:` e `,` no filtro).
- Sequência 4K vertical (2160×3840): confira o frame rate (`254016000000/timebase`) e dobre tudo no spec — width/height
  2160/3840, `y` ≈ 2100, número ~520, rótulo ~260, `"stroke":12` em cada linha. Os deslocamentos das animações
  (tremida do stamp, subida do slide, queda do bounce) já escalam sozinhos com `width/1080` no `render.ps1`.
- DK Longreach também desenha o **"+"** como rabisco (mãozinha), não só 4 e 5 — e o fallback automático não pega o "+".
  Evite "+" nessa fonte (ex.: "+7 CM" → "7 CM" / "MAIS ALTO").
- Para checar rosto, componha um frame do .mov sobre o frame da fonte aplicando a Escala/Posição do clipe de V1/V2
  (ffmpeg `scale` + `crop`); ExtendScript: objeto com chave `in` sem aspas dá "EvalScript error".

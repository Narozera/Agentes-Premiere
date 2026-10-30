---
name: reenquadrar-entrevistado
description: Reenquadra no Premiere Pro a câmera do entrevistado (vídeo vertical) com keyframes de posição que seguem o rosto e animação de escala (punch-in / zoom lento), mantendo o rosto no centro e o topo da cabeça na régua de cima. Use quando o usuário pedir para centralizar, enquadrar, reposicionar, rastrear ou dar zoom no entrevistado/convidado de uma trilha do Premiere, ou para "ajustar as posições da segunda câmera". Também faz o zoom alternado (in/out) nas trocas entre câmeras.
---

# Reenquadrar entrevistado no Premiere

Objetivo: em cada clipe da trilha da câmera do entrevistado, criar keyframes de **Posição** (a cada 0,2 s) e
de **Escala** para que, o tempo todo:
- o **centro do rosto** fique na régua vertical (`guideX`, padrão 540 = centro de 1080);
- o **topo da cabeça** fique na régua de cima (`guideY`, padrão 384 = 20% de 1920);
- o zoom alterne para dar ênfase às falas (ver "Plano de zoom").

Ferramentas: MCP `premiere-pro` (`execute_extendscript`), PowerShell, ffmpeg (baixado sozinho por
`scripts/common.ps1` para `%LOCALAPPDATA%\claude-premiere-tools`). Pasta de trabalho: o scratchpad da sessão.
Scripts em `~/.claude/skills/reenquadrar-entrevistado/scripts/` (abaixo, `$SK`).

## Preferências do usuário (padrões — confirme se o projeto for diferente)
- Sequência vertical 1080×1920; câmera do entrevistado = iPhone 4K (2160×3840) na **V2**, DJI na V1.
- Escala base **146** (o usuário aprovou). Punch-in de ênfase **175–185**. Zoom lento 146→160/170/185 em falas longas.
- Réguas: x=540, y=384. **Não dá para ler as réguas do Premiere por script** — se o usuário mudou, peça os valores;
  dá para deduzir de um clipe que ele já enquadrou: `rostoSaida = pos + (rostoFonte - fonte/2) * escala/100`.

## Passo a passo

1. **Listar os clipes** (todos da trilha, em ordem — os índices dos JSONs são os índices da trilha):
   `execute_extendscript`: `var ARGS={trackIndex:1}; $.evalFile("<$SK>/scripts/dump_clips.jsx");`
2. **Criar `job.json`** na pasta de trabalho:
   ```json
   {"media":"D:/.../IMG_9925.mov","srcW":2160,"srcH":3840,"seqW":1080,"seqH":1920,
    "guideX":540,"guideY":384,"faceOffset":150,
    "clips":[{"index":0,"in":8.05,"dur":1.65,"faceX":1338,"headY":1221,"zoom":[175,175]}, ...],
    "manual":{}}
   ```
   `in`/`dur` vêm do passo 1 (in = inPoint em segundos da mídia). `faceX`/`headY` = centro do rosto e topo da
   cabeça **no frame do meio** do clipe, em pixels da fonte (passo 3). `zoom` = [escala inicial, final].
3. **Medir o meio de cada clipe**: `& "$SK\scripts\measure_sheet.ps1" -Job job.json -Clips 0,1,2,3 -Out m0.png`
   (4 por folha) e leia a imagem. A grade está em pixels da fonte (rótulos brancos nas linhas vermelhas;
   linha fina a cada 108 px). Anote faceX (centro do rosto, não do cabelo) e headY (topo do cabelo/tiara).
   Se o entrevistado estiver pequeno, use `-Times` com mais frames ou meça com mais zoom.
4. **Rastrear**: `& "$SK\scripts\track.ps1" -Job job.json -OutDir .` → `track.json`. Clipes com
   `minScore < 0.4` estão marcados "<- conferir" (mão/microfone na frente, pessoa passando, cabeça virando).
5. **Gerar keyframes**: `& "$SK\scripts\keys.ps1" -Job job.json -OutDir .` → `keys.json`. A escala sobe sozinha
   se algum keyframe deixaria borda preta.
6. **Verificar ANTES de aplicar** (o Premiere não exporta frame por script nesta máquina):
   `& "$SK\scripts\verify.ps1" -Job job.json -OutDir . -Clips 0,1,2,3,4,5,6 -Out rev0.png` (lotes de 7) e olhe
   **todas** as folhas: em cada miniatura (216×384) a régua horizontal está em y≈77 e a vertical em x≈108.
   Tolerância: ~10 px na miniatura (~50 px no vídeo). Rosto de perfil: vale o centro da cabeça.
7. **Corrigir** onde desviar: meça os frames problemáticos com `measure_sheet.ps1 -Times <tempos da fonte>`
   (tempo da fonte = in + t do rótulo), coloque em `job.json` → `"manual":{"4":[[23.5,1188,1092],[24.4,1218,1092]]}`
   e repita 5–6. Antes de sobrescrever o rastreador, compare com `track.json`: se ele concorda com o
   movimento (ex.: pan de câmera real), o problema é outro — não force medição manual.
8. **Aplicar**: `execute_extendscript`:
   `var ARGS={trackIndex:1, keysPath:"<pasta>/keys.json", only:null}; $.evalFile("<$SK>/scripts/apply_keys.jsx");`
   (`only:[2,5]` reaplica só alguns clipes). Ele limpa os keyframes antigos de Posição/Escala do clipe.
9. Relate ao usuário: o que foi feito, o que foi verificado (e o que não), pessoas/objetos que passam na frente
   (é da gravação, não do enquadramento), e lembre que o projeto não foi salvo.

## Plano de zoom (como escolher `zoom` por clipe)
Leia a legenda/transcrição de cada clipe. Alterne entre clipes consecutivos (jump cut com mudança de escala):
- **Punch-in 175–185**: frase de efeito, número, nome próprio, repetição enfática ("Muita, muita"), emoção.
- **Base 146**: respostas curtas, transições, falas neutras.
- **Zoom lento** (ex.: [146,160], [146,170], [170,185]): clipes > ~2 s com fala que cresce; o final do vídeo.

## Zoom alternado nas trocas de câmera (opcional, depois do enquadramento)
Quando o usuário pedir "zoom leve quando intercalar as câmeras" (aprovado em 2026-10-30, vídeo Lésbica + Gilson):
cada troca entre a câmera aberta (V1) e a do entrevistado (V2) começa um **trecho**; o trecho 0 fica parado e os
seguintes alternam zoom-in lento (1 → 1+amount) e zoom-out (1+amount → 1), sem salto de escala no corte. Como as
câmeras se alternam, na prática a V2 entra aproximando e a V1 entra afastando.
- Script: `scripts/zoom_alternado.jsx`, rodado **sobre o enquadramento já aplicado** (lê as keys atuais do Premiere):
  `var ARGS={wide:0, close:1, amount:0.08, anchorY:0.35, guides:[[0,28,1075,425],[29,55,1090,470]], skip:[],
  part:"close", from:0, to:20, dry:false}; return $.evalFile("<$SK>/scripts/zoom_alternado.jsx");`
  - `part:"close"`: V2 — escala base×f(t) e posição reescalada em volta da régua (`guides` = [primeiro, último clipe,
    guideX, guideY] por vídeo, em px da sequência), então o rosto continua nas réguas. Clipe fora de `guides` é pulado.
  - `part:"wide"`: V1 — zoom ancorado em (0,5; `anchorY`) do quadro (0,35 mantém as cabeças do plano aberto na mesma
    altura), keys só nos trechos visíveis (onde a V2 não cobre).
  - Pula clipes com Escala já animada (zoom feito à mão pelo usuário, ou o script já rodou): é seguro repetir um lote
    que deu erro. Para refazer com outra intensidade, reaplique antes o enquadramento (`apply_keys.jsx` com keys.json).
  - Faça `dry:true` primeiro: devolve o nº de trechos e [clipe, nº keys, escala inicial, final] sem alterar nada.
  - Lotes de ~10 clipes na V2 (amostra a cada 0,1 s); a V1 cabe numa chamada.
- Relate: clipes pulados (zoom manual do usuário), trechos longos onde o zoom fica sutil (8% em 20+ s) e pessoas
  encostando na borda do plano aberto no zoom máximo.

## Lições aprendidas
- **keys.json sem colchetes externos** (editado à mão) faz o `eval` do ExtendScript devolver só o ÚLTIMO clipe
  (operador vírgula) e corrompe os clipes aplicados. Ao editar keys.json manualmente, regrave com
  `'[' + (clipes -join ',') + ']'`. O `apply_keys.jsx` agora valida o formato e não aplica nada se estiver errado. (não repita)
- PowerShell 5.1: nomes de variável **não** diferenciam maiúsculas (`$K`=`$k`, `$W`=`$w`); `[math]::Max(0, x)`
  arredonda para inteiro (use `0.0`); scripts com acento precisam de UTF-8 **com BOM**; use InvariantCulture.
- Escala 100 = pixels nativos. 4K numa sequência 1080 "cabe" em 50.
- Keyframes no ExtendScript usam **tempo da mídia**: `clip.inPoint.seconds + offset`.
- Interpolar Escala e Posição linearmente com os mesmos tempos mantém o rosto fixo durante o zoom.
- Suavização de 0,5 s atrasa em pans rápidos; 0,3 s (3 amostras) é o equilíbrio.
- O rastreador erra quando a mão/microfone cobre o rosto no início do clipe: confira sempre o começo e o fim.
- Propriedades do Motion: `properties[0]`=Posição, `[1]`=Escala (nomes vêm traduzidos, ex.: "Posição").
- **Fonte do mesmo tamanho da sequência** (ex.: 2160×3840 em 2160×3840): escala 100 não deixa margem nenhuma; em 144
  o rosto só pode estar a ±330 px (fonte) do centro horizontal (faceX ~750–1410) — fora disso o keys.ps1 sobe a escala
  (chegou a 240). Câmera na mão com o entrevistado no canto = esperar várias escalas altas; relate quais.
- **Deduzir as réguas de um trecho que o usuário enquadrou**: em vez de medir na folha grosseira e aplicar a fórmula,
  renderize com ffmpeg o quadro de SAÍDA com a escala/posição dele (`scale=W*s:H*s,crop=seqW:seqH:(W*s/2-posX):(H*s/2-posY)`)
  com grade em pixels de saída e leia direto onde caem rosto e topo da cabeça. (DA AUTO SAPATOS: x≈1025→1080, y≈495-510.)
- **Bug de tempo de referência**: `measure_sheet -Clips` mede em `in+dur/2`, mas `track.ps1` ancora o template no frame
  `floor(dur/2*10)/10` (até 0,1 s antes). Com câmera mexendo rápido isso desloca o clipe inteiro em 80-150 px. Correção
  usada: no track.ps1 começar a extração em `in + (dur/2 - floor(dur/2*10)/10)` e, no keys.ps1, usar `$in = $c.in`
  (e um key em t=0 igual ao primeiro). **Já corrigido nos scripts da skill** (track.ps1 e keys.ps1, 2026-10-29).
- **Busca do rastreador saturada**: `R = 14` (56 px de fonte por 0,1 s) não acompanha pan de câmera na mão; passos
  seguidos de ±56 no track.json = saturou. Com `R = 36` os scores subiram de 0,01-0,3 para >0,75. **Já é o padrão no track.ps1.**
- **Medição manual precisa**: a folha do measure_sheet (1 px ≈ 4,3 px da fonte) erra 40-100 px no centro do rosto.
  Para correções use recorte com zoom (ex.: `crop=1512:1296:324:0,scale=756:648` → 1 px = 2 px da fonte, grade a cada
  108) e meça vários tempos (0,2-0,3 s) nos trechos com pan rápido; manual com só 1-2 pontos no início funciona.
- **Premiere instável**: o usuário pode estar editando ao mesmo tempo (houve crash e um clipe novo, um PNG, entrou na V2).
  Antes de aplicar, rode o dump de novo e compare inPoint/duração; ignore clipes de outra mídia ou com escala/keyframes
  feitos à mão; aplique em lotes de 3-4 clipes por chamada (`only:[...]`).
- **Vários takes/vídeos na mesma trilha** (2026-10-29, "21 + 22 + 23 + 24"): track.json/keys.json/apply_keys são
  POSICIONAIS — o job tem de listar TODOS os clipes da trilha, em ordem (index = posição; o keys.ps1 agora aborta se não).
  Não faça um job por arquivo. Use campos por clipe (já suportados pelos scripts): `"media"` (arquivo do take),
  `"guideX"/"guideY"` (réguas de cada vídeo), `"speed"` e `"maxZoom"`. Inclua os clipes de referência e os que não serão
  aplicados (b-roll) no job e só deixe-os fora do `only` do apply. measure_sheet: `-TimesClip <i>` usa a mídia do clipe i.
- **Réguas de cada vídeo a partir do clipe que o usuário enquadrou**: rastreie também o clipe de referência e calcule, em
  cada amostra, `saida = posUsuario(t) + (rosto - fonte/2) * escala` com os keyframes dele interpolados → média. Deu
  vídeo 1 x≈472 y≈247 e vídeo 2 x≈508 y≈244 (NÃO são 540/384, e diferem 36 px em x entre os vídeos). Posição vem
  normalizada (0-1) no ExtendScript.
- **Clipe com velocidade alterada** (`getSpeed()` != 1): `inPoint` vem em tempo "esticado" (in*speed = tempo real da
  mídia; o in passa do fim do arquivo!). No job ponha `in`/`dur` REAIS da mídia e `"speed"`; o keys.ps1 divide os tempos
  por speed (offsets de timeline, que é o que o apply usa sobre `inPoint`) e o verify busca `in + t*speed`.
- **Rosto colado na borda da fonte** (iPhone cortou a pessoa): a escala "mínima sem borda" pode passar de 300. Use
  `"maxZoom"` no clipe: a escala para nesse valor e a posição é presa na borda (o rosto sai da régua só nesse trecho).
- **Medir com marcador**: ler a grade a olho erra ±40 px; desenhe uma cruz amarela na estimativa (crop 540×540 da fonte em
  1:1) e corrija pelo desvio em relação à cruz. Em clipes longos (>3 s) use `verify.ps1 -Step 0.5`: o rastreador derivou
  até 150 px de saída em 9,8 s sem score baixo (clipe 32) — 3 amostras não mostram isso.
- PowerShell: `Add-Member "32" ...` falha (o nome "32" é lido como PSMemberTypes) — use
  `Add-Member -MemberType NoteProperty -Name "32" -Value ...`. E `$k`/`$K` são a mesma variável (de novo).
- Clipes de b-roll/cutaway no meio da câmera 2 (outra cena, sem o entrevistado): não aplique; relate.
- Se só o out-point de um clipe mudou (trim no fim, in igual), os keyframes continuam válidos: basta cortar os keys
  depois da nova duração (não precisa rastrear de novo).
- **`execute_extendscript` só devolve o que vier de `return`**: use `return $.evalFile("...")` (sem `return` volta
  "undefined"). Em literais de objeto do ExtendScript, `in` como chave (`{in: 1}`) quebra o script inteiro — use `inp`.
- **Ponte MCP "não está rodando" com o Premiere aberto**: veja `%TEMP%\premiere-mcp-bridge\bridge-heartbeat.json`; se o
  horário parou, o painel travou (janela modal aberta ou painel suspenso). Peça para fechar diálogos e reabrir
  Window > Extensions > MCP Bridge. Enquanto isso dá para adiantar medição/rastreamento/verificação (só ffmpeg).
- **Sequência 4K (2160×3840)**: réguas e `seqW/seqH` em pixels 4K (padrão vira x=1080, y=768). O `dump_clips` diz o tamanho.
- **Referência com rastreamento ruim** (2026-10-30, clipe 29 com score 0,44 e cabeça inclinada): a média
  `posUsuario + (rosto - fonte/2) * escala` deu x=967, mas o quadro de saída renderizado mostrava o rosto em ~1090.
  Quando o clipe de referência tem score baixo, leia as réguas direto do quadro de saída renderizado (2-3 tempos).
- **Cabelo volumoso (cacheado) puxa a medição a olho**: na folha 1:4 o centro do rosto saiu ~45 px (fonte) à esquerda em
  alguns clipes. A verificação pega isso (rosto ~100 px de saída fora da régua); corrija com recorte 1:1 + linha amarela
  no valor rastreado e `manual` com 3 pontos (início/meio/fim).
- PowerShell: não chame função de `R` — é alias de `Invoke-History`.

---
name: reenquadrar-entrevistado
description: Reenquadra no Premiere Pro a câmera do entrevistado (vídeo vertical) com keyframes de posição que seguem o rosto e animação de escala (punch-in / zoom lento), mantendo o rosto no centro e o topo da cabeça na régua de cima. Use sempre que o usuário pedir para centralizar, enquadrar, reposicionar, rastrear, "fazer a posição" ou dar zoom no entrevistado/convidado de uma trilha do Premiere, ou para "ajustar as posições da câmera 2 / segunda câmera", mesmo sem citar keyframes. Quando o pedido for só posição (sem mexer no zoom), o agente posicionador-video usa esta mesma skill mantendo a escala de cada clipe.
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
   **Proxies:** copie o `"proxy"` de cada clipe do passo 1 para o job (`{"index":0,"media":"...","proxy":"...", ...}`).
   Todos os scripts decodificam o proxy quando ele existe e continuam medindo em pixels da fonte (`srcW/srcH` são os
   do ORIGINAL). O usuário sempre gera proxies (Sony e iPhone em 4K). Teste no ERIC "3 IBIRA" (100 clipes, Sony 4K,
   proxy 540×960): rastreamento 2,5× e verificação 2× mais rápidos, posição igual (mediana 0 px, 90% ≤ 4 px em
   1.706 amostras). `"noProxy": true` no job força os originais (ex.: proxy com outro enquadramento/proporção).
3. **Medir o meio de cada clipe** em duas rodadas:
   a) folha grosseira: `& "$SK\scripts\measure_sheet.ps1" -Job job.json -Clips 0,1,2,3 -Out m0.png` (4 por folha,
      não misture 4K e 1080 na mesma folha). A grade está em pixels da fonte (rótulos brancos nas linhas vermelhas;
      linha fina a cada 108 px). Anote faceX (centro do rosto, não do cabelo) e headY (topo do cabelo/tiara).
   b) refino: `& "$SK\scripts\xcrop.ps1" -Job job.json -Items "clip:t:x:y;..." -Half 600 -Out xc0.png` (t=-1 = meio do clipe) desenha uma cruz
      amarela na estimativa; corrija pelo desvio em relação à cruz. A folha sozinha erra ±40 px; com o xcrop fica
      ±15 px de saída. Use a mesma convenção (rosto de frente: centro do rosto; perfil/3/4: centro da cabeça) no
      clipe de referência e nos outros.
4. **Rastrear**: `& "$SK\scripts\track.ps1" -Job job.json -OutDir .` → `track.json`. Clipes com
   `minScore < 0.4` estão marcados "<- conferir" (mão/microfone na frente, pessoa passando, cabeça virando).
5. **Gerar keyframes**: `& "$SK\scripts\keys.ps1" -Job job.json -OutDir .` → `keys.json`. A escala sobe sozinha
   se algum keyframe deixaria borda preta.
6. **Verificar ANTES de aplicar** (nunca exporte frame do Premiere por script — trava com MOGRT na sequência):
   `& "$SK\scripts\verify_head.ps1" -Job job.json -OutDir . -Clips 0,1,2,3,4,5,6 -Out rev0.png` (lotes de 7;
   recorte da cabeça no quadro de SAÍDA a 1:3, réguas em ciano, grade a cada 108 px de saída) e olhe **todas** as
   folhas. O recorte padrão (`-RX 432 -RY 216 -RW 1296 -RH 1296`) é para sequência 4K; em **1080×1920 passe
   `-RX 216 -RY 108 -RW 648 -RH 648`** (ou centre no `guideX/guideY`). Tolerância ~50 px no vídeo. Clipes longos (> 3 s): `-Step 0.5`, o rastreador pode derivar sem score
   baixo. (`verify.ps1` mostra o quadro inteiro em miniatura; serve para uma visão geral.)
7. **Corrigir** onde desviar: meça os frames problemáticos com `xcrop.ps1` (ou `crop_sheet.ps1 -Marks`), coloque em
   `job.json` → `"manual":{"4":[[23.5,1188,1092],[24.4,1218,1092]]}` (3+ pontos: início/meio/fim) e repita 5–6.
   Antes de sobrescrever o rastreador, compare com `track.json`: se ele concorda com o movimento (ex.: pan de câmera
   real), o problema é outro — não force medição manual. Clipe inteiro deslocado igual e o resto do grupo certo:
   some o desvio no `track.json` daquele clipe em vez de `manual`.
8. **Aplicar**: o usuário costuma editar enquanto você trabalha, então rode o `dump_clips.jsx` de novo e compare.
   Aplique em lotes de 3–4 clipes com a checagem de in/duração:
   `var ARGS={trackIndex:1, n:<nº de clipes>, keysPath:"<pasta>/keys.json", only:[0,1,2], exp:{"0":[in,dur],...}}; $.evalFile("<$SK>/scripts/apply_checked.jsx");`
   Ele confere a trilha e chama o `apply_keys.jsx`, que limpa os keyframes antigos de Posição/Escala do clipe.
9. Relate ao usuário: o que foi feito, o que foi verificado (e o que não), pessoas/objetos que passam na frente
   (é da gravação, não do enquadramento), e lembre que o projeto não foi salvo.

## Plano de zoom (como escolher `zoom` por clipe)
Leia a legenda/transcrição de cada clipe. Alterne entre clipes consecutivos (jump cut com mudança de escala):
- **Punch-in 175–185**: frase de efeito, número, nome próprio, repetição enfática ("Muita, muita"), emoção.
- **Base 146**: respostas curtas, transições, falas neutras.
- **Zoom lento** (ex.: [146,160], [146,170], [170,185]): clipes > ~2 s com fala que cresce; o final do vídeo.

## Lições aprendidas (regras; os casos com data e números estão em `LICOES.md`)
- **keys.json sem colchetes externos** (editado à mão) faz o `eval` do ExtendScript devolver só o ÚLTIMO clipe e
  corrompe os clipes aplicados. Regrave com `'[' + (clipes -join ',') + ']'`; o `apply_keys.jsx` valida e não aplica se estiver errado.
- PowerShell 5.1: nomes de variável **não** diferenciam maiúsculas (`$K`=`$k`, `$W`=`$w`); `[math]::Max(0, x)`
  arredonda para inteiro (use `0.0`); scripts com acento precisam de UTF-8 **com BOM**; use InvariantCulture;
  `Add-Member "32" ...` falha (use `-MemberType NoteProperty -Name "32"`); não chame função de `R` (alias de
  `Invoke-History`). `Get-Content -Raw` lê UTF-8 sem BOM como ANSI e corrompe `D:\EDIÇÃO` ao regravar o job: use
  `[IO.File]::ReadAllText/WriteAllText`; números do `ConvertFrom-Json` podem vir como decimal — converta para `[double]`.
- Escala 100 = pixels nativos. 4K numa sequência 1080 "cabe" em 50. Keyframes no ExtendScript usam **tempo da mídia**
  (`clip.inPoint.seconds + offset`). Propriedades do Motion: `properties[0]`=Posição, `[1]`=Escala (nomes traduzidos).
  Posição vem normalizada (0–1) no ExtendScript.
- Interpolar Escala e Posição linearmente com os mesmos tempos mantém o rosto fixo durante o zoom. Suavização de
  0,3 s (3 amostras) é o equilíbrio; 0,5 s atrasa em pans rápidos.
- **Fonte sem margem** (fonte do mesmo tamanho da sequência em escala 100, ou 1080 em 1080): qualquer posição fora do
  centro dá borda preta, então "só posição mantendo a escala" é impossível. O `keys.ps1` sobe só o mínimo; limite com
  `"maxZoom"` (= escala da referência do grupo, ou = escala atual quando o usuário pôs escala à mão de propósito): a
  posição fica presa na borda e o rosto sai um pouco da régua nesse trecho. Relate a escala nova de cada clipe.
  Rosto colado na borda da fonte pode pedir escala > 300: `"maxZoom"` também.
- **Rastreador**: erra quando mão/microfone cobre o rosto no início (confira começo e fim); passos seguidos do mesmo
  tamanho máximo no track.json = busca saturou (`R` no track.ps1, padrão 36); deriva ~100–140 px quando a pessoa vira de
  3/4 para frente mesmo com score > 0,85 (`manual` com 6–12 pontos); em clipes > 3 s pode derivar 150 px sem score
  baixo (`verify_head -Step 0.5`). Antes de sobrescrever com `manual`, compare com o track.json: se ele concorda com
  o movimento (pan real), o problema é outro.
- **Medição**: folha grosseira erra 40–100 px e cabelo volumoso puxa o centro para um lado; o refino com cruz
  (`xcrop`) fica em ±15 px. Mesma convenção (rosto de frente: centro do rosto; perfil/3/4: centro da cabeça) na
  referência e nos outros clipes. Clipe inteiro deslocado igual, resto do grupo certo: some o desvio no track.json
  daquele clipe. Vídeo inteiro deslocado igual: mova a régua daquele vídeo, não clipe a clipe.
- **Réguas a partir do clipe que o usuário enquadrou**: renderize o quadro de SAÍDA com a escala/posição dele
  (`scale=W*s:H*s,crop=seqW:seqH:(W*s/2-posX):(H*s/2-posY)`) e leia direto onde caem rosto e topo da cabeça, ou
  `saida = pos + (medida - fonte/2) * escala` com a medição do xcrop. Referência com score baixo ou com poucos keys
  espaçados: leia do quadro renderizado (2–3 tempos), não da média do rastreamento. Antes de concluir que a referência
  "não segue o rosto", meça o centro da cabeça (o usuário às vezes segue a cabeça, não os olhos). As réguas de cada
  vídeo diferem (já deu 472/247 × 508/244) — não assuma 540/384.
- **Vários takes na mesma trilha**: track/keys/apply são POSICIONAIS — o job lista TODOS os clipes da trilha em ordem
  (o keys.ps1 aborta se não), com campos por clipe: `media`, `guideX/guideY`, `srcW/srcH`, `faceOffset` (150 no 4K,
  75 no 1080), `speed`, `maxZoom`. B-roll, cutaway do apresentador e clipes de referência entram no job e ficam fora
  do `only`. Não misture 4K e 1080 na mesma folha do measure_sheet. Sony 4K "deitado" (ffprobe 3840×2160 com
  `rotation=-90`) é 2160×3840: use srcW=2160, srcH=3840.
- **Clipe com velocidade alterada** (`getSpeed()` != 1): `inPoint` vem esticado. No job ponha `in`/`dur` REAIS da
  mídia e `"speed"`; o keys.ps1 divide os tempos por speed e o verify busca `in + t*speed`. No `exp` do
  `apply_checked.jsx` vão os valores brutos do dump (é o que ele compara).
- **Usuário editando durante o trabalho**: refaça o dump antes de aplicar; para reindexar sem rastrear de novo, insira
  o clipe novo no job e duplique a entrada no track.json, mova as chaves de `manual`, gere keys.json e compare as
  strings antigas × novas. Só o out-point mudou: corte os keys depois da nova duração. `exp` grande: grave num arquivo
  e leia com `eval("(" + f.read() + ")")`.
- **Sequência 4K (2160×3840)**: réguas e `seqW/seqH` em pixels 4K (padrão x=1080, y=768); o `dump_clips` diz o tamanho.
- **Só posição com clipes em 100 numa fonte sem margem** (Sony 4K em sequência 4K): `"maxZoom"` = escala atual (100)
  deixa tudo parado no centro. Use `"maxZoom"` = escala do clipe que o usuário enquadrou naquele vídeo e relate as escalas.
- **Muitos clipes (150+)**: estime o meio de todos por NCC com o template do rosto da referência de cada vídeo (mesma
  conta do track.ps1, busca no quadro inteiro) e confira tudo com `xcrop` em folhas de 12; só os que errarem vão à folha
  grosseira. Mão no rosto puxa o `headY` do rastreador ~100 px para baixo: `manual` com pontos a cada 0,3–0,4 s.
- **Referência na folha de verificação**: os clipes de referência entram no job, então gere a folha `verify_head`
  deles junto. O desvio que eles mostram é o "zero" daquele vídeo: em perfil/3/4 a leitura a olho na folha difere
  ~50 px de saída do xcrop. Corrija só os clipes que fogem do desvio da referência, não os que fogem da régua.
- **Rastreador com minScore 0,40–0,55 também falhou** (perdeu o rosto 2 s, ou saltou ~150 px quando o entrevistador
  entrou no quadro): olhe esses com `-Step 0.3`. Se a busca ficou parada num ponto errado, refaça o xcrop centrado
  onde a pessoa está de fato, não no valor rastreado (a janela corta o rosto).
- **Óculos escuros na cabeça** durante o vídeo todo: use o topo dos óculos como `headY` na referência e nos outros
  clipes. A borda é nítida, e o cabelo embaixo dela não dá para ler.
- **Outra máquina**: o `apply_checked.jsx` chama `C:/Users/Gustavo/.../apply_keys.jsx` por caminho fixo. Fora dessa
  máquina, use uma cópia com a mesma checagem apontando para o `apply_keys.jsx` do repositório. A ponte recusa
  ("Script validation failed") string com `eval(`: deixe o `eval` dentro do `.jsx`.
- **`execute_extendscript`** muda entre versões da ponte: termine com a expressão (`...; $.evalFile("...");`), e se
  falhar use `return`. `in` como chave de objeto (`{in: 1}`) quebra o script — use `inp`. Ponte "não está rodando" com
  o Premiere aberto: veja `%TEMP%\premiere-mcp-bridge\bridge-heartbeat.json`; se parou, peça para fechar diálogos e
  reabrir Window > Extensions > MCP Bridge. Enquanto isso, medição/rastreamento/verificação só precisam do ffmpeg.
- **Zoom de um clipe muito acima dos vizinhos** (ex.: +57 com o resto do vídeo em +15–30) pode ser rastreio errado, não só rosto na borda: braços subindo perto da cabeça (gesto, dança) fazem o rastreador saltar ~200 px com score > 0,95. Confira esse clipe com `-Step 0.3` e meça com `xcrop` antes de aplicar.
- **Referência por entrevista**: vários vídeos na trilha e só o 1º clipe de cada um enquadrado à mão (escala 129–157, keys de posição) → réguas e `maxZoom` por vídeo, deduzidos desse clipe; deixe a referência fora do `only`.
- **"Réguas padrão" com referência enquadrada pelo usuário**: leia a régua de cima do quadro de SAÍDA das referências
  antes de usar 768 (4K). Já deu y≈440: com 768 a cabeça ficaria ~330 px mais baixa que nos clipes dele. Relate o valor usado.
- **Estimativa do meio por NCC no quadro inteiro**: só vale com score ≥ 0,9. Entre 0,45 e 0,85 a posição saiu errada
  (cantos, outro objeto), então meça esses na folha grosseira.
- **Boné para trás / rosto virando de lado**: o rastreador desliza 50–150 px **sem** score baixo (minScore 0,6–0,9).
  Verifique todos os clipes > 1 s com `-Step 0.3` e corrija com `manual` (6–16 pontos nos clipes longos).
- **Rodar os `.ps1`**: use a ferramenta PowerShell. Pelo bash, `powershell -File x.ps1 -Clips 0,1,2` chega como uma
  string só (sai 1 clipe), e caminho relativo em `-Out` quebra (`GetDirectoryName` vazio). Use sempre caminho absoluto.

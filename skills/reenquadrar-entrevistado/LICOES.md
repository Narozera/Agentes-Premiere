# Lições aprendidas — histórico de casos (reenquadrar-entrevistado)

Casos reais, com datas e números, que deram origem às regras do `SKILL.md`. Leia quando um caso parecido aparecer.

- **Fonte do mesmo tamanho da sequência** (ex.: 2160×3840 em 2160×3840): escala 100 não deixa margem nenhuma; em 144
  o rosto só pode estar a ±330 px (fonte) do centro horizontal (faceX ~750–1410) — fora disso o keys.ps1 sobe a escala
  (chegou a 240). Câmera na mão com o entrevistado no canto = esperar várias escalas altas; relate quais.
- **Deduzir as réguas de um trecho que o usuário enquadrou**: em vez de medir na folha grosseira e aplicar a fórmula,
  renderize com ffmpeg o quadro de SAÍDA com a escala/posição dele (`scale=W*s:H*s,crop=seqW:seqH:(W*s/2-posX):(H*s/2-posY)`)
  com grade em pixels de saída e leia direto onde caem rosto e topo da cabeça. (DA AUTO SAPATOS: x≈1025→1080, y≈495-510.)
- **Medição manual precisa**: a folha do measure_sheet (1 px ≈ 4,3 px da fonte) erra 40-100 px no centro do rosto.
  Para correções use recorte com zoom (ex.: `crop=1512:1296:324:0,scale=756:648` → 1 px = 2 px da fonte, grade a cada
  108) e meça vários tempos (0,2-0,3 s) nos trechos com pan rápido; manual com só 1-2 pontos no início funciona.
- **Vários takes/vídeos na mesma trilha** (2026-10-29, "21 + 22 + 23 + 24"): track.json/keys.json/apply_keys são
  POSICIONAIS — o job tem de listar TODOS os clipes da trilha, em ordem (index = posição; o keys.ps1 agora aborta se não).
  Não faça um job por arquivo. Use campos por clipe (já suportados pelos scripts): `"media"` (arquivo do take),
  `"guideX"/"guideY"` (réguas de cada vídeo), `"speed"` e `"maxZoom"`. Inclua os clipes de referência e os que não serão
  aplicados (b-roll) no job e só deixe-os fora do `only` do apply. measure_sheet: `-TimesClip <i>` usa a mídia do clipe i.
- **Réguas de cada vídeo a partir do clipe que o usuário enquadrou**: rastreie também o clipe de referência e calcule, em
  cada amostra, `saida = posUsuario(t) + (rosto - fonte/2) * escala` com os keyframes dele interpolados → média. Deu
  vídeo 1 x≈472 y≈247 e vídeo 2 x≈508 y≈244 (NÃO são 540/384, e diferem 36 px em x entre os vídeos). Posição vem
  normalizada (0-1) no ExtendScript.
- **Medir com marcador**: ler a grade a olho erra ±40 px; desenhe uma cruz amarela na estimativa (crop 540×540 da fonte em
  1:1) e corrija pelo desvio em relação à cruz. Em clipes longos (>3 s) use `verify.ps1 -Step 0.5`: o rastreador derivou
  até 150 px de saída em 9,8 s sem score baixo (clipe 32) — 3 amostras não mostram isso.
- **Referência com rastreamento ruim** (2026-10-30, clipe 29 com score 0,44 e cabeça inclinada): a média
  `posUsuario + (rosto - fonte/2) * escala` deu x=967, mas o quadro de saída renderizado mostrava o rosto em ~1090.
  Quando o clipe de referência tem score baixo, leia as réguas direto do quadro de saída renderizado (2-3 tempos).
- **Cabelo volumoso (cacheado) puxa a medição a olho**: na folha 1:4 o centro do rosto saiu ~45 px (fonte) à esquerda em
  alguns clipes. A verificação pega isso (rosto ~100 px de saída fora da régua); corrija com recorte 1:1 + linha amarela
  no valor rastreado e `manual` com 3 pontos (início/meio/fim).
- **Sony 4K "deitado" com rotação** (2026-10-30, ERIC/3 IBIRA): o ffprobe diz 3840×2160 mas com `rotation=-90`; o ffmpeg
  gira sozinho e a imagem é 2160×3840, igual à sequência 4K. Use srcW=2160, srcH=3840. Clipes em escala 100 não têm
  margem: TODO reposicionamento obriga a subir a escala (lá subiu +12 a +60; o keys.ps1 faz isso). Relate a lista.
- **Folhas de verificação em 4K**: as miniaturas do verify.ps1 (432×768) são pequenas demais para medir desvio. Use
  `scripts/verify_head.ps1` (recorte da região da cabeça do quadro de SAÍDA a 1:3, grade a cada 108 px, réguas em ciano;
  `-RX/-RY` mudam o recorte) e `scripts/crop_sheet.ps1` (fonte a 1:2 com `-Marks "x,y;..."` desenhando cruz amarela no
  valor rastreado) para medir correções.
- **Referência com keyframes que não seguem o rosto** (clipe longo, 4 keys espaçados): a média do rastreamento deu
  x=886 com espalhamento de 700-1090 — inútil. Renderize o quadro de saída da referência e leia onde fica o centro dos
  óculos/olhos com o rosto de FRENTE (lá: ~1020) e o centro da cabeça com o rosto 3/4. Depois compare com os quadros de
  frente da verificação: se todos os clipes do vídeo ficam deslocados igual (lá ~-90 px), a medição a olho tem viés
  (cabelo volumoso de um lado) — corrija deslocando a régua daquele vídeo (1000 → 1090), não clipe a clipe.
- **Rastreador deriva quando a pessoa vira de 3/4 para frente** mesmo com score > 0,85 (template pego no meio, de 3/4):
  erro de ~100-140 px da fonte no começo/fim (clipes 88 e 98 do IBIRA). Use `manual` com 6-12 pontos medidos com cruz.
- **Usuário editando durante o trabalho (de novo)**: a referência foi cortada em dois (99 → 100 clipes) entre a
  verificação e a aplicação. Refaça o dump antes de aplicar; para reindexar sem rastrear de novo, insira o clipe novo
  no job e duplique a entrada correspondente no track.json (os dois são posicionais), mova as chaves de `manual`, gere
  keys.json e compare as strings de keys antigas×novas (devem ser idênticas). Aplique com `scripts/apply_checked.jsx`
  (`ARGS={trackIndex, n, keysPath, only, exp:{"i":[in,dur]}}`): ele confere nº de clipes e in/duração de cada clipe do
  lote antes de chamar o apply_keys.
- **Resoluções misturadas na mesma trilha** (2026-10-30, "25 + ... + 33": iPhone 4K 2160×3840 e iPhone 1080×1920, proxies
  540×960 e 404×720): ponha `"srcW"/"srcH"` e `"faceOffset"` (150 no 4K, 75 no 1080) POR CLIPE no job — todos os scripts
  agora leem por clipe (`Get-WH` em common.ps1). Confira com ffprobe (vem "1920,1080,-90" = 1080×1920 em pé). O
  measure_sheet usa o tamanho do 1º clipe da folha: não misture 4K e 1080 na mesma folha.
- **Medição precisa e rápida**: `scripts/xcrop.ps1 -Items "clip:t:x:y;..." -Half 600` (t=-1 = meio do clipe) recorta em
  volta da estimativa com janela proporcional à largura da fonte (mesma área do corpo em 4K e 1080) e desenha a cruz
  amarela; leia o desvio em relação à cruz (grade a cada 54 px do tile). Comece com a folha grosseira, depois 1 rodada de
  xcrop: deu ±15 px de saída na maioria. Janela pequena demais (-Half 270) não mostra o rosto inteiro.
- **Perfil/3/4**: use sempre a mesma convenção no clipe de referência e nos outros (ex.: média entre centro do rosto e
  centro da cabeça nariz↔nuca). A leitura a olho variou ~40 px (fonte) entre duas folhas no mesmo quadro (clipe 19):
  se a verificação mostra um clipe inteiro deslocado igual e o resto do grupo certo, some o desvio em x no track.json
  daquele clipe (sem rastrear de novo) em vez de `manual`.
- **Referência que segue o CENTRO DA CABEÇA** (2026-10-31, VIDEO URGENTE, 6 keys em 0,7 s): no quadro de saída o centro
  dos óculos oscilou -115..0 px da régua quando a pessoa virava, mas o centro da cabeça (cabelo+coque) ficou fixo em
  ~1065. Antes de concluir que a referência "não segue o rosto", meça o centro da cabeça. Para as réguas, use a medição
  da referência com a MESMA convenção (xcrop) que os outros clipes: `saida = pos + (medida - fonte/2) * escala`.
- **Sony 4K em pé (2160×3840) a 100 numa sequência 4K com referência em 139**: com réguas x=1080, y=700 a escala mínima
  sem borda deu 111-132 (subir a cabeça até a régua e centralizar exige zoom); `"maxZoom": 139` não chegou a atuar.
  Medição: folha grosseira (4 por linha) + 1 rodada de `xcrop -Half 600` em todos os clipes bastou (verificação sem correção).
- **ERIC "4 VIDEOS_"** (2026-11-02, seq 4K, V2 com 159 clipes de 4 entrevistadas, Sony 4K em pé, proxies 540×960): o 1º
  clipe de cada vídeo (0, 22, 72, 111) estava enquadrado à mão (escala 138/135/129/125, 4-5 keys) e o resto em 100 no
  centro. Réguas lidas do quadro de saída das referências: x≈1065, y≈650 (iguais nos 4). Com `maxZoom` = 100 nada mudaria;
  usado `maxZoom` = escala da referência: escalas finais 117-138, 33 clipes presos na borda (rosto perto da lateral da
  fonte). Estimativa automática por NCC com o template da referência + xcrop em folhas de 12 mediu os 159 em ~15 min
  (7 clipes com estimativa errada, achados no xcrop). Correções manuais: 65 (mão no rosto, headY do
  rastreador +110), 153 (score 0,42, câmera mexendo), 137 (perfil, fim com score 0,46).

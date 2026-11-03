---
name: animacoes-texto
description: Cria animações de texto para entrevistas no Premiere Pro quando a pessoa fala de dinheiro (números em Digital-7 verde, palavras em Montserrat Bold), quantidades (X pessoas, X mercadorias... em DK Longreach) e anos (DK Longreach vermelho) — encontra as menções na transcrição, escolhe a melhor animação para cada caso (pop, queda, impacto, cascata, contador, roleta) e coloca na timeline como gráfico EDITÁVEL (MOGRT feito no After Effects) na linha da legenda. Quando a pessoa faz uma conta (empréstimo, juros, parcelas, lucro), monta um quadro de contas em tela cheia (Remotion) com a conta aparecendo linha a linha. Também remonta/atualiza os templates MOGRT da biblioteca. Use sempre que o usuário pedir motion, animação, destaque ou "efeito" em valores, preços, números, quantidades, anos ou contas de um vídeo no Premiere, mesmo sem dizer "MOGRT". Não serve para legendas (isso é a skill legendas-entrevista).
---

# Animações de texto (dinheiro, quantidades, anos)

Ferramentas: MCP `premiere-pro` (`execute_extendscript`), After Effects 2026 (`AfterFX.exe -r`, só para (re)montar
templates), Node + Remotion (`%LOCALAPPDATA%\claude-premiere-tools\motion`), ffmpeg. Skill em
`~/.claude/skills/animacoes-texto/` (`$SK`). Transcrição: skill `legendas-entrevista` (`words.csv`, `dump.json` e o SRT
de legendas corrigido, todos em tempo de timeline).

## Biblioteca salva (reaproveite — o usuário pediu para tudo ficar guardado)
- `mogrt/` — **templates editáveis** (padrão). `Dinheiro - Pop/Queda/Impacto/Cascata/Contador/Roleta.mogrt`,
  o projeto-fonte `Dinheiro - animacoes.aep` (o usuário pode abrir no AE) e `build_mogrts.jsx`, que monta tudo.
  Campos editáveis no Premiere (Controle de efeitos / Gráficos essenciais), nesta ordem: **Valor e Rótulo** (com
  troca de fonte, estilo e tamanho de fonte — liberados no `definition.json`), **Cor do valor, Cor do rótulo**,
  **Tamanho** (0–300), **Espaçamento** (entre as linhas: 50 = normal, cada ponto = 2 px), **Brilho**,
  **Velocidade** (**30 = normal**, 60 = 2×, 90 = 3×, 15 = metade; o controle do Premiere vai só até 100, por isso o
  normal é 30 — pedido do usuário para ter margem para acelerar; vale para toda a animação, atrasos incluídos).
  O usuário também usa os templates à mão: a pasta `mogrt/` pode estar adicionada em Gráficos essenciais
  (Procurar > pastas adicionais), então mantenha os nomes dos arquivos.
- `motion/` — projeto Remotion (React) que renderiza `.mov` ProRes 4444 com alfa e motion blur real
  (`scripts/render-motion.ps1`). Use quando o MOGRT não dá conta (ex.: roleta de verdade, com os dígitos girando em
  coluna) ou quando o usuário pedir vídeo. `scripts/render.ps1` (ffmpeg drawtext) é o motor antigo, só de reserva.
- Em cada vídeo: `<pasta do projeto>\animacoes\spec.json` guarda o que foi feito (textos, tempos, animação) — para
  refazer/alterar depois parta dele, não do zero.
- Referências das animações: `REFERENCIAS.md`. Skills oficiais do Remotion (`remotion-markup`, `remotion-render`,
  `remotion-docs`) estão em `~/.claude/skills/` para consultar a API.

Alterar uma animação da biblioteca (velocidade, mola, brilho...): edite `mogrt/build_mogrts.jsx` (as animações são
expressões; molas em `spr(t, freqHz, amortecimento)`), rode de novo (abaixo) e confira o render. Nova categoria
(quantidade/anos): `build-mogrts.ps1 -Style quantidade` — gera `Quantidade - *.mogrt`.

## Estilos padrão do usuário (fonte e cor podem ser trocadas quando ele pedir)
| Categoria | Exemplos | Fonte | Cor |
|---|---|---|---|
| dinheiro | "R$ 2", "30 reais", "R$ 1.500", "mil reais" | `Digital-7` | `#00ff00` (pedido 2026-10-30: "ff00") |
| quantidade | "146 crianças", "300 pessoas", "50 peças" | `DK Longreach` | `#ffffff` |
| anos | "40 anos", "há 12 anos", "desde 1985" | `DK Longreach` | `#ff1a1a` |
**Palavras (MÍNIMO, MÁXIMO, JUROS, MIL, AO MÊS, rótulos) sempre em `Montserrat Bold`** (pedido do usuário,
2026-11-01): a Digital-7 não tem acento (Ê, Ó, Í, Á, Ç saem numa fonte de reserva com serifa) e as letras dela leem
mal. Digital-7 só para números, R$, % e X. Contorno preto 6 px em tudo, brilho leve (LED). **Números sempre em algarismos**. Dinheiro sempre `R$ N` (com
espaço). Rótulos (MÍNIMO, BLUSAS, ANOS) em MAIÚSCULAS. DK Longreach desenha **4, 5 e "+" como rabisco** (o
render-motion troca a linha para `Montserrat Black`; no MOGRT evite ou use a categoria dinheiro/Montserrat).

## Posição e tempo (regras do usuário)
- **Todas as animações ficam na linha da legenda**: o valor centrado em **y = 1138** (meio das letras da legenda
  dele, medido no vídeo 20 exportado) e o rótulo logo abaixo. Os templates já nascem nessa linha.
- O tempo da animação é o da(s) legenda(s) que têm o valor (início da 1ª, fim da última); as legendas servem só
  de **leitura** para achar fala e tempo.
- **Nunca crie, altere nem importe legendas** (SRT, trilha de legendas): animações e legendas são agentes
  separados (pedido do usuário, 2026-10-30). Tirar a legenda de baixo da animação é com ele / com o agente de legendas.
- Se a legenda tem palavras além do valor ("mínimo R$9", "No máximo 80"), elas viram o rótulo.

## Animações — escolha a melhor para cada fala e varie (nada de flicker em dinheiro)
| Nome | O que faz | Quando |
|---|---|---|
| `pop` | cresce com mola, passa do tamanho e assenta, leve giro | neutro; serve para legendas curtas (< 0,9 s) |
| `queda` | cai de cima e quica (mola) — antigo `bounce` | padrão suave para dinheiro, coisas leves |
| `impacto` | bate vindo de 260% e a tela treme | valor muito baixo/alto, surpresa, recorde |
| `cascata` | letra por letra sobe com mola (SplitText) | rótulos maiores, falas animadas |
| `contador` | o número conta até o valor (ponto de milhar) e dá um "soco" | valor ≥ 10 e legenda ≥ 1,3 s |
| `roleta` | os dígitos "embaralham" e travam um a um, como caça-níquel | faixas de preço ("R$ 100 A 120"), ≥ 1,2 s |
No Remotion (`render-motion.ps1`) os mesmos nomes existem; lá `roleta` gira os dígitos em coluna (odômetro) e há
`mascara`, `deslize` e `led`. **Opacidade nunca é animada** (o usuário faz fades à mão). Sem "fim": o template tem
10 s e o clipe entra cortado em `dur`, para o usuário puxar a ponta.

## Passo a passo (MOGRT — padrão)
1. Leia as legendas corrigidas do usuário (exporte a trilha dele em SRT ou use o `<nome> - final.srt`) e, se
   existir, o `words.csv`. Sem transcrição, use só o `dump_timeline.jsx` + `transcribe.ps1` da skill
   `legendas-entrevista` (só leitura) — nunca o `captions.ps1` nem o `import_srt.jsx`. Liste as legendas com valor
   (dinheiro / quantidade / anos), juntando as seguidas que repetem o valor. Ignore horas, endereços e perguntas.
   **Vários números que se relacionam (uma conta) → quadro de contas** (seção abaixo), não valores soltos.
2. Escreva `<pasta do projeto>\animacoes\spec.json` (guarda o trabalho; mesmo formato do Remotion):
   ```json
   {"width":1080,"height":1920,"fps":60,"items":[
     {"id":"dinheiro_03","start":74.62,"dur":1.08,"anim":"impacto","lineY":1138,"glow":0.5,
      "lines":[{"text":"R$ 9","font":"digital-7","color":"#00ff00","size":200},
               {"text":"MÍNIMO","font":"Montserrat Bold","color":"#00ff00","size":100}]}]}
   ```
3. Confira a trilha de destino: liste os clipes das trilhas de vídeo. V3/V4 costumam ter imagens do usuário (logos,
   produtos); use a primeira trilha **vazia no trecho** acima delas (já foi V3 e V5). Sequência 4K: depois de
   colocar, Movimento > Escala 200 em cada clipe (linha da legenda fica em y 2276).
4. Coloque e preencha (Valor = linha 1, Rótulo = linha 2; contador/roleta animam o número do próprio Valor):
   `var ARGS={trackIndex:2, items:[{mogrt:"<$SK>/mogrt/Dinheiro - Impacto.mogrt", start:74.62, dur:1.08, valor:"R$ 9", rotulo:"MÍNIMO"}]}; $.evalFile("<$SK>/scripts/place_mogrt.jsx");`
   Campos opcionais por item (mesmos do Controle de efeitos): `cor:[r,g,b]` (0–1), `corRotulo`, `tamanho`,
   `espacamento`, `brilho`, `velocidade` (30 = normal). A troca de fonte só se faz no Premiere.
   Confira no retorno que `valor`/`rotulo` voltaram com o texto certo, que início/fim batem e que não há `...Warn`.
5. Relate: tabela (tempo, fala, texto, animação e por quê), trilha usada, que tudo é editável no Controle de efeitos,
   que o `spec.json` ficou salvo e que o projeto não foi salvo. **Se as legendas já estavam prontas**, avise que as
   que caem embaixo das animações novas continuam lá: o agente de legendas as tira rodando de novo o passo 5 dele
   com um `dump.json` novo (ordem ideal: animações antes da legenda final).

## Remontar os templates no After Effects
`& "$SK\mogrt\build-mogrts.ps1" [-Style dinheiro]` — roda o `build_mogrts.jsx` no AE, confirma sozinho os avisos de
cada export (fonte fora do Adobe Fonts, "salvar o projeto?") e mostra o log (`ok ...` por template, `aep: ...` no
fim). O AE precisa de *Preferências > Script e Expressões > Permitir que scripts gravem arquivos* (o usuário liga; é
configuração de segurança). Confira renderizando: `aerender.exe -project <cópia do .aep> -comp "Dinheiro - Pop"
-s 0 -e 150 -output x.mp4` e monte uma folha com frames 0,1/0,25/0,5/2 s.
Depois, para os clipes que já estão na timeline ganharem a versão nova (campo novo, animação ajustada):
`var ARGS={trackIndex:4, mogrtDir:"<$SK>/mogrt"}; $.evalFile("<$SK>/scripts/update_mogrts.jsx");` — troca cada
MOGRT da trilha pelo template de mesmo nome mantendo início/fim, todos os campos e Posição/Escala do Movimento
(avisa se havia keyframes). Os templates novos entraram com o campo novo direto (o Premiere não usou cache). Se o
significado de um campo mudou, converta: `scale:{"Velocidade":0.3}` (2026-10-30: normal passou de 100 para 30); se
um campo foi dividido/renomeado, `from:{"Cor do valor":"Cor","Cor do rótulo":"Cor"}`. Os textos são mesclados:
ficam o texto/fonte do usuário e as opções (capProp*) do template novo.

## Quadro de contas (quando a pessoa faz uma conta)
Quando o entrevistado explica uma conta (empréstimo, juros, parcelas, lucro), o usuário quer um **quadro em tela
cheia** com a conta sendo montada linha a linha enquanto a pessoa fala por trás (não valores soltos na legenda).
Componente `motion/src/Quadro.jsx` (Remotion, `"comp":"Quadro"`): fundo escuro 90% com grade, título, linhas de
dados (`info`: rótulo + valor, com contagem), tabela (`rows`: rótulo, valor que conta e barra proporcional; a última
pode ser vermelha) e conclusão que bate (`total`). Todos os tempos em segundos desde o início do quadro, tirados das
**legendas corrigidas do usuário** (início da legenda de cada número; quadro do início da 1ª frase da conta ao fim da
frase que fecha). Medidas na base 1080 (escalam com a largura); deixe vazia a faixa da legenda (y 1080–1200 na base
1080). Exemplo pronto: `D:\EDIÇÃO\Caio Xavier\29-10\9 VIDEOS\animacoes\8366\quadro.json` (simulação de empréstimo).
Render 4K de ~43 s sem blur: ~7 min. Coloque o `.mov` com `scripts/place.jsx` numa trilha livre acima das imagens:
`var ARGS={trackIndex:4, bin:"Animações de texto", items:[{file:"<pasta>/quadro_emprestimo.mov", start:81.2, dur:43.1}]}; $.evalFile("<$SK>/scripts/place.jsx");`
(`bin` é obrigatório: é a pasta do projeto onde o arquivo é importado.)

## Remotion (vídeo .mov)
`& "$SK\scripts\render-motion.ps1" -Spec spec.json -OutDir "<pasta do projeto>\animacoes"` (instala/atualiza o
projeto `motion/` sozinho; ~15–20 s por item em 1080) e **olhe o `preview.png`** (linha vermelha = `lineY`). Coloque com
`scripts/place.jsx` (`{trackIndex, bin, items:[{file, start, dur}]}`, exemplo na seção do quadro).
O Chrome do Remotion desenha na **GPU** (`gl: 'angle'`, padrão do `render.mjs`): item 4K com blur em 34 s × 94 s na
CPU, imagem igual. `$env:GL='swangle'` volta para a CPU se um driver quebrar; `$env:CONCURRENCY` muda o nº de quadros
em paralelo (padrão 75% dos núcleos).

## Refazer/substituir uma animação já colocada
MOGRT: só trocar Valor/Rótulo/Cor no Controle de efeitos (ou `place_mogrt.jsx` de novo). Para trocar o TIPO de
animação, use o **início atual** do clipe antigo (o usuário costuma ajustar à mão), coloque o novo template ali e
remova o antigo (`clip.remove(false,false)`). Atualize o `spec.json`.

## Lições aprendidas
- Sequência 4K com template 1080 (MOGRT): Movimento > Escala 200 mantém tudo na linha da legenda (y 2276).
- Transcrever só um trecho: desloque o `dump.json` para começar em 0 (`offset` = menor início) — com centenas de
  segundos de silêncio antes, o Whisper alucina ("Legenda por Sônia Ruberti") e o `adelay` não aceita negativo.
- **Nunca exporte frame do Premiere (`export_frame` / QE `exportFramePNG`) com MOGRT na sequência**: travou o
  Premiere em loop (2026-10-30, teve de ser fechado à força). Confira os templates pelo `aerender` e o texto pelo
  retorno do `place_mogrt.jsx`.
- **O usuário reedita depois das legendas** (reordena blocos, recorta, move a pasta das mídias): antes de colocar,
  compare o A1 atual com o `dump.json` das legendas; se mudou, gere `dump-agora.json` e converta o `spec.json` com
  `legendas-entrevista/scripts/remap.mjs` (casa pela mídia original, pelo NOME do arquivo). Converta só o spec.
- Texto de MOGRT do AE no Premiere é um JSON; ao trocar `textEditValue`, ajuste `fontTextRunLength` para o tamanho do
  texto novo (o `place_mogrt.jsx` já faz).
- Dois servidores do MCP do Premiere (duas sessões do Claude abertas): só um fica com a porta 8097 e o painel
  conecta nele. Veja quem escuta a porta (`Get-NetTCPConnection -LocalPort 8097`) antes de culpar o painel.
- After Effects por script: `exportAsMotionGraphicsTemplate(overwrite, PASTA)` (o 2º argumento é a pasta; o nome vem
  de `motionGraphicsTemplateName`) e **exige o projeto salvo antes de cada export** — senão abre "O projeto precisa
  ser salvo primeiro" e o script trava. Depois do export o objeto da comp fica inválido (`itemByID`). Objetos de
  propriedade/efeito também ficam inválidos ao adicionar irmãos: procure de novo pelo nome.
- O script do AE não liga "Editar propriedades > fonte" nem muda a faixa dos sliders (0–100). O `.mogrt` é um zip:
  o `build-mogrts.ps1` edita o `definition.json` (`patch_definition.mjs`: `capPropFont*Edit` = true, `Tamanho` até
  300). Ordem dos campos no Premiere = inversa da ordem de `addToMotionGraphicsTemplateAs`. Nomes de efeito usados em
  expressão ficam sem acento (`CorValor`, `Espacamento`); o nome com acento vai só no EGP.
- Texto que muda a cada quadro (contador, roleta) fica com fantasmas com motion blur: o valor desses templates vai
  sem blur. Velocidade entra no tempo de TODAS as expressões (`t=(time-inPoint)*V/30-atraso`, `SPEED_NORMAL`),
  inclusive na semente do embaralhamento.
- Expressões de Source Text: `value` é o texto digitado no Premiere (`value.text`); em outra propriedade use
  `text.sourceText.value`. Âncora pelo `sourceRectAtTime` do texto FINAL (fim da comp), senão treme enquanto conta.
- Cor só no preenchimento: animador de texto "Fill Color" com expressão (o efeito Preencher pintaria o contorno).
- `<HtmlInCanvasMotionBlur>` do Remotion falha no render headless ("No cached paint record"): o `render.mjs` renderiza
  a 6× fps e faz a média com ffmpeg (premultiply + tmix, obturador 180°). Contagem fica sem blur (vira fantasma).
- Roleta em coluna: a coluna tem a largura do dígito FINAL (um "1" é estreito), senão sobra espaço ("R$ 1 00").
- PowerShell: um parâmetro tipado `[string]$Spec` e a variável `$spec` são a mesma — atribuir um objeto o converte em texto.
- Prévia de vídeo com alfa: use `trim=start=` no filtro, não `-ss` no input (dessincroniza com o fundo).
- Sequência 4K vertical (2160×3840), Remotion: dobre tudo no spec (width/height, `lineY` ≈ 2276, tamanhos,
  `"stroke":12`). MOGRT: só Movimento > Escala 200 (ver 1ª lição) — não mexa no campo Tamanho para isso.
- Para checar rosto, componha um frame do .mov sobre o frame da fonte aplicando a Escala/Posição do clipe de V1/V2
  (ffmpeg `scale` + `crop`); ExtendScript: objeto com chave `in` sem aspas dá "EvalScript error".
- **Som de dinheiro** (quando pedido): item `efeitoDinheiro.mp3` já importado no projeto (`C:\Edições\efeitoDinheiro.mp3`;
  o som começa em 0,062 s). Uma cópia por animação numa trilha de áudio vazia no trecho (A2), início **4 quadros antes**
  da animação, com `audioTracks[i].overwriteClip(item, tempo)` só depois de conferir que o trecho está vazio. Volume
  original. Confira por dump que o A1 não mudou. O Premiere vê o mp3 com 1,567 s (ffprobe: 1,205 s); tudo bem.
- **O usuário edita em paralelo**: liste as trilhas de novo logo antes de colocar. Se ele já animou um valor (outro
  template, ex. Mister Horse com o texto), não duplique; relate. Use uma trilha nova acima das dele (V4).
- **Confira se as fontes estão ativas na máquina** (`%APPDATA%\Adobe\CoreSync\plugins\livetype\r` + Fonts do
  Windows): a Montserrat Bold pode faltar. A fonte de um campo de texto troca por script: no JSON do campo, mude
  `fontEditValue` para o nome PostScript (ex. `Montserrat-ExtraBold`) e confira lendo de volta.
- O `place_mogrt.jsx` arredonda o início para quadro, mas o fim (`início + dur`) não: acerte `clip.end` no quadro do
  fim da legenda depois de colocar.

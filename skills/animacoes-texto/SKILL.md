---
name: animacoes-texto
description: Cria animações de texto para entrevistas no Premiere Pro quando a pessoa fala de dinheiro (Digital-7 verde), quantidades (X pessoas, X mercadorias... em DK Longreach) e anos (DK Longreach vermelho) — encontra as menções na transcrição, escolhe a melhor animação para cada caso (pop, queda, impacto, cascata, contador, roleta) e coloca na timeline como gráfico EDITÁVEL (MOGRT feito no After Effects) na linha da legenda. Também renderiza versões em vídeo (Remotion, com motion blur) quando precisar de algo que o MOGRT não faz. Fontes e cores podem ser trocadas a pedido.
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
(quantidade/anos): `var ARGS={style:"quantidade"}` antes do `$.evalFile` — gera `Quantidade - *.mogrt`.

## Estilos padrão do usuário (fonte e cor podem ser trocadas quando ele pedir)
| Categoria | Exemplos | Fonte | Cor |
|---|---|---|---|
| dinheiro | "R$ 2", "30 reais", "R$ 1.500", "mil reais" | `Digital-7` | `#00ff00` (pedido 2026-10-30: "ff00") |
| quantidade | "146 crianças", "300 pessoas", "50 peças" | `DK Longreach` | `#ffffff` |
| anos | "40 anos", "há 12 anos", "desde 1985" | `DK Longreach` | `#ff1a1a` |
Contorno preto 6 px em tudo, brilho leve (LED). **Números sempre em algarismos**. Dinheiro sempre `R$ N` (com
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
1. Legendas corrigidas + `words.csv` (skill `legendas-entrevista`). Liste as legendas com valor (dinheiro /
   quantidade / anos), juntando as seguidas que repetem o valor. Ignore horas, endereços e perguntas.
2. Escreva `<pasta do projeto>\animacoes\spec.json` (guarda o trabalho; mesmo formato do Remotion):
   ```json
   {"width":1080,"height":1920,"fps":60,"items":[
     {"id":"dinheiro_03","start":74.62,"dur":1.08,"anim":"impacto","lineY":1138,"glow":0.5,
      "lines":[{"text":"R$ 9","font":"digital-7","color":"#00ff00","size":200},
               {"text":"MÍNIMO","font":"digital-7","color":"#00ff00","size":100}]}]}
   ```
3. Confira a trilha de destino (padrão V3, `trackIndex:2`): liste os clipes; se houver algo do usuário no trecho,
   use a de cima.
4. Coloque e preencha (Valor = linha 1, Rótulo = linha 2; contador/roleta animam o número do próprio Valor):
   `var ARGS={trackIndex:2, items:[{mogrt:"<$SK>/mogrt/Dinheiro - Impacto.mogrt", start:74.62, dur:1.08, valor:"R$ 9", rotulo:"MÍNIMO"}]}; $.evalFile("<$SK>/scripts/place_mogrt.jsx");`
   Confira no retorno que `valor`/`rotulo` voltaram com o texto certo e que início/fim batem.
5. Relate: tabela (tempo, fala, texto, animação e por quê), trilha usada, que tudo é editável no Controle de efeitos,
   que o `spec.json` ficou salvo e que o projeto não foi salvo.

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

## Remotion (vídeo .mov)
`& "$SK\scripts\render-motion.ps1" -Spec spec.json -OutDir "<pasta do projeto>\animacoes"` (instala/atualiza o
projeto `motion/` sozinho; ~15–20 s por item) e **olhe o `preview.png`** (linha vermelha = `lineY`). Coloque com
`scripts/place.jsx` (`{file, start, dur}`).

## Refazer/substituir uma animação já colocada
MOGRT: só trocar Valor/Rótulo/Cor no Controle de efeitos (ou `place_mogrt.jsx` de novo). Para trocar o TIPO de
animação, use o **início atual** do clipe antigo (o usuário costuma ajustar à mão), coloque o novo template ali e
remova o antigo (`clip.remove(false,false)`). Atualize o `spec.json`.

## Lições aprendidas
- **Nunca exporte frame do Premiere (`export_frame` / QE `exportFramePNG`) com MOGRT na sequência**: travou o
  Premiere em loop (2026-10-30, teve de ser fechado à força). Confira os templates pelo `aerender` e o texto pelo
  retorno do `place_mogrt.jsx`.
- **O usuário reedita depois das legendas** (reordena blocos, recorta, move a pasta das mídias): antes de colocar,
  compare o A1 atual com o `dump.json` das legendas; se mudou, gere `dump-agora.json` e converta o `spec.json` com
  `legendas-entrevista/scripts/remap.mjs` (casa pela mídia original, pelo NOME do arquivo). Converta só o spec.
- Texto de MOGRT do AE no Premiere é um JSON; ao trocar `textEditValue`, ajuste `fontTextRunLength` para o tamanho do
  texto novo (o `place_mogrt.jsx` já faz).
- V3/V4 costumam ter as imagens do usuário (logos de lojas, produtos): coloque as animações na primeira trilha vazia
  acima delas (aqui V5).
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
  sem blur. Velocidade entra no tempo de TODAS as expressões (`t=(time-inPoint)*V/100-atraso`), inclusive na
  semente do embaralhamento.
- Expressões de Source Text: `value` é o texto digitado no Premiere (`value.text`); em outra propriedade use
  `text.sourceText.value`. Âncora pelo `sourceRectAtTime` do texto FINAL (fim da comp), senão treme enquanto conta.
- Cor só no preenchimento: animador de texto "Fill Color" com expressão (o efeito Preencher pintaria o contorno).
- `<HtmlInCanvasMotionBlur>` do Remotion falha no render headless ("No cached paint record"): o `render.mjs` renderiza
  a 6× fps e faz a média com ffmpeg (premultiply + tmix, obturador 180°). Contagem fica sem blur (vira fantasma).
- Roleta em coluna: a coluna tem a largura do dígito FINAL (um "1" é estreito), senão sobra espaço ("R$ 1 00").
- PowerShell: um parâmetro tipado `[string]$Spec` e a variável `$spec` são a mesma — atribuir um objeto o converte em texto.
- Prévia de vídeo com alfa: use `trim=start=` no filtro, não `-ss` no input (dessincroniza com o fundo).
- Sequência 4K vertical (2160×3840): dobre tudo no spec (width/height, `lineY` ≈ 2276, tamanhos, `"stroke":12`); no
  MOGRT use Tamanho 200 e ajuste a posição no Movimento do clipe.
- Para checar rosto, componha um frame do .mov sobre o frame da fonte aplicando a Escala/Posição do clipe de V1/V2
  (ffmpeg `scale` + `crop`); ExtendScript: objeto com chave `in` sem aspas dá "EvalScript error".

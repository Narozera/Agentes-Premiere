# Lições aprendidas — histórico de casos (animacoes-texto)

Casos reais, com datas e números, que deram origem às regras do `SKILL.md`. Leia quando um caso parecido aparecer.

- **03/11/2026, GUALDEZI (Seguros + Advogada + Consultora, Sequence 01 4K)** — pedido: animações de dinheiro com o
  `efeitoDinheiro.mp3` na entrada.
  - Entre o pedido e a colocação, o usuário pôs ele mesmo o "R$100.000" (Digital-7, template Overshoot da Mister Horse)
    em V3 97,817–100,083 s e o som em A2 no mesmo início. O agente não duplicou essa menção; colocou só "100 mil por
    12" (Queda, 109,35 s) e "R$15 mil" (Impacto, 150,183 s) em V4 nova. O padrão do usuário: som começando junto com
    o clipe da animação.
  - A Montserrat Bold não estava ativa nesta máquina (Adobe Fonts tinha Medium, SemiBold e ExtraBold). O rótulo
    "÷ 12 MESES" foi trocado por script para `Montserrat-ExtraBold` (`fontEditValue` no JSON do campo). A Digital-7
    não tem "÷" nem "×": esses sinais vão no rótulo.
  - O `place_mogrt.jsx` deixou o fim em 111,239 e 151,3173 s (início arredondado + dur); acertado à mão para o quadro.
  - O mp3 tem 1,205 s no ffprobe, mas o Premiere o coloca com 1,567 s (o clipe do usuário também).

## 2026-11-03 — Caio Xavier, Takes bruto (8 vídeos, 4K)
- Quadro passou a aceitar listas (`items`), cores por linha e conclusão em palavras: 7 quadros (passo a passo,
  lista de prioridades, ranking, causas, conta de juros) num vídeo só de monólogo.
- Errei dois tempos do quadro (palavra vizinha na legenda) e tive de parar o render 4K: conferir cada `t` antes.
- "3 anos" no template de dinheiro com cor vermelha e fonte trocada para DKLongreach-Regular pelo `fontEditValue`.

## 2026-11-04 — Caio Xavier, "7 Vídeos" (Sequence 05, 1080×1920 60 fps, máquina guilh)
- Pedido aberto ("animações onde fica mais entendível"): 4 quadros (juro acima da lei → redução/devolução; corte de
  limite → aviso de 30 dias/danos morais; aplicação → autorizou/não autorizou; penhora → parte da esposa/do marido),
  6 MOGRTs (30 DIAS, R$ 80.000, R$ 12.000, MITO ×3) e 8 etiquetas EVITE/USE acima da legenda no vídeo de frases. Tudo
  em V4 (V3 tinha as manchetes do usuário; V2 a caixinha da pergunta, coberta só pelo quadro da resposta).
- Montserrat não estava instalada (nem no Adobe Fonts): o Remotion parou com "Fonte nao encontrada"/404. Entrou a
  Mazzard H Black (`fontFiles` novo no `render-motion.ps1`) e no MOGRT o `fontEditValue` = `MazzardH-Black`.
- Enquanto o agente trabalhava, o usuário tirou 17 quadros (0,283 s) em ~79,27 s com ripple: os MOGRTs já colocados
  andaram junto; o spec foi convertido com `remap.mjs` (`dump-agora.json` montado do A1) antes de colocar os `.mov`.
  O 1º "MITO" apareceu 7 quadros mais longo depois disso (provável ajuste do usuário): ficou como estava.
- `place.jsx` deixou 6 dos 12 `.mov` com o fim 1 quadro antes do pedido; acertado com `clip.end`.
- Heredoc do Bash juntou `\\` em `\` dentro de scripts gerados (caminho da fonte sem barras, regex quebrada no
  ExtendScript): scripts com barra invertida vão pelo Write, não por `cat <<EOF`.

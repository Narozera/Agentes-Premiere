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

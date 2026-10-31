# Referências das animações

De onde vem cada animação da biblioteca e como ela foi traduzida para código. Use isto para manter o estilo ao
criar ou alterar uma animação.

- **Base técnica:** [Remotion](https://www.remotion.dev) 4.0.539 e as Agent Skills oficiais dele
  (`remotion-dev/skills`, instaladas em `~/.claude/skills/remotion-*`). A regra que vale para tudo: animação movida a
  tempo, com `spring()` (mola amortecida) e easing de motion designer (`Easing.bezier(0.16, 1, 0.3, 1)`, o
  "expo out"), em vez de movimento linear.
- **Molas:** as mesmas curvas do Remotion foram passadas para expressões do After Effects
  (`spr(t, frequência Hz, amortecimento)`):

| Remotion `spring` (damping / stiffness / mass) | AE `spr(t, f, z)` | usada em |
|---|---|---|
| 11 / 170 / 0,8 | 2,32 Hz, 0,47 | pop |
| 9 / 120 / 0,9 | 1,84 Hz, 0,43 | queda |
| 12 / 150 / 1 | 1,95 Hz, 0,49 | cascata (por letra, 35 ms entre letras) |
| 13 / 160 / 1 | 2,01 Hz, 0,51 | entrada da roleta |

| Animação | Referência real | Ideia principal |
|---|---|---|
| pop | preset "Pop in" do CapCut / After Effects | escala 0 → passa um pouco de 100% → assenta, com contra-giro de −8° |
| queda | "drop + bounce" de títulos de Reels | cai 420 px com mola pouco amortecida (quica 1 ou 2 vezes) |
| impacto | "impact / slam text" (estilo MrBeast) | 260% → 100% em 0,1 s acelerando, depois a tela treme e para em ~0,3 s |
| cascata | SplitText do GSAP, "typewriter rise" | cada letra sobe 90 px com mola, 35 ms depois da anterior |
| contador | contador com Slider Control do AE (canais de finanças) | ease-out cúbico até o valor em 0,6 s, depois um "soco" de 113% |
| roleta | odômetro / caça-níquel ("number ticker") | no Remotion: cada dígito gira em coluna e trava (o da direita gira mais); no MOGRT: os dígitos embaralham e travam da esquerda para a direita (120 ms entre eles) |

Comum a todas:
- Motion blur com obturador de 180°: o padrão do cinema e do After Effects.
- Brilho de display LED (Glow).
- Contorno preto por fora da letra.
- Opacidade nunca animada (pedido do usuário).

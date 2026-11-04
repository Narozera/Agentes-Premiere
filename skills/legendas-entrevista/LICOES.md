# Lições aprendidas — histórico de casos (legendas-entrevista)

Casos reais, com datas e números, que deram origem às regras do `SKILL.md`. Leia quando um caso parecido aparecer.

- **Teste às cegas de 01/11/2026 (MACHADO, Médico + Pinfer, Mãe Vitin)** — os 3 agentes acharam os mesmos
  defeitos no `captions.ps1`, **corrigidos no mesmo dia** (tempo só do script: MACHADO 79,9→80,9%, Médico
  82,3→84,6%, Mãe Vitin 57,2→59,2%):
  - 1ª palavra trocada (está→tá, para→pra, quatro→4) atrasava a legenda 0,15–1 s. Agora o `Norm` trata as formas
    faladas e os números por extenso como a mesma palavra nos três lados, e se a 1ª ainda não casa (Vou→Vamos) o
    início vem da palavra do Premiere que ela substituiu. Não precisa mais de `premiere-norm.srt`.
  - O snap não leva mais um início para DEPOIS do corte se o Whisper ouviu a 1ª palavra antes dele, nem para dentro
    de um gráfico (a legenda virava TIRADA). Cortes a < 0,3 s um do outro (detecção de cena) contam como um só.
  - Linha que o Premiere não tem pega o tempo do Whisper (saída "TEMPO DO WHISPER").
  - Nova saída **"INICIO x WHISPER"**: inícios a > 0,5 s da 1ª palavra no Whisper. Confira cada um (o Whisper
    também erra, e às vezes fica ~0,4 s adiantado o vídeo todo).
  - **Dump antigo sem `cam`/`cuts`** (projetos de antes de 30/10): o script avisa e pinta tudo de uma cor. Pinte
    pelo falante (perguntas amarelas) e confira que cada troca de falante cai num corte.
- `captions.ps1` (corrigido em 30/10/2026): a checagem de 0,6 s agora roda antes de prender o início em
  `anterior + 0,1` (antes, um início muito errado era "preso" e aceito), legendas em REVISAR mantêm também o fim
  original, e nenhuma legenda sai com fim ≤ início (antes saíam coisas como `39,200 --> 32,570`). Sempre valide
  o SRT final (fim > início, inícios em ordem) antes de importar.
- `transcribe.ps1` (corrigido em 30/10/2026, ERIC "3 IBIRA"): a variável `$model` colidia com o parâmetro `$Model`
  (PowerShell não diferencia maiúsculas; o ValidateSet rejeitava o caminho), então o modelo era procurado como
  `large-v3` na pasta atual e **baixado de novo (3 GB) no diretório de trabalho**. Agora é `$modelPath`. Se aparecer um
  arquivo `large-v3` solto em alguma pasta, é sobra disso.
- **Whisper large-v3 entra em laço** depois de um buraco de silêncio entre entrevistas (ERIC: a 3ª entrevista inteira
  virou a mesma frase repetida em `sent.srt`/`words.csv`) e inventa fala no silêncio ("O que você espera de um homem?"
  num buraco sem clipe de áudio). Sempre olhe o `sent.srt` atrás de linhas repetidas; se houver, corte o trecho do
  `edit.wav` (ffmpeg `-ss`) e transcreva de novo com `-mc 0` (sem contexto), somando o início às marcas de tempo, e
  tire do `words.csv` as palavras que caem onde não há clipe no `dump.audio`. Trechos curtos (2–4 s, `-mc 0 -nt`) são
  um bom jeito de desempatar Premiere × Whisper numa palavra.
- **Câmera 1 pode ser plano aberto com os dois** (ERIC: V1 = plano aberto entrevistador + entrevistada, V2 = close
  dela). Aí a entrevistada também fala com V1 no ar e a cor por câmera erra (~30 legendas dela ficariam amarelas).
  Confira um quadro de cada câmera (ffmpeg no `media` + `in` do dump) e, se for assim, pinte pelo falante (perguntas
  amarelas, respostas brancas) e avise o usuário.
- A regra do `captions.ps1` "legenda curta entre duas do outro falante segue as vizinhas" pinta de amarelo as
  **respostas de uma palavra** no meio de perguntas (ERIC: `Rosa`, `7`, `Boa`, `Solteira`, `Interfere`), mesmo com a
  câmera 2 no ar. Em entrevista de perguntas rápidas, confira a cor de toda legenda de 1 palavra.
- **Whisper large-v3 depois de buraco entre vídeos estica a 1ª frase pelo buraco inteiro** (Perrengues 25-33: a
  pergunta que começa em 229,6 s saiu espalhada de 213,7 a 233 s; a de 65,3 s, de 58 a 69 s) e inventa frase repetida
  no buraco. Isso faz o `captions.ps1` errar a cor e o tempo das primeiras legendas. Corte do `edit.wav` só o começo
  de cada bloco (≈ 8–12 s) e transcreva com `-mc 0`; troque essas palavras no `words.csv` (guarde `words-orig.csv`).
- **Palavra que o Whisper escreve diferente do `texto.txt` não alinha** (ex.: "Braço" × `Brás`) e o tempo dela sai
  por proporção — aí o `captions.ps1` dividiu `aqui no | Brás` num corte errado. Antes de rodar, troque no `words.csv`
  os erros fixos do Whisper pela forma do `texto.txt` (Braço→Brás, Story→Store).
- Em pergunta-resposta muito rápida (respostas de 1–2 palavras, cortes a cada 0,5–1 s), mesmo assim ~20 legendas
  saíram com cor/tempo trocados perto dos cortes. Sempre rode uma checagem final: para cada legenda, a câmera no meio
  dela (`dump.cam`) tem que bater com a cor, nenhuma pode atravessar `dump.cuts`, fim > início, sem sobreposição; e
  corrija à mão com as palavras do Whisper (o Premiere marca a última palavra da pergunta 0,2–0,5 s tarde).
- **`overlay` pode ser a própria câmera** (ERIC "VIDEO URGENTE": V3 tinha uma cópia do clipe da câmera 1, mesma mídia e
  mesmo `in` do V1 — punch-in no tênis). O `dump_timeline.jsx` pôs isso em `overlay` e o `captions.ps1` teria tirado as
  legendas de baixo. Se a mídia do overlay for de câmera (MP4 da entrevista, não gráfico/MOGRT/animação), tire do
  `overlay` (guarde `dump-orig.json`) e avise. O usuário também pode dizer "V3 vazia" sem ser.
- **Palavra de um lado ou do outro de um jump cut**: o Whisper do arquivo inteiro erra (ERIC: pôs `Não só` 0,4 s antes
  do corte e `no seu` antes de outro; os dois eram depois). Transcrever **cada clipe do áudio sozinho**
  (`ffmpeg -ss <start> -to <end>` do `dump.audio`, `whisper-cli -mc 0 -nt`) mostra exatamente que palavras ficam em
  cada clipe. Use nos cortes onde Premiere e Whisper discordam e divida a linha no corte (`mesmo de | honrar`).
- **Emendas de 30 s do Whisper** (ERIC "4 VIDEOS", 02/11/2026): o `words.csv` perdeu `Eu falo que hoje eu tô na minha
  melhor fase a fase do amor próprio` (327,5–330 s, a fala que o Premiere tinha) e repetiu `Exatamente` (179,7/180,0) e
  `um valor. Tem um valor` (209–210) — todos encostados em múltiplos de 30 s. Trechos de 2–8 s com `-mc 0` resolveram.
  No mesmo vídeo o Whisper do arquivo inteiro ficou 0,5–1 s adiantado no 4º bloco (lista INICIO x WHISPER com ~45
  itens); os trechos curtos confirmaram o tempo do Premiere. Cada resposta tinha clipe próprio na câmera 2, então a cor
  por câmera bateu com o falante; exceção: `Sim` dele fora de quadro com a câmera 2 no ar (f0 104 Hz).
- **GUALDEZI "Seguros + Advogada + Consultora" (03/11/2026, 3 entrevistas, 416 legendas do Premiere → 429)**:
  - A pasta `%TEMP%\claude\leg-gualdezi` já tinha `words.csv`, `sent.srt` e `texto.txt` de 30/10 (outro vídeo); o
    laço de espera achou o `sent.srt` velho e parou na hora. Movidos para `antigo-30-10\`.
  - O `edit.wav` inteiro inventou "Olha que coisa maravilhosa, né? Então, eu tenho uma ideia" ×3 no buraco
    178,5–183,2 s (sem clipe de áudio) e deixou o 3º bloco ~0,4–0,5 s atrasado (Premiere `Eu sou advogada` 195,8 x
    Whisper 196,3). Transcrever os 3 blocos separados (`-mc 0`) resolveu os dois; o `words.csv` final saiu deles.
  - Trechos curtos (1–3 s) às vezes inventam ou trocam palavra (`400 clientes`, `E agora tá mais tranquilo`, `14?`):
    quando 4 rodadas discordam, fique com o Premiere e liste.
  - V1 aqui não é DJI: é iPhone em plano aberto com os dois, mas a edição corta para a V2 em toda resposta, então a cor
    pela câmera bateu. Exceções achadas pela voz (ela ~210–260 Hz, ele ~125–175 Hz): o entrevistador repete `R$100 mil`,
    `6 sessões`, completa `sai mais em conta` e diz `É` antes da pergunta com a câmera 2 no ar → amarelas.
  - O `captions.ps1` deixou `É` com 10 ms, `e` com 20/50 ms e `O que que` com 17 ms, colados em cortes; corrigidos à
    mão com o tempo do Premiere (`fix.mjs` em `legendas-trabalho\Sequence 01\`).
  - **Legenda atrasada depois de importada**: enquanto o agente trabalhava (~23 min), o usuário tirou 0,32 s de pausa
    dentro de `por mês` (26,2 s) e 1 frame em 35,4 s, e pôs 6 gráficos na V3. A legenda saiu do `dump.json` antigo e
    entrou ~0,35 s atrasada do 26 s até o fim ("as legendas estão entrando no time errado"). Conserto: `dump-agora.json`,
    `remap.mjs` do SRT corrigido (427 mantidas, 2 caíram no corte), `umas 10`/`por mês` refeitas pelo Whisper do
    trecho atual e pelo corte, 8 tiradas embaixo dos gráficos (`rebase.mjs` na pasta de trabalho) → `Sequence 01 -
    corrigida v2.srt`, 421 legendas.
- **Quem fala, com câmera 1 em plano aberto**: altura da voz (f0 mediana por trecho, autocorrelação em Node sobre o
  `edit.wav`; sem Python na máquina). ERIC: homem 110–140 Hz, mulher 220–260 Hz — resolveu `Aí ó tá vendo` (dela, na
  câmera 2) e `Então tá faltando um homem de verdade` (dele). Script: `legendas-trabalho\video-urgente\` (pitch.mjs).
- **04/11/2026 — MACHADO "3 Bizonho"** (3 entrevistas de rua em Curitiba sobre sexualidade, 419 legendas do Premiere →
  420; máquina do usuário `guilh`, sem `whisper-gpu`):
  - A pasta `%TEMP%\claude\leg-bizonho` já tinha `dump.json`/`words.csv` de uma tentativa de 40 min antes (sem
    `sent.srt`). Movidos para `antigo-1134\` antes de começar.
  - Transcrição direto por bloco (3 blocos, `-mc 0`, palavras + frases): 124 + 131 + 72 s na CPU (i5/20 threads, `-t 16`).
    Sem laço nem fala inventada.
  - V1 = iPhone em plano aberto com os dois, mas a edição corta para a V2 em toda resposta: a cor por câmera bateu,
    menos o `É` em V1 (67,5 s, provável entrevistador) e o `É?` dele com a V2 no ar (243,6 s). As respostas de 1 palavra
    (`De homem`, `Solteiro`, `Não`, `20`, `Sim`) saíram amarelas pela regra das vizinhas e o `Você é bi` / `Por quê que é`
    saíram brancas: 14 cores corrigidas à mão.
  - Whisper do bloco 0,3–0,6 s longe do Premiere em ~35 inícios (para os dois lados). Transcrever os clipes do áudio
    sozinhos (`clips.ps1`) confirmou o Premiere em quase todos; onde o clipe mostrou a palavra do outro lado do corte
    (`Então | vindo` em 24,32; `Então | deu pra | continuar` em 38,48/39,07/39,57; `Como que foi esse` e `E como que foi`
    começando no corte), a linha foi dividida ou levada ao corte.
  - Linhas com palavra nova no começo (`É uma questão`, `É mais de boa`, `a gente tem`) começaram no tempo da 2ª palavra
    (até 0,7 s tarde). Correções à mão com `fix.mjs` + `ops.json` e conferidas com `check.mjs` (cor × câmera, atravessa
    corte, corte perto do início, < 0,15 s, sobreposição) — tudo na pasta `legendas-trabalho\Sequence 01\` do projeto.
- **03/11/2026 — Caio Xavier "Takes bruto"** (monólogo, 8 vídeos numa sequência, 589 legendas do Premiere, 158 clipes).
  Whisper do arquivo inteiro entrou em laço depois do 2º buraco (de 2:57 a 10:03 só frases repetidas); por bloco
  (`-mc 0`) ficou certo. Mesmo por bloco, no bloco 1 os tempos saíram 0,3–0,5 s cedo (`milagre` 9,80 × 10,14 num trecho
  de 1,5 s; `20 mil` 12,70 × 13,18). Com isso, 14 palavras curtas logo depois de um corte ficaram "antes" do corte e o
  `captions.ps1` encaixou a legenda seguinte: `na` (1 ms), `e` (17 ms), `a gente` (34 ms), `Você | tem casa`, `não |
  fica`, `ele não | vai virar`. Transcrevendo cada clipe sozinho, todas estavam depois do corte. Também 68 inícios
  ficaram 1–3 frames antes de um corte e `a isso` (fim do bloco 3) foi encaixada no fim do último clipe. Consertado à
  mão com `fix.js` (pasta `legendas-trabalho\takes-bruto`).
- **04/11/2026 — Caio Xavier "7 Vídeos", Sequence 05** (monólogo, 7 vídeos curtos numa sequência, 540 legendas do
  Premiere → 537; uma câmera, V1; máquina `guilh`, Whisper na CPU, 7 blocos `-mc 0` em ~5 min):
  - A V3 tinha 6 `Graphic` (Essential Graphics, `isMGT` = true) no topo da tela: lidos do `.prproj` eram manchetes
    ("Quanto a sua empresa pagou de juros ao banco em 2026?", "O banco cortou o meu limite sem aviso..."), não animação
    de valor. Com o `overlay` normal o `captions.ps1` teria tirado as legendas dos primeiros 6 s e do 2º vídeo.
    Ficou `overlay` vazio no `dump.json` (`dump-orig.json` guardado).
  - O último clipe (225–234 s, MVI_1672, só títulos, -51 dB) virou "Legenda por Sônia Ruberti" no Whisper; o fim do
    bloco 6 também. Tirados do `words.csv`.
  - 15 inícios 1–3 frames antes de um corte (`Essa`, `é`, `e`, `E`, `mas`, `com o`, `a sua`, `fecha`, `cabe`, `Pode`,
    `então`, `Eu não`...): transcrevendo 1,6 s antes e 1,2 s depois de cada corte, **15 de 15** estavam depois do corte.
    O `captions.ps1` tinha encaixado a legenda seguinte no corte e deixado a palavra com 17–67 ms (e dividido
    `a sua | empresa` e `com o | limite` no corte). Consertado com `fix.mjs` + `ops.json`.
  - Linhas com palavra trocada (`juro`→`juros`, `o`→`ou`, `do apartamento`→`de um apartamento`, `com o aceno`→`que eu
    assino`) pegaram o tempo do Whisper, 0,3–0,45 s cedo; voltaram para o tempo do Premiere da palavra trocada.
    `dívida` (fim do bloco 5) foi encaixada no fim do último clipe (192,82); voltou para 192,38.
  - **Volta depois das animações (mesmo dia)**: o usuário tinha tirado 0,283 s em 79,27 s (ripple). O `remap.mjs`
    manteve 535 e tirou 2: `E` (estava mesmo no pedaço cortado, ouvido sozinho: "porque") e `as portas` (o fim caía no
    corte, mas a fala continua: devolvida com fim no corte 79,267); `como` foi para o corte. Tiradas 11 legendas
    embaixo dos 6 MOGRTs de dinheiro/"mito"; `porque` (invadido 0,117 s) começou no fim da animação. O `fix.mjs` teria
    esticado `é só um limite` e `trás` por cima das animações (buraco < 1 s) — por isso o `fin.mjs`. Entre o dump e a
    importação o usuário pôs mais um título na V5 (fora da linha da legenda): dump de novo logo antes de importar.
    Final: 525 legendas, importadas uma vez.

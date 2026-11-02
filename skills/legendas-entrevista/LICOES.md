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
- **Quem fala, com câmera 1 em plano aberto**: altura da voz (f0 mediana por trecho, autocorrelação em Node sobre o
  `edit.wav`; sem Python na máquina). ERIC: homem 110–140 Hz, mulher 220–260 Hz — resolveu `Aí ó tá vendo` (dela, na
  câmera 2) e `Então tá faltando um homem de verdade` (dele). Script: `legendas-trabalho\video-urgente\` (pitch.mjs).

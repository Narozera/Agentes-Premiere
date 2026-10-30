# Claude + Premiere (Perrengues do Bras)

Skills, agentes e memoria do Claude Code para edicao de entrevistas verticais no Premiere Pro.

- `skills/reenquadrar-entrevistado` - posicao/zoom da camera 2 seguindo o rosto
- `skills/legendas-entrevista` - transcricao (Whisper), correcao, cores e importacao do SRT
- `skills/animacoes-texto` - animacoes de dinheiro, quantidades e anos
- `agents/` - posicionador-video, revisor-legendas, animador-textos
- `projects/.../memory/` - preferencias de edicao

## Instalar em outro computador
1. Clonar este repositorio dentro de `C:\Users\<usuario>\.claude` (ou copiar as pastas `skills` e `agents` para la).
2. Ferramentas externas (nao vao para o GitHub por serem grandes): ffmpeg e whisper.cpp + modelo
   `ggml-large-v3-turbo-q5_0.bin` em `%LOCALAPPDATA%\claude-premiere-tools`. O Claude baixa de novo se pedir.
3. Premiere Pro com o MCP premiere-pro configurado.

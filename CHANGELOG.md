# Registro de Mudanças (Changelog)

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-10-29

### Adicionado
- Estrutura completa de projeto para desenvolvimento profissional e suporte a Google Clasp (`src/`, `.claspignore`, `.clasp.json.example`).
- Manifesto `appsscript.json` com escopos OAuth mínimos necessários explícitos e configuração de fuso horário.
- Proteção preventiva contra estouro de tempo limite do Google Apps Script (interrupção controlada aos 5 minutos para salvar o progresso).
- Tratamento automático de overflow de colunas ao gravar o status na planilha (`insertColumnAfter`).
- Suporte inteligente para links do Google Forms e detecção mista de IDs diretos (tenta arquivo e pasta com fallback gracioso).
- Testes unitários com Jest para funções puras de parsing, conversão e interpretação de erros.
- Integração contínua (CI) com GitHub Actions (`.github/workflows/ci.yml`).
- Configurações de padronização de código: `.editorconfig`, `.eslintrc.json` e `.prettierrc.json`.
- Modelos de Issues para GitHub (`bug_report.md` e `feature_request.md`) e guia `CONTRIBUTING.md`.

### Modificado
- Refatoração do código principal (`code.gs` e `src/Code.js`) para separar responsabilidades de UI, processamento do Drive e I/O de planilha.
- Extração de constantes e configurações para objeto imutável `CONFIG`.
- Atualização completa do `README.md` com instruções detalhadas para Clasp e cópia manual.

## [1.0.0] - 2026-10-29
- Lançamento inicial com menu interativo, processamento em lote e suporte a arquivos e pastas.


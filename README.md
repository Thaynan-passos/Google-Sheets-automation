# 🚀 Google Sheets Drive Permissions Automation

[![CI](https://github.com/tavila/Google-Sheets-automation/actions/workflows/ci.yml/badge.svg)](https://github.com/tavila/Google-Sheets-automation/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8%20Runtime-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Clasp Enabled](https://img.shields.io/badge/Clasp-Ready-0F9D58?logo=google-drive&logoColor=white)](https://github.com/google/clasp)

Automação em **Google Apps Script** para alterar em massa as permissões e níveis de compartilhamento de múltiplos arquivos, planilhas, apresentações, documentos, formulários e pastas do **Google Drive**, a partir de uma lista de links ou IDs em uma planilha do **Google Sheets**.

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Links e Formatos Suportados](#-links-e-formatos-suportados)
- [Como Utilizar](#-como-utilizar)
  - [Opção 1: Cópia Manual (Rápido)](#opção-1-cópia-manual-rápido)
  - [Opção 2: Via Google Clasp (Desenvolvedores)](#opção-2-via-google-clasp-desenvolvedores)
- [Escopos e Permissões OAuth](#-escopos-e-permissões-oauth)
- [Tratamento de Erros e Limites](#-tratamento-de-erros-e-limites)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Desenvolvimento e Testes](#-desenvolvimento-e-testes)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Visão Geral

Gerenciar permissões de dezenas ou centenas de arquivos no Google Drive manualmente consome tempo e é propenso a erros. Este script adiciona um menu interativo ao Google Sheets, orientando o usuário passo a passo para:
- Escolher a coluna que contém os links ou IDs.
- Definir o tipo de visibilidade (Privado, Domínio ou Qualquer pessoa com o link).
- Definir o papel concedido (Leitor, Comentador ou Editor).
- Escolher se deseja propagar permissões recursivamente dentro de pastas.
- Gravar o relatório linha por linha na própria planilha.

---

## ✨ Funcionalidades

- **Menu Integrado no Sheets**: Adicionado automaticamente ao abrir a planilha (`🚀 Automação Drive > Alterar Permissões em Massa`).
- **Processamento em Lote Otimizado**: Lê e grava dados em bloco reduzindo chamadas à API.
- **Detecção Inteligente**: Identifica automaticamente arquivos do Drive, Google Docs, Sheets, Slides, Forms, pastas e IDs puros.
- **Propagação Recursiva para Pastas**: Permite estender a mesma permissão a todos os arquivos e subpastas internos.
- **Proteção Preventiva de Timeout**: O Apps Script possui um limite de 6 minutos de execução contínua; a automação monitora o tempo e pausa preventivamente aos 5 minutos salvando o progresso para evitar erros fatais.
- **Segurança de Limites de Coluna**: Cria automaticamente a coluna de status caso a coluna indicada seja a última da planilha.
- **Diagnóstico Descritivo de Erros**: Traduz exceções técnicas da API em mensagens claras (ex: falta de permissão de editor/proprietário, item inexistente, limite de cota).

---

## 🔗 Links e Formatos Suportados

A ferramenta aceita diversos formatos de entrada na coluna:

| Tipo | Exemplo |
|---|---|
| **Pasta do Drive** | `https://drive.google.com/drive/folders/1A2b3C...` |
| **Pasta com usuário na URL** | `https://drive.google.com/drive/u/0/folders/1A2b3C...` |
| **Planilha Google** | `https://docs.google.com/spreadsheets/d/1XyZ.../edit` |
| **Documento Google** | `https://docs.google.com/document/d/1XyZ.../edit` |
| **Apresentação Google** | `https://docs.google.com/presentation/d/1XyZ.../edit` |
| **Formulário Google** | `https://docs.google.com/forms/d/1XyZ.../edit` |
| **Link de Visualização Direta** | `https://drive.google.com/file/d/1XyZ.../view` |
| **Link com Query Parameter** | `https://drive.google.com/open?id=1XyZ...` |
| **ID Puro** | `1A2b3C4D5E6F7G8H9I0J...` |

---

## 🚀 Como Utilizar

### Opção 1: Cópia Manual (Rápido)

1. Abra a sua planilha no [Google Sheets](https://sheets.google.com).
2. Cole os links ou IDs desejados em qualquer coluna a partir da **linha 2** (a linha 1 é reservada para cabeçalho).
3. No menu superior da planilha, clique em **Extensões > Apps Script**.
4. Apague qualquer código existente no editor e cole todo o conteúdo do arquivo [`code.gs`](./code.gs).
5. Salve o projeto (`Ctrl + S` ou ícone de disquete) e recarregue a página da planilha.
6. Clique no novo menu: **🚀 Automação Drive > Alterar Permissões em Massa**.
7. Na primeira execução, autorize o aplicativo a acessar sua planilha e arquivos do Google Drive.
8. Responda às caixas de diálogo conforme a sua necessidade.

---

### Opção 2: Via Google Clasp (Desenvolvedores)

Se você utiliza a CLI oficial do Google Apps Script ([@google/clasp](https://github.com/google/clasp)):

1. Clone este repositório:
   ```bash
   git clone https://github.com/tavila/Google-Sheets-automation.git
   cd Google-Sheets-automation
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Faça login no Google:
   ```bash
   npx clasp login
   ```
4. Crie o arquivo `.clasp.json` a partir do modelo:
   ```bash
   cp .clasp.json.example .clasp.json
   ```
   *Edite `.clasp.json` inserindo o `scriptId` do seu projeto do Apps Script.*
5. Envie os arquivos para o Apps Script:
   ```bash
   npm run push
   ```

---

## 🔐 Escopos e Permissões OAuth

O projeto utiliza apenas os escopos mínimos necessários no manifesto [`src/appsscript.json`](./src/appsscript.json):

| Escopo OAuth | Finalidade |
|---|---|
| `.../auth/spreadsheets` | Leitura da coluna de links/IDs e registro do status na planilha ativa. |
| `.../auth/drive` | Leitura de metadados e aplicação de regras de compartilhamento nos itens indicados. |

> **Importante:** Para alterar o compartilhamento de um arquivo ou pasta, a sua conta Google precisa ter perfil de **Editor** ou **Proprietário** sobre o item. Se você for apenas **Leitor**, o Google Drive impedirá a alteração por segurança.

---

## ⚠️ Tratamento de Erros e Limites

- **Limite de 6 minutos do Apps Script**: O script possui proteção preventiva integrada. Em listas com muitos itens e pastas profundas, ele para aos 5 minutos, salva os itens processados até então e marca os demais como `Pendente`. Basta executar a ferramenta novamente para continuar.
- **Cota da API do Google Drive**: Em contas pessoais gratuitas, há limites diários de requisições de Drive. O script traduz eventuais respostas de rate-limit com aviso amigável.
- **Inserção de Colunas**: Caso a coluna indicada esteja na extremidade direita da planilha, uma nova coluna é inserida automaticamente para o status, evitando falhas de intervalo fora dos limites.

---

## 📁 Estrutura do Projeto

```text
Google-Sheets-automation/
├── .github/
│   ├── workflows/
│   │   └── ci.yml               # Workflow de integração contínua (Lint & Test)
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md        # Modelo de relato de bug
│       └── feature_request.md   # Modelo de solicitação de funcionalidade
├── src/
│   ├── Code.js                  # Código fonte modular para Apps Script / Clasp
│   └── appsscript.json          # Manifesto do Apps Script (V8, fusos e escopos OAuth)
├── tests/
│   └── utils.test.js            # Testes unitários para parsing, validação e conversão
├── .clasp.json.example          # Exemplo de configuração da CLI Clasp
├── .claspignore                 # Arquivos ignorados no push do Clasp
├── .editorconfig                # Padronização de formatação para editores
├── .eslintrc.json               # Regras do ESLint para JavaScript / Google Apps Script
├── .gitignore                   # Arquivos ignorados pelo Git e credenciais
├── .prettierrc.json             # Regras de formatação do Prettier
├── CHANGELOG.md                 # Histórico de alterações e versões
├── CONTRIBUTING.md              # Diretrizes de contribuição
├── LICENSE                      # Licença Apache 2.0
├── README.md                    # Documentação principal
├── code.gs                      # Arquivo pronto para cópia direta no editor web
└── package.json                 # Metadados do projeto, scripts e dependências
```

---

## 🧪 Desenvolvimento e Testes

Para executar a verificação de sintaxe, formatação e os testes unitários:

```bash
# Executar os testes unitários (Jest)
npm test

# Executar a verificação de código (ESLint)
npm run lint

# Formatar o código (Prettier)
npm run format
```

---

## 🤝 Contribuição

Contribuições são muito bem-vindas! Sinta-se à vontade para abrir uma *Issue* ou enviar um *Pull Request*. Por favor, consulte o [Guia de Contribuição](./CONTRIBUTING.md) para mais detalhes.

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença **Apache 2.0**. Consulte o arquivo [LICENSE](./LICENSE) para obter detalhes completos.

# Google-Sheets-automation
# Automação de Permissões no Google Drive via Google Sheets

Script em Google Apps Script para alterar em massa o nível de acesso (permissões de compartilhamento) de várias planilhas, arquivos ou pastas do Google Drive, a partir de uma lista de links ou IDs inseridos numa planilha do Google Sheets.

## O que faz

- Lê uma coluna de uma planilha do Google Sheets contendo links ou IDs de arquivos ou **pastas** do Drive.
- Adiciona automaticamente um menu no Google Sheets (**🚀 Automação Drive > Alterar Permissões em Massa**).
- Pergunta interativamente (via caixas de diálogo):
  1. Qual coluna contém os links/IDs.
  2. Qual tipo de visibilidade aplicar:
     - **1** — Bloquear acesso (privado, somente quem já tem permissão direta)
     - **2** — Restringir ao domínio da organização
     - **3** — Liberar para qualquer pessoa com o link
  3. Qual nível de permissão conceder no link (caso opções 2 ou 3):
     - **1** — Leitor
     - **2** — Comentador
     - **3** — Editor
  4. Se houver pastas na lista, opção de **replicar recursivamente** a permissão a todos os arquivos contidos.
  5. Opção de gravar o status (**Sucesso/Erro**) diretamente em uma coluna ao lado na planilha.
- Exibe um relatório final com total de sucessos e erros.

## Como usar

1. Crie uma planilha no Google Sheets e cole os links/IDs a partir da célula `A2` (linha 1 reservada para cabeçalho).
2. Vá em **Extensões > Apps Script**, apague o código padrão e cole o conteúdo de [`code.gs`](./code.gs).
3. Salve o projeto e recarregue a página da planilha.
4. Use o novo menu **🚀 Automação Drive > Alterar Permissões em Massa** (ou vincule um botão desenhado à função `liberarPlanilhasSelecionadas`).
5. Na primeira execução, autorize o acesso ao Google Drive quando solicitado pelo Google.
6. Siga as instruções das caixas de diálogo interativas.

> **Atenção:** Você precisa ter perfil de **Editor** ou **Proprietário** sobre os arquivos ou pastas listados para conseguir alterar permissões de compartilhamento. Se você for apenas **Leitor**, o Google Drive bloqueará a alteração por segurança.

## Funções principais

| Função | Descrição |
|---|---|
| `onOpen()` | Cria o menu interativo automaticamente ao abrir a planilha. |
| `liberarPlanilhasSelecionadas()` | Função principal, dispara todo o fluxo de validação e execução em lote. |
| `propagarPermissaoPasta(pasta, access, permission)` | Aplica recursivamente as regras a arquivos e subpastas de uma pasta informada. |
| `aplicarPermissao(itemDrive, access, permission)` | Centraliza a alteração de compartilhamento para arquivos e pastas. |
| `extrairInfoDrive(texto)` | Identifica se a URL/ID refere-se a uma Pasta ou Arquivo e extrai o ID correspondente. |
| `letraParaIndiceColuna(letra)` | Converte letra de coluna (ex: `A`, `B`, `AA`) em índice numérico. |
| `interpretarErro(erro, valorOriginal)` | Traduz erros do Google Apps Script em diagnósticos amigáveis. |


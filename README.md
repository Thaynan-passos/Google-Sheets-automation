# Google-Sheets-automation
# Automação de Permissões no Google Drive via Google Sheets

Script em Google Apps Script para alterar em massa o nível de acesso (permissões de compartilhamento) de várias planilhas/arquivos do Google Drive, a partir de uma lista de links ou IDs inseridos numa planilha do Google Sheets.

## O que faz

- Lê uma coluna de uma planilha do Google Sheets contendo links ou IDs de arquivos do Drive.
- Pergunta interativamente (via caixas de diálogo):
  1. Qual coluna contém os links/IDs.
  2. Qual tipo de acesso aplicar:
     - **1** — Bloquear acesso (privado)
     - **2** — Restringir ao domínio da organização
     - **3** — Liberar para qualquer pessoa com o link
- Aplica a permissão escolhida em cada arquivo da lista.
- Exibe um relatório final com total de sucessos e erros.

## Como usar

1. Crie uma planilha em branco no Google Sheets e cole os links/IDs a partir da célula `A2` (linha 1 reservada para cabeçalho).
2. Vá em **Extensões > Apps Script**, apague o código padrão e cole o conteúdo de [`Code.gs`](./Code.gs).
3. Salve o projeto.
4. (Opcional) Crie um botão na planilha (**Inserir > Desenho**) e vincule-o à função `liberarPlanilhasSelecionadas` (três pontos no botão > **Transferir script**).
5. Execute o script (pelo botão ou pelo editor). Na primeira execução, autorize o acesso ao Drive.
6. Siga as etapas interativas: informe a coluna e o tipo de acesso desejado.

> **Atenção:** você precisa ter permissão de proprietário ou editor sobre os arquivos listados para conseguir alterar o compartilhamento deles.

## Arquivos

- [`Code.gs`](./Code.gs) — código-fonte do Google Apps Script.
- [`documentacao_automacao_drive.pdf`](./documentacao_automacao_drive.pdf) — documentação completa em PDF, com passo a passo e screenshots.

## Funções principais

| Função | Descrição |
|---|---|
| `liberarPlanilhasSelecionadas()` | Função principal, dispara todo o fluxo. |
| `obterConfiguracaoAcesso(opcao)` | Retorna a configuração de acesso do Drive conforme a opção escolhida. |
| `letraParaIndiceColuna(letra)` | Converte letra de coluna (ex: `A`, `B`) em índice numérico. |
| `extrairIdPlanilha(texto)` | Extrai o ID do arquivo a partir de um link completo ou já retorna o ID se for informado diretamente. |

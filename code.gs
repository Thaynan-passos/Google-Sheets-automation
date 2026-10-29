/**
 * @file Google Sheets Drive Permissions Automation
 * @description Script em Google Apps Script para gerenciamento e alteração em lote
 * de permissões de compartilhamento no Google Drive a partir do Google Sheets.
 * @license Apache-2.0
 */

/**
 * Configurações e constantes do sistema.
 * @constant
 */
const CONFIG = Object.freeze({
  MENU: {
    NAME: "🚀 Automação Drive",
    ACTION_TITLE: "Alterar Permissões em Massa",
    ACTION_FUNCTION: "liberarPlanilhasSelecionadas",
  },
  SHEET: {
    HEADER_ROW: 1,
    DATA_START_ROW: 2,
    STATUS_HEADER: "Status da Automação",
  },
  EXECUTION: {
    // Limite de segurança de 5 minutos (evita o corte abrupto pelo timeout de 6 min do Apps Script)
    MAX_RUNTIME_MS: 5 * 60 * 1000,
    MAX_DISPLAY_ERRORS: 10,
  },
  ACCESS_OPTIONS: {
    PRIVATE: "1",
    DOMAIN: "2",
    ANYONE: "3",
  },
  PERMISSION_OPTIONS: {
    VIEW: "1",
    COMMENT: "2",
    EDIT: "3",
  },
});

/**
 * Cria o menu interativo na barra superior da planilha ao ser aberta.
 * @param {GoogleAppsScript.Events.SheetsOnOpen} [e] Evento de abertura da planilha.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu(CONFIG.MENU.NAME)
    .addItem(CONFIG.MENU.ACTION_TITLE, CONFIG.MENU.ACTION_FUNCTION)
    .addToUi();
}

/**
 * Função principal para processamento em lote de permissões no Google Drive.
 * Conduz o usuário pelas etapas de configuração via diálogos e executa o processamento.
 */
function liberarPlanilhasSelecionadas() {
  const ui = SpreadsheetApp.getUi();
  const abaAtiva = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ultimaLinha = abaAtiva.getLastRow();

  if (ultimaLinha < CONFIG.SHEET.DATA_START_ROW) {
    ui.alert(
      "Aviso",
      `Não existem dados para processar a partir da linha ${CONFIG.SHEET.DATA_START_ROW}.`,
      ui.ButtonSet.OK
    );
    return;
  }

  // Coleta as preferências do usuário via diálogos
  const configuracao = solicitarEntradasDoUsuario(ui);
  if (!configuracao) {
    return; // Usuário cancelou ou inseriu opções inválidas
  }

  const { colunaIndice, colunaLetra, tipoAcesso, permissaoEscolhida, descPermissao, propagarArquivosPasta, gravarStatus } = configuracao;

  const totalLinhas = ultimaLinha - CONFIG.SHEET.DATA_START_ROW + 1;
  const dados = abaAtiva.getRange(CONFIG.SHEET.DATA_START_ROW, colunaIndice, totalLinhas, 1).getValues();

  const colunaStatusIndice = colunaIndice + 1;
  const statusAtualizacoes = [];
  const detalhesErros = [];

  let sucesso = 0;
  let erros = 0;
  let ignorados = 0;
  let interrompidoPorTempo = false;
  const inicioExecucao = Date.now();

  for (let i = 0; i < dados.length; i++) {
    const linha = i + CONFIG.SHEET.DATA_START_ROW;
    const valor = String(dados[i][0] || "").trim();

    // Verificação de timeout de segurança
    if (Date.now() - inicioExecucao > CONFIG.EXECUTION.MAX_RUNTIME_MS) {
      interrompidoPorTempo = true;
      Logger.log(`Execução pausada na linha ${linha} para evitar timeout de 6 minutos.`);
      break;
    }

    if (!valor) {
      statusAtualizacoes.push([""]);
      ignorados++;
      continue;
    }

    try {
      const infoItem = extrairInfoDrive(valor);
      if (!infoItem) {
        throw new Error("ID_INVALIDO");
      }

      const itemResolvido = obterItemDrive(infoItem);
      const { item, isFolder, nome } = itemResolvido;

      // Aplica a permissão ao item (arquivo ou pasta)
      aplicarPermissao(item, tipoAcesso.access, permissaoEscolhida);

      if (isFolder) {
        let countFilhos = 0;
        if (propagarArquivosPasta) {
          countFilhos = propagarPermissaoPasta(item, tipoAcesso.access, permissaoEscolhida);
        }
        sucesso++;
        const infoSub = propagarArquivosPasta ? ` (+${countFilhos} itens internos)` : "";
        statusAtualizacoes.push([`✅ Pasta atualizada${infoSub}`]);
        Logger.log(`Linha ${linha}: Pasta '${nome}' atualizada com sucesso.`);
      } else {
        sucesso++;
        statusAtualizacoes.push([`✅ Arquivo atualizado (${tipoAcesso.descricao})`]);
        Logger.log(`Linha ${linha}: Arquivo '${nome}' atualizado (${tipoAcesso.descricao}).`);
      }
    } catch (erro) {
      erros++;
      const descricaoAmigavel = interpretarErro(erro, valor);
      statusAtualizacoes.push([`❌ ${descricaoAmigavel}`]);
      detalhesErros.push(`Linha ${linha}: ${descricaoAmigavel}`);
      Logger.log(`ERRO na linha ${linha} (valor='${valor}'): ${erro.message || erro}`);
    }
  }

  // Preenche linhas restantes caso tenha havido interrupção preventiva por tempo
  if (interrompidoPorTempo) {
    while (statusAtualizacoes.length < dados.length) {
      statusAtualizacoes.push(["⏳ Pendente (tempo limite atingido, execute novamente)"]);
    }
  }

  // Grava o status na planilha em lote
  if (gravarStatus && statusAtualizacoes.length > 0) {
    gravarStatusNaPlanilha(abaAtiva, colunaStatusIndice, statusAtualizacoes);
  }

  // Exibe o relatório final ao usuário
  exibirRelatorioFinal(ui, {
    colunaLetra,
    tipoAcesso,
    descPermissao,
    sucesso,
    erros,
    ignorados,
    detalhesErros,
    interrompidoPorTempo,
  });
}

/**
 * Solicita interativamente todas as entradas do usuário por meio de caixas de diálogo.
 * @param {GoogleAppsScript.Base.Ui} ui Interface de usuário do Google Sheets.
 * @returns {Object|null} Objeto com os parâmetros de configuração ou null se cancelado.
 */
function solicitarEntradasDoUsuario(ui) {
  // 1. Pergunta a coluna dos links ou IDs
  const respColuna = ui.prompt(
    "Coluna dos links ou IDs",
    "Digite a letra da coluna onde estão os links ou IDs (ex: A, B, C...):",
    ui.ButtonSet.OK_CANCEL
  );
  if (respColuna.getSelectedButton() !== ui.Button.OK) return null;

  const colunaLetra = respColuna.getResponseText().trim().toUpperCase();
  const colunaIndice = letraParaIndiceColuna(colunaLetra);
  if (colunaIndice <= 0) {
    ui.alert("Coluna inválida", "Digite apenas letras válidas (ex: A, B, AA).", ui.ButtonSet.OK);
    return null;
  }

  // 2. Pergunta o tipo de visibilidade do link
  const respAcesso = ui.prompt(
    "Tipo de Visibilidade",
    "Escolha o tipo de visibilidade do link digitando o número correspondente:\n\n" +
      "1 - Bloqueado / Privado (somente quem já tem permissão direta)\n" +
      "2 - Restrito ao domínio da organização (com o link)\n" +
      "3 - Qualquer pessoa com o link",
    ui.ButtonSet.OK_CANCEL
  );
  if (respAcesso.getSelectedButton() !== ui.Button.OK) return null;

  const tipoAcesso = mapearTipoAcesso(respAcesso.getResponseText().trim());
  if (!tipoAcesso) {
    ui.alert("Opção inválida", "Opção de visibilidade inválida. Digite 1, 2 ou 3.", ui.ButtonSet.OK);
    return null;
  }

  // 3. Se não for privado, escolhe o nível de permissão concedido pelo link
  let permissaoEscolhida = DriveApp.Permission.VIEW;
  let descPermissao = "Leitor";

  if (tipoAcesso.access !== DriveApp.Access.PRIVATE) {
    const respPermissao = ui.prompt(
      "Nível de Permissão",
      "Qual permissão conceder para quem acessar o link?\n\n" +
        "1 - Leitor (Somente visualização)\n" +
        "2 - Comentador (Pode comentar)\n" +
        "3 - Editor (Pode editar)",
      ui.ButtonSet.OK_CANCEL
    );
    if (respPermissao.getSelectedButton() !== ui.Button.OK) return null;

    const permissaoMapeada = mapearNivelPermissao(respPermissao.getResponseText().trim());
    if (!permissaoMapeada) {
      ui.alert("Opção inválida", "Opção de nível de permissão inválida. Operação cancelada.", ui.ButtonSet.OK);
      return null;
    }
    permissaoEscolhida = permissaoMapeada.permission;
    descPermissao = permissaoMapeada.descricao;
  }

  // 4. Pergunta sobre o comportamento em caso de pastas
  const propagarArquivosPasta =
    ui.alert(
      "Comportamento com Pastas",
      "Se houver pastas na lista, deseja aplicar a mesma permissão a TODOS os arquivos dentro delas?",
      ui.ButtonSet.YES_NO
    ) === ui.Button.YES;

  // 5. Pergunta se deseja registrar o status na planilha
  const gravarStatus =
    ui.alert(
      "Gravar Status na Planilha?",
      "Deseja gravar o resultado (Sucesso/Erro) na coluna ao lado dos links?",
      ui.ButtonSet.YES_NO
    ) === ui.Button.YES;

  return {
    colunaLetra,
    colunaIndice,
    tipoAcesso,
    permissaoEscolhida,
    descPermissao,
    propagarArquivosPasta,
    gravarStatus,
  };
}

/**
 * Resolve o objeto do Drive (Arquivo ou Pasta) de forma inteligente.
 * @param {{ id: string, tipo: string }} info Informações extraídas do link/ID.
 * @returns {{ item: GoogleAppsScript.Drive.File|GoogleAppsScript.Drive.Folder, isFolder: boolean, nome: string }}
 */
function obterItemDrive(info) {
  if (info.tipo === "PASTA") {
    const pasta = DriveApp.getFolderById(info.id);
    return { item: pasta, isFolder: true, nome: pasta.getName() };
  }

  if (info.tipo === "ARQUIVO") {
    const arquivo = DriveApp.getFileById(info.id);
    return { item: arquivo, isFolder: false, nome: arquivo.getName() };
  }

  // Se o tipo for indeterminado (ex: ID puro ou link com ?id=), tenta como arquivo e depois como pasta
  try {
    const arquivo = DriveApp.getFileById(info.id);
    return { item: arquivo, isFolder: false, nome: arquivo.getName() };
  } catch (e) {
    const pasta = DriveApp.getFolderById(info.id);
    return { item: pasta, isFolder: true, nome: pasta.getName() };
  }
}

/**
 * Aplica a regra de compartilhamento em um Arquivo ou Pasta do Drive.
 * @param {GoogleAppsScript.Drive.File|GoogleAppsScript.Drive.Folder} itemDrive Item do Google Drive.
 * @param {GoogleAppsScript.Drive.Access} access Tipo de acesso (PRIVATE, DOMAIN, ANYONE...).
 * @param {GoogleAppsScript.Drive.Permission} permission Nível de permissão (VIEW, COMMENT, EDIT).
 */
function aplicarPermissao(itemDrive, access, permission) {
  if (access === DriveApp.Access.PRIVATE) {
    itemDrive.setSharing(access, DriveApp.Permission.NONE);
  } else {
    itemDrive.setSharing(access, permission);
  }
}

/**
 * Percorre recursivamente todos os arquivos e subpastas para aplicar a mesma permissão.
 * @param {GoogleAppsScript.Drive.Folder} pasta Pasta raiz da propagação.
 * @param {GoogleAppsScript.Drive.Access} access Tipo de acesso.
 * @param {GoogleAppsScript.Drive.Permission} permission Nível de permissão.
 * @returns {number} Quantidade total de arquivos e subpastas atualizados.
 */
function propagarPermissaoPasta(pasta, access, permission) {
  let contador = 0;

  // Arquivos contidos na pasta
  const arquivos = pasta.getFiles();
  while (arquivos.hasNext()) {
    const arq = arquivos.next();
    try {
      aplicarPermissao(arq, access, permission);
      contador++;
    } catch (e) {
      Logger.log(`Não foi possível alterar arquivo filho '${arq.getName()}': ${e.message || e}`);
    }
  }

  // Subpastas recursivas
  const subpastas = pasta.getFolders();
  while (subpastas.hasNext()) {
    const sub = subpastas.next();
    try {
      aplicarPermissao(sub, access, permission);
      contador++;
      contador += propagarPermissaoPasta(sub, access, permission);
    } catch (e) {
      Logger.log(`Não foi possível alterar subpasta '${sub.getName()}': ${e.message || e}`);
    }
  }

  return contador;
}

/**
 * Grava a lista de status de processamento na planilha com tratamento de overflow de colunas.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} aba Aba ativa da planilha.
 * @param {number} colunaIndice Índice numérico da coluna de status (1-based).
 * @param {Array<Array<string>>} statusLista Matriz de status a serem inseridos.
 */
function gravarStatusNaPlanilha(aba, colunaIndice, statusLista) {
  const maxColunas = aba.getMaxColumns();
  if (colunaIndice > maxColunas) {
    aba.insertColumnAfter(maxColunas);
  }

  aba.getRange(CONFIG.SHEET.HEADER_ROW, colunaIndice).setValue(CONFIG.SHEET.STATUS_HEADER);
  aba.getRange(CONFIG.SHEET.DATA_START_ROW, colunaIndice, statusLista.length, 1).setValues(statusLista);
  SpreadsheetApp.flush();
}

/**
 * Exibe o diálogo com o resumo final da automação.
 * @param {GoogleAppsScript.Base.Ui} ui Interface de usuário.
 * @param {Object} dadosRelatorio Dados compilados da execução.
 */
function exibirRelatorioFinal(ui, dadosRelatorio) {
  const { colunaLetra, tipoAcesso, descPermissao, sucesso, erros, ignorados, detalhesErros, interrompidoPorTempo } = dadosRelatorio;

  let mensagemFinal =
    `Automação concluída!\n\n` +
    `• Coluna processada: ${colunaLetra}\n` +
    `• Visibilidade: ${tipoAcesso.descricao}\n` +
    (tipoAcesso.access !== DriveApp.Access.PRIVATE ? `• Permissão: ${descPermissao}\n` : "") +
    `• Sucessos: ${sucesso}\n` +
    `• Erros: ${erros}\n` +
    `• Linhas em branco: ${ignorados}`;

  if (interrompidoPorTempo) {
    mensagemFinal += `\n\n⚠️ Atenção: A execução foi pausada preventivamente aos 5 minutos para evitar o limite de tempo do Google Apps Script. Reexecute para processar os itens pendentes.`;
  }

  if (detalhesErros.length > 0) {
    mensagemFinal +=
      `\n\nResumo dos erros:\n` +
      detalhesErros.slice(0, CONFIG.EXECUTION.MAX_DISPLAY_ERRORS).join("\n");
    if (detalhesErros.length > CONFIG.EXECUTION.MAX_DISPLAY_ERRORS) {
      mensagemFinal += `\n... e mais ${detalhesErros.length - CONFIG.EXECUTION.MAX_DISPLAY_ERRORS} erro(s). Veja na coluna de status ou no log de execuções.`;
    }
  }

  ui.alert("Resultado", mensagemFinal, ui.ButtonSet.OK);
}

/**
 * Traduz erros do Google Apps Script em diagnósticos amigáveis e explicativos.
 * @param {Error|string} erro Erro capturado.
 * @param {string} valorOriginal Texto/link original informado na célula.
 * @returns {string} Mensagem amigável descritiva.
 */
function interpretarErro(erro, valorOriginal) {
  const msg = (erro && erro.message) ? erro.message : String(erro);

  if (msg.includes("ID_INVALIDO")) {
    return `ID inválido no valor '${valorOriginal}'.`;
  }
  if (/permission|permissão|access denied|does not have permission/i.test(msg)) {
    return "Sem permissão. Se você é apenas 'Leitor' do arquivo/pasta, o Google Drive não permite alterar o compartilhamento.";
  }
  if (/not found|não encontrado|no such file/i.test(msg)) {
    return "Arquivo ou pasta não encontrado (ou está na lixeira).";
  }
  if (/owner|proprietário/i.test(msg)) {
    return "Ação restrita ao proprietário do arquivo/pasta.";
  }
  if (/domain|domínio/i.test(msg)) {
    return "Falha na restrição por domínio (o arquivo pode não pertencer a um Google Workspace).";
  }
  if (/quota|limite|rate limit/i.test(msg)) {
    return "Limite de cota da API do Drive atingido temporariamente. Tente novamente mais tarde.";
  }
  if (/exceeded maximum execution time/i.test(msg)) {
    return "Tempo máximo de execução atingido.";
  }

  return `Erro inesperado: ${msg}`;
}

/**
 * Mapeia a opção numérica informada para as constantes de visibilidade do Google Drive.
 * @param {string} opcao Entrada numérica do usuário ("1", "2" ou "3").
 * @returns {{ access: GoogleAppsScript.Drive.Access, descricao: string }|null}
 */
function mapearTipoAcesso(opcao) {
  switch (opcao) {
    case CONFIG.ACCESS_OPTIONS.PRIVATE:
      return { access: DriveApp.Access.PRIVATE, descricao: "Bloqueado (Privado)" };
    case CONFIG.ACCESS_OPTIONS.DOMAIN:
      return { access: DriveApp.Access.DOMAIN_WITH_LINK, descricao: "Restrito ao domínio" };
    case CONFIG.ACCESS_OPTIONS.ANYONE:
      return { access: DriveApp.Access.ANYONE_WITH_LINK, descricao: "Qualquer pessoa com link" };
    default:
      return null;
  }
}

/**
 * Mapeia a opção numérica informada para as constantes de nível de permissão do Google Drive.
 * @param {string} opcao Entrada numérica do usuário ("1", "2" ou "3").
 * @returns {{ permission: GoogleAppsScript.Drive.Permission, descricao: string }|null}
 */
function mapearNivelPermissao(opcao) {
  switch (opcao) {
    case CONFIG.PERMISSION_OPTIONS.VIEW:
      return { permission: DriveApp.Permission.VIEW, descricao: "Leitor" };
    case CONFIG.PERMISSION_OPTIONS.COMMENT:
      return { permission: DriveApp.Permission.COMMENT, descricao: "Comentador" };
    case CONFIG.PERMISSION_OPTIONS.EDIT:
      return { permission: DriveApp.Permission.EDIT, descricao: "Editor" };
    default:
      return null;
  }
}

/**
 * Converte a letra da coluna (A, B, AA, AB...) em índice numérico (1-based).
 * @param {string} letra Letra ou sequência de letras representando a coluna.
 * @returns {number} Índice correspondente da coluna (1 para A, 2 para B...) ou 0 se inválido.
 */
function letraParaIndiceColuna(letra) {
  if (!letra || typeof letra !== "string") return 0;
  const limpo = letra.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(limpo)) return 0;

  let indice = 0;
  for (let i = 0; i < limpo.length; i++) {
    indice = indice * 26 + (limpo.charCodeAt(i) - 64);
  }
  return indice;
}

/**
 * Extrai o ID e o tipo presumido do item (PASTA, ARQUIVO ou AUTO) a partir do texto/URL.
 * Suporta planilhas, documentos, apresentações, formulários, links de compartilhamento e IDs diretos.
 * @param {string} texto Link completo ou ID fornecido pelo usuário.
 * @returns {{ id: string, tipo: "PASTA"|"ARQUIVO"|"AUTO" }|null} Informações do item ou null se inválido.
 */
function extrairInfoDrive(texto) {
  if (!texto || typeof texto !== "string") return null;
  const limpo = texto.trim();

  // 1. Link de Pasta: /folders/ID ou /drive/u/0/folders/ID
  const padraoPasta = limpo.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (padraoPasta && padraoPasta[1]) {
    return { id: padraoPasta[1], tipo: "PASTA" };
  }

  // 2. Link de Arquivo/Planilha/Doc/Slide/Form: /spreadsheets/d/ID, /file/d/ID, /document/d/ID, /presentation/d/ID, /forms/d/ID
  const padraoArquivo = limpo.match(/\/(?:spreadsheets|file|document|presentation|forms)\/d\/([a-zA-Z0-9_-]+)/);
  if (padraoArquivo && padraoArquivo[1]) {
    return { id: padraoArquivo[1], tipo: "ARQUIVO" };
  }

  // 3. Link com parâmetro de consulta: ?id=ID ou &id=ID (ex: drive.google.com/open?id=...)
  const padraoQuery = limpo.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (padraoQuery && padraoQuery[1]) {
    return { id: padraoQuery[1], tipo: "AUTO" };
  }

  // 4. ID direto (alfanumérico de 15 caracteres ou mais)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(limpo)) {
    return { id: limpo, tipo: "AUTO" };
  }

  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONFIG,
    letraParaIndiceColuna,
    extrairInfoDrive,
    mapearTipoAcesso,
    mapearNivelPermissao,
    interpretarErro,
  };
}


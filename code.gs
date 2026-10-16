/**
 * Adiciona um menu personalizado na barra superior do Google Sheets ao abrir a planilha.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 Automação Drive")
    .addItem("Alterar Permissões em Massa", "liberarPlanilhasSelecionadas")
    .addToUi();
}

/**
 * Função principal para processamento em lote de permissões no Google Drive.
 * Suporta planilhas, arquivos avulsos e pastas (com opção de replicar aos arquivos internos).
 */
function liberarPlanilhasSelecionadas() {
  const ui = SpreadsheetApp.getUi();
  const abaAtiva = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ultimaLinha = abaAtiva.getLastRow();

  if (ultimaLinha < 2) {
    ui.alert("Aviso", "Não existem linhas para processar a partir da linha 2.", ui.ButtonSet.OK);
    return;
  }

  // 1. Pergunta a coluna dos links ou IDs
  const respColuna = ui.prompt(
    "Coluna dos links ou IDs",
    "Digite a letra da coluna onde estão os links ou IDs (ex: A, B, C...):",
    ui.ButtonSet.OK_CANCEL
  );
  if (respColuna.getSelectedButton() !== ui.Button.OK) return;

  const colunaLetra = respColuna.getResponseText().trim().toUpperCase();
  if (!/^[A-Z]+$/.test(colunaLetra)) {
    ui.alert("Coluna inválida. Digite apenas letras (ex: A, B, AA).");
    return;
  }
  const colunaIndice = letraParaIndiceColuna(colunaLetra);

  // 2. Pergunta o tipo de visibilidade do link
  const respAcesso = ui.prompt(
    "Tipo de Visibilidade",
    "Escolha o tipo de visibilidade do link digitando o número correspondente:\n\n" +
      "1 - Bloqueado / Privado (somente quem já tem permissão direta)\n" +
      "2 - Restrito ao domínio da organização (com o link)\n" +
      "3 - Qualquer pessoa com o link",
    ui.ButtonSet.OK_CANCEL
  );
  if (respAcesso.getSelectedButton() !== ui.Button.OK) return;

  const tipoAcesso = mapearTipoAcesso(respAcesso.getResponseText().trim());
  if (!tipoAcesso) {
    ui.alert("Opção inválida. Digite 1, 2 ou 3.");
    return;
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
    if (respPermissao.getSelectedButton() !== ui.Button.OK) return;

    switch (respPermissao.getResponseText().trim()) {
      case "1":
        permissaoEscolhida = DriveApp.Permission.VIEW;
        descPermissao = "Leitor";
        break;
      case "2":
        permissaoEscolhida = DriveApp.Permission.COMMENT;
        descPermissao = "Comentador";
        break;
      case "3":
        permissaoEscolhida = DriveApp.Permission.EDIT;
        descPermissao = "Editor";
        break;
      default:
        ui.alert("Opção inválida. Operação cancelada.");
        return;
    }
  }

  // 4. Pergunta sobre o comportamento em caso de pastas
  const propagarArquivosPasta = ui.alert(
    "Comportamento com Pastas",
    "Se houver pastas na lista, deseja aplicar a mesma permissão a TODOS os arquivos dentro delas?",
    ui.ButtonSet.YES_NO
  ) === ui.Button.YES;

  // 5. Pergunta se deseja registrar o status na planilha
  const gravarStatus = ui.alert(
    "Gravar Status na Planilha?",
    "Deseja gravar o resultado (Sucesso/Erro) na coluna ao lado dos links?",
    ui.ButtonSet.YES_NO
  ) === ui.Button.YES;

  const totalLinhas = ultimaLinha - 1;
  const dados = abaAtiva.getRange(2, colunaIndice, totalLinhas, 1).getValues();

  const colunaStatusIndice = colunaIndice + 1;
  const statusAtualizacoes = [];

  let sucesso = 0;
  let erros = 0;
  let ignorados = 0;
  const detalhesErros = [];

  for (let i = 0; i < dados.length; i++) {
    const linha = i + 2;
    const valor = String(dados[i][0]).trim();

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

      let nomeItem = "";

      if (infoItem.tipo === "PASTA") {
        const pasta = DriveApp.getFolderById(infoItem.id);
        nomeItem = pasta.getName();

        // Altera a pasta
        aplicarPermissao(pasta, tipoAcesso.access, permissaoEscolhida);

        // Se solicitado, replica aos arquivos contidos
        let countFilhos = 0;
        if (propagarArquivosPasta) {
          countFilhos = propagarPermissaoPasta(pasta, tipoAcesso.access, permissaoEscolhida);
        }

        sucesso++;
        const infoSub = propagarArquivosPasta ? ` (+${countFilhos} arquivos internos)` : "";
        statusAtualizacoes.push([`✅ Pasta atualizada${infoSub}`]);
        Logger.log(`Linha ${linha}: Pasta '${nomeItem}' atualizada.`);

      } else {
        // Arquivo ou Planilha
        const arquivo = DriveApp.getFileById(infoItem.id);
        nomeItem = arquivo.getName();

        aplicarPermissao(arquivo, tipoAcesso.access, permissaoEscolhida);

        sucesso++;
        statusAtualizacoes.push([`✅ Arquivo atualizado (${tipoAcesso.descricao})`]);
        Logger.log(`Linha ${linha}: '${nomeItem}' → ${tipoAcesso.descricao}`);
      }

    } catch (erro) {
      erros++;
      const descricaoAmigavel = interpretarErro(erro, valor);
      statusAtualizacoes.push([`❌ ${descricaoAmigavel}`]);
      detalhesErros.push(`Linha ${linha}: ${descricaoAmigavel}`);
      Logger.log(`ERRO linha ${linha} (valor='${valor}'): ${erro.message}`);
    }
  }

  // Grava o status na planilha de uma vez só em lote
  if (gravarStatus) {
    abaAtiva.getRange(1, colunaStatusIndice).setValue("Status da Automação");
    abaAtiva.getRange(2, colunaStatusIndice, statusAtualizacoes.length, 1).setValues(statusAtualizacoes);
  }

  // Resumo final
  let mensagemFinal =
    `Automação concluída!\n\n` +
    `• Coluna processada: ${colunaLetra}\n` +
    `• Visibilidade: ${tipoAcesso.descricao}\n` +
    (tipoAcesso.access !== DriveApp.Access.PRIVATE ? `• Permissão: ${descPermissao}\n` : "") +
    `• Sucessos: ${sucesso}\n` +
    `• Erros: ${erros}\n` +
    `• Linhas em branco: ${ignorados}`;

  if (detalhesErros.length > 0) {
    const maxExibidos = 10;
    mensagemFinal += `\n\nResumo dos erros:\n` + detalhesErros.slice(0, maxExibidos).join("\n");
    if (detalhesErros.length > maxExibidos) {
      mensagemFinal += `\n... e mais ${detalhesErros.length - maxExibidos} erro(s). Veja na planilha ou no Logger.`;
    }
  }

  ui.alert("Resultado", mensagemFinal, ui.ButtonSet.OK);
}

/**
 * Aplica a regra de compartilhamento em um Arquivo ou Pasta.
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
 */
function propagarPermissaoPasta(pasta, access, permission) {
  let contador = 0;

  // Arquivos da pasta atual
  const arquivos = pasta.getFiles();
  while (arquivos.hasNext()) {
    const arq = arquivos.next();
    try {
      aplicarPermissao(arq, access, permission);
      contador++;
    } catch (e) {
      Logger.log(`Não foi possível alterar arquivo filho '${arq.getName()}': ${e.message}`);
    }
  }

  // Subpastas recursivas
  const subpastas = pasta.getFolders();
  while (subpastas.hasNext()) {
    const sub = subpastas.next();
    try {
      aplicarPermissao(sub, access, permission);
      contador += propagarPermissaoPasta(sub, access, permission);
    } catch (e) {
      Logger.log(`Não foi possível alterar subpasta '${sub.getName()}': ${e.message}`);
    }
  }

  return contador;
}

/**
 * Traduz o erro em uma mensagem amigável e explicativa.
 */
function interpretarErro(erro, valorOriginal) {
  const msg = erro.message || String(erro);

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
  if (/quota|limite/i.test(msg)) {
    return "Limite de cota da API do Drive atingido temporariamente.";
  }
  if (/exceeded maximum execution time/i.test(msg)) {
    return "Tempo máximo de 6 minutos atingido.";
  }

  return `Erro inesperado: ${msg}`;
}

/**
 * Mapeia o número da opção para a configuração de acesso do Drive.
 */
function mapearTipoAcesso(opcao) {
  switch (opcao) {
    case "1":
      return { access: DriveApp.Access.PRIVATE, descricao: "Bloqueado (Privado)" };
    case "2":
      return { access: DriveApp.Access.DOMAIN_WITH_LINK, descricao: "Restrito ao domínio" };
    case "3":
      return { access: DriveApp.Access.ANYONE_WITH_LINK, descricao: "Qualquer pessoa com link" };
    default:
      return null;
  }
}

/**
 * Converte a letra da coluna (A, B, AA...) no índice numérico correspondente (1-based).
 */
function letraParaIndiceColuna(letra) {
  let indice = 0;
  for (let i = 0; i < letra.length; i++) {
    indice = indice * 26 + (letra.charCodeAt(i) - 64);
  }
  return indice;
}

/**
 * Extrai o ID e o tipo do item (PASTA ou ARQUIVO) a partir do texto/URL fornecido.
 */
function extrairInfoDrive(texto) {
  const limpo = String(texto).trim();

  // 1. Link de Pasta: /folders/ID ou /drive/u/0/folders/ID
  const padraoPasta = limpo.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (padraoPasta?.[1]) {
    return { id: padraoPasta[1], tipo: "PASTA" };
  }

  // 2. Link de Arquivo/Planilha: /spreadsheets/d/ID, /file/d/ID, /document/d/ID, /presentation/d/ID
  const padraoArquivo = limpo.match(/\/(?:spreadsheets|file|document|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (padraoArquivo?.[1]) {
    return { id: padraoArquivo[1], tipo: "ARQUIVO" };
  }

  // 3. Link com query parameter: ?id=ID ou &id=ID
  const padraoQuery = limpo.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (padraoQuery?.[1]) {
    return { id: padraoQuery[1], tipo: "ARQUIVO" };
  }

  // 4. Se já for o ID puro (tentamos como arquivo por padrão)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(limpo)) {
    return { id: limpo, tipo: "ARQUIVO" };
  }

  return null;
}


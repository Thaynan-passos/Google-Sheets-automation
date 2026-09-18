function liberarPlanilhasSelecionadas() {
  var ui = SpreadsheetApp.getUi();
  var planilhaControle = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var ultimaLinha = planilhaControle.getLastRow();

  if (ultimaLinha < 2) {
    ui.alert("Não existem planilhas para processar.");
    return;
  }

  var respostaColuna = ui.prompt(
    "Coluna dos links",
    "Digite a letra da coluna onde estão os links ou IDs das planilhas (ex: A, B, C...):",
    ui.ButtonSet.OK_CANCEL
  );
  if (respostaColuna.getSelectedButton() !== ui.Button.OK) return;

  var colunaLetra = respostaColuna.getResponseText().trim().toUpperCase();
  if (!/^[A-Z]+$/.test(colunaLetra)) {
    ui.alert("Coluna inválida. Digite apenas letras, ex: A, B, C.");
    return;
  }
  var colunaIndice = letraParaIndiceColuna(colunaLetra);

  var respostaAcesso = ui.prompt(
    "Tipo de acesso",
    "Escolha o tipo de acesso digitando o número correspondente:\n\n" +
      "1 - Bloquear acesso (privado, somente quem já tem acesso explícito)\n" +
      "2 - Restringir ao domínio da organização (quem tem o link, só dentro do domínio)\n" +
      "3 - Liberar para qualquer pessoa com o link",
    ui.ButtonSet.OK_CANCEL
  );
  if (respostaAcesso.getSelectedButton() !== ui.Button.OK) return;

  var opcaoAcesso = respostaAcesso.getResponseText().trim();
  var configuracaoAcesso = obterConfiguracaoAcesso(opcaoAcesso);
  if (!configuracaoAcesso) {
    ui.alert("Opção inválida. Digite 1, 2 ou 3.");
    return;
  }

  var dados = planilhaControle
    .getRange(2, colunaIndice, ultimaLinha - 1, 1)
    .getValues();

  var sucesso = 0;
  var erros = 0;
  var detalhesErros = []; // guarda linha + descrição amigável de cada erro

  for (var i = 0; i < dados.length; i++) {
    var linha = i + 2;
    var valor = String(dados[i][0]).trim();
    if (valor === "") continue;

    try {
      var arquivoId = extrairIdPlanilha(valor);
      if (!arquivoId) {
        throw new Error("ID_INVALIDO");
      }

      var arquivo;
      try {
        arquivo = DriveApp.getFileById(arquivoId);
        // Força uma leitura de metadado para "estourar" erro de permissão/existência aqui,
        // em vez de só na hora do setSharing.
        arquivo.getName();
      } catch (erroAcesso) {
        // Repassa para o catch externo, já identificando a origem
        throw new Error("ACESSO_DRIVE::" + erroAcesso.message);
      }

      try {
        if (configuracaoAcesso.access === DriveApp.Access.PRIVATE) {
          arquivo.setSharing(configuracaoAcesso.access, DriveApp.Permission.NONE);
        } else {
          arquivo.setSharing(configuracaoAcesso.access, configuracaoAcesso.permission);
        }
      } catch (erroSharing) {
        throw new Error("SHARING::" + erroSharing.message);
      }

      sucesso++;
      Logger.log("Linha " + linha + ": '" + arquivo.getName() + "' → " + configuracaoAcesso.descricao);

    } catch (erro) {
      erros++;
      var descricaoAmigavel = interpretarErro(erro, valor);
      detalhesErros.push("Linha " + linha + ": " + descricaoAmigavel);
      Logger.log("ERRO linha " + linha + " (valor='" + valor + "'): " + erro.message);
    }
  }

  var mensagemFinal =
    "Automação concluída!\n\n" +
    "Coluna usada: " + colunaLetra + "\n" +
    "Tipo de acesso: " + configuracaoAcesso.descricao + "\n" +
    "Planilhas atualizadas: " + sucesso + "\n" +
    "Erros: " + erros;

  if (detalhesErros.length > 0) {
    // Limita a exibição para não estourar o tamanho do alert
    var maxExibidos = 15;
    mensagemFinal += "\n\nDetalhes dos erros:\n" + detalhesErros.slice(0, maxExibidos).join("\n");
    if (detalhesErros.length > maxExibidos) {
      mensagemFinal += "\n... e mais " + (detalhesErros.length - maxExibidos) + " erro(s). Veja o Logger para a lista completa.";
    }
  }

  ui.alert(mensagemFinal);
}

/**
 * Traduz o erro cru (mensagem de exception do Apps Script) numa descrição
 * legível para o usuário. Centraliza toda a lógica de "que erro é esse".
 */
function interpretarErro(erro, valorOriginal) {
  var msg = erro.message || String(erro);

  // Erro que nós mesmos lançamos ao não conseguir extrair o ID
  if (msg.indexOf("ID_INVALIDO") !== -1) {
    return "Não foi possível identificar um ID de planilha válido no valor '" + valorOriginal + "'.";
  }

  // Erros vindos do DriveApp.getFileById() ou arquivo.getName()
  if (msg.indexOf("ACESSO_DRIVE::") === 0) {
    var detalheDrive = msg.replace("ACESSO_DRIVE::", "");

    if (/permission|permissão|access denied|does not have permission/i.test(detalheDrive)) {
      return "Sem permissão para acessar esta planilha (você não tem acesso a ela ou ela pertence a outra conta).";
    }
    if (/not found|não encontrado|no such file/i.test(detalheDrive)) {
      return "Planilha não encontrada. O ID pode estar errado ou o arquivo foi excluído/movido para a lixeira.";
    }
    if (/invalid.*id|id.*invalid/i.test(detalheDrive)) {
      return "O ID extraído ('" + valorOriginal + "') não corresponde a nenhum arquivo do Drive.";
    }
    // Fallback: erro de acesso não categorizado
    return "Erro ao acessar o arquivo no Drive: " + detalheDrive;
  }

  // Erros vindos do arquivo.setSharing()
  if (msg.indexOf("SHARING::") === 0) {
    var detalheSharing = msg.replace("SHARING::", "");

    if (/owner|proprietário/i.test(detalheSharing)) {
      return "Não é possível alterar o compartilhamento: você não é o proprietário deste arquivo.";
    }
    if (/permission|permissão/i.test(detalheSharing)) {
      return "Sem permissão para alterar o compartilhamento desta planilha.";
    }
    if (/domain|domínio/i.test(detalheSharing)) {
      return "Não foi possível aplicar a restrição de domínio (o arquivo pode não pertencer a uma organização com Google Workspace).";
    }
    return "Erro ao alterar o compartilhamento: " + detalheSharing;
  }

  // Limite de cota do Drive/Apps Script (comum em execuções longas)
  if (/quota|limite/i.test(msg)) {
    return "Limite de uso do Drive/Apps Script atingido. Tente novamente mais tarde ou processe menos linhas por vez.";
  }

  // Timeout de execução (Apps Script mata scripts com +6 min em conta free)
  if (/exceeded maximum execution time/i.test(msg)) {
    return "O script excedeu o tempo máximo de execução. Considere processar em lotes menores.";
  }

  // Qualquer coisa não prevista
  return "Erro inesperado: " + msg;
}

function obterConfiguracaoAcesso(opcao) {
  switch (opcao) {
    case "1":
      return { access: DriveApp.Access.PRIVATE, permission: DriveApp.Permission.NONE, descricao: "Bloqueado (privado)" };
    case "2":
      return { access: DriveApp.Access.DOMAIN_WITH_LINK, permission: DriveApp.Permission.VIEW, descricao: "Restrito ao domínio (com link)" };
    case "3":
      return { access: DriveApp.Access.ANYONE_WITH_LINK, permission: DriveApp.Permission.VIEW, descricao: "Liberado para qualquer pessoa com o link" };
    default:
      return null;
  }
}

function letraParaIndiceColuna(letra) {
  var indice = 0;
  for (var i = 0; i < letra.length; i++) {
    indice = indice * 26 + (letra.charCodeAt(i) - 64);
  }
  return indice;
}

function extrairIdPlanilha(texto) {
  texto = String(texto).trim();
  var resultado = texto.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (resultado && resultado[1]) return resultado[1];
  if (/^[a-zA-Z0-9_-]+$/.test(texto)) return texto;
  return null;
}

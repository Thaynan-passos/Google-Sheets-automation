function liberarPlanilhasSelecionadas() {
  var ui = SpreadsheetApp.getUi();
  var planilhaControle = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var ultimaLinha = planilhaControle.getLastRow();

  if (ultimaLinha < 2) {
    ui.alert("Não existem planilhas para processar.");
    return;
  }

  // 1) Pergunta qual coluna contém os links/IDs
  var respostaColuna = ui.prompt(
    "Coluna dos links",
    "Digite a letra da coluna onde estão os links ou IDs das planilhas (ex: A, B, C...):",
    ui.ButtonSet.OK_CANCEL
  );

  if (respostaColuna.getSelectedButton() !== ui.Button.OK) {
    return; // usuário cancelou
  }

  var colunaLetra = respostaColuna.getResponseText().trim().toUpperCase();
  if (!/^[A-Z]+$/.test(colunaLetra)) {
    ui.alert("Coluna inválida. Digite apenas letras, ex: A, B, C.");
    return;
  }

  var colunaIndice = letraParaIndiceColuna(colunaLetra);

  // 2) Pergunta qual tipo de acesso aplicar
  var respostaAcesso = ui.prompt(
    "Tipo de acesso",
    "Escolha o tipo de acesso digitando o número correspondente:\n\n" +
      "1 - Bloquear acesso (privado, somente quem já tem acesso explícito)\n" +
      "2 - Restringir ao domínio da organização (quem tem o link, só dentro do domínio)\n" +
      "3 - Liberar para qualquer pessoa com o link",
    ui.ButtonSet.OK_CANCEL
  );

  if (respostaAcesso.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var opcaoAcesso = respostaAcesso.getResponseText().trim();
  var configuracaoAcesso = obterConfiguracaoAcesso(opcaoAcesso);

  if (!configuracaoAcesso) {
    ui.alert("Opção inválida. Digite 1, 2 ou 3.");
    return;
  }

  // Lê os dados a partir da linha 2, na coluna escolhida
  var dados = planilhaControle
    .getRange(2, colunaIndice, ultimaLinha - 1, 1)
    .getValues();

  var sucesso = 0;
  var erros = 0;

  for (var i = 0; i < dados.length; i++) {
    var linha = i + 2;
    var valor = String(dados[i][0]).trim();

    if (valor === "") {
      continue;
    }

    try {
      // Extrai o ID da planilha
      var arquivoId = extrairIdPlanilha(valor);
      if (!arquivoId) {
        throw new Error("Não foi possível identificar o ID da planilha.");
      }

      Logger.log("Linha " + linha + " - ID encontrado: " + arquivoId);

      // Abre a planilha
      var arquivo = DriveApp.getFileById(arquivoId);
      Logger.log("Planilha encontrada: " + arquivo.getName());

      // Aplica o tipo de acesso escolhido
      if (configuracaoAcesso.access === DriveApp.Access.PRIVATE) {
        arquivo.setSharing(configuracaoAcesso.access, DriveApp.Permission.NONE);
      } else {
        arquivo.setSharing(configuracaoAcesso.access, configuracaoAcesso.permission);
      }

      sucesso++;
      Logger.log(
        "SUCESSO: '" + arquivo.getName() + "' teve o acesso atualizado para: " +
          configuracaoAcesso.descricao
      );
    } catch (erro) {
      erros++;
      Logger.log("ERRO na linha " + linha + ": " + erro.message);
    }
  }

  ui.alert(
    "Automação concluída!\n\n" +
      "Coluna usada: " + colunaLetra + "\n" +
      "Tipo de acesso: " + configuracaoAcesso.descricao + "\n" +
      "Planilhas atualizadas: " + sucesso + "\n" +
      "Erros: " + erros
  );
}

function obterConfiguracaoAcesso(opcao) {
  switch (opcao) {
    case "1":
      return {
        access: DriveApp.Access.PRIVATE,
        permission: DriveApp.Permission.NONE,
        descricao: "Bloqueado (privado)"
      };
    case "2":
      return {
        access: DriveApp.Access.DOMAIN_WITH_LINK,
        permission: DriveApp.Permission.VIEW,
        descricao: "Restrito ao domínio (com link)"
      };
    case "3":
      return {
        access: DriveApp.Access.ANYONE_WITH_LINK,
        permission: DriveApp.Permission.VIEW,
        descricao: "Liberado para qualquer pessoa com o link"
      };
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
  if (resultado && resultado[1]) {
    return resultado[1];
  }
  if (/^[a-zA-Z0-9_-]+$/.test(texto)) {
    return texto;
  }
  return null;
}

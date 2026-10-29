const {
  CONFIG,
  letraParaIndiceColuna,
  extrairInfoDrive,
  mapearTipoAcesso,
  mapearNivelPermissao,
  interpretarErro,
} = require("../src/Code");

describe("letraParaIndiceColuna", () => {
  test("converte colunas simples corretamente", () => {
    expect(letraParaIndiceColuna("A")).toBe(1);
    expect(letraParaIndiceColuna("B")).toBe(2);
    expect(letraParaIndiceColuna("Z")).toBe(26);
  });

  test("converte colunas compostas corretamente", () => {
    expect(letraParaIndiceColuna("AA")).toBe(27);
    expect(letraParaIndiceColuna("AB")).toBe(28);
    expect(letraParaIndiceColuna("AZ")).toBe(52);
    expect(letraParaIndiceColuna("BA")).toBe(53);
  });

  test("ignora maiúsculas/minúsculas e espaços em branco", () => {
    expect(letraParaIndiceColuna(" a ")).toBe(1);
    expect(letraParaIndiceColuna("aa")).toBe(27);
  });

  test("retorna 0 para entradas inválidas", () => {
    expect(letraParaIndiceColuna("")).toBe(0);
    expect(letraParaIndiceColuna("123")).toBe(0);
    expect(letraParaIndiceColuna("A1")).toBe(0);
    expect(letraParaIndiceColuna(null)).toBe(0);
    expect(letraParaIndiceColuna(undefined)).toBe(0);
  });
});

describe("extrairInfoDrive", () => {
  test("extrai ID de pasta do Google Drive", () => {
    const url = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz";
    expect(extrairInfoDrive(url)).toEqual({
      id: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
      tipo: "PASTA",
    });
  });

  test("extrai ID de pasta com usuário na URL (/u/0/)", () => {
    const url = "https://drive.google.com/drive/u/0/folders/folder_id_12345";
    expect(extrairInfoDrive(url)).toEqual({
      id: "folder_id_12345",
      tipo: "PASTA",
    });
  });

  test("extrai ID de planilha do Google Sheets", () => {
    const url = "https://docs.google.com/spreadsheets/d/1XyZ_SheetId-999/edit#gid=0";
    expect(extrairInfoDrive(url)).toEqual({
      id: "1XyZ_SheetId-999",
      tipo: "ARQUIVO",
    });
  });

  test("extrai ID de documento do Google Docs", () => {
    const url = "https://docs.google.com/document/d/doc_id_888/edit";
    expect(extrairInfoDrive(url)).toEqual({
      id: "doc_id_888",
      tipo: "ARQUIVO",
    });
  });

  test("extrai ID de apresentação do Google Slides", () => {
    const url = "https://docs.google.com/presentation/d/slide_id_777/edit";
    expect(extrairInfoDrive(url)).toEqual({
      id: "slide_id_777",
      tipo: "ARQUIVO",
    });
  });

  test("extrai ID de formulário do Google Forms", () => {
    const url = "https://docs.google.com/forms/d/form_id_666/edit";
    expect(extrairInfoDrive(url)).toEqual({
      id: "form_id_666",
      tipo: "ARQUIVO",
    });
  });

  test("extrai ID de link com parâmetro query (open?id=)", () => {
    const url = "https://drive.google.com/open?id=1ParamId-456";
    expect(extrairInfoDrive(url)).toEqual({
      id: "1ParamId-456",
      tipo: "AUTO",
    });
  });

  test("extrai ID direto (alfanumérico longo)", () => {
    const idDireto = "1abcDEF_xyz-123456789";
    expect(extrairInfoDrive(idDireto)).toEqual({
      id: idDireto,
      tipo: "AUTO",
    });
  });

  test("retorna null para textos vazios ou inválidos", () => {
    expect(extrairInfoDrive("")).toBeNull();
    expect(extrairInfoDrive("curto")).toBeNull();
    expect(extrairInfoDrive("https://google.com/teste")).toBeNull();
    expect(extrairInfoDrive(null)).toBeNull();
  });
});

describe("mapearTipoAcesso", () => {
  // DriveApp is mocked in Jest if needed, but we check if null is returned for invalid
  test("retorna null para opção inválida", () => {
    expect(mapearTipoAcesso("9")).toBeNull();
    expect(mapearTipoAcesso("abc")).toBeNull();
  });
});

describe("mapearNivelPermissao", () => {
  test("retorna null para opção inválida", () => {
    expect(mapearNivelPermissao("0")).toBeNull();
    expect(mapearNivelPermissao("xyz")).toBeNull();
  });
});

describe("interpretarErro", () => {
  test("interpreta ID inválido", () => {
    const erro = new Error("ID_INVALIDO");
    const msg = interpretarErro(erro, "link_incorreto");
    expect(msg).toContain("ID inválido");
  });

  test("interpreta erro de permissão", () => {
    const erro = new Error("User does not have permission to perform this action");
    const msg = interpretarErro(erro, "id123");
    expect(msg).toContain("Sem permissão");
  });

  test("interpreta erro de item não encontrado", () => {
    const erro = new Error("File not found");
    const msg = interpretarErro(erro, "id123");
    expect(msg).toContain("não encontrado");
  });

  test("interpreta erro de quota de API", () => {
    const erro = new Error("Rate limit / Quota exceeded");
    const msg = interpretarErro(erro, "id123");
    expect(msg).toContain("Limite de cota");
  });
});


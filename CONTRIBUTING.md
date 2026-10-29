# Guia de Contribuição

Obrigado pelo seu interesse em contribuir para o **Google Sheets Drive Permissions Automation**!

## Como Contribuir

1. **Faça um Fork** deste repositório.
2. **Crie uma branch** para a sua feature ou correção:
   ```bash
   git checkout -b feature/minha-melhoria
   ```
3. **Faça as alterações necessárias** seguindo o padrão de código estabelecido:
   - Respeite o padrão de indentação e estilo (`.editorconfig`).
   - Mantenha comentários e anotações JSDoc atualizados.
   - Escreva testes unitários se aplicável para novas funções utilitárias.
4. **Valide os testes e padrões de código**:
   ```bash
   npm test
   npm run lint
   ```
5. **Faça o Commit** das suas alterações com mensagens claras e semânticas (ex: `feat: adiciona suporte a Google Forms`, `fix: corrige cálculo de overflow de coluna`).
6. **Envie para o seu Fork**:
   ```bash
   git push origin feature/minha-melhoria
   ```
7. **Abra um Pull Request** detalhando as alterações propostas.

---

## Boas Práticas para Google Apps Script

- **Limites de Execução**: Lembre-se de que o Apps Script tem limite de 6 minutos por execução. Qualquer rotina em lote deve ser otimizada para evitar chamadas de API repetitivas e loops infinitos.
- **Leitura/Escrita em Lote**: Sempre utilize `.getValues()` e `.setValues()` para ler ou gravar blocos de células de uma única vez.
- **Tratamento de Exceções**: Todo acesso a arquivos externos ou APIs de terceiros deve possuir tratamento de erro amigável (`try...catch`) para evitar que a execução seja interrompida no meio do processo.


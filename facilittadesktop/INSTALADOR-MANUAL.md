# Instruções para Criar o Instalador Manualmente

## Arquivos Preparados

✅ **Build do Electron:** `out/Controle de Encomendas-win32-x64/`
✅ **Script do Inno Setup:** `scripts/installer.iss`

## Como Criar o Instalador

### Passo 1: Instalar o Inno Setup
1. Baixe o Inno Setup em: https://jrsoftware.org/isdl.php
2. Instale com as configurações padrão

### Passo 2: Abrir o Script
1. Abra o Inno Setup Compiler
2. Vá em **File > Open** 
3. Navegue até: `scripts/installer.iss`
4. Abra o arquivo

### Passo 3: Compilar
1. Pressione **F9** ou vá em **Build > Compile**
2. O processo levará alguns segundos
3. Uma janela mostrará o progresso da compilação

### Passo 4: Localizar o Instalador
O instalador será criado em:
```
out/installer/ControleEncomendas-Setup-v1.0.0.exe
```

## Configurações do Instalador

- **Nome:** Controle de Encomendas
- **Versão:** 1.0.0
- **Pasta de Instalação:** `C:\Program Files\Controle de Encomendas`
- **Ícone na Área de Trabalho:** ✅ Marcado por padrão
- **Menu Iniciar:** ✅ Sempre criado
- **Idioma:** Português Brasileiro
- **Arquitetura:** x64 apenas
- **Compressão:** LZMA (máxima)

## Estrutura de Arquivos

```
scripts/
├── installer.iss          ← Script principal do Inno Setup
└── create-installer.ps1   ← Script PowerShell (automático)

out/
├── Controle de Encomendas-win32-x64/  ← Build do Electron
└── installer/                         ← Instalador final (criado após compilação)
    └── ControleEncomendas-Setup-v1.0.0.exe
```

## Verificações Antes da Compilação

✅ Build do Electron existe em `out/Controle de Encomendas-win32-x64/`
✅ Arquivo `ControleEncomendas.exe` existe no build
✅ Ícone `src/assets/icone-app.ico` existe
✅ Script `installer.iss` está configurado corretamente

## Possíveis Problemas

### Erro: "Cannot open file"
- **Causa:** Caminho incorreto no script
- **Solução:** Verificar se o build está na pasta correta

### Erro: "Icon file not found"
- **Causa:** Ícone não encontrado
- **Solução:** Verificar se `src/assets/icone-app.ico` existe

### Erro: "Access denied"
- **Causa:** Permissões insuficientes
- **Solução:** Executar Inno Setup como Administrador

## Teste do Instalador

Após criar o instalador:

1. **Teste em máquina limpa** (sem Node.js/Electron)
2. **Verifique instalação** em `C:\Program Files\Controle de Encomendas`
3. **Teste ícone** na área de trabalho
4. **Teste desinstalação** pelo Painel de Controle

## Distribuição

O arquivo `ControleEncomendas-Setup-v1.0.0.exe` pode ser distribuído para clientes.

**Tamanho aproximado:** ~150-200 MB
**Requisitos do sistema:** Windows 7 SP1 ou superior (x64)

---

**Facilitta Sistemas - 2025**

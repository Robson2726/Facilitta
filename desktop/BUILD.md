# Build e Instalador - Controle de Encomendas

Este documento explica como compilar e criar o instalador para o sistema Controle de Encomendas.

## Pré-requisitos

### Software Necessário
- **Node.js** (versão 16 ou superior) - [Download](https://nodejs.org/)
- **Inno Setup** (versão 6 ou superior) - [Download](https://jrsoftware.org/isdl.php)
- **Git** (opcional, para controle de versão)

### Verificação da Instalação
```bash
node --version
npm --version
```

## Processo de Build

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Build Rápido (Automático)
```bash
npm run create-installer
```

### 3. Build Manual (Passo a Passo)

#### Passo 1: Build do Electron
```bash
npm run build-for-installer
```

#### Passo 2: Criar Instalador
```bash
powershell -ExecutionPolicy Bypass -File scripts/create-installer.ps1
```

## Scripts Disponíveis

### Scripts NPM
- `npm start` - Inicia a aplicação em modo desenvolvimento
- `npm run build-for-installer` - Compila a aplicação para distribuição
- `npm run create-installer` - Executa o script completo de criação do instalador

### Scripts PowerShell
- `scripts/create-installer.ps1` - Script principal de build
  - `-Clean` - Remove builds anteriores
  - `-SkipBuild` - Pula o build do Electron (usa build existente)
  - `-Version "1.0.0"` - Define a versão do build

#### Exemplos de Uso
```powershell
# Build completo com limpeza
./scripts/create-installer.ps1 -Clean

# Apenas criar instalador (build já existe)
./scripts/create-installer.ps1 -SkipBuild

# Build com versão específica
./scripts/create-installer.ps1 -Version "1.1.0"
```

## Estrutura de Saída

Após o build, os seguintes diretórios serão criados:

```
dist/
├── controle-encomendas-win32-x64/     # Build do Electron
│   ├── ControleEncomendas.exe         # Executável principal
│   ├── resources/                     # Recursos da aplicação
│   └── ...
└── installer/                        # Instalador final
    └── ControleEncomendas-Setup-v1.0.0.exe
```

## Configuração do Inno Setup

O arquivo `scripts/installer.iss` contém todas as configurações do instalador:

- **Informações da Aplicação**: Nome, versão, autor
- **Diretórios**: Instalação padrão em `Program Files`
- **Ícones**: Desktop e menu iniciar
- **Registro**: Associações de arquivo
- **Idioma**: Português brasileiro

## Resolução de Problemas

### Erro: "Inno Setup não encontrado"
1. Baixe e instale o Inno Setup
2. Adicione ao PATH ou use o caminho completo no script

### Erro: "Build não encontrado"
1. Execute `npm run build-for-installer` primeiro
2. Verifique se o diretório `dist/controle-encomendas-win32-x64` existe

### Erro: "Dependências não instaladas"
1. Execute `npm install`
2. Verifique a conexão com a internet
3. Limpe o cache: `npm cache clean --force`

### Erro de Permissão PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Distribuição

O instalador final estará em:
```
dist/installer/ControleEncomendas-Setup-v1.0.0.exe
```

Este arquivo pode ser distribuído para os clientes e contém:
- ✅ Aplicação Electron empacotada
- ✅ Todas as dependências necessárias
- ✅ Instalação automática
- ✅ Criação de atalhos
- ✅ Registro no sistema
- ✅ Desinstalador automático

## Notas de Versão

### v1.1.0
- ✅ Integração completa com aplicativo mobile
- ✅ API server embutida para comunicação desktop-mobile
- ✅ QR Code para configuração automática do mobile
- ✅ Sistema de cache otimizado para melhor performance
- ✅ Logs melhorados para debugging
- ✅ Tratamento de erros mais robusto

### v1.0.0
- ✅ Removido modo desenvolvedor automático
- ✅ Configuração profissional do instalador
- ✅ Scripts automatizados de build
- ✅ Ícones e recursos integrados
- ✅ Localização em português brasileiro

## Configuração Mobile-Desktop

### Conectando o Mobile ao Desktop
1. No desktop, vá em **Ajustes** → **Acesso via Aplicativo Mobile**
2. Escaneie o QR Code com o app mobile
3. O mobile se conectará automaticamente à API do desktop

### Verificação da Conexão
- Desktop: Verifique logs da API na seção Ajustes
- Mobile: Status de conexão aparece na tela inicial
- Teste: Cadastre uma encomenda no mobile e verifique no desktop

---

**Facilitta Sistemas**  
Para suporte: contato@facilitta.com.br

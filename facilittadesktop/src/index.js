// --- src/index.js ---
// (Processo Principal do Electron)

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Para senhas
const fs = require('fs'); // <-- Adicione esta linha no topo
const PDFDocument = require('pdfkit'); // Para gerar PDFs
const csvParse = require('csv-parse/sync'); // Certifique-se de já ter instalado: npm install csv-parse
const { execFile, exec, chmod } = require('child_process');
const os = require('os');
const https = require('https');
const DesktopApiServer = require('./api-server'); // Nova importação
const QRCodeUtils = require('./utils/qrcode');
const { statfsSync } = require('node:fs');

// --- Hot reload para desenvolvimento ---
try {
  if (process.env.NODE_ENV !== 'production') {
    require('electron-reload')(__dirname, {
      electron: require('electron'),
      // Assista arquivos .js, .html, .css na pasta src
      // Você pode ajustar os paths conforme sua estrutura
      watch: [
        __dirname,
        // Se quiser incluir arquivos fora de src, adicione paths aqui
      ]
    });
    console.log('[DEV] electron-reload ativado.');
  }
} catch (e) {
  console.warn('[DEV] electron-reload não instalado ou erro ao carregar:', e.message);
}

// --- Configuração da Conexão com o Banco (Usando .env) ---
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

// Função para ler config do banco
function readDbConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[index.js] Erro ao ler config.json:', e);
  }
  return null;
}

// Função para salvar config do banco
function saveDbConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[index.js] Erro ao salvar config.json:', e);
    return false;
  }
}

// Inicializa pool só se houver config
let pool = null;
function initDbPool() {
  const dbConfig = readDbConfig();
  if (!dbConfig) {
    console.warn('[index.js] Nenhuma configuração de banco encontrada. Pool não inicializado.');
    return null;
  }
  pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: parseInt(dbConfig.port || '5432'),
  });
  return pool;
}

// Inicializa pool ao iniciar app, se possível
initDbPool();

// Variável para guardar a referência da janela principal
let mainWindow;
let apiServer = null; // Nova variável para o servidor da API

// --- Função para criar a Janela Principal ---
const createWindow = () => {
  // Cria a janela do navegador.
  mainWindow = new BrowserWindow({
    width: 1000, // Largura inicial
    height: 700, // Altura inicial
    webPreferences: {
      // Anexa o script de preload à janela
      preload: path.join(__dirname, 'preload.js'),
      // Medidas de segurança recomendadas:
      contextIsolation: true, // Isola o contexto do preload do renderer
      nodeIntegration: false // Desabilita acesso direto ao Node.js no renderer
    },
    frame: true, // Remove a barra padrão do sistema
     });

  // Carrega o arquivo index.html da aplicação.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Remover o menu padrão do Electron
  mainWindow.setMenu(null);

  // Adiciona atalho para abrir/fechar DevTools (F12 ou Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || 
        (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Limpa a referência da janela quando ela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};
// -------------------------------------------

// --- Funções de Acesso ao Banco de Dados ---

// Busca encomendas com status 'Recebida na portaria'
async function getPendingPackages() {
  console.log('[index.js] GET Pending Packages...');
  let client;
  try {
    client = await getPoolOrError().connect();
    // Corrigido: usa tabelas em minúsculas
    const result = await client.query(
      `SELECT E.id, M.nome AS morador_nome, U.nome_completo AS porteiro_nome, E.data_recebimento, E.quantidade, E.status, E.observacoes 
       FROM encomendas E
       JOIN moradores M ON E.morador_id = M.id
       LEFT JOIN usuarios U ON E.porteiro_recebeu_id = U.id
       WHERE E.status = 'Recebida na portaria'
       ORDER BY E.data_recebimento DESC`
    );
    console.log('[index.js] Found Pending Packages:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('[index.js] Error getPendingPackages:', error);
    return [];
  } finally {
      if(client) client.release();
  }
}

// Busca moradores por nome (para autocomplete)
async function searchResidents(searchTerm) {
  console.log(`[index.js] SEARCH Residents: "${searchTerm}"`);
  if (!searchTerm?.trim()) return [];
  let client;
  try {
    client = await getPoolOrError().connect();
    const result = await client.query(
      'SELECT id, nome FROM moradores WHERE nome ILIKE $1 ORDER BY nome LIMIT 10',
      [`%${searchTerm}%`]
    );
    console.log(`[index.js] Found Residents for "${searchTerm}":`, result.rows.length);
    return result.rows;
  } catch (error) {
    console.error(`[index.js] Error searchResidents:`, error);
    return [];
  } finally {
      if(client) client.release();
  }
}

// Salva um novo morador no banco
async function saveResident(residentData) {
  console.log('[index.js] SAVE Resident:', residentData);
  const { nome, telefone, rua, numero, bloco, apartamento, observacoes } = residentData;
  if (!nome || !rua || !numero || !apartamento) {
      console.error('[index.js] Error saveResident: missing fields.');
      return { success: false, message: 'Nome, Rua, Número e AP/LT obrigatórios.' };
  }
  let client;
  try {
    client = await getPoolOrError().connect();
    const result = await client.query(
      `INSERT INTO moradores (nome, telefone, rua, numero, bloco, apartamento, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [nome, telefone || null, rua, numero, bloco || null, apartamento, observacoes || null]
    );
    const newId = result.rows[0]?.id;
    
    // Invalida cache após inserção
    invalidateMoradoresCache();
    
    console.log('[index.js] Resident saved! ID:', newId);
    return { success: true, message: 'Morador salvo!', newId: newId };
  } catch (error) {
    console.error('[index.js] Error saveResident DB:', error);
    return { success: false, message: `Erro BD (${error.code || 'N/A'})` };
  } finally {
      if(client) client.release();
  }
}

// Busca todos os moradores cadastrados
async function getResidents() {
    console.log('[index.js] GET Residents...');
    let client;
    try {
        client = await getPoolOrError().connect();
        const result = await client.query(
            `SELECT id, nome, apartamento, bloco, telefone FROM moradores ORDER BY nome ASC`
        );
        console.log('[index.js] Found Residents:', result.rows.length);
        return result.rows;
    } catch (error) {
        console.error('[index.js] Error getResidents:', error);
        return [];
    } finally {
        if(client) client.release();
    }
}

// Nova função otimizada para buscar todos os moradores (com cache)
let moradoresCache = null;
let moradoreCacheExpiry = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function getAllResidents() {
    console.log('[index.js] GET ALL Residents...');
    
    // Verifica cache válido
    if (moradoresCache && moradoreCacheExpiry && Date.now() < moradoreCacheExpiry) {
        console.log('[index.js] Retornando moradores do cache');
        return moradoresCache;
    }
    
    let client;
    try {
        client = await getPoolOrError().connect();
        const result = await client.query(
            `SELECT id, nome, apartamento, bloco 
             FROM moradores 
             ORDER BY nome ASC 
             LIMIT 500`
        );
        
        // Atualiza cache
        moradoresCache = result.rows;
        moradoreCacheExpiry = Date.now() + CACHE_DURATION;
        
        console.log('[index.js] Found All Residents:', result.rows.length);
        return result.rows;
    } catch (error) {
        console.error('[index.js] Error getAllResidents:', error);
        // Retorna cache mesmo expirado em caso de erro
        return moradoresCache || [];
    } finally {
        if (client) client.release();
    }
}

// Função para invalidar cache quando houver mudanças
function invalidateMoradoresCache() {
    moradoresCache = null;
    moradoreCacheExpiry = null;
    console.log('[index.js] Cache de moradores invalidado');
}

// Exclui um morador pelo ID
async function deleteResident(residentId) {
    console.log(`[index.js] DELETE Resident ID: ${residentId}`);
    if (!residentId) return { success: false, message: 'ID não fornecido.' };
    let client;
    try {
        client = await getPoolOrError().connect();
        const checkEncomendas = await client.query('SELECT 1 FROM encomendas WHERE morador_id = $1 LIMIT 1', [residentId]);
        if (checkEncomendas.rows.length > 0) {
             return { success: false, message: 'Não é possível excluir: morador possui encomendas registradas.' };
        }

        const result = await client.query('DELETE FROM moradores WHERE id = $1', [residentId]);
        if (result.rowCount > 0) {
            console.log(`[index.js] Resident ID ${residentId} deleted.`);
            return { success: true, message: 'Morador excluído!' };
        } else {
            console.warn(`[index.js] Delete Resident ID ${residentId}: not found.`);
            return { success: false, message: 'Morador não encontrado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error deleteResident ID ${residentId}:`, error);
        if (error.code === '23503') return { success: false, message: 'Não é possível excluir: registro referenciado em outra tabela.' };
        return { success: false, message: 'Erro interno ao excluir.' };
    } finally {
        if (client) client.release();
    }
}

// Busca dados de um morador específico por ID
async function getResidentById(residentId) {
    console.log(`[index.js] GET Resident ID: ${residentId}`);
    if (!residentId) { console.error('[index.js] Error: ID missing for getResidentById.'); return null; }
    let client;
    try {
        client = await getPoolOrError().connect();
        const result = await client.query(
            `SELECT id, nome, telefone, rua, numero, bloco, apartamento, observacoes FROM moradores WHERE id = $1`,
            [residentId]
        );
        if (result.rows.length > 0) {
            console.log(`[index.js] Found data for resident ID ${residentId}.`);
            return result.rows[0];
        } else {
            console.warn(`[index.js] Resident ID ${residentId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`[index.js] Error getResidentById (${residentId}):`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

// Atualiza os dados de um morador existente
async function updateResident(residentId, residentData) {
    console.log(`[index.js] UPDATE Resident ID: ${residentId}`, residentData);
    const { nome, telefone, rua, numero, bloco, apartamento, observacoes } = residentData;
    if (!residentId || !nome || !rua || !numero || !apartamento) { console.error('[index.js] Error updateResident: missing fields.'); return { success: false, message: 'ID, Nome, Rua, Número e AP/LT obrigatórios.' }; }
    let client;
    try {
        client = await getPoolOrError().connect();
        const result = await client.query(
            `UPDATE moradores SET nome = $1, telefone = $2, rua = $3, numero = $4, bloco = $5, apartamento = $6, observacoes = $7 WHERE id = $8`,
            [nome, telefone || null, rua, numero, bloco || null, apartamento, observacoes || null, residentId]
        );
        if (result.rowCount > 0) {
            console.log(`[index.js] Resident ID ${residentId} updated.`);
            return { success: true, message: 'Morador atualizado!' };
        } else {
            console.warn(`[index.js] Update Resident ID ${residentId}: not found.`);
            return { success: false, message: 'Morador não encontrado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error updateResident ID ${residentId}:`, error);
        return { success: false, message: `Erro interno update. (${error.code || 'N/A'})` };
    } finally {
        if (client) client.release();
    }
}

// Busca usuários ATIVOS com nivel_acesso 'porteiro' (para autocomplete no modal de encomenda)
async function searchActivePorters(searchTerm) {
  // Função espera apenas o termo de busca
  console.log(`[index.js] SEARCH Active Porters (Usuarios table): "${searchTerm}"`);
  // A verificação .trim() aqui agora deve funcionar
  if (!searchTerm?.trim()) return [];
  let client;
  try {
    client = await getPoolOrError().connect();
    const result = await client.query(
      `SELECT id, nome_usuario, nome_completo FROM usuarios
       WHERE (nome_completo ILIKE $1 OR nome_usuario ILIKE $1)
         AND nivel_acesso = 'porteiro'
         AND status = 'Ativo' -- Filtra apenas ativos (adicionado na versão anterior)
       ORDER BY nome_completo, nome_usuario LIMIT 10`,
      [`%${searchTerm}%`]
    );
    console.log(`[index.js] Found Active Porters (Usuarios):`, result.rows.length);
    return result.rows.map(user => ({
      id: user.id,
      nome: user.nome_completo || user.nome_usuario
    }));
  } catch (error) {
    console.error(`[index.js] Error searchActivePorters:`, error);
    return [];
  } finally {
    if (client) client.release();
  }
}

// Nova função para buscar todos os usuários ativos (para API mobile)
async function getActiveUsers(nivel = null) {
  console.log(`[index.js] GET Active Users (nivel: ${nivel})...`);
  let client;
  try {
    client = await getPoolOrError().connect();
    
    let query = `
      SELECT id, nome_usuario, nome_completo, email, nivel_acesso, status
      FROM usuarios
      WHERE status = 'Ativo'
    `;
    const params = [];
    
    if (nivel) {
      query += ` AND nivel_acesso = $1`;
      params.push(nivel);
    }
    
    query += ` ORDER BY nome_completo, nome_usuario ASC`;
    
    const result = await client.query(query, params);
    console.log(`[index.js] Found Active Users:`, result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('[index.js] Error getActiveUsers:', error);
    return [];
  } finally {
    if (client) client.release();
  }
}

// Salva uma nova encomenda (agora usando usuarios.id corretamente)
async function savePackage(packageData) {
    console.log('[index.js] SAVE Package:', packageData);
    const { moradorId, porteiroUserId, quantidade, dataRecebimento, observacoes /*, codigo_rastreio */ } = packageData;

    if (!moradorId || !porteiroUserId || !quantidade || !dataRecebimento) { console.error('[index.js] Error savePackage: missing fields.'); return { success: false, message: 'Morador, ID Porteiro, Qtde e Data/Hora obrigatórios.' }; }

    let client;
    try {
        client = await getPoolOrError().connect();
        const statusInicial = 'Recebida na portaria';
        const iResult = await client.query(
            `INSERT INTO encomendas (morador_id, porteiro_recebeu_id, data_recebimento, quantidade, observacoes, status /*, codigo_rastreio */)
             VALUES ($1, $2, $3, $4, $5, $6 /*, $7 */) RETURNING id`,
            [moradorId, porteiroUserId, dataRecebimento, quantidade, observacoes || null, statusInicial /*, codigo_rastreio || null */]
        );
        const newId = iResult.rows[0]?.id;
        console.log('[index.js] Encomenda salva! ID:', newId);
        return { success: true, message: 'Encomenda salva!', newId: newId };

    } catch (error) {
        console.error('[index.js] Error savePackage:', error);
        if (error.code === '23503') {
             if (error.constraint?.includes('morador_id')) return { success: false, message: 'Erro: Morador inválido.' };
             if (error.constraint?.includes('usuario_recebeu_id')) return { success: false, message: 'Erro: Porteiro inválido ou inativo.' }; // Nome correto da FK
             return { success: false, message: 'Erro de referência ao salvar.' };
        }
        return { success: false, message: `Erro BD (${error.code || 'N/A'})` };
    } finally {
        if (client) client.release();
    }
}

// Função de Login (Usa tabela Usuarios, agora verifica status)
async function loginUser(username, password) {
    const tableName = 'usuarios';
    const loginField = 'nome_usuario';
    console.log(`[index.js] LOGIN User: "${username}" na tabela "${tableName}"`);
    if (!username || !password) return { success: false, message: 'Nome de usuário e senha obrigatórios.' };
    
    // Verificação de credenciais master para acesso offline (sem banco configurado)
    const MASTER_USERNAME = 'facilitta_admin';
    const MASTER_PASSWORD = '@primeiroacesso';
    
    if (username === MASTER_USERNAME && password === MASTER_PASSWORD) {
        console.log('[index.js] Login MASTER realizado com sucesso');
        return { 
            success: true, 
            user: { 
                id: 'master', 
                username: MASTER_USERNAME, 
                name: 'Administrador Master', 
                role: 'admin', 
                status: 'Ativo' 
            }
        };
    }
    
    // Se não for master, tenta login no banco de dados
    let client;
    try {
        client = await getPoolOrError().connect();
        // Adiciona logs de debug e verifica status
        const queryText = `SELECT id, nome_usuario, senha_hash, nome_completo, nivel_acesso, status FROM ${tableName} WHERE ${loginField} = $1`;
        console.log(`[DEBUG loginUser] Executando query for username: ${username}`);
        const result = await client.query(queryText, [username]);
        console.log(`[DEBUG loginUser] Query result row count: ${result.rows.length}`);

        if (result.rows.length === 0) {
            console.log(`[DEBUG loginUser] Usuário "${username}" NÃO encontrado.`);
            return { success: false, message: 'Usuário ou senha inválidos.' };
        }

        const user = result.rows[0];
        console.log(`[DEBUG loginUser] User found in DB: ID=${user.id}, Status=${user.status}`);

        if (user.status !== 'Ativo') {
            console.log(`[index.js] Login falhou: Usuário "${username}" está ${user.status || 'Indefinido'}.`);
             if (client) { client.release(); client = null; }
            return { success: false, message: 'Usuário inativo ou bloqueado.' };
        }

        console.log(`[DEBUG loginUser] Attempting bcrypt.compare for user ID: ${user.id}`);
        const match = await bcrypt.compare(password, user.senha_hash);
        console.log(`[DEBUG loginUser] bcrypt.compare result (match?): ${match}`);

        if (match) {
            const userRole = user.nivel_acesso;
            console.log(`[index.js] Login OK para "${username}". Role: ${userRole}, Status: ${user.status}`);
            return { success: true, user: { id: user.id, username: user.nome_usuario, name: user.nome_completo || user.nome_usuario, role: userRole, status: user.status }};
        } else {
            console.log(`[index.js] Login falhou: Senha incorreta.`);
            return { success: false, message: 'Usuário ou senha inválidos.' };
        }
    } catch (error) {
        console.error('[index.js] Erro login:', error);
        // Se for erro de banco não configurado e for tentativa de login master, retorna mensagem específica
        if (error.message.includes('Banco de dados não configurado') && username === 'facilitta_admin') {
            return { success: false, message: 'Credenciais master inválidas. Verifique o usuário e senha.' };
        }
        return { success: false, message: 'Erro interno login.' };
    } finally {
        if (client) { console.log('[DEBUG loginUser] Liberando cliente.'); client.release(); }
    }
}

// Busca todos os Usuários da tabela Usuarios (agora com status)
async function getUsers() {
    console.log('[index.js] GET Users...');
    let client;
    try {
        client = await getPoolOrError().connect();
        const result = await client.query(
            `SELECT id, nome_usuario, nome_completo, email, nivel_acesso, status
             FROM usuarios ORDER BY nome_completo, nome_usuario ASC`
        );
        console.log('[index.js] Found Users:', result.rows.length);
        return result.rows;
    } catch (error) {
        console.error('[index.js] Error getUsers:', error);
        return [];
    } finally {
        if (client) { console.log('[DEBUG getUsers] Releasing client.'); client.release(); }
    }
}

// Busca dados de um usuário por ID (Tabela Usuarios, agora com status)
async function getUserById(userId) {
    console.log(`[index.js] GET User ID: ${userId}`);
    if (!userId) { console.error('[index.js] Error: ID missing for getUserById.'); return null; }
    let client;
    try {
        client = await getPoolOrError().connect();
        const result = await client.query(
            `SELECT id, nome_usuario, nome_completo, email, nivel_acesso, status
             FROM usuarios WHERE id = $1`,
            [userId]
        );
        if (result.rows.length > 0) {
            console.log(`[index.js] Found data for user ID ${userId}.`);
            return result.rows[0];
        } else {
            console.warn(`[index.js] User ID ${userId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`[index.js] Error getUserById (${userId}):`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

// Atualiza dados de um usuário (Tabela Usuarios, agora com status)
async function updateUser(userId, userData) {
    console.log(`[index.js] UPDATE User ID: ${userId}`, userData);
    const { nomeUsuario, nomeCompleto, email, senha, nivelAcesso, status } = userData;
    const saltRounds = 10;

    if (!userId || !nomeUsuario || !nivelAcesso) return { success: false, message: 'ID, Nome de Usuário e Nível de Acesso obrigatórios para atualização.' };
    if (nivelAcesso !== 'admin' && nivelAcesso !== 'porteiro') return { success: false, message: 'Nível de acesso inválido.' };
    if (status && status !== 'Ativo' && status !== 'Inativo') return { success: false, message: 'Status inválido (deve ser Ativo ou Inativo).' };

    let client;
    try {
        client = await getPoolOrError().connect();
        let queryFields = ['nome_usuario = $1', 'nivel_acesso = $2'];
        let queryParams = [nomeUsuario, nivelAcesso];
        let paramCounter = 3;

        if (nomeCompleto !== undefined) { queryFields.push(`nome_completo = $${paramCounter}`); queryParams.push(nomeCompleto); paramCounter++; }
        if (email !== undefined) { queryFields.push(`email = $${paramCounter}`); queryParams.push(email); paramCounter++; }
        if (status) { queryFields.push(`status = $${paramCounter}`); queryParams.push(status); paramCounter++; }

        if (senha && senha.length >= 6) {
             console.log(`[index.js] Updating user ID ${userId} WITH password.`);
             const novaSenhaHash = await bcrypt.hash(senha, saltRounds);
             queryFields.push(`senha_hash = $${paramCounter}`); queryParams.push(novaSenhaHash); paramCounter++;
        } else if (senha && senha.length > 0) {
             return { success: false, message: 'Nova senha mínima 6 caracteres.' };
        }

        queryParams.push(userId);
        const queryText = `UPDATE usuarios SET ${queryFields.join(', ')} WHERE id = $${paramCounter}`;

        console.log(`[DEBUG updateUser] Query: ${queryText}`); console.log(`[DEBUG updateUser] Params:`, queryParams);
        const result = await client.query(queryText, queryParams);

        if (result.rowCount > 0) {
            console.log(`[index.js] User ID ${userId} updated.`);
            return { success: true, message: 'Usuário atualizado!' };
        } else {
            console.warn(`[index.js] Update User ID ${userId}: not found.`);
            return { success: false, message: 'Usuário não encontrado.' };
        }

    } catch (error) {
        console.error(`[index.js] Error updateUser ID ${userId}:`, error);
        if (error.code === '23505') {
            if (error.constraint?.includes('nome_usuario')) return { success: false, message: 'Erro: Nome de usuário já existe.' };
            if (error.constraint?.includes('email')) return { success: false, message: 'Erro: Email já cadastrado.' };
        }
        return { success: false, message: `Erro interno update. (${error.code || 'N/A'})` };
    } finally {
        if (client) client.release();
    }
}

// Exclui Usuário (Tabela Usuarios)
async function deleteUser(userId) {
    console.log(`[index.js] DELETE User ID: ${userId}`);
    if (!userId) return { success: false, message: 'ID não fornecido.' };
    let client;
    try {
        client = await getPoolOrError().connect();
         const checkEncomendas = await client.query('SELECT 1 FROM encomendas WHERE porteiro_recebeu_id = $1 OR porteiro_entregou_id = $1 LIMIT 1', [userId]);
         if (checkEncomendas.rows.length > 0) {
              return { success: false, message: 'Não é possível excluir: usuário possui encomendas associadas.' };
         }

        const result = await client.query('DELETE FROM usuarios WHERE id = $1', [userId]);
        if (result.rowCount > 0) {
            console.log(`[index.js] User ID ${userId} deleted.`);
            return { success: true, message: 'Usuário excluído!' };
        } else {
            console.warn(`[index.js] Delete User ID ${userId}: not found.`);
            return { success: false, message: 'Usuário não encontrado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error deleteUser ID ${userId}:`, error);
         if (error.code === '23503') return { success: false, message: 'Não é possível excluir: usuário referenciado em outra tabela (ex: encomendas).' };
        return { success: false, message: 'Erro interno ao excluir.' };
    } finally {
        if (client) client.release();
    }
}

// Salva um novo usuário (Tabela Usuarios, agora com status padrão 'Ativo')
async function saveUser(userData) {
    console.log('[index.js] SAVE User:', userData);
    const { nomeUsuario, nomeCompleto, email, senha, nivelAcesso } = userData;
    const saltRounds = 10;
    const statusPadrao = 'Ativo';

    if (!nomeUsuario || !senha || !nivelAcesso) return { success: false, message: 'Nome de usuário, Senha e Nível de Acesso obrigatórios.' };
    if (nivelAcesso !== 'admin' && nivelAcesso !== 'porteiro') return { success: false, message: 'Nível de acesso inválido.' };
    if (senha.length < 6) return { success: false, message: 'Senha mínima 6 caracteres.' };

    let client;
    try {
        console.log('[index.js] Gerando hash senha...');
        const senhaHash = await bcrypt.hash(senha, saltRounds);
        console.log('[index.js] Hash gerado.');
        client = await pool.connect();
        const queryText = `INSERT INTO usuarios (nome_usuario, nome_completo, email, senha_hash, nivel_acesso, status)
                           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const queryParams = [nomeUsuario, nomeCompleto || null, email || null, senhaHash, nivelAcesso, statusPadrao];

        console.log(`[DEBUG saveUser] Query: ${queryText}`); console.log(`[DEBUG saveUser] Params:`, queryParams);
        const result = await client.query(queryText, queryParams);
        const newId = result.rows[0]?.id;
        console.log(`[index.js] Usuário (${nivelAcesso}, ${statusPadrao}) salvo! ID:`, newId);
        return { success: true, message: `Usuário (${nivelAcesso}) salvo!`, newId: newId };
    } catch (error) {
        console.error('[index.js] Error saveUser DB:', error);
        console.error(`[DEBUG saveUser] DB Error Code: ${error.code}, Constraint: ${error.constraint}`);
        if (error.code === '23505') {
            if (error.constraint?.includes('nome_usuario')) return { success: false, message: 'Erro: Nome de usuário já existe.' };
            if (error.constraint?.includes('email')) return { success: false, message: 'Erro: Email já cadastrado.' };
        }
        return { success: false, message: `Erro BD (${error.code || 'N/A'})` };
    } finally {
        if (client) { console.log('[DEBUG saveUser] Releasing client.'); client.release(); }
    }
}

// Função auxiliar para garantir pool inicializado e tratar erro de conexão
function getPoolOrError() {
  if (!pool) {
    throw new Error('Banco de dados não configurado. Configure o banco antes de usar o app.');
  }
  return pool;
}

// Wrappers para handlers IPC (com modo master para configuração inicial)
async function handleGetPendingPackages(event) {
  try {
    return await getPendingPackages();
  } catch (error) {
    console.log('[DEBUG] Erro de banco:', error.message);
    return [];
  }
}

async function handleGetResidents(event) {
  try {
    return await getResidents();
  } catch (error) {
    console.log('[DEBUG] Erro de banco:', error.message);
    return [];
  }
}

async function handleGetUsers(event) {
  try {
    return await getUsers();
  } catch (error) {
    console.log('[DEBUG] Erro de banco:', error.message);
    return [];
  }
}

async function handleGetDashboardStats(event) {
  try {
    return await getDashboardStats();
  } catch (error) {
    console.log('[DEBUG] Erro de banco:', error.message);
    return {};
  }
}

async function handleSearchResidents(event, searchTerm) {
  try {
    return await searchResidents(searchTerm);
  } catch (error) {
    console.log('[DEBUG] Erro de banco:', error.message);
    return [];
  }
}

async function handleSearchActivePorters(event, searchTerm) {
  try {
    return await searchActivePorters(searchTerm);
  } catch (error) {
    console.log('[DEBUG] Erro de banco:', error.message);
    return [];
  }
}

// -------------------------------------------
async function getPackageById(packageId) {
    console.log(`[index.js] GET Package By ID: ${packageId}`);
    console.log(`[index.js] Package ID tipo: ${typeof packageId}, valor: ${packageId}`);
    
    if (!packageId) {
        console.error('[index.js] Error: Package ID missing for getPackageById.');
        return { success: false, message: 'ID da encomenda não fornecido.', data: null };
    }
    let client;
    try {
        console.log('[index.js] Conectando ao banco...');
        client = await getPoolOrError().connect();
        console.log('[index.js] Executando query...');
        
        const result = await client.query(
            `SELECT
                E.id, E.morador_id, M.nome AS morador_nome,
                E.porteiro_recebeu_id, U.nome_completo AS porteiro_nome,
                E.data_recebimento, E.quantidade, E.status, E.observacoes, E.codigo_rastreio,
                E.data_entrega, E.porteiro_entregou_id, U_entrega.nome_completo AS porteiro_entregou_nome
             FROM encomendas E
             JOIN moradores M ON E.morador_id = M.id
             LEFT JOIN usuarios U ON E.porteiro_recebeu_id = U.id
             LEFT JOIN usuarios U_entrega ON E.porteiro_entregou_id = U_entregou.id
             WHERE E.id = $1`,
            [packageId]
        );

        console.log(`[index.js] Query executada, ${result.rows.length} resultados encontrados`);

        if (result.rows.length > 0) {
            console.log(`[index.js] Found package data for ID ${packageId}.`);
            // Formata a data_recebimento para YYYY-MM-DD e a hora para HH:MM
            const pkg = result.rows[0];
            console.log('[index.js] Dados brutos da encomenda:', pkg);
            
            if (pkg.data_recebimento) {
                const dataHora = new Date(pkg.data_recebimento);
                // Ajusta para o fuso horário local antes de formatar
                // (Este ajuste pode precisar de mais cuidado dependendo do seu fuso e como o timestamp é salvo)
                // Para simplificar, vamos assumir que o timestamp no banco já está "ok" para conversão direta.
                // Se as datas/horas ficarem erradas, precisaremos ajustar a conversão de fuso aqui.
                pkg.data_recebimento_date = dataHora.toISOString().split('T')[0]; // YYYY-MM-DD
                pkg.data_recebimento_time = dataHora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
                console.log('[index.js] Data formatada:', pkg.data_recebimento_date, pkg.data_recebimento_time);
            }
            console.log('[index.js] Retornando sucesso com dados');
            return { success: true, data: pkg };
        } else {
            console.warn(`[index.js] Package ID ${packageId} not found.`);
            return { success: false, message: 'Encomenda não encontrada.', data: null };
        }
    } catch (error) {
        console.error(`[index.js] Error getPackageById (${packageId}):`, error);
        return { success: false, message: 'Erro ao buscar encomenda.', data: null, error: error.message };
    } finally {
        if (client) {
            console.log('[index.js] Liberando conexão do cliente');
            client.release();
        }
    }
}

async function updatePackage(packageId, packageData) {
    console.log(`[index.js] UPDATE Package ID: ${packageId}`, packageData);

    // Extrai os dados esperados. A dataRecebimento já deve vir no formato ISO string do frontend.
    const {
        moradorId,
        porteiroUserId, // Este é o ID do usuário que recebeu (porteiro_recebeu_id)
        quantidade,
        dataRecebimento, // Espera-se uma string ISO (ex: "2025-05-11T12:30:00.000Z")
        observacoes
        // codigo_rastreio - se você adicionar este campo ao modal de edição
    } = packageData;

    // Validação básica (pode expandir conforme necessidade)
    if (!packageId) return { success: false, message: 'ID da encomenda não fornecido para atualização.' };
    if (!moradorId || !porteiroUserId || !quantidade || !dataRecebimento) {
        return { success: false, message: 'Campos obrigatórios (Morador, Porteiro, Quantidade, Data/Hora) não preenchidos.' };
    }

    let client;
    try {
        client = await getPoolOrError().connect();
        const queryText = `
            UPDATE encomendas
            SET morador_id = $1,
                porteiro_recebeu_id = $2,
                quantidade = $3,
                data_recebimento = $4,
                observacoes = $5
                -- , codigo_rastreio = $6 -- Adicionar se for editar
            WHERE id = $6; -- O ID da encomenda é o último parâmetro
        `;
        const queryParams = [
            moradorId,
            porteiroUserId,
            parseInt(quantidade, 10),
            dataRecebimento, // Deve ser uma string de timestamp válida para o PostgreSQL
            observacoes || null,
            // codigo_rastreio || null, // Adicionar se for editar
            packageId
        ];

        const result = await client.query(queryText, queryParams);

        if (result.rowCount > 0) {
            console.log(`[index.js] Package ID ${packageId} updated successfully.`);
            return { success: true, message: 'Encomenda atualizada com sucesso!' };
        } else {
            console.warn(`[index.js] Update Package ID ${packageId}: not found or no changes made.`);
            return { success: false, message: 'Encomenda não encontrada para atualização ou nenhum dado foi alterado.' };
        }
    } catch (error) {
        console.error(`[index.js] Error updating package ID ${packageId}:`, error);
        if (error.code === '23503') { // Foreign Key violation
             if (error.constraint?.includes('morador_id')) return { success: false, message: 'Erro: Morador inválido.' };
             if (error.constraint?.includes('usuario_recebeu_id')) return { success: false, message: 'Erro: Porteiro inválido.' };
             return { success: false, message: 'Erro de referência ao atualizar.' };
        }
        return { success: false, message: `Erro interno ao atualizar encomenda (${error.code || 'N/A'}).` };
    } finally {
        if (client) client.release();
    }
}

async function deliverPackage(packageId, deliveryData) {
    console.log(`[index.js] ATTEMPTING Deliver Package ID: ${packageId} with data:`, deliveryData);
    console.log('[index.js DEBUG] Função deliverPackage chamada com packageId:', packageId, 'E deliveryData:', deliveryData);
    console.log('[index.js DEBUG] packageId type:', typeof packageId, 'Value:', packageId);
    console.log('[index.js DEBUG] deliveryData type:', typeof deliveryData, 'Value:', deliveryData);

    // Converte packageId para número inteiro se for string
    const numericPackageId = typeof packageId === 'string' ? parseInt(packageId, 10) : packageId;
    
    if (isNaN(numericPackageId) || numericPackageId <= 0) {
        console.error('[index.js DEBUG] Invalid packageId:', packageId, 'converted to:', numericPackageId);
        return { success: false, message: 'ID da encomenda inválido.' };
    }

    const {
        porteiroEntregouId, // ID do usuário que está registrando a entrega
        dataEntrega,         // String ISO da data/hora da entrega (ex: "2025-05-11T14:30:00.000Z")
        retiradoPorNome,     // Nome de quem retirou
        observacoesEntrega   // Observações específicas da entrega
    } = deliveryData;

    console.log('[index.js DEBUG] Extracted values:');
    console.log('  - numericPackageId:', numericPackageId, 'type:', typeof numericPackageId);
    console.log('  - porteiroEntregouId:', porteiroEntregouId, 'type:', typeof porteiroEntregouId);
    console.log('  - dataEntrega:', dataEntrega, 'type:', typeof dataEntrega);
    console.log('  - retiradoPorNome:', retiradoPorNome, 'type:', typeof retiradoPorNome);
    console.log('  - observacoesEntrega:', observacoesEntrega, 'type:', typeof observacoesEntrega);

    if (!numericPackageId || !porteiroEntregouId || !dataEntrega) {
        console.log('[index.js DEBUG] Validation failed:');
        console.log('  - numericPackageId check:', !numericPackageId, 'value:', numericPackageId);
        console.log('  - porteiroEntregouId check:', !porteiroEntregouId, 'value:', porteiroEntregouId);
        console.log('  - dataEntrega check:', !dataEntrega, 'value:', dataEntrega);
        return { success: false, message: 'ID da encomenda, ID do porteiro ou Data/Hora da entrega não fornecidos.' };
    }

    let client;
    try {
        client = await getPoolOrError().connect();
        const newStatus = 'Entregue';

        // Atualiza a encomenda com os novos dados
        const queryText = `
            UPDATE encomendas
            SET status = $1,
                data_entrega = $2,       -- Data/hora fornecida pelo modal
                porteiro_entregou_id = $3, -- Porteiro selecionado no modal
                retirado_por_nome = $4,  -- Nome de quem retirou
                observacoes = $5         -- Atualiza as observações da encomenda com as da entrega
                                         -- (Ou crie uma nova coluna 'observacoes_entrega' se preferir)
            WHERE id = $6 AND status != $1; -- Só atualiza se o status ainda não for 'Entregue'
        `;
        const queryParams = [
            newStatus,
            dataEntrega, // Deve ser um timestamp válido
            porteiroEntregouId,
            retiradoPorNome || null, // Permite nulo se não preenchido
            observacoesEntrega || null, // Permite nulo se não preenchido
            numericPackageId // Usar o ID numérico validado
        ];

        console.log('[index.js DEBUG] Query parameters:', queryParams);

        const result = await client.query(queryText, queryParams);

        if (result.rowCount > 0) {
            console.log(`[index.js] Package ID ${numericPackageId} marked as delivered by User ID ${porteiroEntregouId}.`);
            return { success: true, message: 'Encomenda marcada como entregue com sucesso!' };
        } else {
            const checkPkg = await client.query("SELECT status FROM encomendas WHERE id = $1", [numericPackageId]);
            if (checkPkg.rows.length === 0) {
                console.error(`[index.js] Package ID ${numericPackageId} not found in database`);
                return { success: false, message: 'Encomenda não encontrada.' };
            }
            if (checkPkg.rows[0].status === newStatus) {
                return { success: false, message: 'Esta encomenda já foi marcada como entregue anteriormente.' };
            }
            console.warn(`[index.js] Deliver Package ID ${numericPackageId}: No rows updated. Possible race condition or wrong ID.`);
            return { success: false, message: 'Não foi possível atualizar a encomenda (nenhuma linha afetada).' };
        }
    } catch (error) {
        console.error(`[index.js] Error delivering package ID ${numericPackageId}:`, error);
        if (error.code === '23503' && error.constraint?.includes('porteiro_entregou_id')) {
             return { success: false, message: 'Erro: Porteiro que entregou inválido.' };
        }
        return { success: false, message: `Erro interno ao registrar entrega (${error.message || error.code || 'N/A'}).` };
    } finally {
        if (client) client.release();
    }
}

// Função para obter estatísticas do dashboard
async function getDashboardStats() {
    console.log('[index.js] GET Dashboard Stats...');
    let client;
    try {
        client = await getPoolOrError().connect();
        
        // Total de moradores cadastrados
        const totalMoradoresResult = await client.query('SELECT COUNT(*) as total FROM moradores');
        const totalMoradores = parseInt(totalMoradoresResult.rows[0]?.total || 0);
        
        // Encomendas antigas (> 7 dias)
        const encomendasAntigasResult = await client.query(`
            SELECT COUNT(*) as total 
            FROM encomendas 
            WHERE status = 'Recebida na portaria' 
            AND data_recebimento < NOW() - INTERVAL '7 days'
        `);
        const encomendasAntigas = parseInt(encomendasAntigasResult.rows[0]?.total || 0);
        
        // Encomendas críticas (> 15 dias)
        const encomendasCriticasResult = await client.query(`
            SELECT COUNT(*) as total 
            FROM encomendas 
            WHERE status = 'Recebida na portaria' 
            AND data_recebimento < NOW() - INTERVAL '15 days'
        `);
        const encomendasCriticas = parseInt(encomendasCriticasResult.rows[0]?.total || 0);
        
        const stats = {
            totalMoradores,
            encomendasAntigas,
            encomendasCriticas
        };
        
        console.log('[index.js] Dashboard Stats:', stats);
        return stats;
        
    } catch (error) {
        console.error('[index.js] Error getDashboardStats:', error);
        return {
            totalMoradores: 0,
            encomendasAntigas: 0,
            encomendasCriticas: 0
        };
    } finally {
        if (client) client.release();
    }
}

// Função para obter dados dos gráficos do dashboard
async function getDashboardChartData() {
    console.log('[index.js] GET Dashboard Chart Data...');
    let client;
    try {
        client = await getPoolOrError().connect();
        
        // PRIMEIRO: Vamos verificar os dados brutos para debug
        console.log('[DEBUG] Verificando dados brutos...');
        const debugQuery = await client.query(`
            SELECT id, quantidade, data_recebimento, status 
            FROM encomendas 
            ORDER BY data_recebimento DESC 
            LIMIT 10
        `);
        console.log('[DEBUG] Últimas 10 encomendas:', debugQuery.rows);
        
        // 1. Encomendas recebidas dia a dia nos últimos 15 dias
        console.log('[DEBUG] Executando query por dia...');
        const encomendasPorDiaResult = await client.query(`
            SELECT 
                DATE(data_recebimento) as dia,
                SUM(CAST(quantidade AS integer)) as total
            FROM encomendas 
            WHERE data_recebimento >= CURRENT_DATE - INTERVAL '15 days'
            AND data_recebimento IS NOT NULL
            GROUP BY DATE(data_recebimento)
            ORDER BY dia
        `);
        console.log('[DEBUG] Resultado por dia:', encomendasPorDiaResult.rows);
        
        // 2. Encomendas totais recebidas mês a mês (últimos 12 meses)
        console.log('[DEBUG] Executando query por mês...');
        const encomendasPorMesResult = await client.query(`
            SELECT 
                TO_CHAR(data_recebimento, 'YYYY-MM') as mes,
                SUM(CAST(quantidade AS integer)) as total
            FROM encomendas 
            WHERE data_recebimento >= NOW() - INTERVAL '12 months'
            AND data_recebimento IS NOT NULL
            GROUP BY TO_CHAR(data_recebimento, 'YYYY-MM')
            ORDER BY mes
        `);
        console.log('[DEBUG] Resultado por mês:', encomendasPorMesResult.rows);
        
        const chartData = {
            encomendasPorDia: encomendasPorDiaResult.rows,
            encomendasPorMes: encomendasPorMesResult.rows
        };
        
        console.log('[index.js] Dashboard Chart Data FINAL:', chartData);
        return chartData;
        
    } catch (error) {
        console.error('[index.js] Error getDashboardChartData:', error);
        return {
            encomendasPorDia: [],
            encomendasPorMes: []
        };
    } finally {
        if (client) client.release();
    }
}

// Nova função que retorna dados brutos para aplicar a mesma lógica dos cards
async function getDashboardChartRawData() {
    console.log('[DEBUG] getDashboardChartRawData: Iniciando...');
    let client;
    try {
        client = await getPoolOrError().connect();
        console.log('[DEBUG] getDashboardChartRawData: Conectado ao banco');
        
        // 1. Buscar encomendas individuais dos últimos 15 dias SEM FILTRO DE STATUS
        const encomendasPorDiaRaw = await client.query(`
            SELECT 
                DATE(data_recebimento) as dia,
                quantidade,
                data_recebimento,
                status
            FROM encomendas 
            WHERE data_recebimento >= CURRENT_DATE - INTERVAL '15 days'
            AND data_recebimento IS NOT NULL
            ORDER BY data_recebimento
        `);
        
        // 2. Buscar encomendas individuais dos últimos 12 meses SEM FILTRO DE STATUS
        const encomendasPorMesRaw = await client.query(`
            SELECT 
                TO_CHAR(data_recebimento, 'YYYY-MM') as mes,
                quantidade,
                data_recebimento,
                status
            FROM encomendas 
            WHERE data_recebimento >= NOW() - INTERVAL '12 months'
            AND data_recebimento IS NOT NULL
            ORDER BY data_recebimento
        `);
        
        const rawData = {
            encomendasPorDiaRaw: encomendasPorDiaRaw.rows,
            encomendasPorMesRaw: encomendasPorMesRaw.rows
        };
        
        console.log('[DEBUG] getDashboardChartRawData: Dados retornados ->', rawData);
        console.log('[DEBUG] getDashboardChartRawData: Registros por dia:', encomendasPorDiaRaw.rows.length);
        console.log('[DEBUG] getDashboardChartRawData: Registros por mês:', encomendasPorMesRaw.rows.length);
        return rawData;
        
    } catch (error) {
        console.error('[index.js] Error getDashboardChartRawData:', error);
        return {
            encomendasPorDiaRaw: [],
            encomendasPorMesRaw: []
        };
    } finally {
        if (client) client.release();
    }
}

// --- Configuração do Ciclo de Vida do Electron ---
app.whenReady().then(() => {
  console.log('[index.js] App pronto. Configurando IPC e criando janela...');

  // --- REGISTRO DOS HANDLERS IPC (COM CORREÇÃO) ---
  console.log('[index.js] Registrando handlers IPC...');
  ipcMain.handle('get-pending-packages', handleGetPendingPackages);
  ipcMain.handle('search-porters', (event, searchTerm) => searchActivePorters(searchTerm));
  ipcMain.handle('search-residents', (event, searchTerm) => searchResidents(searchTerm));
  ipcMain.handle('save-resident', (event, residentData) => saveResident(residentData));
  ipcMain.handle('get-residents', handleGetResidents);
  ipcMain.handle('delete-resident', (event, residentId) => deleteResident(residentId));
  ipcMain.handle('get-resident-by-id', (event, residentId) => getResidentById(residentId));
  ipcMain.handle('update-resident', (event, { residentId, residentData }) => updateResident(residentId, residentData));
  ipcMain.handle('login-user', (event, credentials) => loginUser(credentials.username, credentials.password));
  ipcMain.handle('save-package', (event, packageData) => savePackage(packageData));
  ipcMain.handle('save-user', (event, userData) => saveUser(userData));
  ipcMain.handle('get-users', handleGetUsers);
  ipcMain.handle('delete-user', (event, userId) => deleteUser(userId));
  ipcMain.handle('get-user-by-id', (event, userId) => getUserById(userId));
  ipcMain.handle('update-user', (event, { userId, userData }) => updateUser(userId, userData));
  ipcMain.handle('get-package-by-id', (event, packageId) => getPackageById(packageId));
  ipcMain.handle('update-package', (event, { packageId, packageData }) => updatePackage(packageId, packageData));
  ipcMain.handle('deliver-package', (event, { packageId, deliveryData }) => deliverPackage(packageId, deliveryData));
  ipcMain.handle('get-dashboard-stats', handleGetDashboardStats);
  ipcMain.handle('get-dashboard-chart-data', getDashboardChartData);
  console.log('[index.js] Registrando handler get-dashboard-chart-raw-data...');
  ipcMain.handle('get-dashboard-chart-raw-data', getDashboardChartRawData);
  console.log('[index.js] Handler get-dashboard-chart-raw-data registrado com sucesso!');

  // Handler para buscar usuários ativos (para API)
  ipcMain.handle('get-active-users', (event, nivel) => getActiveUsers(nivel));

  // Handler para buscar relatório
  ipcMain.handle('buscar-relatorio', async (event, filtros) => {
    let query = `
      SELECT 
        e.id,
        e.data_recebimento as data,
        m.nome as morador,
        m.apartamento,
        m.bloco,
        m.telefone,
        m.rua,
        m.numero,
        u.nome_completo as porteiro,
        e.quantidade,
        e.status,
        e.observacoes,
        e.codigo_rastreio,
        e.data_entrega,
        u_entrega.nome_completo as porteiro_entregou,
        e.retirado_por_nome
      FROM encomendas e
      LEFT JOIN moradores m ON e.morador_id = m.id
      LEFT JOIN usuarios u ON e.porteiro_recebeu_id = u.id
      LEFT JOIN usuarios u_entrega ON e.porteiro_entregou_id = u_entrega.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filtros.dataInicial && filtros.dataInicial.trim() !== '') {
      query += ` AND e.data_recebimento >= $${idx++}`;
      params.push(filtros.dataInicial);
    }
    if (filtros.dataFinal && filtros.dataFinal.trim() !== '') {
      let dataFinal = filtros.dataFinal;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
        dataFinal += ' 23:59:59';
      }
      query += ` AND e.data_recebimento <= $${idx++}`;
      params.push(dataFinal);
    }
    if (filtros.morador && filtros.morador.trim() !== '') {
      query += ` AND m.nome ILIKE $${idx++}`;
      params.push(`%${filtros.morador}%`);
    }
    if (filtros.porteiro && filtros.porteiro.trim() !== '') {
      query += ` AND u.nome_completo ILIKE $${idx++}`;
      params.push(`%${filtros.porteiro}%`);
    }
    if (filtros.status && filtros.status.trim() !== '') {
      query += ` AND e.status = $${idx++}`;
      params.push(filtros.status);
    }

    query += ' ORDER BY e.data_recebimento DESC';

    let client;
    try {
      client = await getPoolOrError().connect();
      const result = await client.query(query, params);
      console.log('[buscar-relatorio] Query executada:', query);
      console.log('[buscar-relatorio] Parâmetros:', params);
      console.log('[buscar-relatorio] Resultados encontrados:', result.rows.length);
      console.log('[buscar-relatorio] Primeiro resultado (debug):', result.rows[0]);
      return result.rows;
    } catch (error) {
      console.error('[index.js] Erro buscar-relatorio:', error);
      return [];
    } finally {
      if (client) client.release();
    }
  });

  // Handler para exportar PDF
  ipcMain.handle('exportar-relatorio-pdf', async (event, filtros) => {
    // Query corrigida com nomes de tabelas em minúsculas
    let query = `
      SELECT 
        e.id,
        e.data_recebimento as data,
        m.nome as morador,
        m.apartamento,
        m.bloco,
        m.telefone,
        m.rua,
        m.numero,
        u.nome_completo as porteiro,
        e.quantidade,
        e.status,
        e.observacoes,
        e.codigo_rastreio,
        e.data_entrega,
        u_entrega.nome_completo as porteiro_entregou,
        e.retirado_por_nome
      FROM encomendas e
      LEFT JOIN moradores m ON e.morador_id = m.id
      LEFT JOIN usuarios u ON e.porteiro_recebeu_id = u.id
      LEFT JOIN usuarios u_entrega ON e.porteiro_entregou_id = u_entrega.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filtros.dataInicial && filtros.dataInicial.trim() !== '') {
      query += ` AND e.data_recebimento >= $${idx++}`;
      params.push(filtros.dataInicial);
    }
    if (filtros.dataFinal && filtros.dataFinal.trim() !== '') {
      let dataFinal = filtros.dataFinal;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
        dataFinal += ' 23:59:59';
      }
      query += ` AND e.data_recebimento <= $${idx++}`;
      params.push(dataFinal);
    }
    if (filtros.morador && filtros.morador.trim() !== '') {
      query += ` AND m.nome ILIKE $${idx++}`;
      params.push(`%${filtros.morador}%`);
    }
    if (filtros.porteiro && filtros.porteiro.trim() !== '') {
      query += ` AND u.nome_completo ILIKE $${idx++}`;
      params.push(`%${filtros.porteiro}%`);
    }
    if (filtros.status && filtros.status.trim() !== '') {
      query += ` AND e.status = $${idx++}`;
      params.push(filtros.status);
    }

    query += ' ORDER BY e.data_recebimento DESC';

    let client;
    let resultados = [];
    try {
      client = await getPoolOrError().connect();
      const result = await client.query(query, params);
      resultados = result.rows;
      console.log('[exportar-relatorio-pdf] Query executada:', query);
      console.log('[exportar-relatorio-pdf] Parâmetros:', params);
      console.log('[exportar-relatorio-pdf] Resultados:', resultados.length);
    } catch (error) {
      console.error('[index.js] Erro buscar-relatorio (PDF):', error);
      return { success: false, message: 'Erro ao buscar dados para PDF.' };
    } finally {
      if (client) client.release();
    }

    // Solicita ao usuário onde salvar o PDF
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Salvar relatório como PDF',
      defaultPath: 'Relatório de encomendas.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { success: false, message: 'Exportação cancelada pelo usuário.' };
    }

    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Função para formatar data/hora
    const formatarData = (data) => {
      if (!data) return '';
      try {
        const d = new Date(data);
        if (isNaN(d.getTime())) return '';
        return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } catch {
        return '';
      }
    };

    // Função para adicionar nova página se necessário
    const verificarNovaPagina = (yAtual, alturaMinima = 80) => {
      if (yAtual + alturaMinima > doc.page.height - 60) {
        doc.addPage();
        return 60; // Nova posição Y
      }
      return yAtual;
    };

    // Cabeçalho do documento
    doc.fontSize(20).font('Helvetica-Bold').text('RELATÓRIO DE ENCOMENDAS', { align: 'center' });
    doc.moveDown(0.5);

    // Informações do filtro aplicado
    doc.fontSize(10).font('Helvetica');
    let filtroTexto = 'Filtros aplicados: ';
    if (filtros.dataInicial) filtroTexto += `Data inicial: ${filtros.dataInicial} `;
    if (filtros.dataFinal) filtroTexto += `Data final: ${filtros.dataFinal} `;
    if (filtros.morador) filtroTexto += `Morador: ${filtros.morador} `;
    if (filtros.porteiro) filtroTexto += `Porteiro: ${filtros.porteiro} `;
    if (filtros.status) filtroTexto += `Status: ${filtros.status} `;

    doc.text(filtroTexto || 'Filtros aplicados: Nenhum', { align: 'left' });
    doc.text(`Total de registros: ${resultados.length}`, { align: 'left' });
    doc.moveDown(1);

    let y = doc.y;

    // Processar cada encomenda como um bloco completo
    resultados.forEach((encomenda, index) => {
      y = verificarNovaPagina(y, 120);

      // Linha separadora entre encomendas
      if (index > 0) {
        doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();
        y += 10;
      }

      // ID da encomenda e status
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`ENCOMENDA #${encomenda.id}`, 40, y);

      // Status com cor diferente baseado no status
      const statusColor = encomenda.status === 'Entregue' ? 'green' :
                         encomenda.status === 'Recebida na portaria' ? 'orange' : 'black';
      doc.fillColor(statusColor).text(`Status: ${encomenda.status}`, 300, y);
      doc.fillColor('black');
      y += 20;

      // Informações do morador
      doc.fontSize(10).font('Helvetica-Bold').text('DADOS DO MORADOR:', 40, y);
      y += 15;
      doc.font('Helvetica');
      doc.text(`Nome: ${encomenda.morador || 'N/A'}`, 50, y);
      y += 12;

      let endereco = '';
      if (encomenda.rua) endereco += `${encomenda.rua}`;
      if (encomenda.numero) endereco += `, ${encomenda.numero}`;
      if (encomenda.apartamento) endereco += ` - AP: ${encomenda.apartamento}`;
      if (encomenda.bloco) endereco += ` - Bloco: ${encomenda.bloco}`;

      doc.text(`Endereço: ${endereco || 'N/A'}`, 50, y);
      y += 12;
      doc.text(`Telefone: ${encomenda.telefone || 'N/A'}`, 50, y);
      y += 20;

      // Informações da encomenda
      doc.font('Helvetica-Bold').text('DADOS DA ENCOMENDA:', 40, y);
      y += 15;
      doc.font('Helvetica');
      doc.text(`Data de Recebimento: ${formatarData(encomenda.data)}`, 50, y);
      y += 12;
      doc.text(`Quantidade: ${encomenda.quantidade || 'N/A'}`, 50, y);
      y += 12;
      doc.text(`Porteiro que Recebeu: ${encomenda.porteiro || 'N/A'}`, 50, y);
      y += 12;

      if (encomenda.codigo_rastreio) {
        doc.text(`Código de Rastreio: ${encomenda.codigo_rastreio}`, 50, y);
        y += 12;
      }

      // Informações de entrega (se aplicável)
      if (encomenda.status === 'Entregue') {
        y += 8;
        doc.font('Helvetica-Bold').text('DADOS DA ENTREGA:', 40, y);
        y += 15;
        doc.font('Helvetica');
        doc.text(`Data de Entrega: ${formatarData(encomenda.data_entrega)}`, 50, y);
        y += 12;
        doc.text(`Porteiro que Entregou: ${encomenda.porteiro_entregou || 'N/A'}`, 50, y);
        y += 12;
        if (encomenda.retirado_por_nome) {
          doc.text(`Retirado por: ${encomenda.retirado_por_nome}`, 50, y);
          y += 12;
        }
      }

      // Observações
      if (encomenda.observacoes) {
        y += 8;
        doc.font('Helvetica-Bold').text('OBSERVAÇÕES:', 40, y);
        y += 15;
        doc.font('Helvetica');
        // Quebra texto longo em múltiplas linhas
        const obs = encomenda.observacoes;
        const obsLines = [];
        let line = '';
        for (let i = 0; i < obs.length; i++) {
          line += obs[i];
          if (line.length >= 80 || obs[i] === '\n') {
            obsLines.push(line);
            line = '';
          }
        }
        if (line) obsLines.push(line);
        obsLines.forEach(linha => {
          doc.text(linha, 50, y);
          y += 12;
        });
      }

      y += 20; // Espaço entre encomendas
    });

    // Rodapé em todas as páginas
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const dataHora = new Date();
      const textoRodape = `Relatório gerado em: ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR')}`;
      doc.fontSize(8).fillColor('gray')
         .text(textoRodape, 40, doc.page.height - 40, { align: 'left' })
         .text(`Página ${i + 1}`, 0, doc.page.height - 40, { align: 'right', width: doc.page.width - 80 });
    }

    doc.end();

    // Aguarda o término da escrita do PDF
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({ success: true, message: 'PDF exportado com sucesso!', path: filePath });
      });
      stream.on('error', (err) => {
        reject({ success: false, message: 'Erro ao salvar PDF: ' + err.message });
      });
    });
  });

  // Handler para importação de moradores via CSV
  ipcMain.handle('importar-moradores-csv', async (event, csvContent) => {
    try {
      // Parse do CSV
      const records = csvParse.parse(csvContent, {
        columns: true, // Usa cabeçalho
        skip_empty_lines: true,
        trim: true
      });

      let client = await pool.connect();
      let inseridos = 0;
      for (const row of records) {
        // Ajuste os nomes dos campos conforme o cabeçalho do seu CSV
        const { nome, telefone, rua, numero, bloco, apartamento, observacoes } = row;
        if (!nome || !rua || !numero || !apartamento) continue; // Campos obrigatórios
        await client.query(
          `INSERT INTO moradores (nome, telefone, rua, numero, bloco, apartamento, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [nome, telefone || null, rua, numero, bloco || null, apartamento, observacoes || null]
        );
        inseridos++;
      }
      client.release();
      return { success: true, message: `Importação concluída! ${inseridos} moradores inseridos.` };
    } catch (error) {
      console.error('[importar-moradores-csv] Erro:', error);
      return { success: false, message: 'Erro ao importar moradores: ' + error.message };
    }
  });

  // Listener para focar a janela principal
  ipcMain.on('focus-main-window', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.webContents.focus();
          console.log('[Main Process] Foco aplicado.');
      } else {
           console.error('[Main Process] mainWindow não encontrada para aplicar foco.');
      }
  });

  // --- IPC para configuração do banco ---
  ipcMain.handle('get-db-config', () => {
    return readDbConfig();
  });
  ipcMain.handle('save-db-config', (event, config) => {
    const ok = saveDbConfig(config);
    if (ok) {
      // Recria o pool com a nova config
      initDbPool();
      return { success: true };
    }
    return { success: false, message: 'Erro ao salvar configuração.' };
  });

  // Handler para criar tabelas do banco (executa o SQL do esquema)
  ipcMain.handle('criar-tabelas-banco', async () => {
    try {
      const client = await getPoolOrError().connect();
      // Use o SQL do seu esquema (ajuste se necessário)
      const sql = `
        CREATE TABLE IF NOT EXISTS public.moradores (
          id serial PRIMARY KEY,
          nome varchar(255) NOT NULL,
          telefone varchar(50),
          rua varchar(255) NOT NULL,
          numero varchar(50) NOT NULL,
          bloco varchar(100),
          apartamento varchar(100) NOT NULL,
          observacoes text
        );
        CREATE TABLE IF NOT EXISTS public.usuarios (
          id serial PRIMARY KEY,
          nome_usuario varchar(50) NOT NULL UNIQUE,
          senha_hash text NOT NULL,
          nome_completo varchar(100),
          nivel_acesso varchar(20) NOT NULL CHECK (nivel_acesso IN ('admin', 'porteiro')),
          data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          email varchar(100) UNIQUE,
          status varchar(50) NOT NULL DEFAULT 'Ativo'
        );
        CREATE TABLE IF NOT EXISTS public.encomendas (
          id serial PRIMARY KEY,
          morador_id integer NOT NULL REFERENCES public.moradores(id),
          porteiro_recebeu_id integer NOT NULL REFERENCES public.usuarios(id),
          data_recebimento timestamp with time zone NOT NULL,
          quantidade integer NOT NULL DEFAULT 1,
          observacoes text,
          status varchar(50) NOT NULL DEFAULT 'Recebida na portaria',
          data_entrega timestamp with time zone,
          porteiro_entregou_id integer REFERENCES public.usuarios(id),
          codigo_rastreio varchar(100),
          retirado_por_nome text
        );
        CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
        CREATE INDEX IF NOT EXISTS idx_usuarios_nome_usuario ON public.usuarios(nome_usuario);
      `;
      await client.query(sql);
      client.release();
      return { success: true, message: 'Tabelas criadas/verificadas com sucesso!' };
    } catch (err) {
      return { success: false, message: 'Erro ao criar tabelas: ' + err.message };
    }
  });

  // Handler para verificar se existe usuário admin
  ipcMain.handle('existe-usuario-admin', async () => {
    try {
      const client = await getPoolOrError().connect();
      const res = await client.query('SELECT COUNT(*) FROM usuarios');
      client.release();
      return { existe: parseInt(res.rows[0].count, 10) > 0 };
    } catch (err) {
      return { existe: false, error: err.message };
    }
  });

  // Handler para criar admin inicial
  ipcMain.handle('criar-admin-inicial', async (event, { nome_usuario, senha }) => {
    try {
      const client = await getPoolOrError().connect();
      // Verifica se já existe algum usuário
      const res = await client.query('SELECT COUNT(*) FROM usuarios');
      if (parseInt(res.rows[0].count, 10) > 0) {
        client.release();
        return { success: false, message: 'Já existe usuário cadastrado.' };
      }
      const senhaHash = await bcrypt.hash(senha, 10);
      await client.query(
        `INSERT INTO usuarios (nome_usuario, senha_hash, nivel_acesso, status) VALUES ($1, $2, 'admin', 'Ativo')`,
        [nome_usuario, senhaHash]
      );
      client.release();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // Handler para testar conexão com o banco
  ipcMain.handle('testar-conexao-banco', async (event, config) => {
  console.log('[IPC] testar-conexao-banco chamado com config:', config);
  try {
    const testPool = new Pool({
      user: config.user,
      host: config.host,
      database: config.database,
      password: config.password,
      port: parseInt(config.port || '5432'),
      connectionTimeoutMillis: 4000,
    });
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    await testPool.end();
    console.log('[IPC] testar-conexao-banco: conexão OK');
    return { success: true, message: 'Conexão bem-sucedida!' };
  } catch (err) {
    console.error('[IPC] testar-conexao-banco: erro ao conectar:', err);
    return { success: false, message: 'Erro ao conectar: ' + (err.message || err) };
  }
});

  // Handler para criar backup
  ipcMain.handle('criar-backup-banco', criarBackupBanco);

  // Handler para importar backup
  ipcMain.handle('importar-backup-banco', importarBackupBanco);

  // Handler para gerar QR Code da API
  ipcMain.handle('generate-api-qrcode', async (event, port) => {
    try {
      console.log(`[IPC] Gerando QR Code para porta: ${port || 3001}`);
      const result = await QRCodeUtils.generateAPIQRCode(port || 3001);
      console.log(`[IPC] Resultado QR Code:`, result);
      return result;
    } catch (error) {
      console.error('[IPC] Erro ao gerar QR Code:', error);
      return { success: false, message: error.message };
    }
  });

  createWindow();
  
  // Iniciar API Server após a janela estar pronta
  setTimeout(async () => {
    try {
      // Cria instância do servidor API com as funções do desktop
      apiServer = new DesktopApiServer({
        getPendingPackages,
        searchResidents,
        getAllResidents, // Adiciona nova função
        saveResident,
        searchActivePorters,
        getActiveUsers, // Nova função adicionada
        savePackage,
        deliverPackage
      });
      
      await apiServer.start(3001);
    } catch (error) {
      console.error('[API] Erro ao iniciar servidor:', error);
    }
  }, 2000);
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

// --- Função para criar backup do banco de dados ---
async function criarBackupBanco() {
  console.log('[index.js] Iniciando backup do banco...');
  
  try {
    const dbConfig = readDbConfig();
    if (!dbConfig) {
      return { success: false, message: 'Configuração do banco não encontrada.' };
    }

    // Solicita ao usuário onde salvar o backup
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Salvar backup do banco de dados',
      defaultPath: `backup_encomendas_${new Date().toISOString().split('T')[0]}.sql`,
      filters: [{ name: 'SQL', extensions: ['sql'] }]
    });

   

    if (canceled || !filePath) {
      return { success: false, message: 'Backup cancelado pelo usuário.' };
    }

    // Determina o caminho do pg_dump baseado no sistema operacional
    let pgDumpPath = 'pg_dump'; // Padrão se estiver no PATH
    
    // Caminhos comuns do PostgreSQL no Windows
    const possiblePaths = [
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
      'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
    ];

    if (os.platform() === 'win32') {
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          pgDumpPath = possiblePath;
          break;
        }
      }
    }

    // Configura as variáveis de ambiente para autenticação
    const env = {
      ...process.env,
           PGPASSWORD: dbConfig.password
    };

    const args = [
      '-h', dbConfig.host,
      '-p', dbConfig.port || '5432',
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '--no-password',
      '--verbose',
      '--clean',
      '--create',
      '--format=custom',
      '--file', filePath
    ];

    console.log(`[backup] Executando: ${pgDumpPath} ${args.join(' ')}`);

    return new Promise((resolve) => {
      const child = execFile(pgDumpPath, args, { env }, (error, stdout, stderr) => {
        if (error) {
          console.error('[backup] Erro ao executar pg_dump:', error);
          console.error('[backup] stderr:', stderr);
          
          // Tenta backup alternativo com SQL plano se falhar
          criarBackupAlternativo(filePath, dbConfig)
            .then(resolve)
            .catch(() => resolve({ 
              success: false, 
              message: `Erro ao criar backup: ${error.message}\n\nDetalhes: ${stderr}` 
            }));
          return;
        }

        console.log('[backup] pg_dump executado com sucesso');
        console.log('[backup] stdout:', stdout);
        
        resolve({ 
          success: true, 
          message: 'Backup criado com sucesso!', 
          path: filePath 
 
        });
      });

      // Timeout de 5 minutos
      setTimeout(() => {
        child.kill();
        resolve({ 
          success: false, 
          message: 'Timeout: Backup demorou mais de 5 minutos para ser concluído.' 
        });
      }, 5 * 60 * 1000);
    });

  } catch (error) {
    console.error('[backup] Erro geral:', error);
    return { success: false, message: `Erro interno: ${error.message}` };
  }
}

// --- Função para importar backup do banco de dados ---
async function importarBackupBanco() {
  console.log('[index.js] Iniciando importação de backup...');
  
  try {
    const dbConfig = readDbConfig();
    if (!dbConfig) {
      return { success: false, message: 'Configuração do banco não encontrada.' };
    }

    // Solicita ao usuário qual arquivo importar
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Selecionar arquivo de backup para importar',
      filters: [{ name: 'SQL', extensions: ['sql'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, message: 'Importação cancelada pelo usuário.' };
    }

    const filePath = filePaths[0];
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'Arquivo de backup não encontrado.' };
    }

    // Confirma a operação (pois é destrutiva)
    const confirmResult = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Cancelar', 'Continuar'],
      defaultId: 0,
      title: 'Confirmar Importação',
      message: 'ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados atuais do banco!',
      detail: 'Todos os dados existentes (moradores, usuários, encomendas) serão perdidos e substituídos pelos dados do backup. Esta ação não pode ser desfeita.\n\nDeseja continuar?'
    });

    if (confirmResult.response === 0) { // Cancelar
      return { success: false, message: 'Importação cancelada pelo usuário.' };
    }

    // Lê o conteúdo do arquivo
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Verifica se é um backup válido
    if (!sqlContent.includes('-- Backup do banco de dados') && 
        
       
 
        
        !sqlContent.includes('-- Backup tabela moradores')) {
      return { success: false, message: 'Arquivo não parece ser um backup válido do sistema.' };
    }

    // Executa o SQL de restauração
    const client = await getPoolOrError().connect();
    
    try {
      console.log('[importar] Iniciando transação...');
      await client.query('BEGIN');
      
      // Desabilita verificações de chave estrangeira temporariamente
      await client.query('SET session_replication_role = replica');
      
      console.log('[importar] Executando SQL do backup...');
      await client.query(sqlContent);
      
      // Reabilita verificações de chave estrangeira
      await client.query('SET session_replication_role = DEFAULT');
      
      await client.query('COMMIT');
      console.log('[importar] Backup importado com sucesso!');
      
      return { 
        success: true, 
        message: 'Backup importado com sucesso! Todos os dados foram restaurados.' 
      };
      
    } catch (error) {
      console.error('[importar] Erro durante importação:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[importar] Erro geral:', error);
    
    // Mensagens de erro mais específicas
    let errorMessage = 'Erro ao importar backup: ';
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      errorMessage += 'Estrutura do banco não encontrada. Execute a criação das tabelas primeiro.';
    } else if (error.message.includes('syntax error')) {
      errorMessage += 'Arquivo de backup com formato inválido ou corrompido.';
    } else if (error.message.includes('permission')) {
      errorMessage += 'Permissão negada para executar a operação no banco.';
    } else {
      errorMessage += error.message;
    }
    
    return { success: false, message: errorMessage };
  }
}

// Função de backup alternativo usando consultas SQL diretas
async function criarBackupAlternativo(filePath, dbConfig) {
  console.log('[backup] Tentando backup alternativo...');
  
  try {
    const client = await getPoolOrError().connect();
    
    // Gera script SQL com os dados
    let sqlScript = `-- Backup do banco de dados - ${new Date().toISOString()}\n\n`;
    
    // Backup da tabela moradores
    const moradores = await client.query('SELECT * FROM moradores ORDER BY id');
       sqlScript += `-- Backup tabela moradores\n`;
    sqlScript += `DELETE FROM moradores;\n`;
    for (const row of moradores.rows) {
      const values = [
        row.id,
        `'${(row.nome || '').replace(/'/g, "''")}'`,
        row.telefone ? `'${row.telefone.replace(/'/g, "''")}'` : 'NULL',
        `'${(row.rua || '').replace(/'/g, "''")}'`,
        `'${(row.numero || '').replace(/'/g, "''")}'`,
        row.bloco ? `'${row.bloco.replace(/'/g, "''")}'` : 'NULL',
        `'${(row.apartamento || '').replace(/'/g, "''")}'`,
        row.observacoes ? `'${row.observacoes.replace(/'/g, "''")}'` : 'NULL'
      ];
      sqlScript += `INSERT INTO moradores (id, nome, telefone, rua, numero, bloco, apartamento, observacoes) VALUES (${values.join(', ')});\n`;
    }
    
    // Backup da tabela usuarios
    const usuarios = await client.query('SELECT * FROM usuarios ORDER BY id');
    sqlScript += `\n-- Backup tabela usuarios\n`;
    sqlScript += `DELETE FROM usuarios;\n`;
    for (const row of usuarios.rows) {
      const values = [
        row.id,
        `'${(row.nome_usuario || '').replace(/'/g, "''")}'`,
        `'${(row.senha_hash || '').replace(/'/g, "''")}'`,
        row.nome_completo ? `'${row.nome_completo.replace(/'/g, "''")}'` : 'NULL',
        `'${row.nivel_acesso}'`,
        `'${row.data_criacao.toISOString()}'`,
        row.email ? `'${row.email.replace(/'/g, "''")}'` : 'NULL',
        `'${row.status || 'Ativo'}'`
      ];
      sqlScript += `INSERT INTO usuarios (id, nome_usuario, senha_hash, nome_completo, nivel_acesso, data_criacao, email, status) VALUES (${values.join(', ')});\n`;
    }
    
    // Backup da tabela encomendas
    const encomendas = await client.query('SELECT * FROM encomendas ORDER BY id');
    sqlScript += `\n-- Backup tabela encomendas\n`;
    sqlScript += `DELETE FROM encomendas;\n`;
    for (const row of encomendas.rows) {
      const values = [
        row.id,
        row.morador_id,
        row.porteiro_recebeu_id,
        `'${row.data_recebimento.toISOString()}'`,
        row.quantidade,
        row.observacoes ? `'${row.observacoes.replace(/'/g, "''")}'` : 'NULL',
        `'${row.status}'`,
        row.data_entrega ? `'${row.data_entrega.toISOString()}'` : 'NULL',
        row.porteiro_entregou_id || 'NULL',
        row.codigo_rastreio ? `'${row.codigo_rastreio.replace(/'/g, "''")}'` : 'NULL',
        row.retirado_por_nome ? `'${row.retirado_por_nome.replace(/'/g, "''")}'` : 'NULL'
      ];
      sqlScript += `INSERT INTO encomendas (id, morador_id, porteiro_recebeu_id, data_recebimento, quantidade, observacoes, status, data_entrega, porteiro_entregou_id, codigo_rastreio, retirado_por_nome) VALUES (${values.join(', ')});\n`;
    }
    
    // Atualiza sequences
    sqlScript += `\n-- Atualizar sequences\n`;
    sqlScript += `SELECT setval('moradores_id_seq', (SELECT MAX(id) FROM moradores));\n`;
    sqlScript += `SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));\n`;
    sqlScript += `SELECT setval('encomendas_id_seq', (SELECT MAX(id) FROM encomendas));\n`;
    
    client.release();
    
    // Salva o arquivo
    fs.writeFileSync(filePath, sqlScript, 'utf8');
    
    return { 
      success: true, 
      message: 'Backup alternativo criado com sucesso!', 
      path: filePath 
    };
    
  } catch (error) {
    console.error('[backup alternativo] Erro:', error);
    return { 
      success: false, 
      message: `Erro no backup alternativo: ${error.message}` 
    };
  }
}

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') { 
    // Encerra API server antes de fechar o app
    if (apiServer) {
      apiServer.stop().then(() => {
        console.log('[index.js] App encerrado.'); 
        app.quit();
      });
    } else {
      console.log('[index.js] App encerrado.'); 
      app.quit();
    }
  } 
});

console.log('[index.js] Script principal carregado.');

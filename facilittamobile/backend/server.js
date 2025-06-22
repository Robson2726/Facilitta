const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Mudança: PostgreSQL ao invés de SQLite
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do banco PostgreSQL (mesma estrutura do desktop)
let pool = null;

// Função para ler configuração do banco (mesmo formato do desktop)
function readDbConfig() {
  // Tenta ler do diretório padrão do Electron primeiro
  const electronPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'facilitta-desktop', 'config.json');
  const localPath = path.join(__dirname, 'config.json');
  
  for (const configPath of [electronPath, localPath]) {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        console.log(`[DB Config] Carregando configuração de: ${configPath}`);
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`[DB Config] Erro ao ler ${configPath}:`, e);
    }
  }
  return null;
}

// Inicializa pool de conexões PostgreSQL
function initDbPool() {
  const dbConfig = readDbConfig();
  if (!dbConfig) {
    console.warn('[DB] Nenhuma configuração encontrada. Criando configuração padrão...');
    // Configuração padrão para desenvolvimento
    const defaultConfig = {
      host: 'localhost',
      port: '5432',
      database: 'controle_encomendas',
      user: 'postgres',
      password: 'sua_senha'
    };
    
    try {
      fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(defaultConfig, null, 2));
      console.log('[DB] Arquivo config.json criado. Configure os dados corretos do banco.');
    } catch (e) {
      console.error('[DB] Erro ao criar config padrão:', e);
    }
    return null;
  }
  
  try {
    pool = new Pool({
      user: dbConfig.user,
      host: dbConfig.host,
      database: dbConfig.database,
      password: dbConfig.password,
      port: parseInt(dbConfig.port || '5432'),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    console.log('[DB] Pool PostgreSQL inicializado');
    return pool;
  } catch (error) {
    console.error('[DB] Erro ao inicializar pool:', error);
    return null;
  }
}

// Inicializa pool
initDbPool();

// Middleware para verificar banco
const checkDb = (req, res, next) => {
  if (!pool) {
    return res.status(500).json({
      success: false,
      message: 'Banco de dados não configurado'
    });
  }
  next();
};

// Função para mapear status desktop -> mobile - CORREÇÃO
const mapStatusToMobile = (desktopStatus) => {
  console.log('[API] Mapeando status:', desktopStatus);
  switch (desktopStatus) {
    case 'Recebida na portaria':
      return 'pendente';
    case 'Entregue':
      return 'entregue';
    case 'pendente': // Caso já esteja no formato mobile
      return 'pendente';
    case 'entregue': // Caso já esteja no formato mobile
      return 'entregue';
    default:
      console.warn('[API] Status desconhecido:', desktopStatus, 'assumindo como pendente');
      return 'pendente';
  }
};

// Função para converter data brasileira para formato SQL
const converterDataBrasileiraParaSQL = (dataBrasileira) => {
  if (!dataBrasileira) return null;
  
  // Se já está no formato SQL (YYYY-MM-DD), retorna como está
  if (dataBrasileira.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dataBrasileira;
  }
  
  // Se está no formato brasileiro (dd/mm/aaaa), converte - CORREÇÃO AQUI
  if (dataBrasileira.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dia, mes, ano] = dataBrasileira.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  // Se está no formato ISO, extrai apenas a data
  if (dataBrasileira.includes('T')) {
    return dataBrasileira.split('T')[0];
  }
  
  // Tenta parsear como Date e converter
  try {
    const date = new Date(dataBrasileira);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn('Erro ao converter data:', dataBrasileira, error);
  }
  
  return null;
};

// Função utilitária para validar e formatar timestamps
const formatarTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    
    return {
      data: date.toISOString().split('T')[0],
      hora: date.toTimeString().split(' ')[0].substring(0, 5),
      iso: date.toISOString()
    };
  } catch (error) {
    console.warn('Erro ao formatar timestamp:', timestamp, error);
    return null;
  }
};

// GET /api/status - Health check
app.get('/api/status', (req, res) => {
  const dbStatus = pool ? 'conectado' : 'desconectado';
  res.json({ 
    success: true, 
    message: 'API Mobile funcionando', 
    database: dbStatus,
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/status - Health check',
      'GET /api/encomendas - Buscar encomendas',
      'POST /api/encomendas - Cadastrar encomenda',
      'PUT /api/encomendas/:id/entregar - Marcar como entregue',
      'GET /api/usuarios - Buscar usuários/porteiros',
      'GET /api/moradores - Buscar moradores',
      'GET /api/moradores/sugestoes - Sugestões de moradores'
    ]
  });
});

// GET /api/encomendas - Buscar encomendas (formato compatível com mobile)
app.get('/api/encomendas', checkDb, async (req, res) => {
  console.log('[API] ===== NOVA VERSÃO DO ENDPOINT /api/encomendas =====');
  
  try {
    const client = await pool.connect();
    
    // Query exata como no desktop
    const queryText = `
      SELECT 
        e.id,
        m.nome as morador_nome,
        e.morador_id,
        m.apartamento,
        m.bloco,
        e.quantidade,
        e.data_recebimento,
        u.nome_completo as porteiro_nome,
        e.observacoes,
        e.status as status_original,
        e.data_entrega,
        u_entrega.nome_completo as porteiro_entregou_nome,
        e.retirado_por_nome
      FROM encomendas e
      JOIN moradores m ON e.morador_id = m.id
      LEFT JOIN usuarios u ON e.porteiro_recebeu_id = u.id
      LEFT JOIN usuarios u_entrega ON e.porteiro_entregou_id = u_entrega.id
      WHERE e.status = 'Recebida na portaria'
      ORDER BY e.data_recebimento DESC
    `;
    
    console.log('[API] EXECUTANDO QUERY FILTRADA:', queryText);
    
    const result = await client.query(queryText);
    console.log(`[API] RESULTADO: ${result.rows.length} encomendas com status 'Recebida na portaria'`);
    
    // Verificar todos os status no banco
    const allStatusQuery = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM encomendas 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('[API] TODOS OS STATUS NO BANCO:', allStatusQuery.rows);
    
    // Verificar total geral
    const totalQuery = await client.query('SELECT COUNT(*) as total FROM encomendas');
    console.log(`[API] TOTAL GERAL DE ENCOMENDAS: ${totalQuery.rows[0].total}`);
    
    // Log dos primeiros 3 registros para debug
    if (result.rows.length > 0) {
      console.log('[API] Primeiros registros encontrados:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`[API] Registro ${index + 1}:`, {
          id: row.id,
          morador: row.morador_nome,
          status: row.status_original,
          data: row.data_recebimento
        });
      });
    }
    
    const encomendas = result.rows.map(row => {
      const dataRecebimento = new Date(row.data_recebimento);
      const dataEntrega = row.data_entrega ? new Date(row.data_entrega) : null;
      
      const dataLocalRecebimento = new Date(dataRecebimento.getTime() + dataRecebimento.getTimezoneOffset() * 60000);
      const dataLocalEntrega = dataEntrega ? new Date(dataEntrega.getTime() + dataEntrega.getTimezoneOffset() * 60000) : null;
      
      const dataRecebimentoStr = dataLocalRecebimento.toISOString().split('T')[0];
      const dataEntregaStr = dataLocalEntrega ? dataLocalEntrega.toISOString().split('T')[0] : null;
      
      return {
        id: row.id.toString(),
        morador_nome: row.morador_nome,
        morador_id: row.morador_id,
        apartamento: row.apartamento || 'N/A',
        bloco: row.bloco || 'A',
        quantidade: row.quantidade,
        data_recebimento: dataRecebimentoStr,
        hora_recebimento: dataLocalRecebimento.toTimeString().substring(0, 5),
        porteiro_nome: row.porteiro_nome || 'N/A',
        observacoes: row.observacoes,
        status: 'pendente',
        data_entrega: dataEntregaStr,
        hora_entrega: dataLocalEntrega ? dataLocalEntrega.toTimeString().substring(0, 5) : null,
        porteiro_entregou_nome: row.porteiro_entregou_nome,
        retirado_por_nome: row.retirado_por_nome
      };
    });
    
    console.log(`[API] RETORNANDO ${encomendas.length} encomendas mapeadas`);
    
    client.release();
    
    res.json({
      success: true,
      data: encomendas,
      debug: {
        queryUsada: 'WHERE e.status = "Recebida na portaria"',
        totalBanco: result.rows.length,
        totalMapeado: encomendas.length,
        allStatus: allStatusQuery.rows,
        totalGeral: totalQuery.rows[0].total
      }
    });
    
  } catch (error) {
    console.error('[API] Erro ao buscar encomendas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/encomendas - Cadastrar encomenda (já funciona perfeitamente para lotes individuais)
app.post('/api/encomendas', checkDb, async (req, res) => {
  try {
    const {
      morador_nome,
      apartamento,
      bloco,
      porteiro_nome,
      quantidade,
      observacoes,
      data_recebimento,
      hora_recebimento
    } = req.body;
    
    // Validação mais rigorosa similar ao Desktop
    if (!morador_nome?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome do morador é obrigatório'
      });
    }
    
    if (!porteiro_nome?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome do porteiro é obrigatório'
      });
    }
    
    if (!data_recebimento?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Data de recebimento é obrigatória'
      });
    }
    
    if (!hora_recebimento?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Hora de recebimento é obrigatória'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Buscar ou criar morador (compatível com Desktop)
      let moradorResult = await client.query(
        'SELECT id FROM moradores WHERE nome ILIKE $1 LIMIT 1',
        [morador_nome.trim()]
      );
      
      let moradorId;
      if (moradorResult.rows.length === 0) {
        // Cria morador com dados básicos (compatível com Desktop)
        const newMorador = await client.query(
          `INSERT INTO moradores (nome, rua, numero, apartamento, bloco) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            morador_nome.trim(),
            'Rua não informada', // Valor padrão compatível
            'S/N',               // Valor padrão compatível
            apartamento || 'N/A',
            bloco || 'A'
          ]
        );
        moradorId = newMorador.rows[0].id;
        console.log(`[API] Morador criado: ${morador_nome} (ID: ${moradorId})`);
      } else {
        moradorId = moradorResult.rows[0].id;
      }
      
      // 2. Buscar porteiro por nome (compatível com Desktop)
      const porteiroResult = await client.query(
        `SELECT id FROM usuarios 
         WHERE (nome_completo ILIKE $1 OR nome_usuario ILIKE $1)
         AND nivel_acesso = 'porteiro' 
         AND status = 'Ativo' 
         LIMIT 1`,
        [porteiro_nome.trim()]
      );
      
      if (porteiroResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          success: false,
          message: `Porteiro "${porteiro_nome}" não encontrado ou inativo`
        });
      }
      
      const porteiroId = porteiroResult.rows[0].id;
      
      // 3. Converter data/hora para formato do banco (compatível com Desktop) - CORREÇÃO AQUI
      let dataSQL = data_recebimento;
      
      // Se vier no formato brasileiro (dd/mm/aaaa), converte para SQL
      if (data_recebimento.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [dia, mes, ano] = data_recebimento.split('/');
        dataSQL = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      
      const dataHoraCompleta = `${dataSQL} ${hora_recebimento}:00`;
      
      console.log(`[API] Data/hora processada: ${dataHoraCompleta}`);
      
      // 4. Inserir encomenda (compatível com Desktop)
      const encomendaResult = await client.query(
        `INSERT INTO encomendas 
         (morador_id, porteiro_recebeu_id, data_recebimento, quantidade, observacoes, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          moradorId,
          porteiroId,
          dataHoraCompleta,
          parseInt(quantidade) || 1,
          observacoes || null,
          'Recebida na portaria' // Status padrão compatível
        ]
      );
      
      await client.query('COMMIT');
      client.release();
      
      // Resposta no formato compatível com Desktop
      res.json({
        success: true,
        message: 'Encomenda cadastrada com sucesso',
        data: { 
          id: encomendaResult.rows[0].id,
          morador_id: moradorId,
          porteiro_id: porteiroId,
          morador_nome: morador_nome,
          newId: encomendaResult.rows[0].id // Compatibilidade com Desktop
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
    
  } catch (error) {
    console.error('[API] Erro ao cadastrar encomenda:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/usuarios - Buscar usuários (porteiros)
app.get('/api/usuarios', checkDb, async (req, res) => {
  try {
    const { nivel, status } = req.query;
    const client = await pool.connect();
    
    let query = `
      SELECT 
        id,
        nome_completo,
        nome_usuario,
        nivel_acesso,
        status
      FROM usuarios
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (nivel) {
      paramCount++;
      query += ` AND nivel_acesso = $${paramCount}`;
      params.push(nivel);
    }
    
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    query += ` ORDER BY nome_completo ASC`;
    
    const result = await client.query(query, params);
    
    client.release();
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('[API] Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/encomendas/:id/entregar - Marcar como entregue (atualizado)
app.put('/api/encomendas/:id/entregar', checkDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_entrega, hora_entrega, retirado_por, observacoes, porteiro_entregou_id } = req.body;
    
    const packageId = parseInt(id, 10);
    if (isNaN(packageId) || packageId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID da encomenda inválido'
      });
    }
    
    if (!data_entrega || !hora_entrega) {
      return res.status(400).json({
        success: false,
        message: 'Data e hora de entrega são obrigatórias'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Converter para formato SQL para o banco PostgreSQL
      let dataSQL = data_entrega;
      if (data_entrega.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [dia, mes, ano] = data_entrega.split('/');
        dataSQL = `${ano}-${mes}-${dia}`;
      }
      
      const dataHoraEntrega = `${dataSQL} ${hora_entrega}:00`;
      
      console.log(`[API] Processando entrega para ID: ${packageId}, data/hora: ${dataHoraEntrega}`);
      
      // Usar o porteiro fornecido ou buscar um padrão
      let porteiroId = porteiro_entregou_id;
      if (!porteiroId) {
        const porteiroDefault = await client.query(
          `SELECT id FROM usuarios 
           WHERE nivel_acesso = 'porteiro' 
           AND status = 'Ativo' 
           LIMIT 1`
        );
        porteiroId = porteiroDefault.rows[0]?.id || 1;
      }
      
      const result = await client.query(
        `UPDATE encomendas 
         SET status = 'Entregue', 
             data_entrega = $1,
             porteiro_entregou_id = $2,
             retirado_por_nome = $3,
             observacoes = $4
         WHERE id = $5 
         AND status = 'Recebida na portaria'
         RETURNING id`,
        [dataHoraEntrega, porteiroId, retirado_por || null, observacoes || null, packageId]
      );
      
      client.release();
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Encomenda não encontrada ou já foi entregue'
        });
      }
      
      res.json({
        success: true,
        message: 'Encomenda marcada como entregue',
        data: { id: result.rows[0].id }
      });
      
    } catch (error) {
      client.release();
      throw error;
    }
    
  } catch (error) {
    console.error('[API] Erro ao marcar como entrega:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/moradores - Buscar moradores
app.get('/api/moradores', checkDb, async (req, res) => {
  try {
    console.log('[API] Buscando moradores...');
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT DISTINCT
        m.id,
        m.nome,
        m.apartamento,
        m.bloco
      FROM moradores m
      ORDER BY m.nome ASC
    `);
    
    client.release();
    
    console.log(`[API] ${result.rows.length} moradores encontrados`);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('[API] Erro ao buscar moradores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/moradores/sugestoes - Buscar sugestões de moradores
app.get('/api/moradores/sugestoes', checkDb, async (req, res) => {
  try {
    const { q } = req.query; // query parameter para busca
    const client = await pool.connect();
    
    let query = `
      SELECT DISTINCT
        m.nome,
        COUNT(*) as total_encomendas
      FROM moradores m
      LEFT JOIN encomendas e ON m.id = e.morador_id
    `;
    
    let params = [];
    
    if (q && q.trim()) {
      query += ` WHERE m.nome ILIKE $1`;
      params.push(`%${q.trim()}%`);
    }
    
    query += `
      GROUP BY m.nome
      ORDER BY total_encomendas DESC, m.nome ASC
      LIMIT 10
    `;
    
    const result = await client.query(query, params);
    
    client.release();
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        nome: row.nome,
        frequency: row.total_encomendas
      }))
    });
    
  } catch (error) {
    console.error('[API] Erro ao buscar sugestões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Tratamento de erro global
app.use((error, req, res, next) => {
  console.error('[API] Erro não tratado:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Mobile rodando na porta ${PORT}`);
  console.log(`📱 Aplicativo pode conectar em: http://[IP_DO_SERVIDOR]:${PORT}`);
  
  if (pool) {
    console.log('✅ Conectado ao banco PostgreSQL');
  } else {
    console.log('⚠️  Banco não configurado. Configure em config.json');
  }
  
  // Tenta reconectar a cada 30 segundos se não estiver conectado
  setInterval(() => {
    if (!pool) {
      console.log('🔄 Tentando reconectar ao banco...');
      initDbPool();
    }
  }, 30000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  if (pool) {
    pool.end();
  }
  process.exit(0);
});

module.exports = app;
module.exports = app;
module.exports = app;

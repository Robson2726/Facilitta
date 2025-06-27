const express = require('express');
const cors = require('cors');

class DesktopApiServer {
  constructor(desktopFunctions) {
    this.app = express();
    this.functions = desktopFunctions;
    this.server = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    this.app.use(cors({
      origin: '*', // Para desenvolvimento, em produção especificar domínios
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.app.use(express.json({ limit: '10mb' })); // Aumenta limite para uploads
    
    // Middleware de log melhorado com mais informações
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ip = req.ip || req.connection.remoteAddress;
      
      console.log(`[API ${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
      console.log(`[API] User-Agent: ${userAgent}`);
      
      if (req.body && Object.keys(req.body).length > 0) {
        // Log body sem dados sensíveis
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.senha) sanitizedBody.senha = '[HIDDEN]';
        if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
        console.log('[API] Body:', JSON.stringify(sanitizedBody, null, 2));
      }
      
      // Log do tempo de resposta
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[API] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      
      next();
    });
    
    // Middleware de tratamento de erro global melhorado
    this.app.use((err, req, res, next) => {
      console.error('[API] Erro não tratado:', err);
      
      // Diferentes tipos de erro com respostas apropriadas
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
          success: false,
          message: 'JSON inválido na requisição',
          error: 'Formato de dados incorreto'
        });
      }
      
      if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Serviço temporariamente indisponível',
          error: 'Erro de conexão com banco de dados'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  setupRoutes() {
    // Health check melhorado
    this.app.get('/api/status', (req, res) => {
      res.json({
        success: true,
        message: 'Desktop API funcionando',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        endpoints: [
          'GET /api/status',
          'GET /api/encomendas',
          'POST /api/encomendas',
          'PUT /api/encomendas/:id/entregar',
          'GET /api/usuarios',
          'GET /api/moradores'
        ]
      });
    });
    
    // GET /api/usuarios - Buscar usuários/porteiros (para o mobile)
    this.app.get('/api/usuarios', async (req, res) => {
      try {
        const { nivel, status } = req.query;
        console.log(`[API] Buscando usuários - nivel: ${nivel}, status: ${status}`);
        
        // Usa a nova função getActiveUsers que retorna dados mais completos
        const usuarios = await this.functions.getActiveUsers(nivel);
        
        // Filtra por status se especificado (mas como já são só ativos, isso é redundante)
        let result = usuarios;
        if (status && status !== 'Ativo') {
          result = usuarios.filter(user => user.status === status);
        }
        
        // Mapeia para o formato esperado pelo mobile
        const mappedUsers = result.map(usuario => ({
          id: usuario.id.toString(),                    // ID como string
          nome_completo: usuario.nome_completo || usuario.nome_usuario,
          nome_usuario: usuario.nome_usuario,
          email: usuario.email || null,
          nivel_acesso: usuario.nivel_acesso,          // 'admin' ou 'porteiro'
          status: usuario.status                        // 'Ativo' ou 'Inativo'
        }));
        
        console.log(`[API] Retornando ${mappedUsers.length} usuários`);
        
        res.json({
          success: true,
          data: mappedUsers
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
    
    // GET /api/moradores - Buscar moradores (para o mobile)
    this.app.get('/api/moradores', async (req, res) => {
      try {
        console.log('[API] Buscando moradores para o mobile');
        
        // Como não temos uma função getAll, vamos usar uma busca vazia
        // que deve retornar alguns moradores
        const moradores = await this.functions.searchResidents('');
        
        // Se não retornar nada, tenta buscar com algumas letras comuns
        let allMoradores = moradores;
        if (allMoradores.length === 0) {
          const buscas = ['a', 'e', 'i', 'o', 'u', 'm', 'j', 's'];
          const resultados = [];
          
          for (const letra of buscas) {
            const resultado = await this.functions.searchResidents(letra);
            resultados.push(...resultado);
          }
          
          // Remove duplicatas
          const ids = new Set();
          allMoradores = resultados.filter(m => {
            if (ids.has(m.id)) return false;
            ids.add(m.id);
            return true;
          });
        }
        
        console.log(`[API] Retornando ${allMoradores.length} moradores`);
        
        res.json({
          success: true,
          data: allMoradores
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
    
    // GET /api/encomendas - Buscar encomendas
    this.app.get('/api/encomendas', async (req, res) => {
      try {
        const encomendas = await this.functions.getPendingPackages();
        
        // Mapeia para formato mobile
        const mappedEncomendas = encomendas.map(enc => ({
          id: enc.id.toString(),
          morador_nome: enc.morador_nome,
          morador_id: enc.morador_id, // Corrigido: retorna o ID real do morador
          apartamento: enc.apartamento || 'N/A',
          bloco: enc.bloco || 'A',
          quantidade: enc.quantidade,
          data_recebimento: new Date(enc.data_recebimento).toISOString().split('T')[0],
          hora_recebimento: new Date(enc.data_recebimento).toTimeString().substring(0, 5),
          porteiro_nome: enc.porteiro_nome,
          observacoes: enc.observacoes,
          status: this.mapStatusToMobile(enc.status),
          data_entrega: enc.data_entrega ? new Date(enc.data_entrega).toISOString().split('T')[0] : null
        }));
        
        res.json({
          success: true,
          data: mappedEncomendas
        });
        
      } catch (error) {
        console.error('[API] Erro ao buscar encomendas:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    });
    
    // POST /api/encomendas - Melhorar validação
    this.app.post('/api/encomendas', async (req, res) => {
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
        
        // Validação mais rigorosa
        const errosValidacao = [];
        if (!morador_nome?.trim()) errosValidacao.push('morador_nome é obrigatório');
        if (!porteiro_nome?.trim()) errosValidacao.push('porteiro_nome é obrigatório');
        if (!data_recebimento?.trim()) errosValidacao.push('data_recebimento é obrigatório');
        if (!hora_recebimento?.trim()) errosValidacao.push('hora_recebimento é obrigatório');
        
        if (errosValidacao.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Dados inválidos',
            errors: errosValidacao
          });
        }
        
        console.log('[API] Processando cadastro de encomenda:', { morador_nome, porteiro_nome });
        
        // 1. Buscar ou criar morador
        let moradorId;
        const moradores = await this.functions.searchResidents(morador_nome);
        
        if (moradores.length === 0) {
          // Criar morador básico
          const novoMorador = await this.functions.saveResident({
            nome: morador_nome,
            rua: 'Rua não informada',
            numero: 'S/N',
            apartamento: apartamento || 'N/A',
            bloco: bloco || 'A'
          });
          
          if (!novoMorador.success) {
            return res.status(400).json({
              success: false,
              message: 'Erro ao criar morador: ' + novoMorador.message
            });
          }
          
          moradorId = novoMorador.newId;
        } else {
          moradorId = moradores[0].id;
        }
        
        // 2. Buscar porteiro
        const porteiros = await this.functions.searchActivePorters(porteiro_nome);
        if (porteiros.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Porteiro não encontrado'
          });
        }
        
        const porteiroId = porteiros[0].id;
        
        // 3. Salvar encomenda
        const dataHoraCompleta = `${data_recebimento} ${hora_recebimento}:00`;
        
        const resultado = await this.functions.savePackage({
          moradorId,
          porteiroUserId: porteiroId,
          quantidade: parseInt(quantidade) || 1,
          dataRecebimento: dataHoraCompleta,
          observacoes: observacoes || null
        });
        
        if (resultado.success) {
          res.json({
            success: true,
            message: 'Encomenda cadastrada com sucesso',
            data: { id: resultado.newId }
          });
        } else {
          res.status(400).json({
            success: false,
            message: resultado.message
          });
        }
        
      } catch (error) {
        console.error('[API] Erro ao cadastrar encomenda:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
          details: error.message
        });
      }
    });
    
    // PUT /api/encomendas/:id/entregar - Melhorar validação
    this.app.put('/api/encomendas/:id/entregar', async (req, res) => {
      try {
        const { id } = req.params;
        const { data_entrega, hora_entrega, retirado_por, observacoes, porteiro_entregou_id } = req.body;
        
        // Validação do ID
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
            message: 'data_entrega e hora_entrega são obrigatórios'
          });
        }
        
        // Converter data e hora para formato ISO que o desktop espera
        const dataISO = `${data_entrega}T${hora_entrega}:00.000Z`;
        
        console.log(`[API] Processando entrega para encomenda ID: ${packageId}`);
        console.log(`[API] Data/hora convertida para ISO: ${dataISO}`);
        console.log(`[API] Porteiro entregou ID recebido: ${porteiro_entregou_id}`);
        
        // Usa o porteiro fornecido pelo mobile ou busca um padrão
        let porteiroEntregouId = porteiro_entregou_id;
        
        if (!porteiroEntregouId) {
          try {
            const porteiros = await this.functions.searchActivePorters('');
            if (porteiros && porteiros.length > 0) {
              porteiroEntregouId = porteiros[0].id;
              console.log(`[API] Usando porteiro padrão ID: ${porteiroEntregouId}`);
            } else {
              return res.status(400).json({
                success: false,
                message: 'Nenhum porteiro ativo encontrado no sistema'
              });
            }
          } catch (porteiroError) {
            console.error('[API] Erro ao buscar porteiro ativo:', porteiroError);
            return res.status(500).json({
              success: false,
              message: 'Erro ao validar porteiro do sistema'
            });
          }
        }
        
        const resultado = await this.functions.deliverPackage(packageId, {
          porteiroEntregouId: parseInt(porteiroEntregouId),
          dataEntrega: dataISO, // Agora no formato ISO correto
          retiradoPorNome: retirado_por || null,
          observacoesEntrega: observacoes || null
        });
        
        if (resultado.success) {
          console.log(`[API] Entrega registrada com sucesso para ID: ${packageId}`);
          res.json({
            success: true,
            message: 'Encomenda marcada como entregue'
          });
        } else {
          console.error(`[API] Falha na entrega para ID: ${packageId}`, resultado.message);
          res.status(400).json({
            success: false,
            message: resultado.message
          });
        }
        
      } catch (error) {
        console.error('[API] Erro ao marcar como entregue:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
          details: error.message
        });
      }
    });
    
    // GET /api/encomendas/:id - Buscar encomenda específica
    this.app.get('/api/encomendas/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!id) {
          return res.status(400).json({ success: false, message: 'ID não informado' });
        }
        const result = await this.functions.getPackageById(id);
        if (result && result.success && result.data) {
          res.json({ success: true, data: result.data });
        } else {
          res.status(404).json({ success: false, message: result?.message || 'Encomenda não encontrada' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar encomenda', error: error.message });
      }
    });
    
    // Tratamento de erro 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
      });
    });
  }
  
  mapStatusToMobile(desktopStatus) {
    switch (desktopStatus) {
      case 'Recebida na portaria':
        return 'pendente';
      case 'Entregue':
        return 'entregue';
      default:
        return 'pendente';
    }
  }
  
  start(port = 3001) {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, '0.0.0.0', (error) => {
        if (error) {
          console.error('[API] Erro ao iniciar servidor:', error);
          reject(error);
        } else {
          console.log(`🚀 API Desktop rodando na porta ${port}`);
          console.log(`📱 Mobile pode conectar em: http://[IP_DO_COMPUTADOR]:${port}`);
          resolve();
        }
      });
    });
  }
  
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[API] Servidor encerrado');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DesktopApiServer;

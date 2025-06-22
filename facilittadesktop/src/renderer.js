// === ARQUIVO RENDERER.JS LEGACY - EM PROCESSO DE MIGRAÇÃO ===
// Este arquivo está sendo gradualmente migrado para renderer-main.js
// Por enquanto, ele apenas carrega o sistema modular e desabilita funcionalidades antigas

console.log('[RENDERER LEGACY] Iniciando transição para sistema modular...');

// Desabilita o sistema antigo se o novo já estiver ativo
if (window.rendererApp && window.rendererApp.isInitialized) {
    console.log('[RENDERER LEGACY] Sistema modular já ativo, cancelando inicialização legacy');
} else {
    console.log('[RENDERER LEGACY] Sistema modular não detectado, mantendo compatibilidade temporária');
    
    // Verificar se Chart.js foi carregado
    window.addEventListener('load', function() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não foi carregado do CDN!');
            // Tentar carregar versão alternativa
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            script.onload = function() {
                console.log('Chart.js carregado da versão alternativa');
            };
            script.onerror = function() {
                console.error('Falha ao carregar Chart.js de ambas as fontes');
            };
            document.head.appendChild(script);
        } else {
            console.log('Chart.js carregado com sucesso, versão:', Chart.version || 'desconhecida');
        }
    });

    // Aguarda o DOM estar pronto
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('[RENDERER LEGACY] DOM Carregado. Verificando compatibilidade...');
        
        // Se o sistema modular não estiver disponível, mantém funcionalidade básica
        if (!window.rendererApp || !window.rendererApp.isInitialized) {
            console.warn('[RENDERER LEGACY] Sistema modular não encontrado. Ativando modo de compatibilidade limitado.');
            
            // Apenas funcionalidades essenciais para não quebrar o sistema
            setupBasicCompatibility();
        } else {
            console.log('[RENDERER LEGACY] Sistema modular detectado. Modo legacy desabilitado.');
        }
    });
}

function setupBasicCompatibility() {
    console.log('[RENDERER LEGACY] Configurando compatibilidade básica...');
    
    // Login básico se não houver sistema modular
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[RENDERER LEGACY] Tentativa de login via sistema legacy');
            
            const username = document.getElementById('username')?.value?.trim();
            const password = document.getElementById('password')?.value;

            if (!username || !password) {
                showBasicError('Por favor, preencha todos os campos.');
                return;
            }

            try {
                if (!window.electronAPI?.loginUser) {
                    showBasicError('Sistema de login indisponível.');
                    return;
                }

                const result = await window.electronAPI.loginUser({ username, password });
                
                if (result.success && result.user) {
                    console.log('[RENDERER LEGACY] Login bem-sucedido via sistema legacy');
                    window.currentUser = result.user;
                    showBasicApp();
                } else {
                    showBasicError(result.message || 'Erro ao fazer login.');
                }
            } catch (error) {
                console.error('[RENDERER LEGACY] Erro no login:', error);
                showBasicError('Erro interno. Verifique a configuração do banco.');
            }
        });
    }
    
    // Funcionalidade básica de toggle de senha
    const togglePasswordButton = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const passwordToggleIcon = document.getElementById('password-toggle-icon');
    
    if (togglePasswordButton && passwordInput && passwordToggleIcon) {
        togglePasswordButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const isPasswordVisible = passwordInput.type === 'text';
            
            if (isPasswordVisible) {
                passwordInput.type = 'password';
                passwordToggleIcon.src = 'assets/eye-closed.svg';
                passwordToggleIcon.alt = 'Mostrar senha';
                togglePasswordButton.title = 'Mostrar senha';
            } else {
                passwordInput.type = 'text';
                passwordToggleIcon.src = 'assets/eye-open.svg';
                passwordToggleIcon.alt = 'Ocultar senha';
                togglePasswordButton.title = 'Ocultar senha';
            }
        });

        // Garantir que a senha comece oculta
        passwordInput.type = 'password';
        passwordToggleIcon.src = 'assets/eye-closed.svg';
        passwordToggleIcon.alt = 'Mostrar senha';
        togglePasswordButton.title = 'Mostrar senha';
    }
}

function showBasicError(message) {
    const errorElement = document.getElementById('login-error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showBasicApp() {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loggedUserInfo = document.getElementById('logged-user-info');
    
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    
    if (loggedUserInfo && window.currentUser) {
        const userDisplayInfo = `${window.currentUser.name} (${window.currentUser.status || 'Status Desconhecido'})`;
        loggedUserInfo.textContent = `Usuário: ${userDisplayInfo}`;
    }
    
    // Menu básico
    const menuUsuarios = document.getElementById('menu-usuarios');
    if (menuUsuarios && window.currentUser) {
        menuUsuarios.style.display = window.currentUser.role === 'admin' ? 'flex' : 'none';
    }
    
    // Carrega dashboard básico
    loadBasicDashboard();
}

function loadBasicDashboard() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: #1976d2; margin-bottom: 20px;">Sistema em Migração</h2>
                <p style="font-size: 18px; color: #666; margin-bottom: 30px;">
                    O sistema está sendo atualizado para uma nova versão modular.
                </p>
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1976d2; margin-top: 0;">Status da Migração</h3>
                    <ul style="text-align: left; display: inline-block;">
                        <li>✅ Sistema modular base implementado</li>
                        <li>✅ Navegação e layout atualizados</li> 
                        <li>🔄 Funcionalidades sendo migradas</li>
                        <li>⏳ Modais em desenvolvimento</li>
                        <li>⏳ Sistema de busca integrado</li>
                    </ul>
                </div>
                <p style="color: #666; margin-top: 30px;">
                    <strong>Recomendação:</strong> Aguarde a conclusão da migração para melhor experiência.
                </p>
            </div>
        `;
    }
}

// Exporta algumas funções essenciais para compatibilidade
window.legacyRenderer = {
    showBasicError,
    showBasicApp,
    loadBasicDashboard
};

console.log('[RENDERER LEGACY] Compatibilidade básica configurada');
    const menuUsuarios = document.getElementById('menu-usuarios');
    const menuRelatorios = document.getElementById('menu-relatorios');
    const menuAjustes = document.getElementById('menu-ajustes');
    const mainContent = document.querySelector('.main-content');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginErrorMessage = document.getElementById('login-error-message');
    const loggedUserInfo = document.getElementById('logged-user-info');
    const logoutButton = document.getElementById('logout-button');
    
    // Seletores para funcionalidade de mostrar/ocultar senha
    const togglePasswordButton = document.getElementById('toggle-password');
    const passwordToggleIcon = document.getElementById('password-toggle-icon');

    // Modais
    const modalCadastroEncomenda = document.getElementById('modal-cadastro-encomenda');
    const btnCancelarEncomendaModal = document.getElementById('btn-cancelar-encomenda-modal');
    const formCadastroEncomenda = document.getElementById('form-cadastro-encomenda');
    const modalCadastroMorador = document.getElementById('modal-cadastro-morador');
    const btnCancelarMoradorModal = document.getElementById('btn-cancelar-morador-modal');
    const formCadastroMorador = document.getElementById('form-cadastro-morador');
    const modalMoradorTitle = document.getElementById('modal-morador-title');
    const btnSalvarMorador = document.getElementById('btn-salvar-morador');
    const modalCadastroUsuario = document.getElementById('modal-cadastro-usuario');
    const btnCancelarUsuarioModal = document.getElementById('btn-cancelar-usuario-modal');
    const formCadastroUsuario = document.getElementById('form-cadastro-usuario');
    const modalUsuarioTitle = document.getElementById('modal-usuario-title');
    const btnSalvarUsuario = document.getElementById('btn-salvar-usuario');
    const usuarioStatusSelect = document.getElementById('usuario-status');
    const grupoStatusUsuario = document.getElementById('grupo-status');
    const modalEntregaEncomenda = document.getElementById('modal-entrega-encomenda');
    const formEntregaEncomenda = document.getElementById('form-entrega-encomenda');
    const entregaEncomendaIdInput = document.getElementById('entrega-encomenda-id'); // Hidden input
    const entregaMoradorInfoInput = document.getElementById('entrega-morador-info'); // Campo readonly
    const inputEntregaPorteiro = document.getElementById('entrega-porteiro'); // Input para nome do porteiro
    const suggestionsEntregaPorteiroDiv = document.getElementById('entrega-porteiro-suggestions'); // Div para sugestões
    const entregaDataInput = document.getElementById('entrega-data');
    const entregaHoraInput = document.getElementById('entrega-hora');
    const entregaRetiradoPorInput = document.getElementById('entrega-retirado-por');
    const entregaObservacoesTextarea = document.getElementById('entrega-observacoes');
    const btnCancelarEntregaModal = document.getElementById('btn-cancelar-entrega-modal');
    //const btnConfirmarEntrega = document.getElementById('btn-confirmar-entrega');
    // Autocomplete (Modal Encomenda)
    const inputMorador = document.getElementById('morador');
    const suggestionsMoradorDiv = document.getElementById('morador-suggestions');
    const inputPorteiro = document.getElementById('porteiro');
    const suggestionsPorteiroDiv = document.getElementById('porteiro-suggestions');

    // Modal de perfil do usuário
    const modalPerfilUsuario = document.getElementById('modal-perfil-usuario');

    console.log('DEBUG Autocomplete: inputMorador element:', inputMorador);
    console.log('DEBUG Autocomplete: suggestionsMoradorDiv element:', suggestionsMoradorDiv);
    console.log('DEBUG Autocomplete: inputPorteiro element:', inputPorteiro);
    console.log('DEBUG Autocomplete: suggestionsPorteiroDiv element:', suggestionsPorteiroDiv);

    // Estado
    let selectedPorteiroUserId = null;
    let selectedMoradorId = null;
    let currentUser = null;
    let selectedEntregaPorteiroId = null; // Para o ID do porteiro selecionado no modal de entrega

    // Variáveis globais para armazenar instâncias dos gráficos
    let chartEncomendasPorDiaInstance = null;
    let chartEncomendasPorMesInstance = null;

    // --- Implementação da Barra de Busca ---
    const topbarSearchInput = document.getElementById('topbar-search-input');
    let searchTimeout = null;
    
    if (topbarSearchInput) {
        console.log('[Renderer] Campo de pesquisa encontrado, configurando eventos...');
        
        // Event listener para input na barra de busca
        topbarSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            console.log(`[Renderer] Termo de busca digitado: "${searchTerm}"`);
            
            // Remove popup existente
            document.getElementById('popup-encomendas')?.remove();
            
            // Cancela busca anterior se ainda pendente
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Se termo muito curto, não busca
            if (searchTerm.length < 2) {
                return;
            }
            
            // Debounce da busca (aguarda 300ms após parar de digitar)
            searchTimeout = setTimeout(async () => {
                await realizarBuscaEncomendas(searchTerm);
            }, 300);
        });
        
        // Event listener para tecla Enter
        topbarSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = e.target.value.trim();
                if (searchTerm.length >= 2) {
                    realizarBuscaEncomendas(searchTerm);
                }
            }
        });
        
        // Event listener para limpar busca quando campo perde foco
        topbarSearchInput.addEventListener('blur', () => {
            // Aguarda um pouco antes de fechar para permitir cliques nos resultados
            setTimeout(() => {
                const popup = document.getElementById('popup-encomendas');
                if (popup && !popup.matches(':hover')) {
                    popup.remove();
                }
            }, 200);
        });
        
        console.log('[Renderer] Event listeners da pesquisa configurados');
    } else {
        console.warn('[Renderer] Campo de pesquisa não encontrado');
    }
    
    // Função para realizar a busca de encomendas
    async function realizarBuscaEncomendas(searchTerm) {
        console.log(`[Renderer] Realizando busca para: "${searchTerm}"`);
        
        try {
            // Remove popup anterior
            document.getElementById('popup-encomendas')?.remove();
            
            // Busca encomendas pendentes
            const encomendas = await window.electronAPI.getPendingPackages();
            
            if (!Array.isArray(encomendas)) {
                console.error('[Renderer] Resposta inválida da API getPendingPackages');
                return;
            }
            
            console.log(`[Renderer] Total de encomendas pendentes: ${encomendas.length}`);
            
            // Filtra encomendas pelo termo de busca (nome do morador)
            const encomendasFiltradas = encomendas.filter(encomenda => {
                const nomeModar = (encomenda.morador_nome || '').toLowerCase();
                return nomeModar.includes(searchTerm.toLowerCase());
            });
            
            console.log(`[Renderer] Encomendas filtradas: ${encomendasFiltradas.length}`);
            
            if (encomendasFiltradas.length > 0) {
                exibirPopupEncomendas(encomendasFiltradas);
            } else {
                exibirMensagemNenhumResultado(searchTerm);
            }
            
        } catch (error) {
            console.error('[Renderer] Erro ao buscar encomendas:', error);
            exibirErroPopup('Erro ao buscar encomendas: ' + error.message);
        }
    }
    
    // Função para exibir popup com resultados
    function exibirPopupEncomendas(encomendas) {
        console.log(`[Renderer] Exibindo popup com ${encomendas.length} encomendas`);
        
        // Remove popup anterior
        document.getElementById('popup-encomendas')?.remove();
        
        // Cria popup
        const popup = document.createElement('div');
        popup.id = 'popup-encomendas';
        popup.className = 'search-popup';
        
        // Header do popup
        const header = document.createElement('div');
        header.className = 'popup-header';
        header.innerHTML = `
            <h3>Encomendas Encontradas (${encomendas.length})</h3>
            <button class="popup-close" onclick="document.getElementById('popup-encomendas').remove()">×</button>
        `;
        popup.appendChild(header);
        
        // Lista de encomendas
        const lista = document.createElement('div');
        lista.className = 'popup-encomendas-lista';
        
        encomendas.forEach(encomenda => {
            const item = document.createElement('div');
            item.className = 'popup-encomenda-item';
            
            // Formatar data
            let dataFormatada = 'Data inválida';
            try {
                if (encomenda.data_recebimento) {
                    const data = new Date(encomenda.data_recebimento);
                    if (!isNaN(data.getTime())) {
                        dataFormatada = data.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                }
            } catch (e) {
                console.error('[Renderer] Erro ao formatar data:', e);
            }
            
            item.innerHTML = `
                <div class="encomenda-info">
                    <div class="encomenda-morador">${encomenda.morador_nome || 'N/A'}</div>
                    <div class="encomenda-detalhes">
                        <span class="data-recebimento">Recebida: ${dataFormatada}</span>
                        <span class="quantidade">Qtd: ${encomenda.quantidade || 1}</span>
                        <span class="porteiro">Por: ${encomenda.porteiro_nome || 'N/A'}</span>
                    </div>
                    ${encomenda.observacoes ? `<div class="encomenda-obs">${encomenda.observacoes}</div>` : ''}
                </div>
                <div class="encomenda-acoes">
                    <button class="btn-entregar-popup" data-id="${encomenda.id}" data-morador="${encomenda.morador_nome || 'N/A'}">
                        Entregar
                    </button>
                </div>
            `;
            
            lista.appendChild(item);
        });
        
        popup.appendChild(lista);
        
        // Adiciona popup ao DOM
        document.body.appendChild(popup);
        
        // Event listeners para botões de entrega
        const botoesEntregar = popup.querySelectorAll('.btn-entregar-popup');
        botoesEntregar.forEach(botao => {
            botao.addEventListener('click', (e) => {
                const encomendaId = e.target.dataset.id;
                const moradorNome = e.target.dataset.morador;
                
                console.log(`[Renderer] Clicado entregar para encomenda ID: ${encomendaId}, morador: ${moradorNome}`);
                
                // Remove popup
                document.getElementById('popup-encomendas')?.remove();
                
                // Limpa campo de busca
                if (topbarSearchInput) {
                    topbarSearchInput.value = '';
                }
                
                // Abre modal de entrega
                abrirModalEntrega(encomendaId, moradorNome);
            });
        });
    }
    
    // Função para exibir mensagem quando não há resultados
    function exibirMensagemNenhumResultado(searchTerm) {
        console.log(`[Renderer] Nenhum resultado encontrado para: "${searchTerm}"`);
        
        const popup = document.createElement('div');
        popup.id = 'popup-encomendas';
        popup.className = 'search-popup';
        
        popup.innerHTML = `
            <div class="popup-header">
                <h3>Nenhum Resultado</h3>
                <button class="popup-close" onclick="document.getElementById('popup-encomendas').remove()">×</button>
            </div>
            <div class="popup-no-results">
                <p>Nenhuma encomenda pendente encontrada para "${searchTerm}"</p>
                <p>Verifique se:</p>
                <ul>
                    <li>O nome está correto</li>
                    <li>A encomenda ainda está pendente</li>
                    <li>A encomenda foi cadastrada no sistema</li>
                </ul>
            </div>
        `;
        
        document.body.appendChild(popup);
    }
    
    // Função para exibir erro no popup
    function exibirErroPopup(mensagem) {
        console.error(`[Renderer] Exibindo erro no popup: ${mensagem}`);
        
        const popup = document.createElement('div');
        popup.id = 'popup-encomendas';
        popup.className = 'search-popup error';
        
        popup.innerHTML = `
            <div class="popup-header">
                <h3>Erro na Busca</h3>
                <button class="popup-close" onclick="document.getElementById('popup-encomendas').remove()">×</button>
            </div>
            <div class="popup-error">
                <p>${mensagem}</p>
                <p>Tente novamente ou verifique a conexão com o banco de dados.</p>
            </div>
        `;
        
        document.body.appendChild(popup);
    }

    // --- Funcionalidade de mostrar/ocultar senha ---
    if (togglePasswordButton && passwordInput && passwordToggleIcon) {
        togglePasswordButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const isPasswordVisible = passwordInput.type === 'text';
            
            if (isPasswordVisible) {
                // Ocultar senha
                passwordInput.type = 'password';
                passwordToggleIcon.src = 'assets/eye-closed.svg';
                passwordToggleIcon.alt = 'Mostrar senha';
                togglePasswordButton.title = 'Mostrar senha';
            } else {
                // Mostrar senha
                passwordInput.type = 'text';
                passwordToggleIcon.src = 'assets/eye-open.svg';
                passwordToggleIcon.alt = 'Ocultar senha';
                togglePasswordButton.title = 'Ocultar senha';
            }
        });

        // Garantir que a senha comece oculta
        passwordInput.type = 'password';
        passwordToggleIcon.src = 'assets/eye-closed.svg';
        passwordToggleIcon.alt = 'Mostrar senha';
        togglePasswordButton.title = 'Mostrar senha';
    }

    // --- Event Listeners para Navegação do Menu ---
    if (menuEncomendas) menuEncomendas.addEventListener('click', () => carregarConteudo('Dashboard Encomendas', true));
    if (menuMoradores) menuMoradores.addEventListener('click', () => carregarConteudo('Moradores', true));
    if (menuUsuarios) menuUsuarios.addEventListener('click', () => carregarConteudo('Usuários', true));
    if (menuRelatorios) menuRelatorios.addEventListener('click', () => carregarConteudo('Relatórios', true));
    if (menuAjustes) menuAjustes.addEventListener('click', () => carregarConteudo('Ajustes', true));

    // Event listener para o menu Dashboard
    const menuDashboard = document.getElementById('menu-dashboard');
    if (menuDashboard) menuDashboard.addEventListener('click', () => carregarConteudo('Dashboard', true));

    // --- Funções de UI (Login/Logout) ---
    function showLoginScreen() {
        console.log("Mostrando login.");
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        currentUser = null;
        if (loggedUserInfo) loggedUserInfo.textContent = 'Usuário: -';
        if (menuUsuarios) menuUsuarios.style.display = 'none';
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (loginErrorMessage) loginErrorMessage.style.display = 'none';
    }

    function showAppScreen() {
        console.log("Mostrando app.");
        if (!currentUser) {
            showLoginScreen();
            return;
        }
        console.log('DEBUG: Usuario logado:', currentUser);

        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        const userDisplayInfo = `${currentUser.name} (${currentUser.status || 'Status Desconhecido'})`;
        
        if (loggedUserInfo) loggedUserInfo.textContent = `Usuário: ${userDisplayInfo}`;
        if (menuUsuarios) menuUsuarios.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        carregarConteudo('Dashboard', true);
    }

    // --- Funções de Controle dos Modais ---
    function requestMainWindowFocus() { setTimeout(() => { try { if (window.electronAPI?.focusMainWindow) window.electronAPI.focusMainWindow(); } catch (error) { console.error('Erro focar janela:', error); } }, 50); }
    function abrirModalEncomenda(encomendaId = null, packageDataToEdit = null) { // Novo parâmetro
        console.log(`Abrindo Modal Encomenda. ID: ${encomendaId || 'N/A'}`);
        // ... (lógica para fechar outros modais - mantenha) ...
        if (modalCadastroMorador?.classList.contains('active')) fecharModalMorador();
        if (modalCadastroUsuario?.classList.contains('active')) fecharModalCadastroUsuario();
        if (modalCadastroMorador) { modalCadastroMorador.style.display = 'none'; /*...*/ }
        if (modalCadastroUsuario) { modalCadastroUsuario.style.display = 'none'; /*...*/ }

        if (modalCadastroEncomenda) {
            formCadastroEncomenda.reset(); // Limpa o formulário primeiro
            selectedMoradorId = null;
            selectedPorteiroUserId = null;
            if (inputMorador) inputMorador.value = '';
            if (inputPorteiro) inputPorteiro.value = '';
            if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible');
            if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible');

            const hiddenEncomendaIdInput = document.getElementById('encomenda-id');
            const title = document.getElementById('modal-encomenda-title');
            const btn = document.getElementById('btn-salvar-encomenda');
            const qtdInput = document.getElementById('quantidade');
            const dataInput = document.getElementById('data');
            const horaInput = document.getElementById('hora');
            const obsInput = document.getElementById('observacoes');
            // const codigoRastreioInput = document.getElementById('codigo-rastreio'); // Se você tiver esse campo no modal

            if (packageDataToEdit && encomendaId) { // Se estamos editando
                console.log("Populando modal para edição:", packageDataToEdit);
                if (title) title.textContent = 'Editar Encomenda';
                if (btn) btn.textContent = 'Salvar Alterações';
                if (hiddenEncomendaIdInput) hiddenEncomendaIdInput.value = encomendaId;

                // Popular campos
                if (inputMorador && packageDataToEdit.morador_nome) inputMorador.value = packageDataToEdit.morador_nome;
                selectedMoradorId = packageDataToEdit.morador_id; // Importante setar o ID

                if (inputPorteiro && packageDataToEdit.porteiro_nome) inputPorteiro.value = packageDataToEdit.porteiro_nome;
                selectedPorteiroUserId = packageDataToEdit.porteiro_recebeu_id; // Importante setar o ID

                if (qtdInput) qtdInput.value = packageDataToEdit.quantidade || 1;
                if (obsInput) obsInput.value = packageDataToEdit.observacoes || '';
                // if (codigoRastreioInput) codigoRastreioInput.value = packageDataToEdit.codigo_rastreio || '';

                // Popular data e hora (usando os campos formatados do backend)
                if (dataInput && packageDataToEdit.data_recebimento_date) dataInput.value = packageDataToEdit.data_recebimento_date;
                if (horaInput && packageDataToEdit.data_recebimento_time) horaInput.value = packageDataToEdit.data_recebimento_time;

            } else { // Se estamos cadastrando uma nova
                if (title) title.textContent = 'Cadastrar Nova Encomenda';
                if (btn) btn.textContent = 'Salvar Encomenda';
                if (hiddenEncomendaIdInput) hiddenEncomendaIdInput.value = ''; // Limpa ID
                preencherDataHoraAtual(); // Preenche data/hora atuais
            }

            modalCadastroEncomenda.style.display = 'flex';
            modalCadastroEncomenda.classList.add('active');
            setTimeout(() => inputMorador?.focus(), 200);
        } else {
            console.error('Falha abrir Modal Encomenda!');
        }
    }
    function fecharModalEncomenda() { console.log('Fechando Modal Encomenda.'); if (modalCadastroEncomenda) { modalCadastroEncomenda.classList.remove('active'); modalCadastroEncomenda.style.display = 'none'; modalCadastroEncomenda.style.zIndex = ''; if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible'); if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible'); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); requestMainWindowFocus(); } }
    async function abrirModalMorador(residentId = null) { console.log(`Abrindo Modal Morador. ID: ${residentId}`); if (modalCadastroEncomenda?.classList.contains('active')) fecharModalEncomenda(); if (modalCadastroUsuario?.classList.contains('active')) fecharModalCadastroUsuario(); if (modalCadastroEncomenda) { modalCadastroEncomenda.style.display = 'none'; modalCadastroEncomenda.style.zIndex = ''; } if (modalCadastroUsuario) { modalCadastroUsuario.style.display = 'none'; modalCadastroUsuario.style.zIndex = ''; } if (modalCadastroMorador) { if (formCadastroMorador) formCadastroMorador.reset(); const mid = document.getElementById('morador-id'); if (mid) mid.value = ''; const statusMsg = document.getElementById('status-message'); if (statusMsg) { statusMsg.style.display = 'none'; } modalCadastroMorador.style.display = 'flex'; modalCadastroMorador.style.zIndex = '1001'; modalCadastroMorador.classList.add('active'); const nomeInput = document.getElementById('morador-nome'); if (residentId) { console.log("Modo Edição Morador"); if (modalMoradorTitle) modalMoradorTitle.textContent = 'Editar Morador'; if (btnSalvarMorador) btnSalvarMorador.textContent = 'Salvar Alterações'; try { if (!window.electronAPI?.getResidentById) throw new Error('API getResidentById indisponível'); const m = await window.electronAPI.getResidentById(residentId); if (m) { if (mid) mid.value = m.id; if (nomeInput) nomeInput.value = m.nome || ''; document.getElementById('morador-telefone').value = m.telefone || ''; document.getElementById('morador-rua').value = m.rua || ''; document.getElementById('morador-numero').value = m.numero || ''; document.getElementById('morador-bloco').value = m.bloco || ''; document.getElementById('morador-apartamento').value = m.apartamento || ''; document.getElementById('morador-observacoes').value = m.observacoes || ''; setTimeout(() => nomeInput?.focus(), 50); } else { showStatusMessage(`Erro: Morador ID ${residentId} não encontrado.`, 'error'); fecharModalMorador(); } } catch (error) { showStatusMessage(`Erro: ${error.message}`, 'error'); fecharModalMorador(); } } else { console.log("Modo Cadastro Morador."); if (modalMoradorTitle) modalMoradorTitle.textContent = 'Cadastrar Novo Morador'; if (btnSalvarMorador) btnSalvarMorador.textContent = 'Salvar Morador'; setTimeout(() => nomeInput?.focus(), 50); } } else { console.error('Falha abrir Modal Morador!'); } }
    function fecharModalMorador() { console.log('Fechando Modal Morador.'); if (modalCadastroMorador) { modalCadastroMorador.classList.remove('active'); modalCadastroMorador.style.display = 'none'; modalCadastroMorador.style.zIndex = ''; const mid = document.getElementById('morador-id'); if (mid) mid.value = ''; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); requestMainWindowFocus(); } }

    async function abrirModalCadastroUsuario(userId = null) {
        console.log(`DEBUG: Abrindo Modal Usuário. ID: ${userId || 'N/A'}`);
        if (modalCadastroEncomenda?.classList.contains('active')) fecharModalEncomenda();
        if (modalCadastroMorador?.classList.contains('active')) fecharModalMorador();
        if (modalCadastroEncomenda) { modalCadastroEncomenda.style.display = 'none'; modalCadastroEncomenda.style.zIndex = ''; }
        if (modalCadastroMorador) { modalCadastroMorador.style.display = 'none'; modalCadastroMorador.style.zIndex = ''; }

        if (modalCadastroUsuario) {
            if (formCadastroUsuario) formCadastroUsuario.reset();
            const usuarioIdInput = document.getElementById('usuario-id'); if (usuarioIdInput) usuarioIdInput.value = '';
            const statusMsgElement = document.getElementById('status-message'); if (statusMsgElement) statusMsgElement.style.display = 'none';

            modalCadastroUsuario.style.display = 'flex'; modalCadastroUsuario.style.zIndex = '1001'; modalCadastroUsuario.classList.add('active');

            const nomeUsuarioInput = document.getElementById('usuario-nome'); // Corrigido: este campo existe
            const emailInput = document.getElementById('usuario-email');
            const senhaInput = document.getElementById('usuario-senha');
            const senhaConfirmInput = document.getElementById('usuario-senha-confirm');
            const nivelAcessoSelect = document.getElementById('usuario-nivel-acesso');
            const statusSelect = usuarioStatusSelect;
            const nivelAcessoGroup = document.getElementById('grupo-nivel-acesso');
            const statusGroup = grupoStatusUsuario;

            if (senhaInput) senhaInput.placeholder = '';
            if (senhaConfirmInput) senhaConfirmInput.placeholder = '';

            if (userId) {
                console.log("Modo Edição Usuário - Buscando dados...");
                if (modalUsuarioTitle) modalUsuarioTitle.textContent = 'Editar Usuário';
                if (btnSalvarUsuario) btnSalvarUsuario.textContent = 'Salvar Alterações';
                if (usuarioIdInput) usuarioIdInput.value = userId;
                if (senhaInput) { senhaInput.required = false; senhaInput.placeholder = 'Deixe em branco para não alterar'; }
                if (senhaConfirmInput) { senhaConfirmInput.required = false; senhaConfirmInput.placeholder = 'Deixe em branco para não alterar'; }

                const isAdminEditing = currentUser?.role === 'admin';
                if (nivelAcessoGroup) nivelAcessoGroup.style.display = isAdminEditing ? 'block' : 'none';
                if (statusGroup) statusGroup.style.display = isAdminEditing ? 'block' : 'none';

                setTimeout(async () => {
                    try {
                        if (!window.electronAPI?.getUserById) throw new Error('API getUserById indisponível');
                        const userData = await window.electronAPI.getUserById(userId);
                        if (userData) {
                            if (nomeUsuarioInput) nomeUsuarioInput.value = userData.nome_usuario || '';
                            if (emailInput) emailInput.value = userData.email || '';
                            if (nivelAcessoSelect) nivelAcessoSelect.value = userData.nivel_acesso || 'porteiro';
                            if (statusSelect) statusSelect.value = userData.status || 'Ativo';
                            nomeUsuarioInput?.focus();
                        } else {
                            showStatusMessage(`Erro: Usuário ID ${userId} não encontrado.`, 'error');
                            fecharModalCadastroUsuario();
                        }
                    } catch (error) {
                        showStatusMessage(`Erro ao buscar dados: ${error.message}`, 'error');
                        fecharModalCadastroUsuario();
                    }
                }, 50);

            } else {
                console.log("Modo Cadastro Usuário.");
                if (modalUsuarioTitle) modalUsuarioTitle.textContent = 'Cadastrar Novo Usuário';
                if (btnSalvarUsuario) btnSalvarUsuario.textContent = 'Salvar Usuário';
                if (senhaInput) senhaInput.required = true;
                if (senhaConfirmInput) senhaConfirmInput.required = true;
                if (nivelAcessoGroup) nivelAcessoGroup.style.display = 'none';
                if (statusGroup) statusGroup.style.display = 'none';
                setTimeout(() => nomeUsuarioInput?.focus(), 50);
            }
        } else { console.error('Falha ao abrir Modal Usuário!'); }
    }
    function fecharModalCadastroUsuario() { console.log('DEBUG: Fechando Modal Usuário.'); if (modalCadastroUsuario) { modalCadastroUsuario.classList.remove('active'); modalCadastroUsuario.style.display = 'none'; modalCadastroUsuario.style.zIndex = ''; const uid = document.getElementById('usuario-id'); if (uid) uid.value = ''; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); requestMainWindowFocus(); } }


    // --- Funções Auxiliares e Autocomplete ---
    function preencherDataHoraAtual() { const agora = new Date(); const d = document.getElementById('data'); const h = document.getElementById('hora'); const a = agora.getFullYear(); const m = String(agora.getMonth() + 1).padStart(2, '0'); const dia = String(agora.getDate()).padStart(2, '0'); const df = `${a}-${m}-${dia}`; const hora = String(agora.getHours()).padStart(2, '0'); const min = String(agora.getMinutes()).padStart(2, '0'); const hf = `${hora}:${min}`; if (d) d.value = df; if (h) h.value = hf; }

    // Event listeners para autocomplete do morador no modal de encomenda
    if (inputMorador) {
        console.log('DEBUG Autocomplete: Configurando event listeners para inputMorador');
        
        inputMorador.addEventListener('input', handleMoradorInput);
        inputMorador.addEventListener('blur', () => {
            setTimeout(() => {
                const focusedElement = document.activeElement;
                if (!focusedElement || !focusedElement.closest('#morador-suggestions')) {
                    if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible');
                }
            }, 200);
        });
        
        // Navegação por teclado para sugestões de morador
        inputMorador.addEventListener('keydown', (e) => {
            const suggestions = suggestionsMoradorDiv?.querySelectorAll('.suggestion-item');
            if (!suggestions || suggestions.length === 0) return;
            
            let selectedIndex = -1;
            suggestions.forEach((item, index) => {
                if (item.classList.contains('selected')) {
                    selectedIndex = index;
                }
            });
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % suggestions.length;
                updateMoradorSuggestionSelection(suggestions, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
                updateMoradorSuggestionSelection(suggestions, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                suggestions[selectedIndex].click();
            } else if (e.key === 'Escape') {
                suggestionsMoradorDiv.classList.remove('visible');
            }
        });
    }

    // Event listeners para autocomplete do porteiro no modal de encomenda
    if (inputPorteiro) {
        console.log('DEBUG Autocomplete: Configurando event listeners para inputPorteiro');
        
        inputPorteiro.addEventListener('input', handlePorterInput);
        inputPorteiro.addEventListener('blur', () => {
            setTimeout(() => {
                const focusedElement = document.activeElement;
                if (!focusedElement || !focusedElement.closest('#porteiro-suggestions')) {
                    if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible');
                }
            }, 200);
        });
        
        // Navegação por teclado para sugestões de porteiro
        inputPorteiro.addEventListener('keydown', (e) => {
            const suggestions = suggestionsPorteiroDiv?.querySelectorAll('.suggestion-item');
            if (!suggestions || suggestions.length === 0) return;
            
            let selectedIndex = -1;
            suggestions.forEach((item, index) => {
                if (item.classList.contains('selected')) {
                    selectedIndex = index;
                }
            });
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % suggestions.length;
                updatePorteiroSuggestionSelection(suggestions, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
                updatePorteiroSuggestionSelection(suggestions, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                suggestions[selectedIndex].click();
            } else if (e.key === 'Escape') {
                suggestionsPorteiroDiv.classList.remove('visible');
            }
        });
    }

    function displayMoradorSuggestions(suggestions) {
        if (!suggestionsMoradorDiv) {
            console.error("[DEBUG Autocomplete] Elemento suggestionsMoradorDiv não encontrado!");
            return;
        }
        console.log('[DEBUG Autocomplete] displayMoradorSuggestions received:', suggestions);
        suggestionsMoradorDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach((r, index) => {
                try {
                    if (!r || typeof r.id === 'undefined' || typeof r.nome === 'undefined') {
                        console.warn("[DEBUG Autocomplete] Item de sugestão inválido recebido (Morador):", r);
                        return;
                    }
                    const div = document.createElement('div');
                    div.textContent = r.nome;
                    div.className = 'suggestion-item';
                    div.dataset.id = r.id;
                    div.dataset.name = r.nome;
                    
                    // Event listeners para mouse
                    div.addEventListener('mouseenter', () => {
                        updateMoradorSuggestionSelection(suggestionsMoradorDiv.querySelectorAll('.suggestion-item'), index);
                    });
                    
                    div.addEventListener('click', () => {
                        const target = document.getElementById('morador');
                        if (target) target.value = r.nome;
                        selectedMoradorId = r.id;
                        console.log(`Morador selecionado: ${r.nome} (ID: ${r.id})`);
                        suggestionsMoradorDiv.classList.remove('visible');
                        suggestionsMoradorDiv.innerHTML = '';
                        
                        // Move foco para próximo campo
                        const nextField = document.getElementById('quantidade');
                        if (nextField) nextField.focus();
                    });
                    suggestionsMoradorDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[DEBUG Autocomplete] Erro dentro do loop displayMoradorSuggestions:", loopError, "Item problemático:", r);
                }
            });

            if (suggestionsMoradorDiv.children.length > 0) {
                suggestionsMoradorDiv.classList.add('visible');
                console.log('[DEBUG Autocomplete] Morador suggestions displayed (com itens no DOM).');
            } else {
                suggestionsMoradorDiv.classList.remove('visible');
                console.log('[DEBUG Autocomplete] Nenhum item de sugestão de morador foi adicionado ao DOM, apesar de receber sugestões.');
            }
        } else {
            suggestionsMoradorDiv.classList.remove('visible');
            console.log('[DEBUG Autocomplete] No morador suggestions to display (array de sugestões vazio).');
        }
    }

    function displayPorterSuggestions(suggestions) {
        if (!suggestionsPorteiroDiv) {
            console.error("[DEBUG Autocomplete] Elemento suggestionsPorteiroDiv não encontrado!");
            return;
        }
        console.log('[DEBUG Autocomplete] displayPorterSuggestions received:', suggestions);
        suggestionsPorteiroDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach((p, index) => {
                try {
                    if (!p || typeof p.id === 'undefined' || typeof p.nome === 'undefined') {
                        console.warn("[DEBUG Autocomplete] Item de sugestão inválido recebido (Porteiro):", p);
                        return;
                    }
                    const div = document.createElement('div');
                    div.textContent = p.nome;
                    div.className = 'suggestion-item';
                    div.dataset.id = p.id;
                    div.dataset.name = p.nome;
                    
                    // Event listeners para mouse
                    div.addEventListener('mouseenter', () => {
                        updatePorteiroSuggestionSelection(suggestionsPorteiroDiv.querySelectorAll('.suggestion-item'), index);
                    });
                    
                    div.addEventListener('click', () => {
                        const target = document.getElementById('porteiro');
                        if (target) target.value = p.nome;
                        selectedPorteiroUserId = p.id;
                        console.log(`Porteiro (Usuário) selecionado: ${p.nome} (User ID: ${p.id})`);
                        suggestionsPorteiroDiv.classList.remove('visible');
                        suggestionsPorteiroDiv.innerHTML = '';
                        
                        // Move foco para próximo campo
                        const nextField = document.getElementById('observacoes');
                        if (nextField) nextField.focus();
                    });
                    suggestionsPorteiroDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[DEBUG Autocomplete] Erro dentro do loop displayPorterSuggestions:", loopError, "Item problemático:", p);
                }
            });

            if (suggestionsPorteiroDiv.children.length > 0) {
                suggestionsPorteiroDiv.classList.add('visible');
                console.log('[DEBUG Autocomplete] Porter suggestions displayed (com itens no DOM).');
            } else {
                suggestionsPorteiroDiv.classList.remove('visible');
                console.log('[DEBUG Autocomplete] Nenhum item de sugestão de porteiro foi adicionado ao DOM, apesar de receber sugestões.');
            }
        } else {
            suggestionsPorteiroDiv.classList.remove('visible');
            console.log('[DEBUG Autocomplete] No porter suggestions to display (array de sugestões vazio).');
        }
    }

    // Funções para atualizar seleção com teclado
    function updateMoradorSuggestionSelection(suggestions, selectedIndex) {
        suggestions.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function updatePorteiroSuggestionSelection(suggestions, selectedIndex) {
        suggestions.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    async function handleMoradorInput() {
        const input = document.getElementById('morador');
        if (!input || !window.electronAPI?.searchResidents) return;
        const term = input.value;
        console.log(`[DEBUG Autocomplete] handleMoradorInput called. Term: "${term}"`);
        
        // Limpa seleção anterior
        selectedMoradorId = null;
        
        if (term?.length >= 1) {
            try {
                console.log('[DEBUG Autocomplete] Calling API searchResidents...');
                const res = await window.electronAPI.searchResidents(term);
                console.log('[DEBUG Autocomplete] API searchResidents response:', res);
                displayMoradorSuggestions(res);
            } catch (err) {
                console.error('[DEBUG Autocomplete] Error calling searchResidents:', err);
                suggestionsMoradorDiv?.classList.remove('visible');
            }
        } else {
            suggestionsMoradorDiv?.classList.remove('visible');
            selectedMoradorId = null;
        }
    }

    async function handlePorterInput() {
        const input = document.getElementById('porteiro');
        if (!input || !window.electronAPI?.searchActivePorters) return;
        const term = input.value;
        console.log(`[DEBUG Autocomplete] handlePorterInput called. Term: "${term}"`);
        
        // Limpa seleção anterior
        selectedPorteiroUserId = null;
        
        if (term?.length >= 1) {
            try {
                console.log('[DEBUG Autocomplete] Calling API searchActivePorters...');
                const res = await window.electronAPI.searchActivePorters(term);
                console.log('[DEBUG Autocomplete] API searchActivePorters response:', res);
                displayPorterSuggestions(res);
            } catch (err) {
                console.error('[DEBUG Autocomplete] Error calling searchActivePorters:', err);
                suggestionsPorteiroDiv?.classList.remove('visible');
            }
        } else {
            suggestionsPorteiroDiv?.classList.remove('visible');
            selectedPorteiroUserId = null;
        }
    }

    // --- Funções de Carregamento de Conteúdo e Listagem ---
    function showStatusMessage(message, type = 'info', stickyError = false) {
        const el = document.getElementById('status-message');
        if (el) {
            el.textContent = message;
            el.className = `status-message status-${type}`;
            el.style.display = 'block';
            if (type === 'success' || (type === 'error' && !stickyError)) { // Só some se for sucesso ou erro não-fixo
                const delay = type === 'success' ? 3500 : 6000;
                setTimeout(() => { if (el.textContent === message) { el.style.display = 'none'; } }, delay);
            }
        } else { /* ... */ }
    }    function carregarConteudo(titulo, carregaDados = false) {
        console.log(`Carregando: ${titulo}`);
        mainContent.innerHTML = '';
        
        if (titulo !== 'Dashboard') {
            const h1 = document.createElement('h1');
            h1.textContent = titulo;
            h1.style.color = 'var(--cor-azul-principal)';
            mainContent.appendChild(h1);
        }
        
        const statusMsgElement = document.createElement('div');
        statusMsgElement.id = 'status-message';
        statusMsgElement.className = 'status-message';
        statusMsgElement.style.display = 'none';
        mainContent.appendChild(statusMsgElement);
        
        const sectionContent = document.createElement('div');
        sectionContent.className = 'section-content-area';
        mainContent.appendChild(sectionContent);

        if (titulo === 'Dashboard') {
            carregarDashboard(sectionContent);
        } else if (titulo === 'Dashboard Encomendas') {
            const btn = document.createElement('button');
            btn.textContent = 'Cadastrar Nova Encomenda';
            btn.className = 'btn-add';
            mainContent.insertBefore(btn, sectionContent);
            btn.addEventListener('click', () => abrirModalEncomenda());
            buscarEExibirEncomendas(sectionContent);        } else if (titulo === 'Moradores') {
            // Container para os botões
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;';
            mainContent.insertBefore(buttonContainer, sectionContent);            // Botão de cadastrar morador
            const btn = document.createElement('button');
            btn.innerHTML = '<img src="assets/adicionarmorador.svg" alt="Adicionar Morador" style="width: 24px; height: 24px; filter: brightness(0) invert(1);" title="Cadastrar Novo Morador">';
            btn.className = 'btn-add';
            buttonContainer.appendChild(btn);
            btn.addEventListener('click', () => abrirModalMorador());            // Botão de importar moradores CSV
            const btnImportar = document.createElement('button');
            btnImportar.innerHTML = '<img src="assets/upload-botao.svg" alt="Importar CSV" style="width: 24px; height: 24px;" title="Importar Moradores (CSV)">';
            btnImportar.id = 'btnImportarMoradores';
            btnImportar.className = 'btn-import';
            buttonContainer.appendChild(btnImportar);// Input oculto para upload
            const inputCsv = document.createElement('input');
            inputCsv.type = 'file';
            inputCsv.id = 'inputCsvMoradores';
            inputCsv.accept = '.csv';
            inputCsv.style.display = 'none';
            buttonContainer.appendChild(inputCsv);

            btnImportar.onclick = () => inputCsv.click();
            inputCsv.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                const arrayBuffer = await file.arrayBuffer();
                const csvContent = new TextDecoder('utf-8').decode(arrayBuffer);
                window.electronAPI.importarMoradoresCSV(csvContent)
                    .then(res => {
                        alert(res.message);
                        // Atualiza a lista de moradores após importar
                        const div = mainContent.querySelector('#lista-moradores-container');
                        if (div) buscarEExibirMoradores(div);
                    })
                    .catch(err => alert('Erro ao importar: ' + err.message));
            };

            // Lista de moradores
            const div = document.createElement('div');
            div.id = 'lista-moradores-container';
            div.style.marginTop = '20px';
            sectionContent.appendChild(div);
            buscarEExibirMoradores(div);
        } else if (titulo === 'Usuários' && currentUser?.role === 'admin') {
            const btn = document.createElement('button'); btn.textContent = 'Cadastrar Novo Usuário'; btn.className = 'btn-add'; mainContent.insertBefore(btn, sectionContent);
            btn.addEventListener('click', () => abrirModalCadastroUsuario());
            const div = document.createElement('div'); div.id = 'lista-usuarios-container'; div.style.marginTop = '20px'; sectionContent.appendChild(div);
            buscarEExibirUsuarios(div);
        } else if (titulo === 'Relatórios') {
            // Interface de Relatórios
            const formFiltros = document.createElement('form');
            formFiltros.id = 'form-filtros-relatorio';
            formFiltros.innerHTML = `
                <div class="filtros-container" style="background: #f5f8fa; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #1976d2;">Filtros para Relatório</h3>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="filtro-data-inicial">Data Inicial:</label>
                            <input type="date" id="filtro-data-inicial" name="dataInicial">
                        </div>
                        <div class="form-group">
                            <label for="filtro-data-final">Data Final:</label>
                            <input type="date" id="filtro-data-final" name="dataFinal">
                        </div>
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="filtro-morador">Nome do Morador:</label>
                            <input type="text" id="filtro-morador" name="morador" placeholder="Digite o nome...">
                        </div>
                        <div class="form-group">
                            <label for="filtro-porteiro">Nome do Porteiro:</label>
                            <input type="text" id="filtro-porteiro" name="porteiro" placeholder="Digite o nome...">
                        </div>
                        <div class="form-group">
                            <label for="filtro-status">Status:</label>
                            <select id="filtro-status" name="status">
                                <option value="">Todos os Status</option>
                                <option value="Recebida na portaria">Recebida na portaria</option>
                                <option value="Entregue">Entregue</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions" style="display: flex; gap: 12px;">
                        <button type="submit" class="btn-primary">Buscar Relatório</button>
                        <button type="button" id="btn-exportar-pdf" class="btn-secondary">Exportar PDF</button>
                        <button type="button" id="btn-limpar-filtros" class="btn-outline">Limpar Filtros</button>
                    </div>
                </div>
            `;
            sectionContent.appendChild(formFiltros);

            // Container para resultados
            const resultadosContainer = document.createElement('div');
            resultadosContainer.id = 'resultados-relatorio';
            resultadosContainer.style.marginTop = '20px';
            sectionContent.appendChild(resultadosContainer);

            // Event listeners para o formulário de relatórios
            formFiltros.addEventListener('submit', async (e) => {
                e.preventDefault();
                await buscarRelatorio();
            });

            document.getElementById('btn-exportar-pdf').addEventListener('click', async () => {
                // Obtém os filtros do formulário
                const formData = new FormData(formFiltros);
                const filtros = {
                    dataInicial: formData.get('dataInicial') || '',
                    dataFinal: formData.get('dataFinal') || '',
                    morador: formData.get('morador') || '',
                    porteiro: formData.get('porteiro') || '',
                    status: formData.get('status') || ''
                };
                try {
                    if (!window.electronAPI?.exportarRelatorioPDF) throw new Error('API de exportação indisponível');
                    // Chama a função e aguarda o retorno
                    const res = await window.electronAPI.exportarRelatorioPDF(filtros);
                    if (res.success) {
                        alert('PDF exportado com sucesso!\nArquivo salvo em:\n' + res.path);
                    } else {
                        alert('Erro ao exportar PDF: ' + (res.message || 'Erro desconhecido.'));
                    }
                } catch (err) {
                    alert('Erro ao exportar PDF: ' + err.message);
                }
            });

            document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
                formFiltros.reset();
                document.getElementById('resultados-relatorio').innerHTML = '';
            });

            // Função para buscar relatório
            async function buscarRelatorio() {
                const formData = new FormData(formFiltros);
                const filtros = {
                    dataInicial: formData.get('dataInicial') || '',
                    dataFinal: formData.get('dataFinal') || '',
                    morador: formData.get('morador') || '',
                    porteiro: formData.get('porteiro') || '',
                    status: formData.get('status') || ''
                };

                console.log('Buscando relatório com filtros:', filtros);
                resultadosContainer.innerHTML = '<p>Carregando relatório...</p>';

                try {
                    if (!window.electronAPI?.buscarRelatorio) {
                        throw new Error('API de relatórios indisponível');
                    }

                    // Busca TODOS os resultados primeiro, sem filtro de status
                    const filtrosSemStatus = { ...filtros };
                    delete filtrosSemStatus.status; // Remove o filtro de status temporariamente
                    
                    const todosResultados = await window.electronAPI.buscarRelatorio(filtrosSemStatus);
                    console.log('=== DEBUG COMPLETO DOS DADOS ===');
                    console.log('Total de resultados recebidos:', todosResultados?.length || 0);
                    
                    // Log detalhado dos primeiros 3 itens para análise
                    if (Array.isArray(todosResultados) && todosResultados.length > 0) {
                        console.log('Primeiros 3 itens para análise:');
                        todosResultados.slice(0, 3).forEach((item, index) => {
                            console.log(`\n--- ITEM ${index + 1} (ID: ${item.id}) ---`);
                            console.log('Todos os campos disponíveis:', Object.keys(item));
                            console.log('Dados completos:', item);
                            
                            // Verifica especificamente campos relacionados a entrega
                            const camposEntrega = [
                                'data_entrega', 'entregue_em', 'delivered_at', 'entrega_data', 
                                'entrega_timestamp', 'data_entregue', 'porteiro_entregou_id', 
                                'porteiro_entregou_nome', 'entregue_por', 'delivered_by', 
                                'status', 'data_entrega_iso', 'entrega_porteiro_id'
                            ];
                            
                            console.log('Campos de entrega encontrados:');
                            camposEntrega.forEach(campo => {
                                if (item.hasOwnProperty(campo)) {
                                    console.log(`  ${campo}: ${item[campo]} (tipo: ${typeof item[campo]})`);
                                }
                            });
                        });
                    }
                    
                    // Agora aplica a lógica de determinação de status e filtra no frontend
                    let resultadosFiltrados = todosResultados;
                    
                    if (Array.isArray(todosResultados)) {
                        resultadosFiltrados = todosResultados.map(item => {
                            console.log(`\n=== PROCESSANDO ITEM ${item.id} ===`);
                            
                            // Agora usamos o campo 'status' que vem direto da query SQL
                            let statusReal = item.status || 'Recebida na portaria';
                            let motivoStatus = 'Status determinado pela query SQL';
                            
                            // Log dos campos importantes
                            console.log('Campos de entrega:');
                            console.log(`  status: ${item.status}`);
                            console.log(`  data_entrega: ${item.data_entrega}`);
                            console.log(`  porteiro_entregou_id: ${item.porteiro_entregou_id}`);
                            console.log(`  porteiro_entregou_nome: ${item.porteiro_entregou_nome}`);
                            
                            // Verificação adicional para casos especiais
                            if (!statusReal || statusReal === 'null') {
                                if (item.data_entrega) {
                                    statusReal = 'Entregue';
                                    motivoStatus = 'Data de entrega encontrada';
                                } else {
                                    statusReal = 'Recebida na portaria';
                                    motivoStatus = 'Sem data de entrega';
                                }
                            }
                            
                            console.log(`Status final: "${statusReal}" (motivo: ${motivoStatus})`);
                            
                            return { ...item, statusCalculado: statusReal, motivoStatus };
                        });
                        
                        // Agora aplica o filtro de status se especificado
                        if (filtros.status && filtros.status.trim()) {
                            console.log(`\n=== APLICANDO FILTRO DE STATUS: "${filtros.status}" ===`);
                            const antesDoFiltro = resultadosFiltrados.length;
                            
                            resultadosFiltrados = resultadosFiltrados.filter(item => {
                                const match = item.statusCalculado === filtros.status;
                                console.log(`Item ${item.id}: calculado="${item.statusCalculado}", filtro="${filtros.status}", match=${match}`);
                                return match;
                            });
                            
                            console.log(`Filtro aplicado: ${antesDoFiltro} itens -> ${resultadosFiltrados.length} itens`);
                        }
                    }

                    // Insere apenas os resultados
                    resultadosContainer.innerHTML = '';

                    exibirResultadosRelatorio(resultadosFiltrados, filtros);
                } catch (error) {
                    console.error('Erro ao buscar relatório:', error);
                    resultadosContainer.innerHTML = `
                        <div class="error-message" style="color: #d32f2f; background: #ffebee; padding: 16px; border-radius: 8px;">
                            Erro ao buscar relatório: ${error.message}
                        </div>
                    `;
                }
            }

            // Função para exibir resultados do relatório  
            function exibirResultadosRelatorio(resultados, filtros) {
                console.log('=== EXIBINDO RESULTADOS ===');
                console.log('Número de resultados a exibir:', resultados?.length || 0);
                
                if (!Array.isArray(resultados) || resultados.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.innerHTML = `
                        <div class="empty-message" style="text-align: center; padding: 40px; background: #f5f8fa; border-radius: 12px;">
                            <h3>Nenhum resultado encontrado</h3>
                            <p>Tente ajustar os filtros para encontrar encomendas.</p>
                        </div>
                    `;
                    resultadosContainer.appendChild(emptyDiv);
                    return;
                }

                const headerDiv = document.createElement('div');
                headerDiv.innerHTML = `
                    <div class="relatorio-header" style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <h3 style="margin: 0; color: #1976d2;">Resultados do Relatório</h3>
                        <p style="margin: 8px 0 0 0;">Encontradas ${resultados.length} encomendas</p>
                        ${Object.values(filtros).some(f => f.trim()) ? `
                            <div style="margin-top: 8px; font-size: 0.9em;">
                                <strong>Filtros aplicados:</strong>
                                ${filtros.dataInicial ? `Data inicial: ${filtros.dataInicial} ` : ''}
                                ${filtros.dataFinal ? `Data final: ${filtros.dataFinal} ` : ''}
                                ${filtros.morador ? `Morador: ${filtros.morador} ` : ''}
                                ${filtros.porteiro ? `Porteiro: ${filtros.porteiro} ` : ''}
                                ${filtros.status ? `Status: ${filtros.status} ` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
                resultadosContainer.appendChild(headerDiv);

                const tableDiv = document.createElement('div');
                tableDiv.innerHTML = `
                    <div class="relatorio-table-container" style="overflow-x: auto;">
                        <table class="relatorio-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <thead style="background: #1976d2; color: white;">
                                <tr>
                                    <th style="padding: 12px; text-align: left;">ID</th>
                                    <th style="padding: 12px; text-align: left;">Data Recebimento</th>
                                    <th style="padding: 12px; text-align: left;">Morador</th>
                                    <th style="padding: 12px; text-align: left;">Qtd</th>
                                    <th style="padding: 12px; text-align: left;">Status</th>
                                    <th style="padding: 12px; text-align: left;">Observações</th>
                                </tr>
                            </thead>
                            <tbody id="relatorio-tbody">
                            </tbody>
                        </table>
                    </div>
                `;
                resultadosContainer.appendChild(tableDiv);

                const tbody = document.getElementById('relatorio-tbody');
                resultados.forEach((item, index) => {
                    console.log(`Exibindo item ${index}:`, item);
                    
                    const dataFormatada = item.data ? 
                        new Date(item.data).toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : 'N/A';

                    // Usa o status já calculado na função buscarRelatorio
                    const statusValue = item.statusCalculado || 'Recebida na portaria';
                    
                    console.log(`Status final para exibição - Item ${item.id}: "${statusValue}"`);
                    
                    const statusClass = statusValue === 'Entregue' ? 'status-entregue' : 'status-pendente';
                    const rowClass = index % 2 === 0 ? 'even' : 'odd';

                    const row = document.createElement('tr');
                    row.className = rowClass;
                    row.style.borderBottom = '1px solid #eee';
                    
                    row.innerHTML = `
                        <td style="padding: 12px;">${item.id || 'N/A'}</td>
                        <td style="padding: 12px;">${dataFormatada}</td>
                        <td style="padding: 12px; font-weight: 500;">${item.morador || 'N/A'}</td>
                        <td style="padding: 12px; text-align: center;">${item.quantidade || 1}</td>
                        <td style="padding: 12px;">
                            <span class="${statusClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 500; ${
                                statusValue === 'Entregue' ? 'background: #c8e6c9; color: #2e7d32;' : 'background: #fff3e0; color: #f57c00;'
                            }">
                                ${statusValue}
                            </span>
                        </td>
                        <td style="padding: 12px; max-width: 200px; word-wrap: break-word;">${item.observacoes || '-'}</td>
                    `;
                    
                    tbody.appendChild(row);
                });
            }
        } else if (titulo === 'Ajustes') {
            // Seção de Configuração do Banco
            const bancoSection = document.createElement('div');
            bancoSection.innerHTML = `
                <h3 style="color: var(--cor-azul-principal); margin-bottom: 20px;">Configuração do Banco de Dados</h3>
                <form id="form-config-banco" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="db-host">Host:</label>
                            <input type="text" id="db-host" name="host" required placeholder="localhost">
                        </div>
                        <div class="form-group">
                            <label for="db-port">Porta:</label>
                            <input type="number" id="db-port" name="port" required placeholder="5432" value="5432">
                        </div>
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="db-database">Database:</label>
                            <input type="text" id="db-database" name="database" required placeholder="controle_encomendas">
                        </div>
                        <div class="form-group">
                            <label for="db-user">Usuário:</label>
                            <input type="text" id="db-user" name="user" required placeholder="postgres">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="db-password">Senha:</label>
                        <input type="password" id="db-password" name="password" required>
                    </div>
                    <div class="form-actions" style="display: flex; gap: 12px;">
                        <button type="button" id="btn-testar-conexao" class="btn-secondary">Testar Conexão</button>
                        <button type="submit" class="btn-primary">Salvar Configuração</button>
                        <button type="button" id="btn-criar-tabelas" class="btn-secondary">Criar/Verificar Tabelas</button>
                    </div>
                </form>
            `;
            sectionContent.appendChild(bancoSection);

            // Seção de QR Code para API
            const qrSection = document.createElement('div');
            qrSection.innerHTML = `
                <h3 style="color: var(--cor-azul-principal); margin-bottom: 20px;">Acesso via Aplicativo Mobile</h3>
                <div class="qr-section">
                    <p style="margin-bottom: 15px; color: #666;">
                        Use o QR Code abaixo para conectar o aplicativo mobile ao sistema desktop:
                    </p>
                    <div class="qr-container">
                        <div id="qr-code-display" style="text-align: center;">
                            <p>Carregando QR Code...</p>
                        </div>
                        <div class="api-info" style="margin-left: 20px;">
                            <p><strong>URL da API:</strong> <span id="api-url">-</span></p>
                            <p><strong>IP do Computador:</strong> <span id="api-ip">-</span></p>
                            <p><strong>Porta:</strong> <span id="api-port">-</span></p>
                            <p style="font-size: 0.9em; color: #666; margin-top: 15px;">
                                <strong>Instruções:</strong><br>
                                1. Abra o aplicativo mobile<br>
                                2. Escaneie este QR Code<br>
                                3. O app se conectará automaticamente
                            </p>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <button id="btn-refresh-qr" class="btn-refresh">Atualizar QR Code</button>
                        <button id="btn-copy-url" class="btn-secondary" style="margin-left: 10px;">Copiar URL</button>
                    </div>
                </div>
            `;
            sectionContent.appendChild(qrSection);

            // Seção de Backup
            const backupSection = document.createElement('div');
            backupSection.innerHTML = `
                <h3 style="color: var(--cor-azul-principal); margin-bottom: 20px;">Backup e Restauração</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 16px;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 8px 0; color: #333;">Exportar Backup</h4>
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                Cria uma cópia de segurança completa do banco de dados com todos os moradores, usuários e encomendas.
                            </p>
                        </div>                        
                        <button type="button" id="btn-criar-backup" class="btn-backup">
                            <img src="assets/backup.svg" alt="Backup" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;"> Exportar Backup
                        </button>
                    </div>
                    <div style="padding: 12px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                        <small style="color: #1976d2;">
                            <strong>Importante:</strong> Recomendamos fazer backups regulares dos seus dados. 
                            O arquivo será salvo no formato SQL e pode ser usado para restaurar os dados em caso de necessidade.
                        </small>
                    </div>
                </div>
            `;
            sectionContent.appendChild(backupSection);

            // Event listeners para Ajustes
            const formConfigBanco = document.getElementById('form-config-banco');
            const btnTestarConexao = document.getElementById('btn-testar-conexao');
            const btnCriarTabelas = document.getElementById('btn-criar-tabelas');
            const btnCriarBackup = document.getElementById('btn-criar-backup');
            const btnRefreshQR = document.getElementById('btn-refresh-qr');
            const btnCopyUrl = document.getElementById('btn-copy-url');

            // Carrega configuração atual
            (async () => {
                try {
                    const config = await window.electronAPI.getDbConfig();
                    if (config) {
                        document.getElementById('db-host').value = config.host || '';
                        document.getElementById('db-port').value = config.port || '5432';
                        document.getElementById('db-database').value = config.database || '';
                        document.getElementById('db-user').value = config.user || '';
                        document.getElementById('db-password').value = config.password || '';
                    }
                } catch (error) {
                    console.error('Erro ao carregar config:', error);
                }
            })();

            // Função para carregar QR Code
            async function carregarQRCode() {
                try {
                    const qrData = await window.electronAPI.generateAPIQRCode(3001);
                    const qrDisplay = document.getElementById('qr-code-display');
                    const apiUrl = document.getElementById('api-url');
                    const apiIp = document.getElementById('api-ip');
                    const apiPort = document.getElementById('api-port');
                    
                    if (qrData && qrData.success) {
                        qrDisplay.innerHTML = `<img src="${qrData.qrCode}" alt="QR Code API" class="qr-image" style="border: 1px solid #ccc; border-radius: 4px;">`;
                        apiUrl.textContent = qrData.url;
                        apiIp.textContent = qrData.ip;
                        apiPort.textContent = qrData.port;
                    } else {
                        qrDisplay.innerHTML = '<p style="color: #f44040;">Erro ao gerar QR Code</p>';
                        apiUrl.textContent = 'Erro';
                        apiIp.textContent = 'Erro';
                        apiPort.textContent = 'Erro';
                    }
                } catch (error) {
                    console.error('Erro ao carregar QR Code:', error);
                    document.getElementById('qr-code-display').innerHTML = '<p style="color: #f44040;">Erro ao carregar QR Code</p>';
                }
            }

            // Carrega QR Code inicial
            carregarQRCode();

            // Event listener para atualizar QR Code
            if (btnRefreshQR) {
                btnRefreshQR.addEventListener('click', carregarQRCode);
            }

            // Event listener para copiar URL
            if (btnCopyUrl) {
                btnCopyUrl.addEventListener('click', () => {
                    const url = document.getElementById('api-url').textContent;
                    if (url && url !== '-' && url !== 'Erro') {
                        navigator.clipboard.writeText(url).then(() => {
                            showStatusMessage('URL copiada para a área de transferência!', 'success');
                        }).catch(() => {
                            showStatusMessage('Erro ao copiar URL', 'error');
                        });
                    }
                });
            }

            // Event listener para o formulário de configuração do banco
            formConfigBanco.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formConfigBanco);
                const config = Object.fromEntries(formData);
                
                try {
                    const result = await window.electronAPI.saveDbConfig(config);
                    if (result.success) {
                        showStatusMessage('Configuração salva com sucesso!', 'success');
                    } else {
                        showStatusMessage(`Erro ao salvar: ${result.message}`, 'error');
                    }
                } catch (error) {
                    showStatusMessage(`Erro ao salvar configuração: ${error.message}`, 'error');
                }
            });

            // Testar conexão
            btnTestarConexao.addEventListener('click', async () => {
                const formData = new FormData(formConfigBanco);
                const config = Object.fromEntries(formData);
                
                btnTestarConexao.textContent = 'Testando...';
                btnTestarConexao.disabled = true;
                
                try {
                    const result = await window.electronAPI.testarConexaoBanco(config);
                    if (result.success) {
                        showStatusMessage('Conexão testada com sucesso!', 'success');
                    } else {
                        showStatusMessage(`Erro na conexão: ${result.message}`, 'error');
                    }

                } catch (error) {
                    showStatusMessage(`Erro ao testar conexão: ${error.message}`, 'error');
                } finally {
                    btnTestarConexao.textContent = 'Testar Conexão';
                    btnTestarConexao.disabled = false;
                }
            });

            // Criar tabelas
            btnCriarTabelas.addEventListener('click', async () => {
                btnCriarTabelas.textContent = 'Criando...';
                btnCriarTabelas.disabled = true;
                
                try {
                    const result = await window.electronAPI.criarTabelasBanco();
                    if (result.success) {
                        showStatusMessage(result.message, 'success');
                    } else {
                        showStatusMessage(`Erro: ${result.message}`, 'error');
                    }
                } catch (error) {
                    showStatusMessage(`Erro ao criar tabelas: ${error.message}`, 'error');
                } finally {
                    btnCriarTabelas.textContent = 'Criar/Verificar Tabelas';
                    btnCriarTabelas.disabled = false;
                }
            });            // Criar backup
            btnCriarBackup.addEventListener('click', async () => {
                btnCriarBackup.innerHTML = '<img src="assets/backup.svg" alt="Backup" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;"> Criando backup...';
                btnCriarBackup.disabled = true;
                
                try {
                    const result = await window.electronAPI.criarBackupBanco();
                    if (result.success) {
                        showStatusMessage(`${result.message}\nArquivo: ${result.path}`, 'success');
                    } else {
                        showStatusMessage(`Erro ao criar backup: ${result.message}`, 'error');
                    }
                } catch (error) {
                    showStatusMessage(`Erro ao criar backup: ${error.message}`, 'error');
                } finally {
                    btnCriarBackup.innerHTML = '<img src="assets/backup.svg" alt="Backup" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;"> Exportar Backup';
                    btnCriarBackup.disabled = false;
                }
            });

        } else {
            const p = document.createElement('p'); p.textContent = `Conteúdo ${titulo}...`; sectionContent.appendChild(p);
        }
    }
    async function buscarEExibirEncomendas(container) {
        console.log('Buscando encomendas...');
        container.innerHTML = '<p>Carregando...</p>';
        try {
            if (!window.electronAPI?.getPendingPackages) throw new Error('API getPendingPackages indisponível');
            const pacotes = await window.electronAPI.getPendingPackages();
            container.innerHTML = '';
            if (Array.isArray(pacotes)) {
                if (pacotes.length > 0) {
                    const title = document.createElement('h3');
                    title.textContent = 'Aguardando Entrega:';
                    title.style.marginTop = '0';
                    container.appendChild(title);                    // Adiciona container para botão de entrega em lote
                    const batchContainer = document.createElement('div');
                    batchContainer.id = 'batch-delivery-container';
                    batchContainer.className = 'batch-delivery-container';
                    batchContainer.style.display = 'none';
                    batchContainer.innerHTML = `
                        <button id="btn-entregar-selecionadas" class="btn-primary btn-batch-delivery">
                            Entregar Selecionadas (<span id="selected-count">0</span>)
                        </button>
                        <span id="selected-resident-name" class="selected-resident-info"></span>
                    `;
                    container.appendChild(batchContainer);

                    const ul = document.createElement('ul');
                    ul.className = 'encomendas-list';
                    pacotes.forEach(p => {
                        const li = document.createElement('li');
                        li.className = 'encomenda-item';
                        li.dataset.residentId = p.morador_id || '';
                        li.dataset.residentName = p.morador_nome || '';
                        li.dataset.packageId = p.id;
                        
                        let dataReceb = 'Inválida';
                        try {
                            dataReceb = new Date(p.data_recebimento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                            if (dataReceb === 'Invalid Date') dataReceb = 'Inválida';
                        } catch (e) {
                            // dataReceb continua 'Inválida'
                        }
                        
                        li.innerHTML = `
                            <div class="encomenda-checkbox">
                                <input type="checkbox" 
                                       class="package-checkbox" 
                                       data-package-id="${p.id}" 
                                       data-resident-id="${p.morador_id || ''}" 
                                       data-resident-name="${p.morador_nome || 'N/A'}">
                            </div>
                            <div class="encomenda-info">
                                <span><strong>Morador:</strong> ${p.morador_nome || 'N/A'}</span>
                                <span><strong>Recebido:</strong> ${dataReceb}</span>
                                <span><strong>Quantidade:</strong> ${p.quantidade || 1}</span>
                                <span><strong>Porteiro que recebeu:</strong> ${p.porteiro_nome || 'N/A'}</span>
                                ${p.observacoes ? `<span><strong>Obs:</strong> ${p.observacoes}</span>` : ''}
                            </div>
                            <div class="encomenda-actions">
                                <button class="btn-editar-encomenda" data-id="${p.id}">Editar</button>
                                <button class="btn-entregar-encomenda" data-id="${p.id}">Entregar</button>
                            </div>
                        `;
                        ul.appendChild(li);                        const btnEditEnc = li.querySelector('.btn-editar-encomenda');
                        const btnDeliverEnc = li.querySelector('.btn-entregar-encomenda');
                        const checkbox = li.querySelector('.package-checkbox');

                        // Event listener para checkbox
                        if (checkbox) {
                            checkbox.addEventListener('change', handlePackageSelection);
                        }

                        if (btnDeliverEnc) {
                            btnDeliverEnc.addEventListener('click', (e) => {
                                const packageId = e.currentTarget.dataset.id;
                                const moradorNome = p.morador_nome || 'N/A';
                                abrirModalEntrega(packageId, moradorNome);
                            });
                        }

                        // ***** INÍCIO DA ALTERAÇÃO *****
                        if (btnEditEnc) {
                            btnEditEnc.addEventListener('click', (e) => {
                                const packageId = e.currentTarget.dataset.id; // Pega o ID do atributo data-id
                                if (packageId) {
                                    iniciarEdicaoEncomenda(packageId); // Chama a nova função
                                } else {
                                    console.error("ID da encomenda não encontrado no botão editar.");
                                    showStatusMessage("Erro: ID da encomenda não encontrado.", "error");
                                }
                            });
                        }
                        // ***** FIM DA ALTERAÇÃO *****
                    });
                    container.appendChild(ul);

                    // Event listener para botão de entrega em lote
                    const btnEntregarSelecionadas = document.getElementById('btn-entregar-selecionadas');
                    if (btnEntregarSelecionadas) {
                        btnEntregarSelecionadas.addEventListener('click', abrirModalEntregaLote);
                    }
                } else {
                    const msg = document.createElement('p');
                    msg.textContent = 'Nenhuma encomenda pendente.';
                    msg.className = 'empty-list-message';
                    container.appendChild(msg);
                }
            } else {
                throw new Error('Resposta inesperada do backend (pacotes).');
            }
        } catch (error) {
            console.error('Erro ao buscar/exibir encomendas:', error);
            container.innerHTML = ''; // Limpa o "Carregando..."
            const err = document.createElement('p');
            err.textContent = `Erro ao carregar encomendas: ${error.message}`;
            err.className = 'error-message';
            container.appendChild(err);
        }
    }
    async function buscarEExibirMoradores(container) { console.log('Buscando moradores...'); container.innerHTML = '<p>Carregando...</p>'; try { if (!window.electronAPI?.getResidents) throw new Error('API indisponível'); const moradores = await window.electronAPI.getResidents(); container.innerHTML = ''; if (Array.isArray(moradores)) { if (moradores.length > 0) { const table = document.createElement('table'); table.className = 'moradores-table'; const thead = table.createTHead(); const hr = thead.insertRow();['Nome', 'AP/LT', 'BL/QD', 'Telefone', 'Ações'].forEach(t => { const th = document.createElement('th'); th.textContent = t; hr.appendChild(th); }); const tbody = table.createTBody(); moradores.forEach(m => { const row = tbody.insertRow(); row.dataset.residentId = m.id; row.insertCell().textContent = m.nome || 'N/A'; row.insertCell().textContent = m.apartamento || 'N/A'; row.insertCell().textContent = m.bloco || 'N/A'; row.insertCell().textContent = m.telefone || 'N/A'; const actionsCell = row.insertCell(); actionsCell.className = 'morador-actions'; const btnEdit = document.createElement('button'); btnEdit.textContent = 'Editar'; btnEdit.className = 'btn-editar-morador'; btnEdit.dataset.id = m.id; btnEdit.addEventListener('click', () => abrirModalMorador(m.id)); actionsCell.appendChild(btnEdit); if (currentUser?.role === 'admin') { const btnDel = document.createElement('button'); btnDel.textContent = 'Excluir'; btnDel.className = 'btn-excluir-morador'; btnDel.dataset.id = m.id; btnDel.addEventListener('click', async () => { const mid = btnDel.dataset.id; const mNome = m.nome; if (confirm(`Excluir ${mNome}? Esta ação não pode ser desfeita.`)) { try { if (!window.electronAPI?.deleteResident) throw new Error('API indisponível'); const res = await window.electronAPI.deleteResident(mid); if (res?.success) { showStatusMessage(res.message || 'Excluído!', 'success'); container.querySelector(`tr[data-resident-id="${mid}"]`)?.remove(); } else { showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error'); } } catch (err) { showStatusMessage(`Erro: ${err.message}`, 'error'); } } }); actionsCell.appendChild(btnDel); } }); container.appendChild(table); } else { const msg = document.createElement('p'); msg.textContent = 'Nenhum morador cadastrado.'; msg.className = 'empty-list-message'; container.appendChild(msg); } } else { throw new Error('Resposta inesperada.'); } } catch (error) { console.error('Erro moradores:', error); container.innerHTML = ''; const err = document.createElement('p'); err.textContent = `Erro ao carregar moradores: ${error.message}`; err.className = 'error-message'; container.appendChild(err); } }    async function buscarEExibirUsuarios(containerElement) {
        console.log('Renderer: Chamando electronAPI.getUsers()...');
        containerElement.innerHTML = '<p>Carregando usuários...</p>';
               try {
            if (!window.electronAPI?.getUsers) throw new Error('API getUsers indisponível.');
            const usuarios = await window.electronAPI.getUsers();
            containerElement.innerHTML = '';

            if (Array.isArray(usuarios)) {
                if (usuarios.length > 0) {
                    const table = document.createElement('table');
                    table.className = 'porteiros-table';
                    const thead = table.createTHead();
                    const headerRow = thead.insertRow();                    const headers = ['Nome', 'Nível', 'Ações'];
                    headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

                    const tbody = table.createTBody();
                    usuarios.forEach(user => {
                        const row = tbody.insertRow();
                        row.dataset.userId = user.id;
                        row.insertCell().textContent = user.nome_completo || 'N/A';                        row.insertCell().textContent = user.nivel_acesso || 'N/A';

                        const actionsCell = row.insertCell();
                        actionsCell.className = 'porteiro-actions';const btnEditar = document.createElement('button');
                        btnEditar.innerHTML = '<img src="assets/editar.svg" alt="Editar" style="width: 16px; height: 16px;" title="Editar Usuário">';
                        btnEditar.className = 'btn-editar-porteiro';
                        btnEditar.dataset.id = user.id;
                        btnEditar.addEventListener('click', () => {
                            abrirModalCadastroUsuario(user.id);
                        });
                        actionsCell.appendChild(btnEditar);                        if (currentUser?.role === 'admin' && currentUser.id !== user.id) {
                            // Toggle Switch para Status
                            const toggleContainer = document.createElement('label');
                            toggleContainer.className = 'user-status-toggle';
                            toggleContainer.title = `${user.status === 'Ativo' ? 'Desativar' : 'Ativar'} usuário`;
                            
                            const toggleInput = document.createElement('input');
                            toggleInput.type = 'checkbox';
                            toggleInput.checked = user.status === 'Ativo';
                            toggleInput.dataset.id = user.id;
                            
                            const toggleSlider = document.createElement('span');
                            toggleSlider.className = 'toggle-slider';

                            toggleContainer.appendChild(toggleInput);
                            toggleContainer.appendChild(toggleSlider);

                            toggleInput.addEventListener('change', async (e) => {
                                const checkbox = e.target;
                                const userIdToToggle = checkbox.dataset.id;
                                const isNowActive = checkbox.checked;
                                const newStatus = isNowActive ? 'Ativo' : 'Inativo';
                                const userName = user.nome_completo || user.nome_usuario;

                                if (confirm(`${isNowActive ? 'Ativar' : 'Desativar'} usuário ${userName}?`)) {
                                    checkbox.disabled = true;
                                    try {
                                        const currentUserDataFromDB = await window.electronAPI.getUserById(userIdToToggle);
                                        if (!currentUserDataFromDB) throw new Error("Usuário não encontrado para atualizar status.");

                                        const updateData = {
                                            nomeUsuario: currentUserDataFromDB.nome_usuario,
                                            nivelAcesso: currentUserDataFromDB.nivel_acesso,
                                            nomeCompleto: currentUserDataFromDB.nome_completo,
                                            email: currentUserDataFromDB.email,
                                            status: newStatus
                                        };

                                        if (!window.electronAPI?.updateUser) throw new Error('API updateUser indisponível');
                                        const res = await window.electronAPI.updateUser(userIdToToggle, updateData);                                        if (res?.success) {
                                            showStatusMessage(res.message || `Status atualizado!`, 'success');
                                            user.status = newStatus;
                                            toggleContainer.title = `${newStatus === 'Ativo' ? 'Desativar' : 'Ativar'} usuário`;
                                        } else {
                                            showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error');
                                            checkbox.checked = !isNowActive; // Reverte o estado
                                        }
                                    } catch (err) {
                                        showStatusMessage(`Erro ao alterar status: ${err.message}`, 'error');
                                        checkbox.checked = !isNowActive; // Reverte o estado
                                    } finally {
                                        checkbox.disabled = false;
                                    }
                                } else {
                                    checkbox.checked = !isNowActive; // Reverte se cancelar
                                }
                            });                            actionsCell.appendChild(toggleContainer);
                        }

                        if (currentUser?.role === 'admin' && currentUser.id !== user.id) {                            const btnDel = document.createElement('button');
                            btnDel.innerHTML = '<img src="assets/excluir.svg" alt="Excluir" style="width: 16px; height: 16px;" title="Excluir Usuário">';
                            btnDel.className = 'btn-excluir-porteiro';
                            btnDel.dataset.id = user.id;
                            btnDel.addEventListener('click', async (e) => {
                                const userIdToDelete = e.currentTarget.dataset.id;
                                const userName = user.nome_completo || user.nome_usuario;
                                if (confirm(`Excluir usuário ${userName}? Esta ação não pode ser desfeita.`)) {
                                    try {
                                        if (!window.electronAPI?.deleteUser) throw new Error('API deleteUser indisponível');
                                        const res = await window.electronAPI.deleteUser(userIdToDelete);
                                        if (res?.success) { showStatusMessage(res.message || 'Excluído!', 'success'); containerElement.querySelector(`tr[data-user-id="${userIdToDelete}"]`)?.remove(); }
                                        else { showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error'); }
                                    } catch (err) { showStatusMessage(`Erro: ${err.message}`, 'error'); }
                                }
                            });
                            actionsCell.appendChild(btnDel);
                        }
                    });
                    containerElement.appendChild(table);
                } else { const msg = document.createElement('p'); msg.textContent = 'Nenhum usuário cadastrado.'; msg.className = 'empty-list-message'; containerElement.appendChild(msg); }
            } else { throw new Error('Resposta inesperada (usuários).'); }
        } catch (error) { console.error('Erro buscar/exibir usuários:', error); containerElement.innerHTML = ''; const err = document.createElement('p'); err.textContent = `Erro ao carregar usuários: ${error.message}`; err.className = 'error-message'; containerElement.appendChild(err); }
    }    // Adicione esta nova função no seu renderer.js
    async function iniciarEdicaoEncomenda(packageId) {
        console.log(`[Renderer] Iniciando edição para encomenda ID: ${packageId}`);
        console.log(`[Renderer] Tipo do packageId: ${typeof packageId}`);
        
        try {
            if (!window.electronAPI?.getPackageById) {
                console.error('[Renderer] window.electronAPI.getPackageById não disponível');
                showStatusMessage('Funcionalidade de edição indisponível.', 'error');
                return;
            }
            
            console.log('[Renderer] Chamando window.electronAPI.getPackageById...');
            const response = await window.electronAPI.getPackageById(packageId);
            console.log('[Renderer] Resposta recebida:', response);
            
            if (response.success && response.data) {
                console.log('[Renderer] Dados da encomenda recebidos, abrindo modal...');
                abrirModalEncomenda(packageId, response.data); // Passa ID e dados para popular
            } else {
                console.error('[Renderer] Erro na resposta:', response);
                showStatusMessage(response.message || 'Erro ao buscar dados da encomenda.', 'error');
            }
        } catch (error) {
            console.error('Erro ao chamar getPackageById:', error);
            showStatusMessage('Erro de comunicação ao buscar encomenda.', 'error');
        }
    }

    // --- Funções para Seleção Múltipla de Encomendas ---
    let selectedPackages = [];
    let currentSelectedResident = null;

    function handlePackageSelection(event) {
        const checkbox = event.target;
        const packageId = checkbox.dataset.packageId;
        const residentId = checkbox.dataset.residentId;
        const residentName = checkbox.dataset.residentName;

        if (checkbox.checked) {
            // Verifica se é o primeiro item selecionado ou se é do mesmo morador
            if (selectedPackages.length === 0) {
                currentSelectedResident = { id: residentId, name: residentName };
                selectedPackages.push({ id: packageId, residentId, residentName });
                updateBatchDeliveryUI();
            } else if (currentSelectedResident.id === residentId) {
                // Mesmo morador, pode adicionar
                selectedPackages.push({ id: packageId, residentId, residentName });
                updateBatchDeliveryUI();
            } else {
                // Morador diferente, não permite seleção
                checkbox.checked = false;
                showStatusMessage(`Só é possível selecionar encomendas do mesmo morador (${currentSelectedResident.name}).`, 'error');
            }
        } else {
            // Remove da seleção
            selectedPackages = selectedPackages.filter(pkg => pkg.id !== packageId);
            if (selectedPackages.length === 0) {
                currentSelectedResident = null;
            }
            updateBatchDeliveryUI();
        }
    }

    function updateBatchDeliveryUI() {
        const batchContainer = document.getElementById('batch-delivery-container');
        const selectedCount = document.getElementById('selected-count');
        const selectedResidentName = document.getElementById('selected-resident-name');

        if (!batchContainer || !selectedCount || !selectedResidentName) return;

        if (selectedPackages.length > 0) {
            batchContainer.style.display = 'flex';
            selectedCount.textContent = selectedPackages.length;
            selectedResidentName.textContent = `Morador: ${currentSelectedResident.name}`;
        } else {
            batchContainer.style.display = 'none';
            selectedCount.textContent = '0';
            selectedResidentName.textContent = '';
        }
    }

    function abrirModalEntregaLote() {
        if (selectedPackages.length === 0) {
            showStatusMessage('Nenhuma encomenda selecionada.', 'error');
            return;
        }

        const packageIds = selectedPackages.map(pkg => pkg.id);
        abrirModalEntrega(packageIds, currentSelectedResident.name);
    }

    function clearPackageSelection() {
        selectedPackages = [];
        currentSelectedResident = null;
        
        // Desmarca todos os checkboxes
        const checkboxes = document.querySelectorAll('.package-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        updateBatchDeliveryUI();
    }
    // --- Fim das Funções de Seleção Múltipla ---

    function abrirModalEntrega(packageId, moradorNome) {
        // Verifica se é entrega em lote (packageId é array) ou individual
        const isMultiple = Array.isArray(packageId);
        const packageIds = isMultiple ? packageId : [packageId];
        
        console.log(`[Renderer] Abrindo modal de entrega para ${isMultiple ? 'múltiplas' : 'única'} encomenda(s):`, packageIds, `Morador: ${moradorNome}`);
        
        if (!modalEntregaEncomenda || !formEntregaEncomenda || !entregaEncomendaIdInput || !entregaMoradorInfoInput || !entregaDataInput || !entregaHoraInput || !inputEntregaPorteiro) {
            console.error("Elementos do modal de entrega não encontrados!");
            showStatusMessage("Erro ao abrir modal de entrega.", "error");
            return;
        }

        // Garante que outros modais estejam fechados (código mantido)
        if (modalCadastroEncomenda?.classList.contains('active')) fecharModalEncomenda();
        if (modalCadastroMorador?.classList.contains('active')) fecharModalMorador();
        if (modalCadastroUsuario?.classList.contains('active')) fecharModalCadastroUsuario();
        if (modalCadastroEncomenda) modalCadastroEncomenda.style.display = 'none';
        if (modalCadastroMorador) modalCadastroMorador.style.display = 'none';
        if (modalCadastroUsuario) modalCadastroUsuario.style.display = 'none';        formEntregaEncomenda.reset();
        selectedEntregaPorteiroId = null;
        if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');        // Armazena os IDs das encomendas (array JSON ou ID único)
        // Garante que os IDs sejam números inteiros
        if (isMultiple) {
            const numericIds = packageIds.map(id => parseInt(id, 10));
            entregaEncomendaIdInput.value = JSON.stringify(numericIds);
        } else {
            const numericId = parseInt(packageId, 10);
            entregaEncomendaIdInput.value = numericId.toString();
        }
        
        // Atualiza o título do modal para refletir se é entrega individual ou em lote
        const modalTitle = document.getElementById('modal-entrega-title');
        if (modalTitle) {
            modalTitle.textContent = isMultiple 
                ? `Registrar entrega em lote (${packageIds.length} encomendas)`
                : 'Registrar entrega de encomenda';
        }
        
        entregaMoradorInfoInput.value = isMultiple 
            ? `${moradorNome} (${packageIds.length} encomendas)`
            : moradorNome || 'N/A';

        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        entregaDataInput.value = `${ano}-${mes}-${dia}`;
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
       
        entregaHoraInput.value = `${hora}:${minuto}`;

        if (currentUser && inputEntregaPorteiro) {
            // Corrigido: usar o nome correto do campo do usuário
            inputEntregaPorteiro.value = currentUser.nome_completo || currentUser.name || '';
            selectedEntregaPorteiroId = currentUser.id;
        } else if (inputEntregaPorteiro) {
            inputEntregaPorteiro.value = '';
        }        modalEntregaEncomenda.style.display = 'flex';
        modalEntregaEncomenda.classList.add('active');

        // Força o reflow do navegador e garante que o modal seja renderizado
        void modalEntregaEncomenda.offsetWidth;
        
        // Pequeno delay para garantir que o modal esteja totalmente visível antes de focar
        setTimeout(() => {
            // Foca na janela principal primeiro
            if (window.electronAPI?.focusMainWindow) {
                window.electronAPI.focusMainWindow();
            }
            
            // Depois foca no campo de input
            setTimeout(() => {
                if (inputEntregaPorteiro) {
                    inputEntregaPorteiro.focus();
                    inputEntregaPorteiro.click(); // Força o cursor no campo
                    console.log("[Renderer] Foco aplicado no inputEntregaPorteiro");
                }
            }, 100);
        }, 150);
    }    function fecharModalEntrega() {
        if (modalEntregaEncomenda) {
            modalEntregaEncomenda.classList.remove('active');
            modalEntregaEncomenda.style.display = 'none';
           

            if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
            const statusMsg = document.getElementById('status-message'); // Pega msg de status global
            if (statusMsg) statusMsg.style.display = 'none'; // Esconde msg ao fechar modal
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            requestMainWindowFocus();
        }
    }
    async function handleEntregaPorterInput() {
        if (!inputEntregaPorteiro || !window.electronAPI?.searchActivePorters) return;
        const term = inputEntregaPorteiro.value;
        console.log(`[DEBUG Autocomplete Entrega] handleEntregaPorterInput called. Term: "${term}"`);
        if (term?.length >= 1) {
            try {
                console.log('[DEBUG Autocomplete Entrega] Calling API searchActivePorters...');
                const res = await window.electronAPI.searchActivePorters(term);
                console.log('[DEBUG Autocomplete Entrega] API searchActivePorters response:', res);
                displayEntregaPorterSuggestions(res);
            } catch (err) {
                console.error('[DEBUG Autocomplete Entrega] Error calling searchActivePorters:', err);
                if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
            }
        } else {
            if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
            selectedEntregaPorteiroId = null; // Limpa se o campo estiver vazio
        }
    }

    function displayEntregaPorterSuggestions(suggestions) {
        if (!suggestionsEntregaPorteiroDiv) {
            console.error("[DEBUG Autocomplete Entrega] Elemento suggestionsEntregaPorteiroDiv não encontrado!");
            return;
        }
        console.log('[DEBUG Autocomplete Entrega] displayEntregaPorterSuggestions received:', suggestions);
        suggestionsEntregaPorteiroDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach(user => { // 'user' em vez de 'p' para clareza
                try {
                    if (!user || typeof user.id === 'undefined' || typeof user.nome === 'undefined') {
                        console.warn("[DEBUG Autocomplete Entrega] Item de sugestão inválido recebido (Porteiro):", user);
                        return;
                    }
                    const div = document.createElement('div');
                    div.textContent = user.nome;
                    div.className = 'suggestion-item';
                    div.dataset.id = user.id;
                    div.dataset.name = user.nome;
                    div.addEventListener('click', () => {
                        if (inputEntregaPorteiro) inputEntregaPorteiro.value = user.nome;
                        selectedEntregaPorteiroId = user.id;
                        console.log(`Porteiro da Entrega selecionado: ${user.nome} (User ID: ${user.id})`);
                        suggestionsEntregaPorteiroDiv.classList.remove('visible');
                        suggestionsEntregaPorteiroDiv.innerHTML = '';
                    });
                    suggestionsEntregaPorteiroDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[DEBUG Autocomplete Entrega] Erro dentro do loop displayEntregaPorterSuggestions:", loopError, "Item:", user);
                }
            });

            if (suggestionsEntregaPorteiroDiv.children.length > 0) {
                suggestionsEntregaPorteiroDiv.classList.add('visible');
                console.log('[DEBUG Autocomplete Entrega] Entrega Porter suggestions displayed (com itens no DOM).');
            } else {
                suggestionsEntregaPorteiroDiv.classList.remove('visible');
                console.log('[DEBUG Autocomplete Entrega] Nenhum item de sugestão de porteiro (entrega) foi adicionado ao DOM.');
            }
        } else {
            suggestionsEntregaPorteiroDiv.classList.remove('visible');
            console.log('[DEBUG Autocomplete Entrega] No Entrega Porter suggestions to display.');
        }
    }

    // Adicione estes listeners na seção "Ouvintes de Evento Globais",
    // perto dos outros listeners de autocomplete
    if (inputEntregaPorteiro) {
        inputEntregaPorteiro.addEventListener('input', handleEntregaPorterInput);
        inputEntregaPorteiro.addEventListener('blur', () => {
            setTimeout(() => {
                // Apenas esconde se o foco não foi para um item da própria lista.
                // A seleção do item já esconde a lista.
                const focusedElement = document.activeElement;
                if (!focusedElement || !focusedElement.closest('#entrega-porteiro-suggestions .suggestion-item')) {
                    if (suggestionsEntregaPorteiroDiv) suggestionsEntregaPorteiroDiv.classList.remove('visible');
                }
            }, 200);
        });
    }
    // --- Ouvintes de Evento Globais ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput?.value?.trim();
            const password = passwordInput?.value;

            if (!username || !password) {
                showLoginError('Por favor, preencha todos os campos.');
                return;
            }

            try {
                if (!window.electronAPI?.loginUser) {
                    showLoginError('Erro: API de login não disponível.');
                    return;
                }

                const result = await window.electronAPI.loginUser({ username, password });
                
                if (result.success && result.user) {
                    console.log('[Renderer] Login bem-sucedido:', result.user);
                    currentUser = result.user;
                    showAppScreen();
                    showStatusMessage(`Bem-vindo, ${result.user.name}!`, 'success');
                } else {
                    showLoginError(result.message || 'Erro ao fazer login.');
                }
            } catch (error) {
                console.error('[Renderer] Erro no login:', error);
                showLoginError('Erro interno. Verifique a configuração do banco.');
            }
        });    }

    // Event listener para o formulário de encomendas
    if (formCadastroEncomenda) {
        formCadastroEncomenda.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[Form Submit] Formulário de encomenda enviado');
            
            // Verificar se estamos em modo de edição ou cadastro
            const hiddenEncomendaIdInput = document.getElementById('encomenda-id');
            const encomendaId = hiddenEncomendaIdInput?.value?.trim();
            const isEditMode = encomendaId && encomendaId !== '';
            
            console.log(`[Form Submit] Modo: ${isEditMode ? 'Edição' : 'Cadastro'}, ID: ${encomendaId || 'N/A'}`);
            
            // Coletar dados do formulário
            const formData = new FormData(formCadastroEncomenda);
            const moradorValue = formData.get('morador')?.toString().trim();
            const porteiroValue = formData.get('porteiro')?.toString().trim();
            const quantidade = parseInt(formData.get('quantidade')?.toString() || '1', 10);
            const data = formData.get('data')?.toString();
            const hora = formData.get('hora')?.toString();
            const observacoes = formData.get('observacoes')?.toString().trim();
            
            // Validação básica
            if (!moradorValue || !porteiroValue || !data || !hora || quantidade < 1) {
                showStatusMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }
            
            if (!selectedMoradorId) {
                showStatusMessage('Por favor, selecione um morador válido da lista de sugestões.', 'error');
                if (inputMorador) {
                    inputMorador.focus();
                    inputMorador.style.borderColor = '#f44336';
                    setTimeout(() => {
                        inputMorador.style.borderColor = '';
                    }, 3000);
                }
                return;
            }
            
            if (!selectedPorteiroUserId) {
                showStatusMessage('Por favor, selecione um porteiro válido da lista de sugestões.', 'error');
                if (inputPorteiro) {
                    inputPorteiro.focus();
                    inputPorteiro.style.borderColor = '#f44336';
                    setTimeout(() => {
                        inputPorteiro.style.borderColor = '';
                    }, 3000);
                }
                return;
            }
            
            // Montar objeto de dados
            const packageData = {
                moradorId: selectedMoradorId,
                porteiroUserId: selectedPorteiroUserId,
                quantidade: quantidade,
                dataRecebimento: `${data} ${hora}`,
                observacoes: observacoes || null
            };
            
            console.log('[Form Submit] Dados coletados:', packageData);
            
            try {
                let result;
                
                if (isEditMode) {
                    // Modo edição - chama updatePackage
                    console.log('[Form Submit] Chamando updatePackage...');
                    if (!window.electronAPI?.updatePackage) {
                        throw new Error('API updatePackage não disponível');
                    }
                    result = await window.electronAPI.updatePackage(encomendaId, packageData);
                } else {
                    // Modo cadastro - chama savePackage
                    console.log('[Form Submit] Chamando savePackage...');
                    if (!window.electronAPI?.savePackage) {
                        throw new Error('API savePackage não disponível');
                    }
                    result = await window.electronAPI.savePackage(packageData);
                }
                
                console.log('[Form Submit] Resultado:', result);
                
                if (result?.success) {
                    const message = isEditMode ? 'Encomenda atualizada com sucesso!' : 'Encomenda cadastrada com sucesso!';
                    showStatusMessage(message, 'success');
                    fecharModalEncomenda();
                    
                    // Recarregar lista de encomendas se estivermos na tela de encomendas
                    const encomendasContent = document.getElementById('encomendas-content');
                    if (encomendasContent && encomendasContent.style.display !== 'none') {
                        const sectionContent = encomendasContent.querySelector('.section-content');
                        if (sectionContent) {
                            buscarEExibirEncomendas(sectionContent);
                        }
                    }
                } else {
                    const errorMessage = result?.message || 'Erro desconhecido ao processar encomenda';
                    showStatusMessage(errorMessage, 'error');
                }
                
            } catch (error) {
                console.error('[Form Submit] Erro:', error);
                showStatusMessage(`Erro ao processar encomenda: ${error.message}`, 'error');
            }        });
    }    // Event listener para o formulário de entrega
    if (formEntregaEncomenda) {
        formEntregaEncomenda.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[Form Submit] Formulário de entrega enviado');
            
            try {
                // Coletar dados do formulário
                const formData = new FormData(formEntregaEncomenda);
                const packageIds = entregaEncomendaIdInput?.value?.trim();
                const porteiroEntrega = formData.get('entregaPorteiro')?.toString().trim();
                const dataEntrega = formData.get('entregaData')?.toString();
                const horaEntrega = formData.get('entregaHora')?.toString();
                const retiradoPor = formData.get('entregaRetiradoPor')?.toString().trim();
                const observacoesEntrega = formData.get('entregaObservacoes')?.toString().trim();
                
                console.log('[Form Submit] Dados coletados:', {
                    packageIds,
                    porteiroEntrega,
                    dataEntrega,
                    horaEntrega,
                    retiradoPor,
                    observacoesEntrega,
                    selectedEntregaPorteiroId
                });
                
                // Validação básica
                if (!packageIds || !porteiroEntrega || !dataEntrega || !horaEntrega) {
                    showStatusMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
                    return;
                }
                
                // Se não há selectedEntregaPorteiroId, tentar buscar o porteiro pelo nome
                let porteiroId = selectedEntregaPorteiroId;
                if (!porteiroId && porteiroEntrega) {
                    console.log('[Form Submit] Tentando buscar porteiro pelo nome:', porteiroEntrega);
                    try {
                        const searchResult = await window.electronAPI.searchActivePorters(porteiroEntrega);
                        const porteiroEncontrado = searchResult?.find(p => 
                            p.nome?.toLowerCase() === porteiroEntrega.toLowerCase()
                        );
                        if (porteiroEncontrado) {
                            porteiroId = porteiroEncontrado.id;
                            console.log('[Form Submit] Porteiro encontrado pelo nome:', porteiroEncontrado);
                        }
                    } catch (error) {
                        console.error('[Form Submit] Erro ao buscar porteiro:', error);
                    }
                }
                  if (!porteiroId) {
                    showStatusMessage('Por favor, selecione um porteiro válido da lista ou verifique se o nome está correto.', 'error');
                    return;
                }
                
                // Montar objeto de dados para entrega com o porteiroId validado
                const deliveryData = {
                    porteiroEntregouId: porteiroId,
                    dataEntrega: `${dataEntrega} ${horaEntrega}`,
                    retiradoPorNome: retiradoPor || null,
                    observacoesEntrega: observacoesEntrega || null
                };
                
                console.log('[Form Submit] Dados de entrega montados:', deliveryData);
                  // Verificar se é entrega múltipla ou individual
                let isMultiple = false;
                let packageIdsList = [];
                try {
                    packageIdsList = JSON.parse(packageIds);
                    isMultiple = Array.isArray(packageIdsList);
                    // Garante que os IDs sejam números inteiros
                    packageIdsList = packageIdsList.map(id => parseInt(id, 10));
                } catch {
                    // Se não é JSON, é um ID único - converte para número
                    const singleId = parseInt(packageIds, 10);
                    if (isNaN(singleId)) {
                        throw new Error('ID da encomenda inválido');
                    }
                    packageIdsList = [singleId];
                    isMultiple = false;
                }
                
                console.log('[Form Submit] PackageIds processados:', {
                    original: packageIds,
                    processed: packageIdsList,
                    isMultiple
                });
                
                let result;
                  if (isMultiple) {
                    // Entrega em lote - processar cada encomenda individualmente
                    console.log('[Form Submit] Processando entrega em lote...');
                    console.log('[Form Submit] IDs para entrega em lote:', packageIdsList);
                    
                    const deliveryPromises = packageIdsList.map((packageId, index) => {
                        console.log(`[Form Submit] Enviando entrega ${index + 1}: ID ${packageId}, tipo: ${typeof packageId}`);
                        return window.electronAPI.deliverPackage(packageId, deliveryData);
                    });
                    
                    const results = await Promise.all(deliveryPromises);
                    console.log('[Form Submit] Resultados da entrega em lote:', results);
                    
                    const allSuccessful = results.every(res => res?.success);
                    
                    if (allSuccessful) {
                        result = { success: true, message: `${packageIdsList.length} encomendas entregues com sucesso!` };
                    } else {
                        const failedCount = results.filter(res => !res?.success).length;
                        const failedMessages = results.filter(res => !res?.success).map(res => res?.message).join('; ');
                        result = { 
                            success: false, 
                            message: `Erro: ${failedCount} de ${packageIdsList.length} entregas falharam. Detalhes: ${failedMessages}` 
                        };
                    }
                } else {
                    // Entrega individual
                    console.log('[Form Submit] Processando entrega individual...');
                    console.log('[Form Submit] ID para entrega individual:', packageIdsList[0], 'tipo:', typeof packageIdsList[0]);
                    
                    if (!window.electronAPI?.deliverPackage) {
                        throw new Error('API de entrega não disponível.');
                    }
                    result = await window.electronAPI.deliverPackage(packageIdsList[0], deliveryData);
                    console.log('[Form Submit] Resultado da entrega individual:', result);
                }
                  if (result?.success) {
                    showStatusMessage(result.message || 'Entrega registrada com sucesso!', 'success');
                    fecharModalEntrega();
                    
                    // Limpar seleção em lote se existir
                    if (isMultiple) {
                        clearPackageSelection();
                    }
                    
                    // Recarregar a lista de encomendas se estivermos na tela de encomendas
                    if (document.querySelector('.main-content h1')?.textContent?.includes('Encomendas')) {
                        const container = document.querySelector('.main-content > div:last-child');
                        if (container) {
                            container.innerHTML = '<p style="text-align: center; color: #666;">Carregando...</p>';
                            await buscarEExibirEncomendas(container);
                        }
                    }
                } else {
                    const errorMessage = result?.message || 'Erro desconhecido ao registrar entrega';
                    showStatusMessage(errorMessage, 'error');
                }
                
            } catch (error) {
                console.error('[Form Submit] Erro na entrega:', error);
                showStatusMessage(`Erro ao registrar entrega: ${error.message}`, 'error');
            }        });
    }

    // Event listener para o formulário de cadastro de morador
    if (formCadastroMorador) {
        formCadastroMorador.addEventListener('submit', async (e) => {
            e.preventDefault();
            const moradorId = document.getElementById('morador-id')?.value?.trim();
            const nome = document.getElementById('morador-nome')?.value?.trim();
            const telefone = document.getElementById('morador-telefone')?.value?.trim();
            const rua = document.getElementById('morador-rua')?.value?.trim();
            const numero = document.getElementById('morador-numero')?.value?.trim();
            const bloco = document.getElementById('morador-bloco')?.value?.trim();
            const apartamento = document.getElementById('morador-apartamento')?.value?.trim();
            const observacoes = document.getElementById('morador-observacoes')?.value?.trim();

            if (!nome || !rua || !numero || !apartamento) {
                showStatusMessage('Preencha todos os campos obrigatórios.', 'error');
                return;
            }

            try {
                let result;
                if (moradorId) {
                    // Edição
                    if (!window.electronAPI?.updateResident) throw new Error('API updateResident não disponível');
                    result = await window.electronAPI.updateResident(moradorId, { nome, telefone, rua, numero, bloco, apartamento, observacoes });
                } else {
                    // Cadastro
                    if (!window.electronAPI?.saveResident) throw new Error('API saveResident não disponível');
                    result = await window.electronAPI.saveResident({ nome, telefone, rua, numero, bloco, apartamento, observacoes });
                }
                if (result?.success) {
                    showStatusMessage(result.message || 'Morador salvo com sucesso!', 'success');
                    fecharModalMorador();
                    // Atualiza lista de moradores se estiver visível
                    const moradoresContent = document.getElementById('moradores-content');
                    if (moradoresContent && moradoresContent.style.display !== 'none') {
                        buscarEExibirMoradores(moradoresContent);
                    }
                } else {
                    showStatusMessage(result?.message || 'Erro ao salvar morador.', 'error');
                }
            } catch (error) {
                console.error('[Form Submit] Erro ao salvar morador:', error);
                showStatusMessage('Erro ao salvar morador: ' + error.message, 'error');
            }        });
    }

    // Event listener para o formulário de cadastro de usuário
    if (formCadastroUsuario) {
        formCadastroUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[Form Submit] Formulário de usuário enviado');
            
            const usuarioId = document.getElementById('usuario-id')?.value?.trim();
            const nome = document.getElementById('usuario-nome')?.value?.trim();
            const email = document.getElementById('usuario-email')?.value?.trim();
            const senha = document.getElementById('usuario-senha')?.value;
            const senhaConfirm = document.getElementById('usuario-senha-confirm')?.value;
            const nivelAcesso = document.getElementById('usuario-nivel-acesso')?.value || 'porteiro';
            const status = document.getElementById('usuario-status')?.value || 'Ativo';            // Validação básica
            if (!nome) {
                showStatusMessage('Por favor, preencha o nome de usuário.', 'error');
                return;
            }

            // Validação de senha para novo usuário ou quando senha é fornecida
            if (!usuarioId || senha) { // Novo usuário ou alteração de senha
                if (!senha || senha.length < 6) {
                    showStatusMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
                    return;
                }
                if (senha !== senhaConfirm) {
                    showStatusMessage('As senhas não coincidem.', 'error');
                    return;
                }
            }

            try {
                let result;
                  if (usuarioId) {
                    // Edição
                    console.log('[Form Submit] Editando usuário ID:', usuarioId);
                    if (!window.electronAPI?.updateUser) throw new Error('API updateUser não disponível');
                    
                    const updateData = { 
                        nomeUsuario: nome, 
                        nomeCompleto: nome, 
                        email, 
                        nivelAcesso, 
                        status 
                    };
                    if (senha) { // Só inclui senha se foi fornecida
                        updateData.senha = senha;
                    }
                    
                    result = await window.electronAPI.updateUser(usuarioId, updateData);
                } else {                    // Cadastro
                    console.log('[Form Submit] Cadastrando novo usuário');
                    if (!window.electronAPI?.saveUser) throw new Error('API saveUser não disponível');
                    result = await window.electronAPI.saveUser({ 
                        nomeUsuario: nome, 
                        nomeCompleto: nome, 
                        email, 
                        senha, 
                        nivelAcesso 
                    });
                }
                
                console.log('[Form Submit] Resultado do salvamento:', result);
                
                if (result?.success) {
                    const message = usuarioId ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!';
                    showStatusMessage(message, 'success');
                    fecharModalCadastroUsuario();
                    
                    // Atualiza lista de usuários se estiver visível
                    const usuariosContent = document.getElementById('lista-usuarios-container');
                    if (usuariosContent) {
                        buscarEExibirUsuarios(usuariosContent);
                    }
                } else {
                    showStatusMessage(result?.message || 'Erro ao salvar usuário.', 'error');
                }
            } catch (error) {
                console.error('[Form Submit] Erro ao salvar usuário:', error);
                showStatusMessage('Erro ao salvar usuário: ' + error.message, 'error');
            }
        });
    }

        // Fechar popup ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#topbar-search-bar')) {
                document.getElementById('popup-encomendas')?.remove();
            }
        });
        
        console.log('[Renderer] Event listeners da pesquisa configurados');
    
    error => {
        console.warn('[Renderer] Campo de pesquisa não encontrado');                               
    }

    // --- Inicialização dos Gráficos do Dashboard ---
    // Apenas para garantir que a função existe antes de chamar
    if (typeof inicializarGraficos === 'function') 
        {
        inicializarGraficos();
    } else {
        console.warn('Função inicializarGraficos não encontrada');
    }


// Função para inicializar os gráficos do dashboard com dados reais
async function inicializarGraficos() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não está carregado. Certifique-se de incluir Chart.js no seu index.html.');
        return;
    }

    // Busca dados raw do backend para aplicar a mesma lógica do card "encomendas pendentes"
    let rawData = null;
    if (window.electronAPI?.getDashboardChartRawData) {
        try {
            console.log('[RENDERER] Buscando dados raw dos gráficos...');
            rawData = await window.electronAPI.getDashboardChartRawData();
            console.log('[RENDERER] Dados raw recebidos:', rawData);
        } catch (err) {
            console.error('Erro ao buscar dados raw dos gráficos:', err);
        }
    } else {
        console.warn('[RENDERER] API getDashboardChartRawData não disponível');
    }    // --- GRÁFICO DE ENCOMENDAS POR DIA (ÚLTIMOS 15 DIAS) ---
    const ctxDia = document.getElementById('chartEncomendasPorDia');
    if (ctxDia) {
        if (window.chartEncomendasPorDiaInstance) window.chartEncomendasPorDiaInstance.destroy();

        // Gera os últimos 15 dias (YYYY-MM-DD)
        const hoje = new Date();
        const dias = [];
        for (let i = 14; i >= 0; i--) {
            const d = new Date(hoje);
            d.setDate(hoje.getDate() - i);
            dias.push(d.toISOString().slice(0, 10));
        }
        // Labels para o gráfico
        const labels = dias.map(d => {
            const dt = new Date(d);
            return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });
        // Inicializa contagem zerada
        const data = dias.map(() => 0);
        // Preenche com dados reais
        if (rawData && Array.isArray(rawData.encomendasPorDiaRaw)) {
            rawData.encomendasPorDiaRaw.forEach(e => {
                // Agora conta todas as encomendas, independente do status
                let dia = e.dia;
                if (!(typeof dia === 'string' && dia.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/))) {
                    const d = new Date(e.data_recebimento);
                    dia = d.toISOString().slice(0, 10);
                }
                const idx = dias.indexOf(dia);
                if (idx !== -1) {
                    data[idx] += (parseInt(e.quantidade, 10) || 1);
                }
            });
        }
        window.chartEncomendasPorDiaInstance = new Chart(ctxDia, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Recebidas',
                    data,
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'Dia' } },
                    y: { title: { display: true, text: 'Encomendas' }, beginAtZero: true }
                }
            }
        });
    }

    // --- GRÁFICO DE ENCOMENDAS POR MÊS (ÚLTIMOS 12 MESES) ---
    const ctxMes = document.getElementById('chartEncomendasPorMes');
    if (ctxMes) {
        if (window.chartEncomendasPorMesInstance) window.chartEncomendasPorMesInstance.destroy();

        // Gera os últimos 12 meses (YYYY-MM)
        const hoje = new Date();
        const meses = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(hoje);
            d.setMonth(hoje.getMonth() - i);
            const mes = d.toISOString().slice(0, 7); // YYYY-MM
            meses.push(mes);
        }
        // Labels para o gráfico
        const labels = meses.map(m => {
            const [ano, mes] = m.split('-');
            return `${mes}/${ano.slice(2)}`;
        });
        // Inicializa contagem zerada
        const data = meses.map(() => 0);
        // Preenche com dados reais
        if (rawData && Array.isArray(rawData.encomendasPorMesRaw)) {
            rawData.encomendasPorMesRaw.forEach(e => {
                // Agora conta todas as encomendas, independente do status
                let mes = e.mes;
                if (!(typeof mes === 'string' && mes.match(/^[0-9]{4}-[0-9]{2}$/))) {
                    const d = new Date(e.data_recebimento);
                    mes = d.toISOString().slice(0, 7);
                }
                const idx = meses.indexOf(mes);
                if (idx !== -1) {
                    data[idx] += (parseInt(e.quantidade, 10) || 1);
                }
            });
        }
        window.chartEncomendasPorMesInstance = new Chart(ctxMes, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Total por mês',
                    data,
                    backgroundColor: '#0288d1',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'Mês' } },
                    y: { title: { display: true, text: 'Encomendas' }, beginAtZero: true }
                }
            }
        });
    }
}

// Funções auxiliares para gerar dados fictícios
function gerarUltimosDiasLabels(qtd) {
    const labels = [];
    const hoje = new Date();
    for (let i = qtd - 1; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - i);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    }
    return labels;
}
function gerarUltimosMesesLabels(qtd) {
    const labels = [];
    const hoje = new Date();
    for (let i = qtd - 1; i >= 0; i--) {
        const d = new Date(hoje);
        d.setMonth(hoje.getMonth() - i);
        labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
    }
    return labels;
}
function gerarDadosAleatorios(qtd, min, max) {
    return Array.from({ length: qtd }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

// Função para carregar o Dashboard - RESTAURADA
async function carregarDashboard(container) {
    console.log('[Dashboard] Carregando dashboard...');
    
    // Header do Dashboard
    const headerSection = document.createElement('div');
    headerSection.className = 'dashboard-header-section';
    headerSection.innerHTML = `
        <h1 class="dashboard-title">Dashboard</h1>
        <p class="dashboard-subtitle">Visão geral do sistema de controle de encomendas</p>
    `;
    container.appendChild(headerSection);

    // Grid de cards
    const gridContainer = document.createElement('div');
    gridContainer.className = 'dashboard-grid';
    container.appendChild(gridContainer);

    // Cards iniciais (serão atualizados com dados reais)
    const cardsData = [
        { id: 'moradores', title: 'Total de', subtitle: 'Moradores', number: '0', icon: 'moradores.svg' },
        { id: 'pendentes', title: 'Encomendas', subtitle: 'Pendentes', number: '0', icon: 'encomendas.svg' },
        { id: 'antigas', title: 'Encomendas', subtitle: 'Antigas (7+ dias)', number: '0', icon: 'criticas.svg' },
        { id: 'criticas', title: 'Encomendas', subtitle: 'Críticas (15+ dias)', number: '0', icon: 'antigas.svg' }
    ];

    cardsData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = `dashboard-card card-${card.id}`;
        cardElement.innerHTML = `
            <div class="card-content">
                <div class="card-icon">
                    <img src="./assets/${card.icon}" alt="${card.title}">
                </div>
                <div class="card-number" id="card-${card.id}-number">${card.number}</div>
                <div class="card-title">${card.title}</div>
                <div class="card-subtitle">${card.subtitle}</div>
            </div>
        `;
        gridContainer.appendChild(cardElement);
    });

    // Seção de gráficos
    const chartsSection = document.createElement('div');
    chartsSection.className = 'dashboard-charts-section';
    chartsSection.innerHTML = `
        <div class="charts-grid">
            <div class="chart-container">
                <h3 class="chart-title">Encomendas Recebidas (Últimos 15 dias)</h3>
                <div class="chart-wrapper">
                    <canvas id="chartEncomendasPorDia"></canvas>
                </div>
            </div>
            <div class="chart-container">
                <h3 class="chart-title">Encomendas por Mês (Últimos 12 meses)</h3>
                <div class="chart-wrapper">
                    <canvas id="chartEncomendasPorMes"></canvas>
                </div>
            </div>
        </div>
    `;
    container.appendChild(chartsSection);

    // Carregar dados
    await carregarDadosDashboard();
    await inicializarGraficos(); // Usar a função que já existia
}

// Função para carregar dados dos cards do dashboard - SIMPLIFICADA
async function carregarDadosDashboard() {
    console.log('[Dashboard] Carregando dados dos cards...');
    
    try {
        // Buscar dados dos moradores
        if (window.electronAPI?.getResidents) {
            const moradores = await window.electronAPI.getResidents();
            const totalMoradoresEl = document.getElementById('card-moradores-number');
            if (totalMoradoresEl) totalMoradoresEl.textContent = moradores?.length || '0';
        }

        // Buscar encomendas pendentes
        if (window.electronAPI?.getPendingPackages) {
            const encomendas = await window.electronAPI.getPendingPackages();
            const encomendasPendentesEl = document.getElementById('card-pendentes-number');
            if (encomendasPendentesEl) {
                const total = encomendas.reduce((acc, enc) => {
                    return acc + (parseInt(enc.quantidade, 10) || 1);
                }, 0);
                encomendasPendentesEl.textContent = total || '0';
            }

            // Calcular encomendas antigas (7+ dias) e críticas (15+ dias)
            const agora = new Date();
            let antigas = 0;
            let criticas = 0;

            encomendas.forEach(enc => {
                const dataRecebimento = new Date(enc.data_recebimento);
                const diasDiferenca = Math.floor((agora - dataRecebimento) / (1000 * 60 * 60 * 24));
                const quantidade = parseInt(enc.quantidade, 10) || 1;
                
                if (diasDiferenca >= 15) {
                    criticas += quantidade;
                } else if (diasDiferenca >= 7) {
                    antigas += quantidade;
                }
            });

            const encomendasAntigasEl = document.getElementById('card-antigas-number');
            const encomendasCriticasEl = document.getElementById('card-criticas-number');
            if (encomendasAntigasEl) encomendasAntigasEl.textContent = antigas;
            if (encomendasCriticasEl) encomendasCriticasEl.textContent = criticas;
        }
    } catch (error) {
        console.error('[Dashboard] Erro ao carregar dados:', error);
    }
}
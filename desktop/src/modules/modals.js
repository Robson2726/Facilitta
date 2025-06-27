// --- src/modules/modals.js ---
// Gerenciador de Modais

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        // Removido: this.setupGlobalListeners();
    }

    openModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} não encontrado`);
            return false;
        }

        // Fechar modal ativo se houver
        if (this.activeModal) {
            this.closeActiveModal();
        }

        // Configurar modal
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        if (options.zIndex) {
            modal.style.zIndex = options.zIndex;
        }

        this.activeModal = modal;

        // Focar no primeiro input se especificado
        if (options.focusSelector) {
            setTimeout(() => {
                const focusElement = modal.querySelector(options.focusSelector);
                if (focusElement) focusElement.focus();
            }, 200);
        }

        return true;
    }

    closeActiveModal() {
        if (this.activeModal) {
            this.activeModal.classList.remove('active');
            this.activeModal.style.display = 'none';
            this.activeModal.style.zIndex = '';
            this.activeModal = null;

            // Limpar foco
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            // Focar na janela principal
            this.requestMainWindowFocus();
        }
    }

    requestMainWindowFocus() {
        setTimeout(() => {
            try {
                if (window.electronAPI?.focusMainWindow) {
                    window.electronAPI.focusMainWindow();
                }
            } catch (error) {
                console.error('Erro focar janela:', error);
            }
        }, 50);
    }

    // Métodos específicos para cada modal
    openEncomendaModal(encomendaId = null, packageDataToEdit = null) {
        console.log(`Abrindo Modal Encomenda. ID: ${encomendaId || 'N/A'}`);
        
        const modalId = 'modal-cadastro-encomenda';
        const success = this.openModal(modalId, {
            zIndex: '1001',
            focusSelector: '#morador'
        });

        if (success) {
            this.setupEncomendaModal(encomendaId, packageDataToEdit);
        }
    }

    setupEncomendaModal(encomendaId, packageDataToEdit) {
        const form = document.getElementById('form-cadastro-encomenda');
        const title = document.getElementById('modal-encomenda-title');
        const btn = document.getElementById('btn-salvar-encomenda');
        const hiddenIdInput = document.getElementById('encomenda-id');

        if (form) form.reset();

        // Limpar seleções
        window.selectedMoradorId = null;
        window.selectedPorteiroUserId = null;

        // Limpar campos de autocomplete
        const inputMorador = document.getElementById('morador');
        const inputPorteiro = document.getElementById('porteiro');
        const suggestionsMoradorDiv = document.getElementById('morador-suggestions');
        const suggestionsPorteiroDiv = document.getElementById('porteiro-suggestions');

        if (inputMorador) inputMorador.value = '';
        if (inputPorteiro) inputPorteiro.value = '';
        if (suggestionsMoradorDiv) suggestionsMoradorDiv.classList.remove('visible');
        if (suggestionsPorteiroDiv) suggestionsPorteiroDiv.classList.remove('visible');

        if (packageDataToEdit && encomendaId) {
            // Modo edição
            if (title) title.textContent = 'Editar Encomenda';
            if (btn) btn.textContent = 'Salvar Alterações';
            if (hiddenIdInput) hiddenIdInput.value = encomendaId;

            // Popular campos
            this.populateEncomendaFields(packageDataToEdit);
        } else {
            // Modo cadastro
            if (title) title.textContent = 'Cadastrar Nova Encomenda';
            if (btn) btn.textContent = 'Salvar Encomenda';
            if (hiddenIdInput) hiddenIdInput.value = '';
            this.preencherDataHoraAtual();
        }
    }

    populateEncomendaFields(data) {
        const inputMorador = document.getElementById('morador');
        const inputPorteiro = document.getElementById('porteiro');
        const qtdInput = document.getElementById('quantidade');
        const obsInput = document.getElementById('observacoes');
        const dataInput = document.getElementById('data');
        const horaInput = document.getElementById('hora');

        if (inputMorador && data.morador_nome) inputMorador.value = data.morador_nome;
        window.selectedMoradorId = data.morador_id;

        if (inputPorteiro && data.porteiro_nome) inputPorteiro.value = data.porteiro_nome;
        window.selectedPorteiroUserId = data.porteiro_recebeu_id;

        if (qtdInput) qtdInput.value = data.quantidade || 1;
        if (obsInput) obsInput.value = data.observacoes || '';

        if (dataInput && data.data_recebimento_date) dataInput.value = data.data_recebimento_date;
        if (horaInput && data.data_recebimento_time) horaInput.value = data.data_recebimento_time;
    }

    preencherDataHoraAtual() {
        const agora = new Date();
        const d = document.getElementById('data');
        const h = document.getElementById('hora');
        
        const a = agora.getFullYear();
        const m = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const df = `${a}-${m}-${dia}`;
        
        const hora = String(agora.getHours()).padStart(2, '0');
        const min = String(agora.getMinutes()).padStart(2, '0');
        const hf = `${hora}:${min}`;
        
        if (d) d.value = df;
        if (h) h.value = hf;
    }

    openMoradorModal(residentId = null) {
        console.log(`Abrindo Modal Morador. ID: ${residentId}`);
        
        const modalId = 'modal-cadastro-morador';
        const success = this.openModal(modalId, {
            zIndex: '1001',
            focusSelector: '#morador-nome'
        });

        if (success) {
            this.setupMoradorModal(residentId);
        }
    }

    async setupMoradorModal(residentId) {
        const form = document.getElementById('form-cadastro-morador');
        const title = document.getElementById('modal-morador-title');
        const btn = document.getElementById('btn-salvar-morador');
        const mid = document.getElementById('morador-id');

        if (form) form.reset();
        if (mid) mid.value = '';

        if (residentId) {
            // Modo edição
            if (title) title.textContent = 'Editar Morador';
            if (btn) btn.textContent = 'Salvar Alterações';
            if (mid) mid.value = residentId;

            try {
                const m = await window.electronAPI.getResidentById(residentId);
                if (m) {
                    this.populateMoradorFields(m);
                } else {
                    this.showStatusMessage(`Erro: Morador ID ${residentId} não encontrado.`, 'error');
                    this.closeActiveModal();
                }
            } catch (error) {
                this.showStatusMessage(`Erro: ${error.message}`, 'error');
                this.closeActiveModal();
            }
        } else {
            // Modo cadastro
            if (title) title.textContent = 'Cadastrar novo morador';
            if (btn) btn.textContent = 'Salvar Morador';
        }
    }

    populateMoradorFields(morador) {
        const nomeInput = document.getElementById('morador-nome');
        if (nomeInput) nomeInput.value = morador.nome || '';
        
        document.getElementById('morador-telefone').value = morador.telefone || '';
        document.getElementById('morador-rua').value = morador.rua || '';
        document.getElementById('morador-numero').value = morador.numero || '';
        document.getElementById('morador-bloco').value = morador.bloco || '';
        document.getElementById('morador-apartamento').value = morador.apartamento || '';
        document.getElementById('morador-observacoes').value = morador.observacoes || '';
    }

    openUsuarioModal(userId = null) {
        console.log(`Abrindo Modal Usuário. ID: ${userId || 'N/A'}`);
        
        const modalId = 'modal-cadastro-usuario';
        const success = this.openModal(modalId, {
            zIndex: '1001',
            focusSelector: '#usuario-nome'
        });

        if (success) {
            this.setupUsuarioModal(userId);
        }
    }

    async setupUsuarioModal(userId) {
        const form = document.getElementById('form-cadastro-usuario');
        const title = document.getElementById('modal-usuario-title');
        const btn = document.getElementById('btn-salvar-usuario');
        const usuarioIdInput = document.getElementById('usuario-id');

        if (form) form.reset();
        if (usuarioIdInput) usuarioIdInput.value = '';

        if (userId) {
            // Modo edição
            if (title) title.textContent = 'Editar Usuário';
            if (btn) btn.textContent = 'Salvar Alterações';
            if (usuarioIdInput) usuarioIdInput.value = userId;

            // Configurar campos de senha
            const senhaInput = document.getElementById('usuario-senha');
            const senhaConfirmInput = document.getElementById('usuario-senha-confirm');
            
            if (senhaInput) {
                senhaInput.required = false;
                senhaInput.placeholder = 'Deixe em branco para não alterar';
            }
            if (senhaConfirmInput) {
                senhaConfirmInput.required = false;
                senhaConfirmInput.placeholder = 'Deixe em branco para não alterar';
            }

            // Configurar visibilidade dos grupos
            const isAdminEditing = window.authManager?.isAdmin();
            const nivelAcessoGroup = document.getElementById('grupo-nivel-acesso');
            const statusGroup = document.getElementById('grupo-status');

            if (nivelAcessoGroup) nivelAcessoGroup.style.display = isAdminEditing ? 'block' : 'none';
            if (statusGroup) statusGroup.style.display = isAdminEditing ? 'block' : 'none';

            // Carregar dados do usuário
            setTimeout(async () => {
                try {
                    const userData = await window.electronAPI.getUserById(userId);
                    if (userData) {
                        this.populateUsuarioFields(userData);
                    } else {
                        this.showStatusMessage(`Erro: Usuário ID ${userId} não encontrado.`, 'error');
                        this.closeActiveModal();
                    }
                } catch (error) {
                    this.showStatusMessage(`Erro ao buscar dados: ${error.message}`, 'error');
                    this.closeActiveModal();
                }
            }, 50);
        } else {
            // Modo cadastro
            if (title) title.textContent = 'Cadastrar Novo Usuário';
            if (btn) btn.textContent = 'Salvar Usuário';
            
            const senhaInput = document.getElementById('usuario-senha');
            const senhaConfirmInput = document.getElementById('usuario-senha-confirm');
            
            if (senhaInput) senhaInput.required = true;
            if (senhaConfirmInput) senhaConfirmInput.required = true;

            const nivelAcessoGroup = document.getElementById('grupo-nivel-acesso');
            const statusGroup = document.getElementById('grupo-status');
            
            if (nivelAcessoGroup) nivelAcessoGroup.style.display = 'none';
            if (statusGroup) statusGroup.style.display = 'none';
        }
    }

    populateUsuarioFields(userData) {
        const nomeUsuarioInput = document.getElementById('usuario-nome');
        const emailInput = document.getElementById('usuario-email');
        const nivelAcessoSelect = document.getElementById('usuario-nivel-acesso');
        const statusSelect = document.getElementById('usuario-status');

        if (nomeUsuarioInput) nomeUsuarioInput.value = userData.nome_usuario || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (nivelAcessoSelect) nivelAcessoSelect.value = userData.nivel_acesso || 'porteiro';
        if (statusSelect) statusSelect.value = userData.status || 'Ativo';
    }

    openEntregaModal(packageId, moradorNome) {
        const isMultiple = Array.isArray(packageId);
        const packageIds = isMultiple ? packageId : [packageId];
        
        console.log(`Abrindo modal de entrega para ${isMultiple ? 'múltiplas' : 'única'} encomenda(s):`, packageIds);
        
        const modalId = 'modal-entrega-encomenda';
        const success = this.openModal(modalId, {
            zIndex: '1001',
            focusSelector: '#entrega-porteiro'
        });

        if (success) {
            this.setupEntregaModal(packageIds, moradorNome, isMultiple);
        }
    }

    setupEntregaModal(packageIds, moradorNome, isMultiple) {
        const form = document.getElementById('form-entrega-encomenda');
        const entregaEncomendaIdInput = document.getElementById('entrega-encomenda-id');
        const entregaMoradorInfoInput = document.getElementById('entrega-morador-info');
        const entregaDataInput = document.getElementById('entrega-data');
        const entregaHoraInput = document.getElementById('entrega-hora');
        const inputEntregaPorteiro = document.getElementById('entrega-porteiro');
        const modalTitle = document.getElementById('modal-entrega-title');

        if (form) form.reset();
        window.selectedEntregaPorteiroId = null;

        // Armazenar IDs das encomendas
        if (isMultiple) {
            const numericIds = packageIds.map(id => parseInt(id, 10));
            entregaEncomendaIdInput.value = JSON.stringify(numericIds);
        } else {
            const numericId = parseInt(packageIds[0], 10);
            entregaEncomendaIdInput.value = numericId.toString();
        }
        
        // Atualizar título
        if (modalTitle) {
            modalTitle.textContent = isMultiple 
                ? `Registrar entrega em lote (${packageIds.length} encomendas)`
                : 'Registrar entrega de encomenda';
        }
        
        // Informações do morador
        entregaMoradorInfoInput.value = isMultiple 
            ? `${moradorNome} (${packageIds.length} encomendas)`
            : moradorNome || 'N/A';

        // Data e hora atuais
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        entregaDataInput.value = `${ano}-${mes}-${dia}`;
        
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        entregaHoraInput.value = `${hora}:${minuto}`;

        // Porteiro atual
        if (window.authManager?.getCurrentUser() && inputEntregaPorteiro) {
            const currentUser = window.authManager.getCurrentUser();
            inputEntregaPorteiro.value = currentUser.nome_completo || currentUser.name || '';
            window.selectedEntregaPorteiroId = currentUser.id;
        }
    }

    showStatusMessage(message, type = 'info', stickyError = false) {
        const el = document.getElementById('status-message');
        if (el) {
            el.textContent = message;
            el.className = `status-message status-${type}`;
            el.style.display = 'block';
            if (type === 'success' || (type === 'error' && !stickyError)) {
                const delay = type === 'success' ? 3500 : 6000;
                setTimeout(() => { 
                    if (el.textContent === message) { 
                        el.style.display = 'none'; 
                    } 
                }, delay);
            }
        }
    }

    // Métodos específicos de fechamento de modal
    closeEncomendaModal() {
        console.log('[ModalManager] Fechando modal de encomenda');
        this.closeActiveModal();
    }

    closeMoradorModal() {
        console.log('[ModalManager] Fechando modal de morador');
        this.closeActiveModal();
    }

    closeUsuarioModal() {
        console.log('[ModalManager] Fechando modal de usuário');
        this.closeActiveModal();
    }

    closeEntregaModal() {
        console.log('[ModalManager] Fechando modal de entrega');
        this.closeActiveModal();
    }
}

// Exportar para uso global
window.ModalManager = ModalManager; 
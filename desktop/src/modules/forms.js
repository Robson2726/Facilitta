// --- src/modules/forms.js ---
// Gerenciador de Formulários e Validações

class FormsManager {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('[Forms] FormsManager já foi inicializado');
            return;
        }
        
        console.log('[Forms] Inicializando FormsManager...');
        this.initialized = true;
        console.log('[Forms] FormsManager inicializado com sucesso');
    }

    async handleEncomendaSubmit(e) {
        e.preventDefault();
        console.log('[Forms] ===== INÍCIO DO PROCESSAMENTO DO FORMULÁRIO =====');
        console.log('[Forms] Formulário de encomenda enviado');
        console.log('[Forms] Timestamp:', new Date().toISOString());
        
        // Verificar se estamos em modo de edição ou cadastro
        const hiddenEncomendaIdInput = document.getElementById('encomenda-id');
        const encomendaId = hiddenEncomendaIdInput?.value?.trim();
        const isEditMode = encomendaId && encomendaId !== '';
        
        console.log(`[Forms] Modo: ${isEditMode ? 'Edição' : 'Cadastro'}, ID: ${encomendaId || 'N/A'}`);
        
        // Coletar dados do formulário
        const formData = new FormData(e.target);
        const moradorValue = formData.get('morador')?.toString().trim();
        const porteiroValue = formData.get('porteiro')?.toString().trim();
        const quantidade = parseInt(formData.get('quantidade')?.toString() || '1', 10);
        const data = formData.get('data')?.toString();
        const hora = formData.get('hora')?.toString();
        const observacoes = formData.get('observacoes')?.toString().trim();
        
        console.log('[Forms] Dados do formulário coletados:', {
            moradorValue,
            porteiroValue,
            quantidade,
            data,
            hora,
            observacoes
        });
        
        // Validação básica
        if (!moradorValue || !porteiroValue || !data || !hora || quantidade < 1) {
            console.log('[Forms] Validação falhou - campos obrigatórios não preenchidos');
            this.showStatusMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        // Verificar se os IDs foram selecionados via autocomplete
        const selectedMoradorId = window.autocompleteManager?.getSelectedMoradorId();
        const selectedPorteiroUserId = window.autocompleteManager?.getSelectedPorteiroUserId();
        
        console.log('[Forms] IDs selecionados:', {
            selectedMoradorId,
            selectedPorteiroUserId
        });
        
        if (!selectedMoradorId) {
            console.log('[Forms] Validação falhou - morador não selecionado');
            this.showStatusMessage('Por favor, selecione um morador válido da lista de sugestões.', 'error');
            const inputMorador = document.getElementById('morador');
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
            console.log('[Forms] Validação falhou - porteiro não selecionado');
            this.showStatusMessage('Por favor, selecione um porteiro válido da lista de sugestões.', 'error');
            const inputPorteiro = document.getElementById('porteiro');
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
        
        console.log('[Forms] Dados montados para envio:', packageData);
        
        try {
            let result;
            
            if (isEditMode) {
                // Modo edição - chama updatePackage
                console.log('[Forms] Chamando updatePackage...');
                if (!window.electronAPI?.updatePackage) {
                    throw new Error('API updatePackage não disponível');
                }
                result = await window.electronAPI.updatePackage(encomendaId, packageData);
            } else {
                // Modo cadastro - chama savePackage
                console.log('[Forms] Chamando savePackage...');
                if (!window.electronAPI?.savePackage) {
                    throw new Error('API savePackage não disponível');
                }
                result = await window.electronAPI.savePackage(packageData);
            }
            
            console.log('[Forms] Resultado da API:', result);
            
            if (result?.success) {
                const message = isEditMode ? 'Encomenda atualizada com sucesso!' : 'Encomenda cadastrada com sucesso!';
                console.log('[Forms] Sucesso:', message);
                this.showStatusMessage(message, 'success');
                
                if (window.modalManager) {
                    console.log('[Forms] Fechando modal...');
                    window.modalManager.closeEncomendaModal();
                }
                
                // Recarregar lista de encomendas se estivermos na tela de encomendas
                console.log('[Forms] Recarregando lista de encomendas...');
                this.recarregarListaEncomendas();
            } else {
                const errorMessage = result?.message || 'Erro desconhecido ao processar encomenda';
                console.log('[Forms] Erro:', errorMessage);
                this.showStatusMessage(errorMessage, 'error');
            }
            
        } catch (error) {
            console.error('[Forms] Erro durante processamento:', error);
            this.showStatusMessage(`Erro ao processar encomenda: ${error.message}`, 'error');
        }
        
        console.log('[Forms] ===== FIM DO PROCESSAMENTO DO FORMULÁRIO =====');
    }

    async handleEntregaSubmit(e) {
        e.preventDefault();
        console.log('[Forms] Formulário de entrega enviado');
        
        try {
            // Coletar dados do formulário
            const formData = new FormData(e.target);
            const entregaEncomendaIdInput = document.getElementById('entrega-encomenda-id');
            const packageIds = entregaEncomendaIdInput?.value?.trim();
            const porteiroEntrega = formData.get('entregaPorteiro')?.toString().trim();
            const dataEntrega = formData.get('entregaData')?.toString();
            const horaEntrega = formData.get('entregaHora')?.toString();
            const retiradoPor = formData.get('entregaRetiradoPor')?.toString().trim();
            const observacoesEntrega = formData.get('entregaObservacoes')?.toString().trim();
            
            console.log('[Forms] Dados coletados:', {
                packageIds,
                porteiroEntrega,
                dataEntrega,
                horaEntrega,
                retiradoPor,
                observacoesEntrega
            });
            
            // Validação básica
            if (!packageIds || !porteiroEntrega || !dataEntrega || !horaEntrega) {
                this.showStatusMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }
            
            // Obter ID do porteiro selecionado
            let porteiroId = window.autocompleteManager?.getSelectedEntregaPorteiroId();
            
            // Se não há selectedEntregaPorteiroId, tentar buscar o porteiro pelo nome
            if (!porteiroId && porteiroEntrega) {
                console.log('[Forms] Tentando buscar porteiro pelo nome:', porteiroEntrega);
                try {
                    const searchResult = await window.electronAPI.searchActivePorters(porteiroEntrega);
                    const porteiroEncontrado = searchResult?.find(p => 
                        p.nome?.toLowerCase() === porteiroEntrega.toLowerCase()
                    );
                    if (porteiroEncontrado) {
                        porteiroId = porteiroEncontrado.id;
                        console.log('[Forms] Porteiro encontrado pelo nome:', porteiroEncontrado);
                    }
                } catch (error) {
                    console.error('[Forms] Erro ao buscar porteiro:', error);
                }
            }
            
            if (!porteiroId) {
                this.showStatusMessage('Por favor, selecione um porteiro válido da lista ou verifique se o nome está correto.', 'error');
                return;
            }
            
            // Montar objeto de dados para entrega com o porteiroId validado
            const deliveryData = {
                porteiroEntregouId: porteiroId,
                dataEntrega: `${dataEntrega} ${horaEntrega}`,
                retiradoPorNome: retiradoPor || null,
                observacoesEntrega: observacoesEntrega || null
            };
            
            console.log('[Forms] Dados de entrega montados:', deliveryData);
            
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
            
            console.log('[Forms] PackageIds processados:', {
                original: packageIds,
                processed: packageIdsList,
                isMultiple
            });
            
            let result;
            
            if (isMultiple) {
                // Entrega em lote - processar cada encomenda individualmente
                console.log('[Forms] Processando entrega em lote...');
                console.log('[Forms] IDs para entrega em lote:', packageIdsList);
                
                const deliveryPromises = packageIdsList.map((packageId, index) => {
                    console.log(`[Forms] Enviando entrega ${index + 1}: ID ${packageId}, tipo: ${typeof packageId}`);
                    return window.electronAPI.deliverPackage(packageId, deliveryData);
                });
                
                const results = await Promise.all(deliveryPromises);
                console.log('[Forms] Resultados da entrega em lote:', results);
                
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
                console.log('[Forms] Processando entrega individual...');
                console.log('[Forms] ID para entrega individual:', packageIdsList[0], 'tipo:', typeof packageIdsList[0]);
                
                if (!window.electronAPI?.deliverPackage) {
                    throw new Error('API de entrega não disponível.');
                }
                result = await window.electronAPI.deliverPackage(packageIdsList[0], deliveryData);
                console.log('[Forms] Resultado da entrega individual:', result);
            }
            
            if (result?.success) {
                this.showStatusMessage(result.message || 'Entrega registrada com sucesso!', 'success');
                
                if (window.modalManager) {
                    window.modalManager.closeEntregaModal();
                }
                
                // Limpar seleção em lote se existir
                if (isMultiple && window.contentManager) {
                    window.contentManager.clearPackageSelection();
                }
                
                // Recarregar a lista de encomendas se estivermos na tela de encomendas
                this.recarregarListaEncomendas();
            } else {
                const errorMessage = result?.message || 'Erro desconhecido ao registrar entrega';
                this.showStatusMessage(errorMessage, 'error');
            }
            
        } catch (error) {
            console.error('[Forms] Erro na entrega:', error);
            this.showStatusMessage(`Erro ao registrar entrega: ${error.message}`, 'error');
        }
    }

    async handleMoradorSubmit(e) {
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
            this.showStatusMessage('Preencha todos os campos obrigatórios.', 'error');
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
                this.showStatusMessage(result.message || 'Morador salvo com sucesso!', 'success');
                
                if (window.modalManager) {
                    window.modalManager.closeMoradorModal();
                }
                
                // Atualiza lista de moradores se estiver visível
                this.recarregarListaMoradores();
            } else {
                this.showStatusMessage(result?.message || 'Erro ao salvar morador.', 'error');
            }
        } catch (error) {
            console.error('[Forms] Erro ao salvar morador:', error);
            this.showStatusMessage('Erro ao salvar morador: ' + error.message, 'error');
        }
    }

    async handleUsuarioSubmit(e) {
        e.preventDefault();
        console.log('[Forms] Formulário de usuário enviado');
        
        const usuarioId = document.getElementById('usuario-id')?.value?.trim();
        const nome = document.getElementById('usuario-nome')?.value?.trim();
        const email = document.getElementById('usuario-email')?.value?.trim();
        const senha = document.getElementById('usuario-senha')?.value;
        const senhaConfirm = document.getElementById('usuario-senha-confirm')?.value;
        const nivelAcesso = document.getElementById('usuario-nivel-acesso')?.value || 'porteiro';
        const status = document.getElementById('usuario-status')?.value || 'Ativo';
        
        // Validação básica
        if (!nome) {
            this.showStatusMessage('Por favor, preencha o nome de usuário.', 'error');
            return;
        }

        // Validação de senha para novo usuário ou quando senha é fornecida
        if (!usuarioId || senha) { // Novo usuário ou alteração de senha
            if (!senha || senha.length < 6) {
                this.showStatusMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }
            if (senha !== senhaConfirm) {
                this.showStatusMessage('As senhas não coincidem.', 'error');
                return;
            }
        }

        try {
            let result;
            
            if (usuarioId) {
                // Edição
                console.log('[Forms] Editando usuário ID:', usuarioId);
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
            } else {
                // Cadastro
                console.log('[Forms] Cadastrando novo usuário');
                if (!window.electronAPI?.saveUser) throw new Error('API saveUser não disponível');
                result = await window.electronAPI.saveUser({ 
                    nomeUsuario: nome, 
                    nomeCompleto: nome, 
                    email, 
                    senha, 
                    nivelAcesso 
                });
            }
            
            console.log('[Forms] Resultado do salvamento:', result);
            
            if (result?.success) {
                const message = usuarioId ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!';
                this.showStatusMessage(message, 'success');
                
                if (window.modalManager) {
                    window.modalManager.closeUsuarioModal();
                }
                
                // Atualiza lista de usuários se estiver visível
                this.recarregarListaUsuarios();
            } else {
                this.showStatusMessage(result?.message || 'Erro ao salvar usuário.', 'error');
            }
        } catch (error) {
            console.error('[Forms] Erro ao salvar usuário:', error);
            this.showStatusMessage('Erro ao salvar usuário: ' + error.message, 'error');
        }
    }

    // Métodos auxiliares
    showStatusMessage(message, type = 'info', stickyError = false) {
        if (window.authManager) {
            window.authManager.showStatusMessage(message, type, stickyError);
        }
    }

    recarregarListaEncomendas() {
        if (document.querySelector('.main-content h1')?.textContent?.includes('Encomendas')) {
            const container = document.querySelector('.main-content > div:last-child');
            if (container && window.contentManager) {
                container.innerHTML = '<p style="text-align: center; color: #666;">Carregando...</p>';
                window.contentManager.buscarEExibirEncomendas(container);
            }
        }
    }

    recarregarListaMoradores() {
        const moradoresContent = document.getElementById('lista-moradores-container');
        if (moradoresContent && window.contentManager) {
            window.contentManager.buscarEExibirMoradores(moradoresContent);
        }
    }

    recarregarListaUsuarios() {
        const usuariosContent = document.getElementById('lista-usuarios-container');
        if (usuariosContent && window.contentManager) {
            window.contentManager.buscarEExibirUsuarios(usuariosContent);
        }
    }

    // Método para preencher data e hora atuais
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
}

// Exportar para uso global
window.FormsManager = FormsManager; 
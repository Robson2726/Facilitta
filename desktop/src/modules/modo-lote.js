class ModoLoteManager {
    constructor() {
        this.passoAtual = 1;
        this.dadosComuns = {
            porteiro: '',
            porteiroId: null,
            data: '',
            hora: ''
        };
        this.moradoresSelecionados = [];
        this.moradoresDisponiveis = [];
        this.moradorSelecionadoTemp = null;
        this.quantidadeTemp = 1;
        
        this.init();
    }

    init() {
        this.preencherDataHoraAtual();
        this.carregarMoradores();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botão do menu
        document.getElementById('menu-modo-lote').addEventListener('click', () => {
            this.abrirModal();
        });

        // Eventos do modal
        document.getElementById('btn-voltar-passo').addEventListener('click', () => {
            this.voltarPasso();
        });

        document.getElementById('btn-proximo-passo').addEventListener('click', () => {
            this.proximoPasso();
        });

        document.getElementById('btn-finalizar-lote').addEventListener('click', () => {
            this.finalizarLote();
        });

        // Busca de porteiro
        document.getElementById('lote-porteiro').addEventListener('input', (e) => {
            this.buscarPorteiros(e.target.value);
        });

        // Busca de moradores
        document.getElementById('lote-busca-morador').addEventListener('input', (e) => {
            this.filtrarMoradores(e.target.value);
        });

        // Modal de quantidade
        document.getElementById('btn-diminuir-quantidade').addEventListener('click', () => {
            this.alterarQuantidade(-1);
        });

        document.getElementById('btn-aumentar-quantidade').addEventListener('click', () => {
            this.alterarQuantidade(1);
        });

        document.getElementById('input-quantidade').addEventListener('input', (e) => {
            this.quantidadeTemp = parseInt(e.target.value) || 1;
        });

        document.getElementById('btn-confirmar-quantidade').addEventListener('click', () => {
            this.confirmarQuantidade();
        });

        document.getElementById('btn-cancelar-quantidade').addEventListener('click', () => {
            this.fecharModalQuantidade();
        });

        // Fechar modal principal
        document.getElementById('modal-modo-lote').addEventListener('click', (e) => {
            if (e.target.id === 'modal-modo-lote') {
                this.fecharModal();
            }
        });
    }

    preencherDataHoraAtual() {
        const agora = new Date();
        const dataAtual = agora.toISOString().split('T')[0];
        const horaAtual = agora.toTimeString().split(' ')[0].substring(0, 5);
        
        this.dadosComuns.data = dataAtual;
        this.dadosComuns.hora = horaAtual;
        
        document.getElementById('lote-data').value = dataAtual;
        document.getElementById('lote-hora').value = horaAtual;
    }

    async carregarMoradores() {
        try {
            if (!window.electronAPI?.getResidents) {
                console.error('API getResidents não disponível');
                return;
            }
            
            const moradores = await window.electronAPI.getResidents();
            this.moradoresDisponiveis = moradores || [];
            this.renderizarMoradoresDisponiveis();
        } catch (error) {
            console.error('Erro ao carregar moradores:', error);
        }
    }

    async buscarPorteiros(termo) {
        if (!termo.trim()) {
            this.limparSugestoesPorteiro();
            return;
        }

        try {
            if (!window.electronAPI?.searchActivePorters) {
                console.error('API searchActivePorters não disponível');
                return;
            }
            
            // Buscar porteiros ativos
            const porteiros = await window.electronAPI.searchActivePorters(termo);
            
            if (porteiros && porteiros.length > 0) {
                this.renderizarSugestoesPorteiro(porteiros);
            } else {
                this.limparSugestoesPorteiro();
            }
        } catch (error) {
            console.error('Erro ao buscar porteiros:', error);
        }
    }

    renderizarSugestoesPorteiro(porteiros) {
        const container = document.getElementById('lote-porteiro-suggestions');
        container.innerHTML = '';
        
        if (porteiros.length > 0) {
            porteiros.slice(0, 5).forEach(porteiro => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <span class="material-symbols-outlined">person</span>
                    <span>${porteiro.nome || porteiro.nome_completo || porteiro.nome_usuario || 'Nome não informado'}</span>
                `;
                item.addEventListener('click', () => {
                    this.selecionarPorteiro(porteiro);
                });
                container.appendChild(item);
            });
            container.classList.add('visible');
        } else {
            container.classList.remove('visible');
        }
    }

    selecionarPorteiro(porteiro) {
        this.dadosComuns.porteiro = porteiro.nome || porteiro.nome_completo || porteiro.nome_usuario || 'Nome não informado';
        this.dadosComuns.porteiroId = porteiro.id;
        
        document.getElementById('lote-porteiro').value = this.dadosComuns.porteiro;
        this.limparSugestoesPorteiro();
    }

    limparSugestoesPorteiro() {
        const container = document.getElementById('lote-porteiro-suggestions');
        container.innerHTML = '';
        container.classList.remove('visible');
    }

    filtrarMoradores(termo) {
        if (!termo.trim()) {
            this.renderizarMoradoresDisponiveis();
            this.limparSugestoesMorador();
            return;
        }

        const filtrados = this.moradoresDisponiveis.filter(morador => {
            const nome = (morador.nome || '').toLowerCase();
            const apartamento = (morador.apartamento || '').toLowerCase();
            const bloco = (morador.bloco || '').toLowerCase();
            const termoLower = termo.toLowerCase();
            
            return nome.includes(termoLower) || 
                   apartamento.includes(termoLower) || 
                   bloco.includes(termoLower);
        });

        this.renderizarMoradoresDisponiveis(filtrados);
        
        this.renderizarSugestoesMorador(filtrados.slice(0, 5));
    }

    renderizarMoradoresDisponiveis(moradores = this.moradoresDisponiveis) {
        const container = document.getElementById('lista-moradores-disponiveis');
        container.innerHTML = '';
        
        moradores.forEach(morador => {
            const jaSelecionado = this.moradoresSelecionados.some(m => m.id === morador.id);
            
            const card = document.createElement('div');
            card.className = `morador-card ${jaSelecionado ? 'selecionado' : ''}`;
            card.innerHTML = `
                <div class="morador-card-nome">${morador.nome}</div>
                <div class="morador-card-detalhes">${morador.bloco || 'A'}${morador.apartamento}</div>
            `;
            
            if (!jaSelecionado) {
                card.addEventListener('click', () => {
                    this.selecionarMorador(morador);
                });
            }
            
            container.appendChild(card);
        });
    }

    selecionarMorador(morador) {
        this.moradorSelecionadoTemp = morador;
        this.quantidadeTemp = 1;
        
        document.getElementById('quantidade-morador-info').textContent = 
            `${morador.nome} - ${morador.bloco || 'A'}${morador.apartamento}`;
        document.getElementById('input-quantidade').value = '1';
        
        this.abrirModalQuantidade();
    }

    abrirModalQuantidade() {
        document.getElementById('modal-quantidade').classList.add('active');
    }

    fecharModalQuantidade() {
        document.getElementById('modal-quantidade').classList.remove('active');
        this.moradorSelecionadoTemp = null;
    }

    alterarQuantidade(delta) {
        const novaQuantidade = Math.max(1, this.quantidadeTemp + delta);
        this.quantidadeTemp = novaQuantidade;
        document.getElementById('input-quantidade').value = novaQuantidade;
    }

    confirmarQuantidade() {
        if (this.moradorSelecionadoTemp) {
            const moradorComQuantidade = {
                ...this.moradorSelecionadoTemp,
                quantidade: this.quantidadeTemp
            };
            
            this.moradoresSelecionados.push(moradorComQuantidade);
            this.atualizarListaMoradoresSelecionados();
            this.fecharModalQuantidade();
        }
    }

    removerMorador(moradorId) {
        this.moradoresSelecionados = this.moradoresSelecionados.filter(m => m.id !== moradorId);
        this.atualizarListaMoradoresSelecionados();
    }

    atualizarListaMoradoresSelecionados() {
        const container = document.getElementById('lista-moradores-selecionados');
        const contador = document.getElementById('contador-moradores');
        
        container.innerHTML = '';
        contador.textContent = this.moradoresSelecionados.length;
        
        this.moradoresSelecionados.forEach(morador => {
            const item = document.createElement('div');
            item.className = 'morador-item';
            item.innerHTML = `
                <div class="morador-info">
                    <h4>${morador.nome}</h4>
                    <p>${morador.bloco || 'A'}${morador.apartamento} • ${morador.quantidade}x encomenda${morador.quantidade > 1 ? 's' : ''}</p>
                </div>
                <div class="morador-actions">
                    <button class="btn-remover" onclick="modoLoteManager.removerMorador('${morador.id}')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    proximoPasso() {
        if (this.passoAtual === 1) {
            if (!this.dadosComuns.porteiro) {
                alert('Selecione um porteiro antes de continuar.');
                return;
            }
            this.passoAtual = 2;
        } else if (this.passoAtual === 2) {
            if (this.moradoresSelecionados.length === 0) {
                alert('Selecione pelo menos um morador antes de continuar.');
                return;
            }
            this.passoAtual = 3;
            this.atualizarResumo();
        }
        
        this.atualizarPasso();
    }

    voltarPasso() {
        if (this.passoAtual > 1) {
            this.passoAtual--;
            this.atualizarPasso();
        }
    }

    atualizarPasso() {
        // Atualizar indicadores de progresso
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const circle = step.querySelector('.progress-circle');
            const stepNumber = index + 1;
            
            circle.classList.remove('active');
            
            if (stepNumber <= this.passoAtual) {
                circle.classList.add('active');
                // Atualizar ícone para check quando completado
                const icon = circle.querySelector('.material-symbols-outlined');
                if (stepNumber < this.passoAtual) {
                    icon.textContent = 'check';
                } else {
                    icon.textContent = stepNumber === 1 ? 'check' : 'ellipse';
                }
            }
        });

        // Atualizar texto do header
        const headerPassoInfo = document.getElementById('header-passo-info');
        headerPassoInfo.textContent = `Passo ${this.passoAtual} de 3`;

        // Mostrar/ocultar passos
        document.querySelectorAll('.modo-lote-passo').forEach((passo, index) => {
            passo.classList.remove('active');
            if (index + 1 === this.passoAtual) {
                passo.classList.add('active');
            }
        });

        // Atualizar botões do footer
        const btnProximo = document.getElementById('btn-proximo-passo');
        const btnFinalizar = document.getElementById('btn-finalizar-lote');

        if (this.passoAtual === 1) {
            btnProximo.innerHTML = '<span>Selecionar Moradores</span><span class="material-symbols-outlined">arrow_forward</span>';
            btnProximo.style.display = 'flex';
            btnFinalizar.style.display = 'none';
        } else if (this.passoAtual === 2) {
            btnProximo.innerHTML = '<span>Ver Resumo</span><span class="material-symbols-outlined">arrow_forward</span>';
            btnProximo.style.display = 'flex';
            btnFinalizar.style.display = 'none';
        } else if (this.passoAtual === 3) {
            btnProximo.style.display = 'none';
            btnFinalizar.style.display = 'flex';
        }
    }

    atualizarResumo() {
        const totalEncomendas = this.moradoresSelecionados.reduce((total, m) => total + m.quantidade, 0);
        
        document.getElementById('resumo-porteiro').textContent = this.dadosComuns.porteiro;
        document.getElementById('resumo-data-hora').textContent = `${this.dadosComuns.data} às ${this.dadosComuns.hora}`;
        document.getElementById('resumo-total').textContent = totalEncomendas;
        
        const container = document.getElementById('resumo-lista-moradores');
        container.innerHTML = '';
        
        this.moradoresSelecionados.forEach(morador => {
            const item = document.createElement('div');
            item.className = 'resumo-item';
            item.innerHTML = `
                <div class="resumo-morador">${morador.nome}</div>
                <div class="resumo-detalhes">${morador.bloco || 'A'}${morador.apartamento} • ${morador.quantidade}x encomenda${morador.quantidade > 1 ? 's' : ''}</div>
            `;
            container.appendChild(item);
        });
    }

    async finalizarLote() {
        if (this.moradoresSelecionados.length === 0) {
            alert('Nenhum morador selecionado.');
            return;
        }

        const btnFinalizar = document.getElementById('btn-finalizar-lote');
        const textoOriginal = btnFinalizar.innerHTML;
        
        btnFinalizar.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>Processando...';
        btnFinalizar.disabled = true;

        try {
            let sucessos = 0;
            let erros = 0;
            const totalEncomendas = this.moradoresSelecionados.reduce((total, m) => total + m.quantidade, 0);

            for (const morador of this.moradoresSelecionados) {
                try {
                    if (!window.electronAPI?.savePackage) {
                        console.error('API savePackage não disponível');
                        return;
                    }
                    
                    const packageData = {
                        moradorId: morador.id,
                        quantidade: morador.quantidade,
                        dataRecebimento: `${this.dadosComuns.data} ${this.dadosComuns.hora}:00`,
                        porteiroUserId: this.dadosComuns.porteiroId,
                        observacoes: `Lote: ${new Date().toLocaleString()} - ${morador.quantidade} encomenda${morador.quantidade > 1 ? 's' : ''} para ${morador.nome}`
                    };
                    
                    const result = await window.electronAPI.savePackage(packageData);
                    
                    if (result.success) {
                        sucessos++;
                    } else {
                        erros++;
                        console.error(`Erro ao cadastrar encomendas para ${morador.nome}:`, result.message);
                    }
                } catch (error) {
                    erros++;
                    console.error(`Erro de conexão para ${morador.nome}:`, error);
                }
            }

            // Mostrar resultado
            if (erros === 0) {
                alert(`✅ Sucesso! ${sucessos} moradores processados com ${totalEncomendas} encomendas cadastradas.`);
                this.fecharModal();
                // Recarregar lista de encomendas se estiver na tela de encomendas
                if (window.contentManager && window.contentManager.currentSection === 'encomendas') {
                    window.contentManager.carregarEncomendas();
                }
            } else if (sucessos > 0) {
                alert(`⚠️ Parcial: ${sucessos} moradores processados com sucesso, ${erros} falharam.`);
            } else {
                alert('❌ Erro: Nenhuma encomenda foi cadastrada. Verifique a conexão.');
            }

        } catch (error) {
            console.error('Erro geral:', error);
            alert('❌ Erro: Não foi possível conectar com o servidor.');
        } finally {
            btnFinalizar.innerHTML = textoOriginal;
            btnFinalizar.disabled = false;
        }
    }

    abrirModal() {
        document.getElementById('modal-modo-lote').classList.add('active');
        this.passoAtual = 1;
        this.atualizarPasso();
    }

    fecharModal() {
        document.getElementById('modal-modo-lote').classList.remove('active');
        this.resetarDados();
    }

    resetarDados() {
        this.passoAtual = 1;
        this.dadosComuns = {
            porteiro: '',
            porteiroId: null,
            data: '',
            hora: ''
        };
        this.moradoresSelecionados = [];
        this.moradorSelecionadoTemp = null;
        this.quantidadeTemp = 1;
        
        this.preencherDataHoraAtual();
        this.limparSugestoesPorteiro();
        document.getElementById('lote-porteiro').value = '';
        document.getElementById('lote-busca-morador').value = '';
        this.atualizarListaMoradoresSelecionados();
    }

    renderizarSugestoesMorador(moradores) {
        const container = document.getElementById('lote-morador-suggestions');
        container.innerHTML = '';
        
        if (moradores.length > 0) {
            moradores.forEach(morador => {
                const jaSelecionado = this.moradoresSelecionados.some(m => m.id === morador.id);
                
                if (!jaSelecionado) {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.innerHTML = `
                        <span class="material-symbols-outlined">home</span>
                        <div>
                            <div style="font-weight: 500;">${morador.nome}</div>
                            <div style="font-size: 12px; color: #666;">${morador.bloco || 'A'}${morador.apartamento}</div>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        this.selecionarMorador(morador);
                        document.getElementById('lote-busca-morador').value = '';
                        this.limparSugestoesMorador();
                    });
                    container.appendChild(item);
                }
            });
            container.classList.add('visible');
        } else {
            container.classList.remove('visible');
        }
    }

    limparSugestoesMorador() {
        const container = document.getElementById('lote-morador-suggestions');
        container.innerHTML = '';
        container.classList.remove('visible');
    }
}

// Exportar para uso global
window.ModoLoteManager = ModoLoteManager; 
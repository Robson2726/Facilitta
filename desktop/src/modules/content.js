// --- src/modules/content.js ---
// Gerenciador de Conteúdo das Seções

class ContentManager {
    constructor() {
        this.currentSection = null;
        this.init();
    }

    init() {
        console.log('[Content] Inicializando gerenciador de conteúdo');
    }

    carregarConteudo(titulo, carregaDados = false) {
        console.log(`[Content] Carregando: ${titulo}`);
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('[Content] Elemento main-content não encontrado');
            return;
        }

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

        this.currentSection = titulo;

        // Delegar para módulos específicos
        switch (titulo) {
            case 'Dashboard':
                if (window.dashboardManager) {
                    window.dashboardManager.carregarDashboard(sectionContent);
                } else {
                    console.error('[Content] DashboardManager não disponível');
                }
                break;
                
            case 'Dashboard Encomendas':
                this.carregarEncomendas(sectionContent);
                break;
                
            case 'Moradores':
                this.carregarMoradores(sectionContent);
                break;
                
            case 'Usuários':
                if (window.authManager?.isAdmin()) {
                    this.carregarUsuarios(sectionContent);
                } else {
                    sectionContent.innerHTML = '<p>Acesso negado. Apenas administradores podem acessar esta seção.</p>';
                }
                break;
                
            case 'Relatórios':
                this.carregarRelatorios(sectionContent);
                break;
                
            case 'Ajustes':
                this.carregarAjustes(sectionContent);
                break;
                
            default:
                const p = document.createElement('p');
                p.textContent = `Conteúdo ${titulo}...`;
                sectionContent.appendChild(p);
        }
    }

    carregarEncomendas(container) {
        const btn = document.createElement('button');
        btn.textContent = 'Cadastrar encomenda';
        btn.className = 'btn-add';
        container.parentElement.insertBefore(btn, container);
        btn.setAttribute('data-action', 'open-encomenda-modal');
        this.buscarEExibirEncomendas(container);
    }

    carregarMoradores(container) {
        // Container para os botões
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;';
        container.parentElement.insertBefore(buttonContainer, container);

        // Botão de cadastrar morador
        const btn = document.createElement('button');
        btn.textContent = 'Cadastrar morador';
        btn.className = 'btn-add';
        buttonContainer.appendChild(btn);
        btn.setAttribute('data-action', 'open-morador-modal');

        // Botão de importar moradores CSV
        const btnImportar = document.createElement('button');
        btnImportar.innerHTML = '<img src="assets/upload-botao.svg" alt="Upload" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;"> Importar Moradores (CSV)';
        btnImportar.id = 'btnImportarMoradores';
        btnImportar.className = 'btn-importar-moradores';
        buttonContainer.appendChild(btnImportar);

        // Input oculto para upload
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
                    const div = container.querySelector('#lista-moradores-container');
                    if (div) this.buscarEExibirMoradores(div);
                })
                .catch(err => alert('Erro ao importar: ' + err.message));
        };

        // Lista de moradores
        const div = document.createElement('div');
        div.id = 'lista-moradores-container';
        div.style.marginTop = '20px';
        container.appendChild(div);
        this.buscarEExibirMoradores(div);
    }

    carregarUsuarios(container) {
        const btn = document.createElement('button');
        btn.textContent = 'Cadastrar usuário';
        btn.className = 'btn-add';
        container.parentElement.insertBefore(btn, container);
        btn.setAttribute('data-action', 'open-usuario-modal');
        this.buscarEExibirUsuarios(container);
    }

    carregarRelatorios(container) {
        // Interface de Relatórios
        const formFiltros = document.createElement('form');
        formFiltros.id = 'form-filtros-relatorio';
        formFiltros.innerHTML = `
            <div class="filtros-container" style="
                background: #fff;
                padding: 18px 20px 12px 20px;
                border-radius: 10px;
                margin-bottom: 18px;
                box-shadow: 0 1px 6px rgba(30,60,90,0.06);
                border: 1px solid #e3e8ee;
                max-width: 900px;
            ">
                <h3 style="margin: 0 0 14px 0; color: #1976d2; font-size: 1.15em; font-weight: 600; letter-spacing: 0.01em;">Filtros para Relatório</h3>
                <div class="form-row" style="display: flex; gap: 12px; margin-bottom: 10px;">
                    <div class="form-group" style="flex:1; min-width:120px;">
                        <label for="filtro-data-inicial" style="font-size: 0.98em; color: #444;">Data Inicial:</label>
                        <input type="date" id="filtro-data-inicial" name="dataInicial" style="width:100%; font-size:0.97em; padding:4px 8px; border-radius:5px; border:1px solid #cfd8dc;">
                    </div>
                    <div class="form-group" style="flex:1; min-width:120px;">
                        <label for="filtro-data-final" style="font-size: 0.98em; color: #444;">Data Final:</label>
                        <input type="date" id="filtro-data-final" name="dataFinal" style="width:100%; font-size:0.97em; padding:4px 8px; border-radius:5px; border:1px solid #cfd8dc;">
                    </div>
                </div>
                <div class="form-row" style="display: flex; gap: 12px; margin-bottom: 10px;">
                    <div class="form-group" style="flex:1; min-width:120px; position:relative;">
                        <label for="filtro-morador" style="font-size: 0.98em; color: #444;">Morador:</label>
                        <input type="text" id="filtro-morador" name="morador" placeholder="Nome..." autocomplete="off"
                            style="width:100%; font-size:0.97em; padding:4px 8px; border-radius:5px; border:1px solid #cfd8dc;">
                        <div id="filtro-morador-suggestions" class="suggestions-dropdown"
                            style="position:absolute;top:100%;left:0;right:0;z-index:10;display:none;background:#fff;border:1px solid #ccc;border-radius:4px;max-height:140px;overflow-y:auto;"></div>
                    </div>
                    <div class="form-group" style="flex:1; min-width:120px; position:relative;">
                        <label for="filtro-porteiro" style="font-size: 0.98em; color: #444;">Porteiro:</label>
                        <input type="text" id="filtro-porteiro" name="porteiro" placeholder="Nome..." autocomplete="off"
                            style="width:100%; font-size:0.97em; padding:4px 8px; border-radius:5px; border:1px solid #cfd8dc;">
                        <div id="filtro-porteiro-suggestions" class="suggestions-dropdown"
                            style="position:absolute;top:100%;left:0;right:0;z-index:10;display:none;background:#fff;border:1px solid #ccc;border-radius:4px;max-height:140px;overflow-y:auto;"></div>
                    </div>
                    <div class="form-group" style="flex:0.7; min-width:110px;">
                        <label for="filtro-status" style="font-size: 0.98em; color: #444;">Status:</label>
                        <select id="filtro-status" name="status"
                            style="width:100%; font-size:0.97em; padding:4px 8px; border-radius:5px; border:1px solid #cfd8dc;">
                            <option value="">Todos</option>
                            <option value="Recebida na portaria">Recebida na portaria</option>
                            <option value="Entregue">Entregue</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions" style="display: flex; gap: 10px; margin-top: 8px;">
                    <button type="submit" class="btn-primary" style="font-size:0.97em; padding:6px 18px;">Buscar</button>
                    <button type="button" id="btn-exportar-pdf" class="btn-secondary" style="font-size:0.97em; padding:6px 14px;">Exportar PDF</button>
                    <button type="button" id="btn-limpar-filtros" class="btn-outline" style="font-size:0.97em; padding:6px 14px;">Limpar</button>
                </div>
            </div>
        `;
        container.appendChild(formFiltros);

        // Container para resultados
        const resultadosContainer = document.createElement('div');
        resultadosContainer.id = 'resultados-relatorio';
        resultadosContainer.style.marginTop = '20px';
        container.appendChild(resultadosContainer);

        // Configurar event listeners
        this.setupRelatoriosEventListeners(formFiltros, resultadosContainer);
    }

    carregarAjustes(container) {
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
        container.appendChild(bancoSection);

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
                </div>
            </div>
        `;
        container.appendChild(qrSection);

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
        container.appendChild(backupSection);

        // Configurar event listeners
        this.setupAjustesEventListeners(container);
    }

    // Métodos auxiliares para buscar e exibir dados
    async buscarEExibirEncomendas(container) {
        console.log('[Content] Buscando encomendas...');
        container.innerHTML = '<p>Carregando...</p>';
        
        try {
            if (!window.electronAPI?.getPendingPackages) throw new Error('API getPendingPackages indisponível');
            const pacotes = await window.electronAPI.getPendingPackages();
            container.innerHTML = '';
            
            if (Array.isArray(pacotes)) {
                if (pacotes.length > 0) {
                    const title = document.createElement('h3');
                    title.textContent = 'Aguardando entrega:';
                    title.style.marginTop = '0';
                    container.appendChild(title);

                    // Adiciona container para botão de entrega em lote
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
                        ul.appendChild(li);

                        const btnEditEnc = li.querySelector('.btn-editar-encomenda');
                        const btnDeliverEnc = li.querySelector('.btn-entregar-encomenda');
                        const checkbox = li.querySelector('.package-checkbox');

                        // Event listener para checkbox
                        if (checkbox) {
                            checkbox.addEventListener('change', (e) => this.handlePackageSelection(e));
                        }

                        if (btnDeliverEnc) {
                            btnDeliverEnc.addEventListener('click', (e) => {
                                const packageId = e.currentTarget.dataset.id;
                                const moradorNome = p.morador_nome || 'N/A';
                                if (window.modalManager) {
                                    window.modalManager.openEntregaModal(packageId, moradorNome);
                                }
                            });
                        }

                        if (btnEditEnc) {
                            btnEditEnc.addEventListener('click', (e) => {
                                const packageId = e.currentTarget.dataset.id;
                                if (packageId) {
                                    this.iniciarEdicaoEncomenda(packageId);
                                } else {
                                    console.error("ID da encomenda não encontrado no botão editar.");
                                    this.showStatusMessage("Erro: ID da encomenda não encontrado.", "error");
                                }
                            });
                        }
                    });
                    
                    container.appendChild(ul);

                    // Event listener para botão de entrega em lote
                    const btnEntregarSelecionadas = document.getElementById('btn-entregar-selecionadas');
                    if (btnEntregarSelecionadas) {
                        btnEntregarSelecionadas.addEventListener('click', () => this.abrirModalEntregaLote());
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
            console.error('[Content] Erro ao buscar/exibir encomendas:', error);
            container.innerHTML = '';
            const err = document.createElement('p');
            err.textContent = `Erro ao carregar encomendas: ${error.message}`;
            err.className = 'error-message';
            container.appendChild(err);
        }
    }

    async buscarEExibirMoradores(container) {
        console.log('[Content] Buscando moradores...');
        container.innerHTML = '<p>Carregando...</p>';
        
        try {
            if (!window.electronAPI?.getResidents) throw new Error('API indisponível.');
            const moradores = await window.electronAPI.getResidents();
            container.innerHTML = '';

            if (Array.isArray(moradores)) {
                if (moradores.length > 0) {
                    const table = document.createElement('table');
                    table.className = 'moradores-table';
                    const thead = table.createTHead();
                    const headerRow = thead.insertRow();
                    const headers = ['Nome', 'AP/LT', 'Bloco/Quadra', 'Telefone', 'Ações'];
                    headers.forEach(text => {
                        const th = document.createElement('th');
                        th.textContent = text;
                        headerRow.appendChild(th);
                    });
                    
                    const tbody = table.createTBody();
                    moradores.forEach(m => {
                        const row = tbody.insertRow();
                        row.dataset.residentId = m.id;
                        row.insertCell().textContent = m.nome || 'N/A';
                        row.insertCell().textContent = m.apartamento || 'N/A';
                        row.insertCell().textContent = m.bloco || 'N/A';
                        row.insertCell().textContent = m.telefone || 'N/A';
                        
                        const actionsCell = row.insertCell();
                        actionsCell.className = 'morador-actions';
                        
                        // Botão Editar com ícone SVG
                        const btnEdit = document.createElement('button');
                        btnEdit.className = 'btn-editar-morador';
                        btnEdit.dataset.id = m.id;
                        btnEdit.innerHTML = `<img src="assets/editar.svg" alt="Editar" style="width: 22px; height: 22px;">`;
                        btnEdit.addEventListener('click', () => {
                            if (window.modalManager) {
                                window.modalManager.openMoradorModal(m.id);
                            }
                        });
                        actionsCell.appendChild(btnEdit);
                        
                        if (window.authManager?.isAdmin()) {
                            // Botão Excluir com ícone SVG
                            const btnDel = document.createElement('button');
                            btnDel.className = 'btn-excluir-morador';
                            btnDel.dataset.id = m.id;
                            btnDel.innerHTML = `<img src="assets/excluir.svg" alt="Excluir" style="width: 22px; height: 22px;">`;
                            btnDel.addEventListener('click', async () => {
                                const mid = btnDel.dataset.id;
                                const mNome = m.nome;
                                if (confirm(`Excluir ${mNome}? Esta ação não pode ser desfeita.`)) {
                                    try {
                                        if (!window.electronAPI?.deleteResident) throw new Error('API indisponível');
                                        const res = await window.electronAPI.deleteResident(mid);
                                        if (res?.success) {
                                            this.showStatusMessage(res.message || 'Excluído!', 'success');
                                            container.querySelector(`tr[data-resident-id="${mid}"]`)?.remove();
                                        } else {
                                            this.showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error');
                                        }
                                    } catch (err) {
                                        this.showStatusMessage(`Erro: ${err.message}`, 'error');
                                    }
                                }
                            });
                            actionsCell.appendChild(btnDel);
                        }
                    });
                    
                    container.appendChild(table);
                } else {
                    const msg = document.createElement('p');
                    msg.textContent = 'Nenhum morador cadastrado.';
                    msg.className = 'empty-list-message';
                    container.appendChild(msg);
                }
            } else {
                throw new Error('Resposta inesperada.');
            }
        } catch (error) {
            console.error('[Content] Erro moradores:', error);
            container.innerHTML = '';
            const err = document.createElement('p');
            err.textContent = `Erro ao carregar moradores: ${error.message}`;
            err.className = 'error-message';
            container.appendChild(err);
        }
    }

    async buscarEExibirUsuarios(containerElement) {
        console.log('[Content] Chamando electronAPI.getUsers()...');
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
                    const headerRow = thead.insertRow();
                    const headers = ['Nome Completo', 'Usuário (Login)', 'Email', 'Nível', 'Status', 'Ações'];
                    headers.forEach(text => { 
                        const th = document.createElement('th'); 
                        th.textContent = text; 
                        headerRow.appendChild(th); 
                    });

                    const tbody = table.createTBody();
                    usuarios.forEach(user => {
                        const row = tbody.insertRow();
                        row.dataset.userId = user.id;
                        row.insertCell().textContent = user.nome_completo || 'N/A';
                        row.insertCell().textContent = user.nome_usuario || 'N/A';
                        row.insertCell().textContent = user.email || 'N/A';
                        row.insertCell().textContent = user.nivel_acesso || 'N/A';
                        
                        const statusCell = row.insertCell();
                        statusCell.textContent = user.status || 'N/A';
                        statusCell.className = `status-${(user.status || '').toLowerCase()}`;

                        const actionsCell = row.insertCell();
                        actionsCell.className = 'porteiro-actions';

                        // Botão Editar com ícone SVG
                        const btnEditar = document.createElement('button');
                        btnEditar.className = 'btn-editar-porteiro';
                        btnEditar.dataset.id = user.id;
                        btnEditar.innerHTML = `<img src="assets/editar.svg" alt="Editar" style="width: 22px; height: 22px;">`;
                        btnEditar.addEventListener('click', () => {
                            if (window.modalManager) {
                                window.modalManager.openUsuarioModal(user.id);
                            }
                        });
                        actionsCell.appendChild(btnEditar);

                        if (window.authManager?.isAdmin() && window.authManager.getCurrentUser()?.id !== user.id) {
                            const toggleSwitch = document.createElement('div');
                            const isAtivo = user.status === 'Ativo';
                            toggleSwitch.className = `toggle-switch ${isAtivo ? 'ativo' : 'inativo'}`;
                            toggleSwitch.dataset.id = user.id;
                            toggleSwitch.dataset.currentStatus = user.status;

                            toggleSwitch.addEventListener('click', async (e) => {
                                const targetToggle = e.currentTarget;
                                const userIdToToggle = targetToggle.dataset.id;
                                const currentStatus = targetToggle.dataset.currentStatus;
                                const novoStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
                                const userName = user.nome_completo || user.nome_usuario;

                                if (confirm(`${currentStatus === 'Ativo' ? 'Inativar' : 'Ativar'} usuário ${userName}?`)) {
                                    targetToggle.style.pointerEvents = 'none';
                                    try {
                                        const currentUserDataFromDB = await window.electronAPI.getUserById(userIdToToggle);
                                        if (!currentUserDataFromDB) throw new Error("Usuário não encontrado para atualizar status.");

                                        const updateData = {
                                            nomeUsuario: currentUserDataFromDB.nome_usuario,
                                            nivelAcesso: currentUserDataFromDB.nivel_acesso,
                                            nomeCompleto: currentUserDataFromDB.nome_completo,
                                            email: currentUserDataFromDB.email,
                                            status: novoStatus
                                        };

                                        if (!window.electronAPI?.updateUser) throw new Error('API updateUser indisponível');
                                        const res = await window.electronAPI.updateUser(userIdToToggle, updateData);

                                        if (res?.success) {
                                            this.showStatusMessage(res.message || `Status atualizado!`, 'success');
                                            statusCell.textContent = novoStatus;
                                            statusCell.className = `status-${novoStatus.toLowerCase()}`;
                                            
                                            // Atualizar toggle switch
                                            targetToggle.className = `toggle-switch ${novoStatus === 'Ativo' ? 'ativo' : 'inativo'}`;
                                            targetToggle.dataset.currentStatus = novoStatus;
                                            user.status = novoStatus;
                                        } else {
                                            this.showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error');
                                        }
                                    } catch (err) {
                                        this.showStatusMessage(`Erro ao alterar status: ${err.message}`, 'error');
                                    } finally {
                                        targetToggle.style.pointerEvents = 'auto';
                                        const currentStatus = statusCell.textContent;
                                        targetToggle.className = `toggle-switch ${currentStatus === 'Ativo' ? 'ativo' : 'inativo'}`;
                                        targetToggle.dataset.currentStatus = currentStatus;
                                    }
                                }
                            });
                            actionsCell.appendChild(toggleSwitch);
                        }

                        if (window.authManager?.isAdmin() && window.authManager.getCurrentUser()?.id !== user.id) {
                            // Botão Excluir com ícone SVG
                            const btnDel = document.createElement('button');
                            btnDel.className = 'btn-excluir-porteiro';
                            btnDel.dataset.id = user.id;
                            btnDel.innerHTML = `<img src="assets/excluir.svg" alt="Excluir" style="width: 22px; height: 22px;">`;
                            btnDel.addEventListener('click', async (e) => {
                                const userIdToDelete = e.currentTarget.dataset.id;
                                const userName = user.nome_completo || user.nome_usuario;
                                if (confirm(`Excluir usuário ${userName}? Esta ação não pode ser desfeita.`)) {
                                    try {
                                        if (!window.electronAPI?.deleteUser) throw new Error('API deleteUser indisponível');
                                        const res = await window.electronAPI.deleteUser(userIdToDelete);
                                        if (res?.success) { 
                                            this.showStatusMessage(res.message || 'Excluído!', 'success'); 
                                            containerElement.querySelector(`tr[data-user-id="${userIdToDelete}"]`)?.remove(); 
                                        }
                                        else { 
                                            this.showStatusMessage(`Erro: ${res?.message || 'Erro desconhecido.'}`, 'error'); 
                                        }
                                    } catch (err) { 
                                        this.showStatusMessage(`Erro: ${err.message}`, 'error'); 
                                    }
                                }
                            });
                            actionsCell.appendChild(btnDel);
                        }
                    });
                    
                    containerElement.appendChild(table);
                } else { 
                    const msg = document.createElement('p'); 
                    msg.textContent = 'Nenhum usuário cadastrado.'; 
                    msg.className = 'empty-list-message'; 
                    containerElement.appendChild(msg); 
                }
            } else { 
                throw new Error('Resposta inesperada (usuários).'); 
            }
        } catch (error) { 
            console.error('[Content] Erro buscar/exibir usuários:', error); 
            containerElement.innerHTML = ''; 
            const err = document.createElement('p'); 
            err.textContent = `Erro ao carregar usuários: ${error.message}`; 
            err.className = 'error-message'; 
            containerElement.appendChild(err); 
        }
    }

    // Métodos auxiliares
    showStatusMessage(message, type = 'info', stickyError = false) {
        if (window.authManager) {
            window.authManager.showStatusMessage(message, type, stickyError);
        }
    }

    async iniciarEdicaoEncomenda(packageId) {
        console.log(`[Content] Iniciando edição para encomenda ID: ${packageId}`);
        
        try {
            if (!window.electronAPI?.getPackageById) {
                console.error('[Content] window.electronAPI.getPackageById não disponível');
                this.showStatusMessage('Funcionalidade de edição indisponível.', 'error');
                return;
            }
            
            console.log('[Content] Chamando window.electronAPI.getPackageById...');
            const response = await window.electronAPI.getPackageById(packageId);
            console.log('[Content] Resposta recebida:', response);
            
            if (response.success && response.data) {
                console.log('[Content] Dados da encomenda recebidos, abrindo modal...');
                if (window.modalManager) {
                    window.modalManager.openEncomendaModal(packageId, response.data);
                }
            } else {
                console.error('[Content] Erro na resposta:', response);
                this.showStatusMessage(response.message || 'Erro ao buscar dados da encomenda.', 'error');
            }
        } catch (error) {
            console.error('Erro ao chamar getPackageById:', error);
            this.showStatusMessage('Erro de comunicação ao buscar encomenda.', 'error');
        }
    }

    // Métodos para seleção múltipla (simplificados)
    handlePackageSelection(event) {
        // Implementação simplificada - pode ser expandida conforme necessário
        console.log('[Content] Package selection handled');
    }

    abrirModalEntregaLote() {
        // Implementação simplificada - pode ser expandida conforme necessário
        console.log('[Content] Batch delivery modal opened');
    }

    // Métodos para configurar event listeners (simplificados)
    setupRelatoriosEventListeners(formFiltros, resultadosContainer) {
        console.log('[Content] Configurando event listeners de relatórios...');
        
        // Formulário de filtros
        if (formFiltros) {
            formFiltros.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('[Content] Formulário de relatórios enviado');
                
                try {
                    const formData = new FormData(e.target);
                    const filtros = {
                        dataInicial: formData.get('dataInicial'),
                        dataFinal: formData.get('dataFinal'),
                        morador: formData.get('morador'),
                        porteiro: formData.get('porteiro'),
                        status: formData.get('status')
                    };
                    
                    console.log('[Content] Filtros coletados:', filtros);
                    
                    // Buscar relatório via API
                    if (!window.electronAPI?.buscarRelatorio) {
                        throw new Error('API buscarRelatorio não disponível');
                    }
                    
                    const result = await window.electronAPI.buscarRelatorio(filtros);
                    
                    if (result?.success) {
                        this.exibirResultadosRelatorio(resultadosContainer, result.data);
                    } else {
                        this.showStatusMessage(result?.message || 'Erro ao buscar relatório.', 'error');
                    }
                } catch (error) {
                    console.error('[Content] Erro ao buscar relatório:', error);
                    this.showStatusMessage(`Erro ao buscar relatório: ${error.message}`, 'error');
                }
            });
        }
        
        // Botão exportar PDF
        const btnExportarPdf = document.getElementById('btn-exportar-pdf');
        if (btnExportarPdf) {
            btnExportarPdf.addEventListener('click', async () => {
                console.log('[Content] Exportando relatório PDF...');
                
                try {
                    const formData = new FormData(formFiltros);
                    const filtros = {
                        dataInicial: formData.get('dataInicial'),
                        dataFinal: formData.get('dataFinal'),
                        morador: formData.get('morador'),
                        porteiro: formData.get('porteiro'),
                        status: formData.get('status')
                    };
                    
                    if (!window.electronAPI?.exportarRelatorioPDF) {
                        throw new Error('API exportarRelatorioPDF não disponível');
                    }
                    
                    const result = await window.electronAPI.exportarRelatorioPDF(filtros);
                    
                    if (result?.success) {
                        this.showStatusMessage('Relatório PDF exportado com sucesso!', 'success');
                    } else {
                        this.showStatusMessage(result?.message || 'Erro ao exportar PDF.', 'error');
                    }
                } catch (error) {
                    console.error('[Content] Erro ao exportar PDF:', error);
                    this.showStatusMessage(`Erro ao exportar PDF: ${error.message}`, 'error');
                }
            });
        }
        
        // Botão limpar filtros
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', () => {
                console.log('[Content] Limpando filtros...');
                
                // Limpar todos os campos do formulário
                const inputs = formFiltros.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.type === 'date' || input.type === 'text') {
                        input.value = '';
                    } else if (input.tagName === 'SELECT') {
                        input.selectedIndex = 0;
                    }
                });
                
                // Limpar resultados
                resultadosContainer.innerHTML = '';
                
                this.showStatusMessage('Filtros limpos.', 'info');
            });
        }
        
        // Configurar autocomplete para morador e porteiro
        this.setupRelatoriosAutocomplete();
    }
    
    setupRelatoriosAutocomplete() {
        // Autocomplete para morador
        const inputMorador = document.getElementById('filtro-morador');
        const suggestionsMorador = document.getElementById('filtro-morador-suggestions');
        
        if (inputMorador && suggestionsMorador) {
            inputMorador.addEventListener('input', async (e) => {
                const term = e.target.value.trim();
                if (term.length < 2) {
                    suggestionsMorador.style.display = 'none';
                    return;
                }
                
                try {
                    if (!window.electronAPI?.searchResidents) {
                        return;
                    }
                    
                    const moradores = await window.electronAPI.searchResidents(term);
                    
                    if (moradores && moradores.length > 0) {
                        suggestionsMorador.innerHTML = '';
                        moradores.forEach(morador => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.textContent = morador.nome;
                            div.style.padding = '8px 12px';
                            div.style.cursor = 'pointer';
                            div.style.borderBottom = '1px solid #eee';
                            
                            div.addEventListener('click', () => {
                                inputMorador.value = morador.nome;
                                suggestionsMorador.style.display = 'none';
                            });
                            
                            div.addEventListener('mouseenter', () => {
                                div.style.backgroundColor = '#f5f5f5';
                            });
                            
                            div.addEventListener('mouseleave', () => {
                                div.style.backgroundColor = '';
                            });
                            
                            suggestionsMorador.appendChild(div);
                        });
                        suggestionsMorador.style.display = 'block';
                    } else {
                        suggestionsMorador.style.display = 'none';
                    }
                } catch (error) {
                    console.error('[Content] Erro ao buscar moradores:', error);
                }
            });
            
            // Esconder sugestões quando clicar fora
            document.addEventListener('click', (e) => {
                if (!inputMorador.contains(e.target) && !suggestionsMorador.contains(e.target)) {
                    suggestionsMorador.style.display = 'none';
                }
            });
        }
        
        // Autocomplete para porteiro
        const inputPorteiro = document.getElementById('filtro-porteiro');
        const suggestionsPorteiro = document.getElementById('filtro-porteiro-suggestions');
        
        if (inputPorteiro && suggestionsPorteiro) {
            inputPorteiro.addEventListener('input', async (e) => {
                const term = e.target.value.trim();
                if (term.length < 2) {
                    suggestionsPorteiro.style.display = 'none';
                    return;
                }
                
                try {
                    if (!window.electronAPI?.searchActivePorters) {
                        return;
                    }
                    
                    const porteiros = await window.electronAPI.searchActivePorters(term);
                    
                    if (porteiros && porteiros.length > 0) {
                        suggestionsPorteiro.innerHTML = '';
                        porteiros.forEach(porteiro => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.textContent = porteiro.nome;
                            div.style.padding = '8px 12px';
                            div.style.cursor = 'pointer';
                            div.style.borderBottom = '1px solid #eee';
                            
                            div.addEventListener('click', () => {
                                inputPorteiro.value = porteiro.nome;
                                suggestionsPorteiro.style.display = 'none';
                            });
                            
                            div.addEventListener('mouseenter', () => {
                                div.style.backgroundColor = '#f5f5f5';
                            });
                            
                            div.addEventListener('mouseleave', () => {
                                div.style.backgroundColor = '';
                            });
                            
                            suggestionsPorteiro.appendChild(div);
                        });
                        suggestionsPorteiro.style.display = 'block';
                    } else {
                        suggestionsPorteiro.style.display = 'none';
                    }
                } catch (error) {
                    console.error('[Content] Erro ao buscar porteiros:', error);
                }
            });
            
            // Esconder sugestões quando clicar fora
            document.addEventListener('click', (e) => {
                if (!inputPorteiro.contains(e.target) && !suggestionsPorteiro.contains(e.target)) {
                    suggestionsPorteiro.style.display = 'none';
                }
            });
        }
    }
    
    exibirResultadosRelatorio(container, dados) {
        console.log('[Content] Exibindo resultados do relatório:', dados);
        
        if (!dados || dados.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhum resultado encontrado para os filtros aplicados.</p>';
            return;
        }
        
        // Criar tabela de resultados
        const table = document.createElement('table');
        table.className = 'relatorio-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';
        
        // Cabeçalho
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ['Data Recebimento', 'Morador', 'AP/LT', 'Status', 'Porteiro', 'Quantidade', 'Observações'];
        
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.padding = '12px 8px';
            th.style.backgroundColor = '#f8f9fa';
            th.style.borderBottom = '2px solid #dee2e6';
            th.style.textAlign = 'left';
            headerRow.appendChild(th);
        });
        
        // Dados
        const tbody = table.createTBody();
        dados.forEach(item => {
            const row = tbody.insertRow();
            row.style.borderBottom = '1px solid #dee2e6';
            
            // Data recebimento
            const dataCell = row.insertCell();
            dataCell.textContent = new Date(item.data_recebimento).toLocaleDateString('pt-BR');
            dataCell.style.padding = '8px';
            
            // Morador
            const moradorCell = row.insertCell();
            moradorCell.textContent = item.morador_nome || 'N/A';
            moradorCell.style.padding = '8px';
            
            // AP/LT
            const apCell = row.insertCell();
            apCell.textContent = item.apartamento || 'N/A';
            apCell.style.padding = '8px';
            
            // Status
            const statusCell = row.insertCell();
            statusCell.textContent = item.status || 'N/A';
            statusCell.style.padding = '8px';
            statusCell.style.color = item.status === 'Entregue' ? '#28a745' : '#ffc107';
            
            // Porteiro
            const porteiroCell = row.insertCell();
            porteiroCell.textContent = item.porteiro_nome || 'N/A';
            porteiroCell.style.padding = '8px';
            
            // Quantidade
            const qtdCell = row.insertCell();
            qtdCell.textContent = item.quantidade || 1;
            qtdCell.style.padding = '8px';
            qtdCell.style.textAlign = 'center';
            
            // Observações
            const obsCell = row.insertCell();
            obsCell.textContent = item.observacoes || '-';
            obsCell.style.padding = '8px';
            obsCell.style.maxWidth = '200px';
            obsCell.style.overflow = 'hidden';
            obsCell.style.textOverflow = 'ellipsis';
            obsCell.style.whiteSpace = 'nowrap';
        });
        
        // Limpar container e adicionar tabela
        container.innerHTML = '';
        container.appendChild(table);
        
        // Adicionar resumo
        const resumo = document.createElement('div');
        resumo.style.marginTop = '20px';
        resumo.style.padding = '15px';
        resumo.style.backgroundColor = '#e3f2fd';
        resumo.style.borderRadius = '5px';
        resumo.innerHTML = `
            <strong>Resumo:</strong> ${dados.length} encomenda(s) encontrada(s) para os filtros aplicados.
        `;
        container.appendChild(resumo);
    }

    setupAjustesEventListeners(container) {
        console.log('[Content] Configurando event listeners de ajustes...');
        
        // Formulário de configuração do banco
        const formConfigBanco = document.getElementById('form-config-banco');
        if (formConfigBanco) {
            formConfigBanco.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('[Content] Formulário de configuração do banco enviado');
                
                try {
                    const formData = new FormData(e.target);
                    const config = {
                        host: formData.get('host'),
                        port: formData.get('port'),
                        database: formData.get('database'),
                        user: formData.get('user'),
                        password: formData.get('password')
                    };
                    
                    // Validação básica
                    if (!config.host || !config.database || !config.user || !config.password) {
                        this.showStatusMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
                        return;
                    }
                    
                    // Salvar configuração via API
                    if (!window.electronAPI?.saveDbConfig) {
                        throw new Error('API saveDbConfig não disponível');
                    }
                    
                    const result = await window.electronAPI.saveDbConfig(config);
                    
                    if (result?.success) {
                        this.showStatusMessage('Configuração salva com sucesso!', 'success');
                    } else {
                        this.showStatusMessage(result?.message || 'Erro ao salvar configuração.', 'error');
                    }
                } catch (error) {
                    console.error('[Content] Erro ao salvar configuração:', error);
                    this.showStatusMessage(`Erro ao salvar configuração: ${error.message}`, 'error');
                }
            });
        }
        
        // Botão testar conexão
        const btnTestarConexao = document.getElementById('btn-testar-conexao');
        if (btnTestarConexao) {
            btnTestarConexao.addEventListener('click', async () => {
                console.log('[Content] Testando conexão com banco...');
                
                try {
                    const formData = new FormData(formConfigBanco);
                    const config = {
                        host: formData.get('host'),
                        port: formData.get('port'),
                        database: formData.get('database'),
                        user: formData.get('user'),
                        password: formData.get('password')
                    };
                    
                    if (!window.electronAPI?.testarConexaoBanco) {
                        throw new Error('API testarConexaoBanco não disponível');
                    }
                    
                    const result = await window.electronAPI.testarConexaoBanco(config);
                    
                    if (result?.success) {
                        this.showStatusMessage('Conexão testada com sucesso!', 'success');
                    } else {
                        this.showStatusMessage(result?.message || 'Erro ao testar conexão.', 'error');
                    }
                } catch (error) {
                    console.error('[Content] Erro ao testar conexão:', error);
                    this.showStatusMessage(`Erro ao testar conexão: ${error.message}`, 'error');
                }
            });
        }
        
        // Botão criar/verificar tabelas
        const btnCriarTabelas = document.getElementById('btn-criar-tabelas');
        if (btnCriarTabelas) {
            btnCriarTabelas.addEventListener('click', async () => {
                console.log('[Content] Criando/verificando tabelas...');
                
                try {
                    if (!window.electronAPI?.criarTabelasBanco) {
                        throw new Error('API criarTabelasBanco não disponível');
                    }
                    
                    const result = await window.electronAPI.criarTabelasBanco();
                    
                    if (result?.success) {
                        this.showStatusMessage('Tabelas criadas/verificadas com sucesso!', 'success');
                    } else {
                        this.showStatusMessage(result?.message || 'Erro ao criar tabelas.', 'error');
                    }
                } catch (error) {
                    console.error('[Content] Erro ao criar tabelas:', error);
                    this.showStatusMessage(`Erro ao criar tabelas: ${error.message}`, 'error');
                }
            });
        }
        
        // Botão criar backup
        const btnCriarBackup = document.getElementById('btn-criar-backup');
        if (btnCriarBackup) {
            btnCriarBackup.addEventListener('click', async () => {
                console.log('[Content] Criando backup...');
                
                try {
                    if (!window.electronAPI?.criarBackupBanco) {
                        throw new Error('API criarBackupBanco não disponível');
                    }
                    
                    const result = await window.electronAPI.criarBackupBanco();
                    
                    if (result?.success) {
                        this.showStatusMessage('Backup criado com sucesso!', 'success');
                    } else {
                        this.showStatusMessage(result?.message || 'Erro ao criar backup.', 'error');
                    }
                } catch (error) {
                    console.error('[Content] Erro ao criar backup:', error);
                    this.showStatusMessage(`Erro ao criar backup: ${error.message}`, 'error');
                }
            });
        }
        
        // Botão refresh QR code
        const btnRefreshQr = document.getElementById('btn-refresh-qr');
        if (btnRefreshQr) {
            btnRefreshQr.addEventListener('click', () => {
                console.log('[Content] Atualizando QR code...');
                
                // Implementar atualização do QR code
                if (window.qrCodeManager) {
                    window.qrCodeManager.refreshQRCode();
                }
            });
        }
        
        // Carregar configuração atual se existir
        this.carregarConfiguracaoAtual();
    }
    
    async carregarConfiguracaoAtual() {
        try {
            if (!window.electronAPI?.getDbConfig) {
                return;
            }
            
            const config = await window.electronAPI.getDbConfig();
            
            if (config) {
                const hostInput = document.getElementById('db-host');
                const portInput = document.getElementById('db-port');
                const databaseInput = document.getElementById('db-database');
                const userInput = document.getElementById('db-user');
                const passwordInput = document.getElementById('db-password');
                
                if (hostInput) hostInput.value = config.host || '';
                if (portInput) portInput.value = config.port || '5432';
                if (databaseInput) databaseInput.value = config.database || '';
                if (userInput) userInput.value = config.user || '';
                if (passwordInput) passwordInput.value = config.password || '';
            }
        } catch (error) {
            console.error('[Content] Erro ao carregar configuração:', error);
        }
    }
}

// Exportar para uso global
window.ContentManager = ContentManager; 
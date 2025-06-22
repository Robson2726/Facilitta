// === COMPONENTE MORADORES ===

import { $, createElement, formatters, debounce, classUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { VirtualScrollManager, perfMonitor, globalCache } from '../core/performance.js';
import { openMoradorModal } from '../managers/modal-manager.js';
import { CONFIG, CSS_CLASSES, MESSAGES } from '../core/constants.js';
import { showSuccess, showError, showInfo } from '../managers/notification-manager.js';

let virtualScroll = null;

/**
 * Carrega a visualização de moradores
 */
export async function loadView(container) {
    console.log('[Moradores] Loading view...');
    
    perfMonitor.startMeasure('moradores-load');
    
    // Limpa container
    container.innerHTML = '';
    
    // Header da seção
    const headerSection = createElement('div', {
        className: 'view-header',
        innerHTML: `
            <div class="header-left">
                <h1>Moradores</h1>
                <p>Gerencie os moradores do condomínio</p>
            </div>
            <div class="header-right">
                <button class="btn btn-primary" id="btn-novo-morador">
                    <i class="fas fa-plus"></i> Novo Morador
                </button>
                <button class="btn btn-outline-primary" id="btn-importar-moradores">
                    <i class="fas fa-upload"></i> Importar
                </button>
            </div>
        `,
        parent: container
    });
    
    // Filtros e busca
    const filtersSection = createElement('div', {
        className: 'filters-section',
        innerHTML: `
            <div class="filters-row">
                <div class="filter-group search-group">
                    <label for="search-moradores">Buscar:</label>
                    <div class="search-input-group">
                        <input type="text" id="search-moradores" class="form-control" 
                               placeholder="Nome, apartamento ou bloco...">
                        <i class="fas fa-search search-icon"></i>
                    </div>
                </div>
                <div class="filter-group">
                    <label for="filter-bloco">Bloco:</label>
                    <select id="filter-bloco" class="form-control">
                        <option value="">Todos os blocos</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-status">Status:</label>
                    <select id="filter-status" class="form-control">
                        <option value="">Todos</option>
                        <option value="ativo">Ativos</option>
                        <option value="inativo">Inativos</option>
                    </select>
                </div>
                <div class="filter-actions">
                    <button class="btn btn-outline-secondary" id="btn-limpar-filtros">
                        <i class="fas fa-times"></i> Limpar
                    </button>
                    <button class="btn btn-outline-primary" id="btn-atualizar">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>
        `,
        parent: container
    });
    
    // Área de conteúdo
    const contentSection = createElement('div', {
        className: 'view-content',
        innerHTML: `
            <div class="residents-toolbar">
                <div class="toolbar-left">
                    <span class="residents-count">Carregando...</span>
                </div>
                <div class="toolbar-right">
                    <div class="view-toggle">
                        <button class="btn btn-sm view-toggle-btn active" data-view="grid">
                            <i class="fas fa-th"></i>
                        </button>
                        <button class="btn btn-sm view-toggle-btn" data-view="list">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="residents-container" id="residents-container">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Carregando moradores...</span>
                </div>
            </div>
        `,
        parent: container
    });
    
    // Setup event listeners
    setupMoradoresEventListeners();
    
    // Carrega dados
    await loadResidentsData();
    
    // Carrega filtros dinâmicos
    await loadBlocoFilter();
    
    perfMonitor.endMeasure('moradores-load');
}

/**
 * Configura event listeners da seção
 */
function setupMoradoresEventListeners() {
    // Botão novo morador
    const btnNovo = $('#btn-novo-morador');
    if (btnNovo) {
        eventManager.on(btnNovo, 'click', () => {
            openMoradorModal();
        });
    }
    
    // Botão importar
    const btnImportar = $('#btn-importar-moradores');
    if (btnImportar) {
        eventManager.on(btnImportar, 'click', handleImportMoradores);
    }
    
    // Busca com debounce
    const searchInput = $('#search-moradores');
    if (searchInput) {
        const debouncedSearch = debounce(applyFilters, CONFIG.DEBOUNCE_DELAY);
        eventManager.on(searchInput, 'input', debouncedSearch);
    }
    
    // Filtros
    const filterBloco = $('#filter-bloco');
    if (filterBloco) {
        eventManager.on(filterBloco, 'change', applyFilters);
    }
    
    const filterStatus = $('#filter-status');
    if (filterStatus) {
        eventManager.on(filterStatus, 'change', applyFilters);
    }
    
    // Botões de ação
    const btnLimparFiltros = $('#btn-limpar-filtros');
    if (btnLimparFiltros) {
        eventManager.on(btnLimparFiltros, 'click', clearFilters);
    }
    
    const btnAtualizar = $('#btn-atualizar');
    if (btnAtualizar) {
        eventManager.on(btnAtualizar, 'click', () => {
            globalCache.delete('residents-list');
            globalCache.delete('blocos-list');
            loadResidentsData();
            loadBlocoFilter();
        });
    }
    
    // Toggle de visualização
    const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
    viewToggleBtns.forEach(btn => {
        eventManager.on(btn, 'click', (e) => {
            const viewMode = e.target.closest('button').dataset.view;
            switchViewMode(viewMode);
        });
    });
    
    // Event delegation para ações nos items
    const residentsContainer = $('#residents-container');
    if (residentsContainer) {
        eventManager.delegate(residentsContainer, '.btn-editar-morador', 'click', handleEditResident);
        eventManager.delegate(residentsContainer, '.btn-excluir-morador', 'click', handleDeleteResident);
        eventManager.delegate(residentsContainer, '.btn-toggle-status', 'click', handleToggleStatus);
        eventManager.delegate(residentsContainer, '.resident-card, .resident-item', 'dblclick', handleEditResident);
    }
}

/**
 * Carrega dados dos moradores
 */
async function loadResidentsData() {
    console.log('[Moradores] Loading residents data...');
    
    const container = $('#residents-container');
    if (!container) return;
    
    try {
        // Verifica cache
        const cacheKey = 'residents-list';
        let residents = globalCache.get(cacheKey);
        
        if (!residents) {
            const result = await window.electronAPI.getAllResidents();
            if (result.success) {
                residents = result.residents;
                globalCache.set(cacheKey, residents, 2 * 60 * 1000); // 2 minutos
            } else {
                throw new Error(result.message || 'Erro ao carregar moradores');
            }
        }
        
        // Renderiza lista
        renderResidentsList(residents);
        
        // Atualiza contador
        updateResidentsCount(residents.length);
        
    } catch (error) {
        console.error('[Moradores] Error loading residents:', error);
        showErrorState(container, 'Erro ao carregar moradores');
    }
}

/**
 * Carrega opções do filtro de bloco
 */
async function loadBlocoFilter() {
    const filterBloco = $('#filter-bloco');
    if (!filterBloco) return;
    
    try {
        let blocos = globalCache.get('blocos-list');
        
        if (!blocos) {
            const result = await window.electronAPI.getBlocos();
            if (result.success) {
                blocos = result.blocos;
                globalCache.set('blocos-list', blocos, 5 * 60 * 1000); // 5 minutos
            }
        }
        
        if (blocos && blocos.length > 0) {
            // Preserva seleção atual
            const currentValue = filterBloco.value;
            
            // Limpa opções existentes (exceto "Todos")
            filterBloco.innerHTML = '<option value="">Todos os blocos</option>';
            
            // Adiciona blocos
            blocos.forEach(bloco => {
                const option = createElement('option', {
                    value: bloco.nome,
                    textContent: `Bloco ${bloco.nome}`,
                    parent: filterBloco
                });
            });
            
            // Restaura seleção
            filterBloco.value = currentValue;
        }
        
    } catch (error) {
        console.error('[Moradores] Error loading blocos:', error);
    }
}

/**
 * Renderiza lista de moradores
 */
function renderResidentsList(residents) {
    const container = $('#residents-container');
    if (!container) return;
    
    // Limpa container
    container.innerHTML = '';
    
    if (residents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Nenhum morador encontrado</h3>
                <p>Clique em "Novo Morador" para adicionar um morador</p>
            </div>
        `;
        return;
    }
    
    // Determina modo de visualização
    const viewMode = getActiveViewMode();
    
    // Cria lista virtual para performance (se necessário)
    if (residents.length > 100) {
        setupVirtualScrolling(container, residents, viewMode);
    } else {
        renderResidentsDirectly(container, residents, viewMode);
    }
}

/**
 * Renderização direta para listas menores
 */
function renderResidentsDirectly(container, residents, viewMode) {
    const listElement = createElement('div', {
        className: `residents-${viewMode}`,
        parent: container
    });
    
    residents.forEach(resident => {
        const residentElement = createResidentItem(resident, viewMode);
        listElement.appendChild(residentElement);
    });
}

/**
 * Setup virtual scrolling para listas grandes
 */
function setupVirtualScrolling(container, residents, viewMode) {
    if (virtualScroll) {
        virtualScroll.destroy();
    }
    
    const itemHeight = viewMode === 'grid' ? 200 : 80;
    virtualScroll = new VirtualScrollManager(container, itemHeight);
    
    // Sobrescreve método de criação de item
    virtualScroll.createItemElement = (resident, index) => {
        return createResidentItem(resident, viewMode, index);
    };
    
    virtualScroll.setItems(residents);
}

/**
 * Cria elemento de morador
 */
function createResidentItem(resident, viewMode = 'grid', index = 0) {
    if (viewMode === 'grid') {
        return createResidentCard(resident);
    } else {
        return createResidentListItem(resident);
    }
}

/**
 * Cria card de morador (visualização grid)
 */
function createResidentCard(resident) {
    const statusClass = resident.status === 'ativo' ? 'status-active' : 'status-inactive';
    
    return createElement('div', {
        className: `resident-card ${statusClass}`,
        innerHTML: `
            <div class="resident-card-header">
                <div class="resident-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="resident-status">
                    <span class="status-indicator ${statusClass}"></span>
                </div>
            </div>
            <div class="resident-card-body">
                <h4 class="resident-name">${resident.nome}</h4>
                <div class="resident-details">
                    <div class="detail-item">
                        <i class="fas fa-home"></i>
                        <span>Apto ${resident.apartamento}</span>
                    </div>
                    ${resident.bloco ? `
                        <div class="detail-item">
                            <i class="fas fa-building"></i>
                            <span>Bloco ${resident.bloco}</span>
                        </div>
                    ` : ''}
                    ${resident.telefone ? `
                        <div class="detail-item">
                            <i class="fas fa-phone"></i>
                            <span>${resident.telefone}</span>
                        </div>
                    ` : ''}
                    ${resident.email ? `
                        <div class="detail-item">
                            <i class="fas fa-envelope"></i>
                            <span>${resident.email}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="resident-card-footer">
                <div class="resident-actions">
                    <button class="btn btn-sm btn-primary btn-editar-morador" 
                            data-resident-id="${resident.id}"
                            title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${resident.status === 'ativo' ? 'btn-warning' : 'btn-success'} btn-toggle-status" 
                            data-resident-id="${resident.id}"
                            data-current-status="${resident.status}"
                            title="${resident.status === 'ativo' ? 'Desativar' : 'Ativar'}">
                        <i class="fas ${resident.status === 'ativo' ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-excluir-morador" 
                            data-resident-id="${resident.id}"
                            title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="resident-stats">
                    <small class="text-muted">ID: ${resident.id}</small>
                </div>
            </div>
        `
    });
}

/**
 * Cria item de morador (visualização lista)
 */
function createResidentListItem(resident) {
    const statusClass = resident.status === 'ativo' ? 'status-active' : 'status-inactive';
    
    return createElement('div', {
        className: `resident-item ${statusClass}`,
        innerHTML: `
            <div class="resident-item-content">
                <div class="resident-main-info">
                    <div class="resident-avatar-small">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="resident-info">
                        <h5 class="resident-name">${resident.nome}</h5>
                        <div class="resident-location">
                            <span class="apartamento">Apto ${resident.apartamento}</span>
                            ${resident.bloco ? `<span class="bloco">Bloco ${resident.bloco}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="resident-contact">
                    ${resident.telefone ? `<span class="telefone">${resident.telefone}</span>` : ''}
                    ${resident.email ? `<span class="email">${resident.email}</span>` : ''}
                </div>
                <div class="resident-status-info">
                    <span class="status-badge ${statusClass}">
                        ${resident.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="resident-actions">
                    <button class="btn btn-sm btn-primary btn-editar-morador" 
                            data-resident-id="${resident.id}"
                            title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${resident.status === 'ativo' ? 'btn-warning' : 'btn-success'} btn-toggle-status" 
                            data-resident-id="${resident.id}"
                            data-current-status="${resident.status}"
                            title="${resident.status === 'ativo' ? 'Desativar' : 'Ativar'}">
                        <i class="fas ${resident.status === 'ativo' ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-excluir-morador" 
                            data-resident-id="${resident.id}"
                            title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
    });
}

/**
 * Handlers de eventos
 */
async function handleEditResident(event) {
    const button = event.target.closest('[data-resident-id]');
    const residentId = button.dataset.residentId;
    
    openMoradorModal(residentId);
}

async function handleDeleteResident(event) {
    const button = event.target.closest('.btn-excluir-morador');
    const residentId = button.dataset.residentId;
    
    if (confirm('Tem certeza que deseja excluir este morador?')) {
        try {
            const result = await window.electronAPI.deleteResident(residentId);
            if (result.success) {
                showMessage(MESSAGES.DELETE_SUCCESS, 'success');
                // Recarrega lista
                globalCache.delete('residents-list');
                loadResidentsData();
            } else {
                showMessage(result.message || MESSAGES.DELETE_ERROR, 'error');
            }
        } catch (error) {
            console.error('[Moradores] Error deleting resident:', error);
            showMessage(MESSAGES.CONNECTION_ERROR, 'error');
        }
    }
}

async function handleToggleStatus(event) {
    const button = event.target.closest('.btn-toggle-status');
    const residentId = button.dataset.residentId;
    const currentStatus = button.dataset.currentStatus;
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    
    try {
        const result = await window.electronAPI.updateResidentStatus(residentId, newStatus);
        if (result.success) {
            showMessage(`Morador ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso`, 'success');
            // Recarrega lista
            globalCache.delete('residents-list');
            loadResidentsData();
        } else {
            showMessage(result.message || 'Erro ao alterar status', 'error');
        }
    } catch (error) {
        console.error('[Moradores] Error toggling status:', error);
        showMessage(MESSAGES.CONNECTION_ERROR, 'error');
    }
}

function handleImportMoradores() {
    // TODO: Implementar importação de moradores
    console.log('[Moradores] Import functionality not implemented yet');
    showMessage('Funcionalidade de importação em desenvolvimento', 'info');
}

/**
 * Funções de filtro e busca
 */
function applyFilters() {
    const search = $('#search-moradores')?.value.toLowerCase() || '';
    const bloco = $('#filter-bloco')?.value || '';
    const status = $('#filter-status')?.value || '';
    
    console.log('[Moradores] Applying filters:', { search, bloco, status });
    
    loadFilteredResidents({ search, bloco, status });
}

async function loadFilteredResidents(filters) {
    const container = $('#residents-container');
    if (!container) return;
    
    showLoadingState(container);
    
    try {
        const result = await window.electronAPI.getFilteredResidents(filters);
        if (result.success) {
            renderResidentsList(result.residents);
            updateResidentsCount(result.residents.length);
        }
    } catch (error) {
        console.error('[Moradores] Error applying filters:', error);
        showErrorState(container, 'Erro ao aplicar filtros');
    }
}

function clearFilters() {
    const searchInput = $('#search-moradores');
    const filterBloco = $('#filter-bloco');
    const filterStatus = $('#filter-status');
    
    if (searchInput) searchInput.value = '';
    if (filterBloco) filterBloco.value = '';
    if (filterStatus) filterStatus.value = '';
    
    loadResidentsData();
}

/**
 * Funções de visualização
 */
function switchViewMode(mode) {
    // Atualiza botões
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    toggleBtns.forEach(btn => {
        classUtils.remove(btn, 'active');
        if (btn.dataset.view === mode) {
            classUtils.add(btn, 'active');
        }
    });
    
    // Salva preferência
    localStorage.setItem('moradores-view-mode', mode);
    
    // Recarrega com novo modo
    const cacheKey = 'residents-list';
    const residents = globalCache.get(cacheKey);
    if (residents) {
        renderResidentsList(residents);
    }
}

function getActiveViewMode() {
    const saved = localStorage.getItem('moradores-view-mode');
    if (saved && ['grid', 'list'].includes(saved)) {
        return saved;
    }
    return 'grid'; // padrão
}

/**
 * Funções utilitárias
 */
function updateResidentsCount(count) {
    const countElement = document.querySelector('.residents-count');
    if (countElement) {
        countElement.textContent = `${count} morador${count !== 1 ? 'es' : ''} encontrado${count !== 1 ? 's' : ''}`;
    }
}

function showLoadingState(container) {
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Carregando...</span>
        </div>
    `;
}

function showErrorState(container, message) {
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                Tentar Novamente
            </button>
        </div>
    `;
}

function showMessage(message, type = 'info') {
    switch (type) {
        case 'success':
            showSuccess(message);
            break;
        case 'error':
            showError(message);
            break;
        case 'info':
        default:
            showInfo(message);
            break;
    }
}

/**
 * Cleanup
 */
export function cleanup() {
    if (virtualScroll) {
        virtualScroll.destroy();
        virtualScroll = null;
    }
    globalCache.delete('residents-list');
    globalCache.delete('blocos-list');
}
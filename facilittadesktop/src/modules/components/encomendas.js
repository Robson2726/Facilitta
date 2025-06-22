// === COMPONENTE ENCOMENDAS ===

import { $, createElement, formatters, debounce, classUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { VirtualScrollManager, perfMonitor, globalCache } from '../core/performance.js';
import { openEncomendaModal, openEntregaModal } from '../managers/modal-manager.js';
import { setupMoradorAutocomplete, setupPorteiroAutocomplete, getSelectedIds } from './autocomplete.js';
import { CONFIG, CSS_CLASSES, MESSAGES } from '../core/constants.js';
import { showSuccess, showError, showInfo } from '../managers/notification-manager.js';

let virtualScroll = null;
let selectedPackages = [];

/**
 * Carrega a visualização de encomendas
 */
export async function loadView(container) {
    console.log('[Encomendas] Loading view...');
    
    perfMonitor.startMeasure('encomendas-load');
    
    // Limpa container
    container.innerHTML = '';
    
    // Header da seção
    const headerSection = createElement('div', {
        className: 'view-header',
        innerHTML: `
            <div class="header-left">
                <h1>Encomendas</h1>
                <p>Gerencie as encomendas dos moradores</p>
            </div>
            <div class="header-right">
                <button class="btn btn-primary" id="btn-nova-encomenda">
                    <i class="fas fa-plus"></i> Nova Encomenda
                </button>
                <button class="btn btn-secondary" id="btn-entrega-lote" style="display: none;">
                    <i class="fas fa-truck"></i> Entregar Selecionadas (<span id="count-selected">0</span>)
                </button>
            </div>
        `,
        parent: container
    });
    
    // Filtros
    const filtersSection = createElement('div', {
        className: 'filters-section',
        innerHTML: `
            <div class="filters-row">
                <div class="filter-group">
                    <label for="filter-status">Status:</label>
                    <select id="filter-status" class="form-control">
                        <option value="">Todos</option>
                        <option value="pendente">Pendentes</option>
                        <option value="entregue">Entregues</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-morador">Morador:</label>
                    <input type="text" id="filter-morador" class="form-control" placeholder="Filtrar por morador...">
                </div>
                <div class="filter-group">
                    <label for="filter-data">Data:</label>
                    <input type="date" id="filter-data" class="form-control">
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
            <div class="packages-toolbar">
                <div class="toolbar-left">
                    <span class="packages-count">Carregando...</span>
                </div>
                <div class="toolbar-right">
                    <label class="checkbox-container">
                        <input type="checkbox" id="select-all-packages">
                        <span class="checkmark"></span>
                        Selecionar todos
                    </label>
                </div>
            </div>
            <div class="packages-container" id="packages-container">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Carregando encomendas...</span>
                </div>
            </div>
        `,
        parent: container
    });
    
    // Setup event listeners
    setupEncomendaEventListeners();
    
    // Carrega dados
    await loadPackagesData();
    
    perfMonitor.endMeasure('encomendas-load');
}

/**
 * Configura event listeners da seção
 */
function setupEncomendaEventListeners() {
    // Botão nova encomenda
    const btnNova = $('#btn-nova-encomenda');
    if (btnNova) {
        eventManager.on(btnNova, 'click', () => {
            openEncomendaModal();
            // Setup autocomplete quando modal abrir
            setTimeout(() => {
                setupMoradorAutocomplete();
                setupPorteiroAutocomplete();
            }, 100);
        });
    }
    
    // Botão entrega em lote
    const btnEntregaLote = $('#btn-entrega-lote');
    if (btnEntregaLote) {
        eventManager.on(btnEntregaLote, 'click', handleBatchDelivery);
    }
    
    // Select all checkbox
    const selectAllCheckbox = $('#select-all-packages');
    if (selectAllCheckbox) {
        eventManager.on(selectAllCheckbox, 'change', handleSelectAll);
    }
    
    // Filtros com debounce
    const filterMorador = $('#filter-morador');
    if (filterMorador) {
        const debouncedFilter = debounce(applyFilters, CONFIG.DEBOUNCE_DELAY);
        eventManager.on(filterMorador, 'input', debouncedFilter);
    }
    
    const filterStatus = $('#filter-status');
    if (filterStatus) {
        eventManager.on(filterStatus, 'change', applyFilters);
    }
    
    const filterData = $('#filter-data');
    if (filterData) {
        eventManager.on(filterData, 'change', applyFilters);
    }
    
    // Botões de ação
    const btnLimparFiltros = $('#btn-limpar-filtros');
    if (btnLimparFiltros) {
        eventManager.on(btnLimparFiltros, 'click', clearFilters);
    }
    
    const btnAtualizar = $('#btn-atualizar');
    if (btnAtualizar) {
        eventManager.on(btnAtualizar, 'click', () => {
            globalCache.delete('packages-list');
            loadPackagesData();
        });
    }
    
    // Event delegation para ações nos items
    const packagesContainer = $('#packages-container');
    if (packagesContainer) {
        // Checkboxes de seleção
        eventManager.delegate(packagesContainer, '.package-checkbox', 'change', handlePackageSelection);
        
        // Botões de ação
        eventManager.delegate(packagesContainer, '.btn-entregar', 'click', handleDeliveryAction);
        eventManager.delegate(packagesContainer, '.btn-editar', 'click', handleEditAction);
        eventManager.delegate(packagesContainer, '.btn-excluir', 'click', handleDeleteAction);
    }
}

/**
 * Carrega dados das encomendas
 */
async function loadPackagesData() {
    console.log('[Encomendas] Loading packages data...');
    
    const container = $('#packages-container');
    if (!container) return;
    
    try {
        // Verifica cache
        const cacheKey = 'packages-list';
        let packages = globalCache.get(cacheKey);
        
        if (!packages) {
            const result = await window.electronAPI.getAllPackages();
            if (result.success) {
                packages = result.packages;
                globalCache.set(cacheKey, packages, 60 * 1000); // 1 minuto
            } else {
                throw new Error(result.message || 'Erro ao carregar encomendas');
            }
        }
        
        // Renderiza lista
        renderPackagesList(packages);
        
        // Atualiza contador
        updatePackagesCount(packages.length);
        
    } catch (error) {
        console.error('[Encomendas] Error loading packages:', error);
        showErrorState(container, 'Erro ao carregar encomendas');
    }
}

/**
 * Renderiza lista de encomendas
 */
function renderPackagesList(packages) {
    const container = $('#packages-container');
    if (!container) return;
    
    // Limpa container
    container.innerHTML = '';
    
    if (packages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Nenhuma encomenda encontrada</h3>
                <p>Clique em "Nova Encomenda" para adicionar uma encomenda</p>
            </div>
        `;
        return;
    }
    
    // Cria lista virtual para performance
    if (packages.length > 50) {
        setupVirtualScrolling(container, packages);
    } else {
        renderPackagesDirectly(container, packages);
    }
}

/**
 * Renderização direta para listas pequenas
 */
function renderPackagesDirectly(container, packages) {
    const listElement = createElement('div', {
        className: 'packages-list',
        parent: container
    });
    
    packages.forEach(pkg => {
        const packageElement = createPackageItem(pkg);
        listElement.appendChild(packageElement);
    });
}

/**
 * Setup virtual scrolling para listas grandes
 */
function setupVirtualScrolling(container, packages) {
    if (virtualScroll) {
        virtualScroll.destroy();
    }
    
    virtualScroll = new VirtualScrollManager(container, 120); // 120px por item
    
    // Sobrescreve método de criação de item
    virtualScroll.createItemElement = (pkg, index) => {
        return createPackageItem(pkg, index);
    };
    
    virtualScroll.setItems(packages);
}

/**
 * Cria elemento de encomenda
 */
function createPackageItem(pkg, index = 0) {
    const statusClass = getStatusClass(pkg.status);
    const dataFormatada = formatters.date(pkg.data_recebimento);
    const horaFormatada = formatters.time(pkg.data_recebimento);
    
    return createElement('div', {
        className: `package-item ${statusClass}`,
        innerHTML: `
            <div class="package-checkbox-container">
                <label class="checkbox-container">
                    <input type="checkbox" class="package-checkbox" 
                           data-package-id="${pkg.id}" 
                           data-morador-nome="${pkg.morador_nome}"
                           ${pkg.status === 'entregue' ? 'disabled' : ''}>
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="package-content">
                <div class="package-header">
                    <div class="package-morador">
                        <strong>${pkg.morador_nome}</strong>
                        <span class="package-apartamento">Apto: ${pkg.apartamento || 'N/A'}</span>
                    </div>
                    <div class="package-date">
                        <span class="date">${dataFormatada}</span>
                        <span class="time">${horaFormatada}</span>
                    </div>
                </div>
                <div class="package-details">
                    <div class="package-info">
                        <span class="package-remetente">
                            <i class="fas fa-user"></i> ${pkg.remetente || 'N/A'}
                        </span>
                        <span class="package-porteiro">
                            <i class="fas fa-user-tie"></i> ${pkg.porteiro_nome}
                        </span>
                        ${pkg.observacoes ? `<span class="package-obs"><i class="fas fa-sticky-note"></i> ${pkg.observacoes}</span>` : ''}
                    </div>
                    <div class="package-status">
                        <span class="status-badge status-${pkg.status}">
                            ${pkg.status === 'pendente' ? 'Pendente' : 'Entregue'}
                        </span>
                    </div>
                </div>
                ${pkg.data_entrega ? `
                    <div class="package-delivery-info">
                        <i class="fas fa-check-circle"></i>
                        Entregue em ${formatters.datetime(pkg.data_entrega)}
                        ${pkg.entregue_para ? ` para ${pkg.entregue_para}` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="package-actions">
                ${pkg.status === 'pendente' ? `
                    <button class="btn btn-sm btn-success btn-entregar" 
                            data-package-id="${pkg.id}" 
                            data-morador-nome="${pkg.morador_nome}"
                            title="Registrar Entrega">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-primary btn-editar" 
                        data-package-id="${pkg.id}"
                        title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-excluir" 
                        data-package-id="${pkg.id}"
                        title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `
    });
}

/**
 * Handlers de eventos
 */
function handlePackageSelection(event) {
    const checkbox = event.target;
    const packageId = checkbox.dataset.packageId;
    const moradorNome = checkbox.dataset.moradorNome;
    
    if (checkbox.checked) {
        if (!selectedPackages.find(p => p.id === packageId)) {
            selectedPackages.push({ id: packageId, moradorNome });
        }
    } else {
        selectedPackages = selectedPackages.filter(p => p.id !== packageId);
    }
    
    updateBatchDeliveryUI();
}

function handleSelectAll(event) {
    const checkboxes = document.querySelectorAll('.package-checkbox:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.checked = event.target.checked;
        
        const packageId = cb.dataset.packageId;
        const moradorNome = cb.dataset.moradorNome;
        
        if (event.target.checked) {
            if (!selectedPackages.find(p => p.id === packageId)) {
                selectedPackages.push({ id: packageId, moradorNome });
            }
        } else {
            selectedPackages = selectedPackages.filter(p => p.id !== packageId);
        }
    });
    
    updateBatchDeliveryUI();
}

async function handleDeliveryAction(event) {
    const button = event.target.closest('.btn-entregar');
    const packageId = button.dataset.packageId;
    const moradorNome = button.dataset.moradorNome;
    
    openEntregaModal(packageId, moradorNome);
    
    // Setup autocomplete quando modal abrir
    setTimeout(() => {
        import('./autocomplete.js').then(({ setupEntregaPorteiroAutocomplete }) => {
            setupEntregaPorteiroAutocomplete();
        });
    }, 100);
}

async function handleEditAction(event) {
    const button = event.target.closest('.btn-editar');
    const packageId = button.dataset.packageId;
    
    try {
        // Busca dados da encomenda
        const result = await window.electronAPI.getPackageById(packageId);
        if (result.success) {
            openEncomendaModal(packageId, result.package);
            
            // Setup autocomplete
            setTimeout(() => {
                setupMoradorAutocomplete();
                setupPorteiroAutocomplete();
            }, 100);
        }
    } catch (error) {
        console.error('[Encomendas] Error loading package for edit:', error);
        showMessage(MESSAGES.CONNECTION_ERROR, 'error');
    }
}

async function handleDeleteAction(event) {
    const button = event.target.closest('.btn-excluir');
    const packageId = button.dataset.packageId;
    
    if (confirm('Tem certeza que deseja excluir esta encomenda?')) {
        try {
            const result = await window.electronAPI.deletePackage(packageId);
            if (result.success) {
                showMessage(MESSAGES.DELETE_SUCCESS, 'success');
                // Recarrega lista
                globalCache.delete('packages-list');
                loadPackagesData();
            } else {
                showMessage(result.message || MESSAGES.DELETE_ERROR, 'error');
            }
        } catch (error) {
            console.error('[Encomendas] Error deleting package:', error);
            showMessage(MESSAGES.CONNECTION_ERROR, 'error');
        }
    }
}

function handleBatchDelivery() {
    if (selectedPackages.length === 0) return;
    
    // TODO: Implementar modal de entrega em lote
    console.log('[Encomendas] Batch delivery for:', selectedPackages);
}

/**
 * Funções de filtro
 */
function applyFilters() {
    const status = $('#filter-status')?.value || '';
    const morador = $('#filter-morador')?.value.toLowerCase() || '';
    const data = $('#filter-data')?.value || '';
    
    console.log('[Encomendas] Applying filters:', { status, morador, data });
    
    // TODO: Implementar lógica de filtro
    // Por agora, recarrega com novos parâmetros
    loadFilteredPackages({ status, morador, data });
}

async function loadFilteredPackages(filters) {
    const container = $('#packages-container');
    if (!container) return;
    
    showLoadingState(container);
    
    try {
        const result = await window.electronAPI.getFilteredPackages(filters);
        if (result.success) {
            renderPackagesList(result.packages);
            updatePackagesCount(result.packages.length);
        }
    } catch (error) {
        console.error('[Encomendas] Error applying filters:', error);
        showErrorState(container, 'Erro ao aplicar filtros');
    }
}

function clearFilters() {
    const filterStatus = $('#filter-status');
    const filterMorador = $('#filter-morador');
    const filterData = $('#filter-data');
    
    if (filterStatus) filterStatus.value = '';
    if (filterMorador) filterMorador.value = '';
    if (filterData) filterData.value = '';
    
    loadPackagesData();
}

/**
 * Funções utilitárias
 */
function updateBatchDeliveryUI() {
    const btnEntregaLote = $('#btn-entrega-lote');
    const countSpan = $('#count-selected');
    
    if (btnEntregaLote && countSpan) {
        if (selectedPackages.length > 0) {
            btnEntregaLote.style.display = 'inline-flex';
            countSpan.textContent = selectedPackages.length;
        } else {
            btnEntregaLote.style.display = 'none';
        }
    }
}

function updatePackagesCount(count) {
    const countElement = document.querySelector('.packages-count');
    if (countElement) {
        countElement.textContent = `${count} encomenda${count !== 1 ? 's' : ''} encontrada${count !== 1 ? 's' : ''}`;
    }
}

function getStatusClass(status) {
    return status === 'pendente' ? 'package-pending' : 'package-delivered';
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
    selectedPackages = [];
    globalCache.delete('packages-list');
}
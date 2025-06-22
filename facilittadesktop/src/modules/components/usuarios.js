// === COMPONENTE USUÁRIOS ===

import { $, createElement, formatters, debounce, classUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { perfMonitor, globalCache } from '../core/performance.js';
import { openUsuarioModal } from '../managers/modal-manager.js';
import { authManager } from '../managers/auth-manager.js';
import { CONFIG, CSS_CLASSES, MESSAGES } from '../core/constants.js';
import { showSuccess, showError, showInfo } from '../managers/notification-manager.js';

/**
 * Carrega a visualização de usuários
 */
export async function loadView(container) {
    console.log('[Usuarios] Loading view...');
    
    perfMonitor.startMeasure('usuarios-load');
    
    // Verifica permissões
    if (!authManager.hasPermission('manage_users')) {
        container.innerHTML = `
            <div class="no-permission-state">
                <i class="fas fa-lock"></i>
                <h3>Acesso Negado</h3>
                <p>Você não tem permissão para gerenciar usuários.</p>
            </div>
        `;
        return;
    }
    
    // Limpa container
    container.innerHTML = '';
    
    // Header da seção
    const headerSection = createElement('div', {
        className: 'view-header',
        innerHTML: `
            <div class="header-left">
                <h1>Usuários</h1>
                <p>Gerencie os usuários do sistema</p>
            </div>
            <div class="header-right">
                <button class="btn btn-primary" id="btn-novo-usuario">
                    <i class="fas fa-plus"></i> Novo Usuário
                </button>
                <button class="btn btn-outline-secondary" id="btn-configuracoes-sistema">
                    <i class="fas fa-cog"></i> Configurações
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
                    <label for="search-usuarios">Buscar:</label>
                    <div class="search-input-group">
                        <input type="text" id="search-usuarios" class="form-control" 
                               placeholder="Nome, usuário ou email...">
                        <i class="fas fa-search search-icon"></i>
                    </div>
                </div>
                <div class="filter-group">
                    <label for="filter-role">Função:</label>
                    <select id="filter-role" class="form-control">
                        <option value="">Todas as funções</option>
                        <option value="admin">Administrador</option>
                        <option value="porteiro">Porteiro</option>
                        <option value="gerente">Gerente</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-status">Status:</label>
                    <select id="filter-status" class="form-control">
                        <option value="">Todos</option>
                        <option value="ativo">Ativos</option>
                        <option value="inativo">Inativos</option>
                        <option value="bloqueado">Bloqueados</option>
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
            <div class="users-toolbar">
                <div class="toolbar-left">
                    <span class="users-count">Carregando...</span>
                </div>
                <div class="toolbar-right">
                    <div class="bulk-actions" style="display: none;">
                        <button class="btn btn-sm btn-warning" id="btn-bulk-deactivate">
                            <i class="fas fa-pause"></i> Desativar Selecionados
                        </button>
                        <button class="btn btn-sm btn-danger" id="btn-bulk-delete">
                            <i class="fas fa-trash"></i> Excluir Selecionados
                        </button>
                    </div>
                </div>
            </div>
            <div class="users-container" id="users-container">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Carregando usuários...</span>
                </div>
            </div>
        `,
        parent: container
    });
    
    // Setup event listeners
    setupUsuariosEventListeners();
    
    // Carrega dados
    await loadUsersData();
    
    perfMonitor.endMeasure('usuarios-load');
}

/**
 * Configura event listeners da seção
 */
function setupUsuariosEventListeners() {
    // Botão novo usuário
    const btnNovo = $('#btn-novo-usuario');
    if (btnNovo) {
        eventManager.on(btnNovo, 'click', () => {
            openUsuarioModal();
        });
    }
    
    // Botão configurações
    const btnConfig = $('#btn-configuracoes-sistema');
    if (btnConfig) {
        eventManager.on(btnConfig, 'click', handleSystemConfig);
    }
    
    // Busca com debounce
    const searchInput = $('#search-usuarios');
    if (searchInput) {
        const debouncedSearch = debounce(applyFilters, CONFIG.DEBOUNCE_DELAY);
        eventManager.on(searchInput, 'input', debouncedSearch);
    }
    
    // Filtros
    const filterRole = $('#filter-role');
    if (filterRole) {
        eventManager.on(filterRole, 'change', applyFilters);
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
            globalCache.delete('users-list');
            loadUsersData();
        });
    }
    
    // Ações em lote
    const btnBulkDeactivate = $('#btn-bulk-deactivate');
    if (btnBulkDeactivate) {
        eventManager.on(btnBulkDeactivate, 'click', handleBulkDeactivate);
    }
    
    const btnBulkDelete = $('#btn-bulk-delete');
    if (btnBulkDelete) {
        eventManager.on(btnBulkDelete, 'click', handleBulkDelete);
    }
    
    // Event delegation para ações nos items
    const usersContainer = $('#users-container');
    if (usersContainer) {
        eventManager.delegate(usersContainer, '.user-checkbox', 'change', handleUserSelection);
        eventManager.delegate(usersContainer, '.btn-editar-usuario', 'click', handleEditUser);
        eventManager.delegate(usersContainer, '.btn-excluir-usuario', 'click', handleDeleteUser);
        eventManager.delegate(usersContainer, '.btn-toggle-status', 'click', handleToggleStatus);
        eventManager.delegate(usersContainer, '.btn-reset-password', 'click', handleResetPassword);
        eventManager.delegate(usersContainer, '.btn-view-activity', 'click', handleViewActivity);
    }
}

/**
 * Carrega dados dos usuários
 */
async function loadUsersData() {
    console.log('[Usuarios] Loading users data...');
    
    const container = $('#users-container');
    if (!container) return;
    
    try {
        // Verifica cache
        const cacheKey = 'users-list';
        let users = globalCache.get(cacheKey);
        
        if (!users) {
            const result = await window.electronAPI.getAllUsers();
            if (result.success) {
                users = result.users;
                globalCache.set(cacheKey, users, 2 * 60 * 1000); // 2 minutos
            } else {
                throw new Error(result.message || 'Erro ao carregar usuários');
            }
        }
        
        // Renderiza lista
        renderUsersList(users);
        
        // Atualiza contador
        updateUsersCount(users.length);
        
    } catch (error) {
        console.error('[Usuarios] Error loading users:', error);
        showErrorState(container, 'Erro ao carregar usuários');
    }
}

/**
 * Renderiza lista de usuários
 */
function renderUsersList(users) {
    const container = $('#users-container');
    if (!container) return;
    
    // Limpa container
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Nenhum usuário encontrado</h3>
                <p>Clique em "Novo Usuário" para adicionar um usuário</p>
            </div>
        `;
        return;
    }
    
    // Cria tabela de usuários
    const tableElement = createElement('div', {
        className: 'users-table',
        innerHTML: `
            <div class="table-header">
                <div class="table-row header-row">
                    <div class="table-cell cell-checkbox">
                        <label class="checkbox-container">
                            <input type="checkbox" id="select-all-users">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                    <div class="table-cell cell-user">Usuário</div>
                    <div class="table-cell cell-role">Função</div>
                    <div class="table-cell cell-status">Status</div>
                    <div class="table-cell cell-last-login">Último Login</div>
                    <div class="table-cell cell-actions">Ações</div>
                </div>
            </div>
            <div class="table-body" id="users-table-body"></div>
        `,
        parent: container
    });
    
    // Renderiza linhas
    const tableBody = $('#users-table-body');
    users.forEach(user => {
        const userRow = createUserRow(user);
        tableBody.appendChild(userRow);
    });
    
    // Setup select all
    const selectAllCheckbox = $('#select-all-users');
    if (selectAllCheckbox) {
        eventManager.on(selectAllCheckbox, 'change', handleSelectAllUsers);
    }
}

/**
 * Cria linha de usuário
 */
function createUserRow(user) {
    const statusClass = getStatusClass(user.status);
    const roleLabel = getRoleLabel(user.role);
    const lastLoginFormatted = user.ultimo_login ? 
        formatters.datetime(user.ultimo_login) : 'Nunca';
    
    const currentUser = authManager.getCurrentUser();
    const isCurrentUser = currentUser && currentUser.id === user.id;
    const canEdit = authManager.hasPermission('edit_users') || isCurrentUser;
    const canDelete = authManager.hasPermission('delete_users') && !isCurrentUser;
    
    return createElement('div', {
        className: `table-row user-row ${statusClass}`,
        innerHTML: `
            <div class="table-cell cell-checkbox">
                <label class="checkbox-container">
                    <input type="checkbox" class="user-checkbox" 
                           data-user-id="${user.id}"
                           ${isCurrentUser ? 'disabled' : ''}>
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="table-cell cell-user">
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">
                            ${user.nome}
                            ${isCurrentUser ? '<span class="current-user-badge">Você</span>' : ''}
                        </div>
                        <div class="user-username">@${user.username}</div>
                        ${user.email ? `<div class="user-email">${user.email}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="table-cell cell-role">
                <span class="role-badge role-${user.role}">${roleLabel}</span>
            </div>
            <div class="table-cell cell-status">
                <span class="status-badge ${statusClass}">
                    <span class="status-indicator"></span>
                    ${getStatusLabel(user.status)}
                </span>
            </div>
            <div class="table-cell cell-last-login">
                <span class="last-login-date">${lastLoginFormatted}</span>
            </div>
            <div class="table-cell cell-actions">
                <div class="action-buttons">
                    ${canEdit ? `
                        <button class="btn btn-sm btn-primary btn-editar-usuario" 
                                data-user-id="${user.id}"
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    
                    ${!isCurrentUser && authManager.hasPermission('manage_users') ? `
                        <button class="btn btn-sm ${user.status === 'ativo' ? 'btn-warning' : 'btn-success'} btn-toggle-status" 
                                data-user-id="${user.id}"
                                data-current-status="${user.status}"
                                title="${user.status === 'ativo' ? 'Desativar' : 'Ativar'}">
                            <i class="fas ${user.status === 'ativo' ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                    ` : ''}
                    
                    ${authManager.hasPermission('reset_passwords') ? `
                        <button class="btn btn-sm btn-info btn-reset-password" 
                                data-user-id="${user.id}"
                                title="Resetar Senha">
                            <i class="fas fa-key"></i>
                        </button>
                    ` : ''}
                    
                    ${authManager.hasPermission('view_activity') ? `
                        <button class="btn btn-sm btn-secondary btn-view-activity" 
                                data-user-id="${user.id}"
                                title="Ver Atividade">
                            <i class="fas fa-history"></i>
                        </button>
                    ` : ''}
                    
                    ${canDelete ? `
                        <button class="btn btn-sm btn-danger btn-excluir-usuario" 
                                data-user-id="${user.id}"
                                title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `
    });
}

/**
 * Handlers de eventos
 */
let selectedUsers = [];

function handleUserSelection(event) {
    const checkbox = event.target;
    const userId = checkbox.dataset.userId;
    
    if (checkbox.checked) {
        if (!selectedUsers.includes(userId)) {
            selectedUsers.push(userId);
        }
    } else {
        selectedUsers = selectedUsers.filter(id => id !== userId);
    }
    
    updateBulkActionsUI();
}

function handleSelectAllUsers(event) {
    const checkboxes = document.querySelectorAll('.user-checkbox:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.checked = event.target.checked;
        
        const userId = cb.dataset.userId;
        if (event.target.checked) {
            if (!selectedUsers.includes(userId)) {
                selectedUsers.push(userId);
            }
        } else {
            selectedUsers = selectedUsers.filter(id => id !== userId);
        }
    });
    
    updateBulkActionsUI();
}

async function handleEditUser(event) {
    const button = event.target.closest('.btn-editar-usuario');
    const userId = button.dataset.userId;
    
    openUsuarioModal(userId);
}

async function handleDeleteUser(event) {
    const button = event.target.closest('.btn-excluir-usuario');
    const userId = button.dataset.userId;
    
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            const result = await window.electronAPI.deleteUser(userId);
            if (result.success) {
                showMessage(MESSAGES.DELETE_SUCCESS, 'success');
                // Recarrega lista
                globalCache.delete('users-list');
                loadUsersData();
            } else {
                showMessage(result.message || MESSAGES.DELETE_ERROR, 'error');
            }
        } catch (error) {
            console.error('[Usuarios] Error deleting user:', error);
            showMessage(MESSAGES.CONNECTION_ERROR, 'error');
        }
    }
}

async function handleToggleStatus(event) {
    const button = event.target.closest('.btn-toggle-status');
    const userId = button.dataset.userId;
    const currentStatus = button.dataset.currentStatus;
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    
    try {
        const result = await window.electronAPI.updateUserStatus(userId, newStatus);
        if (result.success) {
            showMessage(`Usuário ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso`, 'success');
            // Recarrega lista
            globalCache.delete('users-list');
            loadUsersData();
        } else {
            showMessage(result.message || 'Erro ao alterar status', 'error');
        }
    } catch (error) {
        console.error('[Usuarios] Error toggling status:', error);
        showMessage(MESSAGES.CONNECTION_ERROR, 'error');
    }
}

async function handleResetPassword(event) {
    const button = event.target.closest('.btn-reset-password');
    const userId = button.dataset.userId;
    
    if (confirm('Tem certeza que deseja resetar a senha deste usuário?')) {
        try {
            const result = await window.electronAPI.resetUserPassword(userId);
            if (result.success) {
                showMessage(`Senha resetada com sucesso. Nova senha: ${result.newPassword}`, 'success');
            } else {
                showMessage(result.message || 'Erro ao resetar senha', 'error');
            }
        } catch (error) {
            console.error('[Usuarios] Error resetting password:', error);
            showMessage(MESSAGES.CONNECTION_ERROR, 'error');
        }
    }
}

function handleViewActivity(event) {
    const button = event.target.closest('.btn-view-activity');
    const userId = button.dataset.userId;
    
    // TODO: Implementar visualização de atividade
    console.log('[Usuarios] View activity for user:', userId);
    showMessage('Visualização de atividade em desenvolvimento', 'info');
}

function handleSystemConfig() {
    // TODO: Implementar configurações do sistema
    console.log('[Usuarios] System configuration');
    showMessage('Configurações do sistema em desenvolvimento', 'info');
}

async function handleBulkDeactivate() {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`Desativar ${selectedUsers.length} usuário(s) selecionado(s)?`)) {
        try {
            const result = await window.electronAPI.bulkUpdateUserStatus(selectedUsers, 'inativo');
            if (result.success) {
                showMessage(`${selectedUsers.length} usuário(s) desativado(s) com sucesso`, 'success');
                selectedUsers = [];
                updateBulkActionsUI();
                globalCache.delete('users-list');
                loadUsersData();
            } else {
                showMessage(result.message || 'Erro na operação em lote', 'error');
            }
        } catch (error) {
            console.error('[Usuarios] Error in bulk deactivate:', error);
            showMessage(MESSAGES.CONNECTION_ERROR, 'error');
        }
    }
}

async function handleBulkDelete() {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`ATENÇÃO: Excluir ${selectedUsers.length} usuário(s) selecionado(s)? Esta ação não pode ser desfeita.`)) {
        try {
            const result = await window.electronAPI.bulkDeleteUsers(selectedUsers);
            if (result.success) {
                showMessage(`${selectedUsers.length} usuário(s) excluído(s) com sucesso`, 'success');
                selectedUsers = [];
                updateBulkActionsUI();
                globalCache.delete('users-list');
                loadUsersData();
            } else {
                showMessage(result.message || 'Erro na operação em lote', 'error');
            }
        } catch (error) {
            console.error('[Usuarios] Error in bulk delete:', error);
            showMessage(MESSAGES.CONNECTION_ERROR, 'error');
        }
    }
}

/**
 * Funções de filtro
 */
function applyFilters() {
    const search = $('#search-usuarios')?.value.toLowerCase() || '';
    const role = $('#filter-role')?.value || '';
    const status = $('#filter-status')?.value || '';
    
    console.log('[Usuarios] Applying filters:', { search, role, status });
    
    loadFilteredUsers({ search, role, status });
}

async function loadFilteredUsers(filters) {
    const container = $('#users-container');
    if (!container) return;
    
    showLoadingState(container);
    
    try {
        const result = await window.electronAPI.getFilteredUsers(filters);
        if (result.success) {
            renderUsersList(result.users);
            updateUsersCount(result.users.length);
        }
    } catch (error) {
        console.error('[Usuarios] Error applying filters:', error);
        showErrorState(container, 'Erro ao aplicar filtros');
    }
}

function clearFilters() {
    const searchInput = $('#search-usuarios');
    const filterRole = $('#filter-role');
    const filterStatus = $('#filter-status');
    
    if (searchInput) searchInput.value = '';
    if (filterRole) filterRole.value = '';
    if (filterStatus) filterStatus.value = '';
    
    loadUsersData();
}

/**
 * Funções utilitárias
 */
function updateBulkActionsUI() {
    const bulkActions = document.querySelector('.bulk-actions');
    if (bulkActions) {
        if (selectedUsers.length > 0) {
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }
}

function updateUsersCount(count) {
    const countElement = document.querySelector('.users-count');
    if (countElement) {
        countElement.textContent = `${count} usuário${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'ativo': return 'status-active';
        case 'inativo': return 'status-inactive';
        case 'bloqueado': return 'status-blocked';
        default: return 'status-unknown';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'ativo': return 'Ativo';
        case 'inativo': return 'Inativo';
        case 'bloqueado': return 'Bloqueado';
        default: return 'Desconhecido';
    }
}

function getRoleLabel(role) {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'porteiro': return 'Porteiro';
        case 'gerente': return 'Gerente';
        default: return 'Usuário';
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
    selectedUsers = [];
    globalCache.delete('users-list');
}
// === COMPONENTE DASHBOARD ===

import { createElement, formatters } from '../core/dom-utils.js';
import { perfMonitor, globalCache } from '../core/performance.js';
import { chartManager } from '../managers/chart-manager.js';

/**
 * Carrega o dashboard principal
 */
export async function loadDashboard(container) {
    console.log('[Dashboard] Loading dashboard...');
    
    perfMonitor.startMeasure('dashboard-load');

    // Limpa container
    container.innerHTML = '';

    // Header do Dashboard
    const headerSection = createElement('div', {
        className: 'dashboard-header-section',
        innerHTML: `
            <h1 class="dashboard-title">Dashboard</h1>
            <p class="dashboard-subtitle">Visão geral do sistema de controle de encomendas</p>
        `,
        parent: container
    });

    // Grid de cards
    const gridContainer = createElement('div', {
        className: 'dashboard-grid',
        parent: container
    });

    // Cards iniciais com placeholder
    const cardsData = [
        { id: 'moradores', title: 'Total de', subtitle: 'Moradores', icon: 'users' },
        { id: 'pendentes', title: 'Encomendas', subtitle: 'Pendentes', icon: 'package' },
        { id: 'antigas', title: 'Encomendas', subtitle: 'Antigas (7+ dias)', icon: 'clock' },
        { id: 'criticas', title: 'Encomendas', subtitle: 'Críticas (15+ dias)', icon: 'alert-triangle' }
    ];

    // Cria cards com loading state
    cardsData.forEach(card => {
        const cardElement = createDashboardCard(card);
        gridContainer.appendChild(cardElement);
    });

    // Seção de gráficos
    const chartsSection = createElement('div', {
        className: 'dashboard-charts-section',
        innerHTML: `
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
        `,
        parent: container
    });

    // Carrega dados dos cards
    loadDashboardData(gridContainer);
    
    perfMonitor.endMeasure('dashboard-load');
}

/**
 * Cria card do dashboard
 */
function createDashboardCard(cardData) {
    return createElement('div', {
        className: 'dashboard-card',
        id: `card-${cardData.id}`,
        innerHTML: `
            <div class="card-icon">
                <i class="fas fa-${cardData.icon}"></i>
            </div>
            <div class="card-content">
                <div class="card-title">${cardData.title}</div>
                <div class="card-subtitle">${cardData.subtitle}</div>
                <div class="card-number loading">
                    <div class="loading-spinner small"></div>
                </div>
            </div>
        `
    });
}

/**
 * Carrega dados dos cards do dashboard
 */
async function loadDashboardData(gridContainer) {
    console.log('[Dashboard] Loading card data...');
    
    try {
        // Verifica cache primeiro
        const cacheKey = 'dashboard-stats';
        let stats = globalCache.get(cacheKey);
        
        if (!stats) {
            // Busca dados do backend
            const result = await window.electronAPI.getDashboardStats();
            if (result.success) {
                stats = result.stats;
                globalCache.set(cacheKey, stats, 2 * 60 * 1000); // 2 minutos
            } else {
                throw new Error(result.message || 'Erro ao carregar estatísticas');
            }
        }

        // Atualiza cards com dados reais
        updateDashboardCard('moradores', stats.totalResidents || 0);
        updateDashboardCard('pendentes', stats.pendingPackages || 0, 'pending');
        updateDashboardCard('antigas', stats.oldPackages || 0, 'warning');
        updateDashboardCard('criticas', stats.criticalPackages || 0, 'critical');

        console.log('[Dashboard] Card data loaded successfully');

    } catch (error) {
        console.error('[Dashboard] Error loading dashboard data:', error);
        
        // Fallback para dados mock em caso de erro
        updateDashboardCard('moradores', '--', 'error');
        updateDashboardCard('pendentes', '--', 'error');
        updateDashboardCard('antigas', '--', 'error');
        updateDashboardCard('criticas', '--', 'error');
    }
}

/**
 * Atualiza card individual
 */
function updateDashboardCard(cardId, value, status = 'normal') {
    const card = document.getElementById(`card-${cardId}`);
    if (!card) return;

    const numberElement = card.querySelector('.card-number');
    if (!numberElement) return;

    // Remove loading state
    numberElement.classList.remove('loading');
    
    // Adiciona status se necessário
    if (status !== 'normal') {
        numberElement.classList.add(`status-${status}`);
    }

    // Anima mudança do número
    if (typeof value === 'number') {
        animateNumber(numberElement, 0, value, 1000);
    } else {
        numberElement.textContent = value;
    }
}

/**
 * Anima mudança de número
 */
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * easeOut);
        
        element.textContent = current.toLocaleString('pt-BR');
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

/**
 * Atualiza dashboard completo
 */
export async function refreshDashboard() {
    console.log('[Dashboard] Refreshing dashboard...');
    
    // Limpa cache
    globalCache.delete('dashboard-stats');
    
    // Recarrega dados
    const gridContainer = document.querySelector('.dashboard-grid');
    if (gridContainer) {
        await loadDashboardData(gridContainer);
    }
    
    // Atualiza gráficos
    await chartManager.refreshAllCharts();
}

/**
 * Configuração de auto-refresh do dashboard
 */
let dashboardRefreshInterval = null;

export function startDashboardAutoRefresh(intervalMs = 5 * 60 * 1000) { // 5 minutos
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
    }
    
    dashboardRefreshInterval = setInterval(() => {
        refreshDashboard();
    }, intervalMs);
    
    console.log('[Dashboard] Auto-refresh started');
}

export function stopDashboardAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
        console.log('[Dashboard] Auto-refresh stopped');
    }
}

/**
 * Event listeners específicos do dashboard
 */
export function setupDashboardEventListeners() {
    // Botão de refresh manual (se existir)
    const refreshButton = document.querySelector('.dashboard-refresh-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshDashboard();
        });
    }
    
    // Click nos cards para navegar para seções específicas
    const cardMoradores = document.getElementById('card-moradores');
    if (cardMoradores) {
        cardMoradores.addEventListener('click', () => {
            window.rendererApp?.navigateTo('moradores');
        });
    }
    
    const cardPendentes = document.getElementById('card-pendentes');
    if (cardPendentes) {
        cardPendentes.addEventListener('click', () => {
            window.rendererApp?.navigateTo('encomendas');
        });
    }
}

/**
 * Cleanup do dashboard
 */
export function cleanupDashboard() {
    stopDashboardAutoRefresh();
    globalCache.delete('dashboard-stats');
}
// === GERENCIADOR DE BUSCA OTIMIZADO ===

import { $, debounce, createElement, classUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { globalCache } from '../core/performance.js';
import { SELECTORS, CONFIG, CSS_CLASSES, MESSAGES } from '../core/constants.js';

class SearchManager {
    constructor() {
        this.searchInput = null;
        this.currentQuery = '';
        this.searchTimeout = null;
        this.activePopup = null;
        this.searchHistory = new Set();
        this.maxHistorySize = 10;
        
        this.initializeSearch();
    }

    initializeSearch() {
        this.searchInput = $(SELECTORS.topbarSearchInput);
        
        if (!this.searchInput) {
            console.warn('[SearchManager] Search input not found');
            return;
        }

        this.setupEventListeners();
        console.log('[SearchManager] Search manager initialized');
    }

    setupEventListeners() {
        if (!this.searchInput) return;

        // Input com debounce
        const debouncedSearch = debounce(
            this.handleSearchInput.bind(this), 
            CONFIG.SEARCH_DELAY
        );

        eventManager.on(this.searchInput, 'input', debouncedSearch);

        // Enter key para busca imediata
        eventManager.on(this.searchInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(this.searchInput.value.trim());
            } else if (e.key === 'Escape') {
                this.clearSearch();
            }
        });

        // Blur para limpar busca (com delay para permitir clique nos resultados)
        eventManager.on(this.searchInput, 'blur', () => {
            setTimeout(() => {
                if (!this.isPopupFocused()) {
                    this.clearSearch();
                }
            }, CONFIG.SUGGESTION_BLUR_DELAY);
        });

        // Click fora do popup para fechar
        eventManager.on(document, 'click', (e) => {
            if (this.activePopup && !this.activePopup.contains(e.target) && 
                e.target !== this.searchInput) {
                this.hidePopup();
            }
        });
    }

    async handleSearchInput(event) {
        const query = event.target.value.trim();
        
        if (query.length === 0) {
            this.hidePopup();
            return;
        }

        if (query.length < 2) {
            this.showMessage('Digite pelo menos 2 caracteres para buscar');
            return;
        }

        this.currentQuery = query;
        await this.performSearch(query);
    }

    async performSearch(query) {
        if (!query || query.length < 2) return;

        console.log(`[SearchManager] Searching for: "${query}"`);

        // Verifica cache primeiro
        const cacheKey = `search:${query.toLowerCase()}`;
        const cachedResults = globalCache.get(cacheKey);
        
        if (cachedResults) {
            console.log('[SearchManager] Using cached results');
            this.displayResults(cachedResults, query);
            return;
        }

        // Mostra loading
        this.showLoadingPopup();

        try {
            // Busca no backend
            const results = await window.electronAPI.searchPackages(query);
            
            if (results.success) {
                // Cache os resultados
                globalCache.set(cacheKey, results.packages, 2 * 60 * 1000); // 2 minutos
                
                // Adiciona ao histórico
                this.addToHistory(query);
                
                // Exibe resultados
                this.displayResults(results.packages, query);
                
            } else {
                this.showMessage(results.message || MESSAGES.SEARCH_NO_RESULTS);
            }
            
        } catch (error) {
            console.error('[SearchManager] Search error:', error);
            this.showErrorPopup(MESSAGES.CONNECTION_ERROR);
        }
    }

    displayResults(encomendas, query) {
        console.log(`[SearchManager] Displaying ${encomendas.length} results`);

        if (encomendas.length === 0) {
            this.showNoResultsPopup(query);
            return;
        }

        this.hidePopup();
        this.createResultsPopup(encomendas, query);
    }

    createResultsPopup(encomendas, query) {
        // Remove popup anterior
        this.hidePopup();

        // Cria popup
        const popup = createElement('div', {
            id: 'search-results-popup',
            className: 'search-popup results-popup'
        });

        // Header
        const header = createElement('div', {
            className: 'popup-header',
            innerHTML: `
                <h3>Encomendas Encontradas (${encomendas.length})</h3>
                <button class="popup-close" aria-label="Fechar">×</button>
            `,
            parent: popup
        });

        // Lista de resultados
        const lista = createElement('div', {
            className: 'popup-results-list',
            parent: popup
        });

        // Renderiza cada encomenda
        encomendas.forEach((encomenda, index) => {
            const item = this.createResultItem(encomenda, index);
            lista.appendChild(item);
        });

        // Event listeners
        this.setupPopupEventListeners(popup);

        // Adiciona ao DOM
        document.body.appendChild(popup);
        this.activePopup = popup;

        // Anima entrada
        requestAnimationFrame(() => {
            classUtils.add(popup, 'popup-visible');
        });
    }

    createResultItem(encomenda, index) {
        const statusClass = this.getStatusClass(encomenda.status);
        const dataFormatada = this.formatDate(encomenda.data_recebimento);
        
        const item = createElement('div', {
            className: `popup-result-item ${statusClass}`,
            innerHTML: `
                <div class="result-item-header">
                    <span class="result-item-morador">${encomenda.morador_nome}</span>
                    <span class="result-item-data">${dataFormatada}</span>
                </div>
                <div class="result-item-details">
                    <span class="result-item-remetente">De: ${encomenda.remetente || 'N/A'}</span>
                    <span class="result-item-porteiro">Por: ${encomenda.porteiro_nome}</span>
                </div>
                <div class="result-item-actions">
                    ${encomenda.status === 'pendente' ? 
                        `<button class="btn-entregar-popup" data-package-id="${encomenda.id}" data-morador-nome="${encomenda.morador_nome}">
                            <i class="fas fa-check"></i> Entregar
                        </button>` : 
                        `<span class="status-entregue">Entregue</span>`
                    }
                </div>
            `
        });

        // Destacar termo pesquisado
        this.highlightSearchTerm(item, this.currentQuery);

        return item;
    }

    setupPopupEventListeners(popup) {
        // Botão fechar
        const closeBtn = popup.querySelector('.popup-close');
        if (closeBtn) {
            eventManager.on(closeBtn, 'click', () => this.hidePopup());
        }

        // Botões de entrega
        const entregaBtns = popup.querySelectorAll('.btn-entregar-popup');
        entregaBtns.forEach(btn => {
            eventManager.on(btn, 'click', (e) => {
                const packageId = e.target.dataset.packageId;
                const moradorNome = e.target.dataset.moradorNome;
                
                if (packageId && moradorNome) {
                    // Importa e abre modal de entrega
                    import('../managers/modal-manager.js').then(({ openEntregaModal }) => {
                        openEntregaModal(packageId, moradorNome);
                        this.hidePopup();
                    });
                }
            });
        });

        // Navegação por teclado
        eventManager.on(popup, 'keydown', (e) => {
            this.handlePopupKeyNavigation(e, popup);
        });
    }

    handlePopupKeyNavigation(event, popup) {
        const items = popup.querySelectorAll('.popup-result-item');
        const currentIndex = Array.from(items).findIndex(item => 
            classUtils.has(item, 'keyboard-focused')
        );

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.focusNextItem(items, currentIndex);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.focusPreviousItem(items, currentIndex);
                break;
            case 'Enter':
                event.preventDefault();
                this.activateSelectedItem(items, currentIndex);
                break;
            case 'Escape':
                event.preventDefault();
                this.hidePopup();
                this.searchInput?.focus();
                break;
        }
    }

    focusNextItem(items, currentIndex) {
        if (currentIndex >= 0) {
            classUtils.remove(items[currentIndex], 'keyboard-focused');
        }
        
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        classUtils.add(items[nextIndex], 'keyboard-focused');
        items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    focusPreviousItem(items, currentIndex) {
        if (currentIndex >= 0) {
            classUtils.remove(items[currentIndex], 'keyboard-focused');
        }
        
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        classUtils.add(items[prevIndex], 'keyboard-focused');
        items[prevIndex].scrollIntoView({ block: 'nearest' });
    }

    activateSelectedItem(items, currentIndex) {
        if (currentIndex >= 0) {
            const button = items[currentIndex].querySelector('.btn-entregar-popup');
            if (button) {
                button.click();
            }
        }
    }

    showLoadingPopup() {
        this.hidePopup();
        
        const popup = createElement('div', {
            id: 'search-loading-popup',
            className: 'search-popup loading-popup',
            innerHTML: `
                <div class="popup-loading">
                    <div class="loading-spinner"></div>
                    <span>Buscando...</span>
                </div>
            `
        });

        document.body.appendChild(popup);
        this.activePopup = popup;
    }

    showNoResultsPopup(query) {
        this.hidePopup();
        
        const popup = createElement('div', {
            id: 'search-no-results-popup',
            className: 'search-popup no-results-popup',
            innerHTML: `
                <div class="popup-no-results">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Não foram encontradas encomendas para "<strong>${query}</strong>"</p>
                    <button class="btn-close-popup">Fechar</button>
                </div>
            `
        });

        // Event listener para botão fechar
        const closeBtn = popup.querySelector('.btn-close-popup');
        if (closeBtn) {
            eventManager.on(closeBtn, 'click', () => this.hidePopup());
        }

        document.body.appendChild(popup);
        this.activePopup = popup;
    }

    showErrorPopup(message) {
        this.hidePopup();
        
        const popup = createElement('div', {
            id: 'search-error-popup',
            className: 'search-popup error-popup',
            innerHTML: `
                <div class="popup-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro na busca</h3>
                    <p>${message}</p>
                    <button class="btn-close-popup">Fechar</button>
                </div>
            `
        });

        const closeBtn = popup.querySelector('.btn-close-popup');
        if (closeBtn) {
            eventManager.on(closeBtn, 'click', () => this.hidePopup());
        }

        document.body.appendChild(popup);
        this.activePopup = popup;
    }

    hidePopup() {
        if (this.activePopup) {
            this.activePopup.remove();
            this.activePopup = null;
        }
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.currentQuery = '';
        this.hidePopup();
    }

    showMessage(message) {
        // Implementar sistema de toast/notification
        console.log(`[SearchManager] ${message}`);
    }

    // Utilitários
    getStatusClass(status) {
        switch (status) {
            case 'pendente': return 'status-pendente';
            case 'entregue': return 'status-entregue';
            default: return '';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    highlightSearchTerm(element, term) {
        if (!term) return;
        
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const regex = new RegExp(`(${term})`, 'gi');
            
            if (regex.test(text)) {
                const highlighted = text.replace(regex, '<mark>$1</mark>');
                const span = createElement('span', { innerHTML: highlighted });
                textNode.parentNode.replaceChild(span, textNode);
            }
        });
    }

    addToHistory(query) {
        this.searchHistory.add(query.toLowerCase());
        
        if (this.searchHistory.size > this.maxHistorySize) {
            const firstItem = this.searchHistory.values().next().value;
            this.searchHistory.delete(firstItem);
        }
    }

    getSearchHistory() {
        return Array.from(this.searchHistory);
    }

    isPopupFocused() {
        return this.activePopup && this.activePopup.contains(document.activeElement);
    }

    // Cleanup
    destroy() {
        this.hidePopup();
        if (this.searchInput) {
            eventManager.removeAllFromElement(this.searchInput);
        }
        this.searchHistory.clear();
    }
}

// Instância global
export const searchManager = new SearchManager();

// Atalhos para uso externo
export const performSearch = (query) => searchManager.performSearch(query);
export const clearSearch = () => searchManager.clearSearch();
export const getSearchHistory = () => searchManager.getSearchHistory();
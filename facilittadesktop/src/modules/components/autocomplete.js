// === SISTEMA DE AUTOCOMPLETE OTIMIZADO ===

import { $, debounce, createElement, classUtils } from '../core/dom-utils.js';
import { eventManager } from '../core/event-manager.js';
import { globalCache } from '../core/performance.js';
import { CONFIG, CSS_CLASSES } from '../core/constants.js';

class AutocompleteManager {
    constructor() {
        this.activeInstances = new Map();
        this.globalState = {
            selectedMoradorId: null,
            selectedPorteiroUserId: null,
            selectedEntregaPorteiroId: null
        };
    }

    /**
     * Cria instância de autocomplete
     */
    createAutocomplete(inputElement, suggestionsElement, options = {}) {
        if (!inputElement || !suggestionsElement) {
            console.error('[AutocompleteManager] Missing required elements');
            return null;
        }

        const config = {
            minLength: 2,
            debounceDelay: CONFIG.DEBOUNCE_DELAY,
            maxSuggestions: 10,
            searchFunction: null,
            displayFunction: null,
            selectCallback: null,
            clearCallback: null,
            ...options
        };

        const instance = new AutocompleteInstance(
            inputElement, 
            suggestionsElement, 
            config,
            this
        );

        const instanceId = `autocomplete_${Date.now()}_${Math.random()}`;
        this.activeInstances.set(instanceId, instance);

        return { instance, instanceId };
    }

    /**
     * Remove instância de autocomplete
     */
    destroyAutocomplete(instanceId) {
        const instance = this.activeInstances.get(instanceId);
        if (instance) {
            instance.destroy();
            this.activeInstances.delete(instanceId);
        }
    }

    /**
     * Setup para autocomplete de moradores no modal de encomenda
     */
    setupMoradorAutocomplete() {
        const inputMorador = $('#morador');
        const suggestionsMorador = $('#morador-suggestions');

        if (!inputMorador || !suggestionsMorador) {
            console.warn('[AutocompleteManager] Morador autocomplete elements not found');
            return null;
        }

        return this.createAutocomplete(inputMorador, suggestionsMorador, {
            searchFunction: async (query) => {
                return this.searchMoradores(query);
            },
            displayFunction: (morador) => {
                return `
                    <div class="suggestion-item" data-id="${morador.id}">
                        <div class="suggestion-main">
                            <strong>${morador.nome}</strong>
                        </div>
                        <div class="suggestion-details">
                            Apto: ${morador.apartamento} | Bloco: ${morador.bloco || 'N/A'}
                        </div>
                    </div>
                `;
            },
            selectCallback: (morador) => {
                this.globalState.selectedMoradorId = morador.id;
                console.log('[AutocompleteManager] Morador selected:', morador);
            },
            clearCallback: () => {
                this.globalState.selectedMoradorId = null;
            }
        });
    }

    /**
     * Setup para autocomplete de porteiros no modal de encomenda
     */
    setupPorteiroAutocomplete() {
        const inputPorteiro = $('#porteiro');
        const suggestionsPorteiro = $('#porteiro-suggestions');

        if (!inputPorteiro || !suggestionsPorteiro) {
            console.warn('[AutocompleteManager] Porteiro autocomplete elements not found');
            return null;
        }

        return this.createAutocomplete(inputPorteiro, suggestionsPorteiro, {
            searchFunction: async (query) => {
                return this.searchPorteiros(query);
            },
            displayFunction: (porteiro) => {
                return `
                    <div class="suggestion-item" data-id="${porteiro.id}">
                        <div class="suggestion-main">
                            <strong>${porteiro.nome}</strong>
                        </div>
                        <div class="suggestion-details">
                            Usuário: ${porteiro.username} | Status: ${porteiro.status}
                        </div>
                    </div>
                `;
            },
            selectCallback: (porteiro) => {
                this.globalState.selectedPorteiroUserId = porteiro.id;
                console.log('[AutocompleteManager] Porteiro selected:', porteiro);
            },
            clearCallback: () => {
                this.globalState.selectedPorteiroUserId = null;
            }
        });
    }

    /**
     * Setup para autocomplete de porteiros no modal de entrega
     */
    setupEntregaPorteiroAutocomplete() {
        const inputEntregaPorteiro = $('#entrega-porteiro');
        const suggestionsEntregaPorteiro = $('#entrega-porteiro-suggestions');

        if (!inputEntregaPorteiro || !suggestionsEntregaPorteiro) {
            console.warn('[AutocompleteManager] Entrega porteiro autocomplete elements not found');
            return null;
        }

        return this.createAutocomplete(inputEntregaPorteiro, suggestionsEntregaPorteiro, {
            searchFunction: async (query) => {
                return this.searchPorteiros(query);
            },
            displayFunction: (porteiro) => {
                return `
                    <div class="suggestion-item" data-id="${porteiro.id}">
                        <div class="suggestion-main">
                            <strong>${porteiro.nome}</strong>
                        </div>
                        <div class="suggestion-details">
                            ${porteiro.username}
                        </div>
                    </div>
                `;
            },
            selectCallback: (porteiro) => {
                this.globalState.selectedEntregaPorteiroId = porteiro.id;
                console.log('[AutocompleteManager] Entrega porteiro selected:', porteiro);
            },
            clearCallback: () => {
                this.globalState.selectedEntregaPorteiroId = null;
            }
        });
    }

    /**
     * Busca moradores com cache
     */
    async searchMoradores(query) {
        const cacheKey = `moradores:${query.toLowerCase()}`;
        const cached = globalCache.get(cacheKey);
        
        if (cached) {
            return cached;
        }        try {
            const result = await window.electronAPI.searchResidents(query);
            if (result && Array.isArray(result)) {
                globalCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutos
                return result;
            }
            return [];
        } catch (error) {
            console.error('[AutocompleteManager] Error searching moradores:', error);
            return [];
        }
    }

    /**
     * Busca porteiros com cache
     */
    async searchPorteiros(query) {
        const cacheKey = `porteiros:${query.toLowerCase()}`;
        const cached = globalCache.get(cacheKey);
        
        if (cached) {
            return cached;
        }        try {
            const result = await window.electronAPI.searchActivePorters(query);
            if (result && Array.isArray(result)) {
                globalCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutos
                return result;
            }
            return [];
        } catch (error) {
            console.error('[AutocompleteManager] Error searching porteiros:', error);
            return [];
        }
    }

    /**
     * Obtém IDs selecionados
     */
    getSelectedIds() {
        return { ...this.globalState };
    }

    /**
     * Limpa todos os estados
     */
    clearAllStates() {
        this.globalState.selectedMoradorId = null;
        this.globalState.selectedPorteiroUserId = null;
        this.globalState.selectedEntregaPorteiroId = null;
    }

    /**
     * Cleanup completo
     */
    destroy() {
        this.activeInstances.forEach((instance, id) => {
            this.destroyAutocomplete(id);
        });
        this.clearAllStates();
    }
}

/**
 * Classe para instância individual de autocomplete
 */
class AutocompleteInstance {
    constructor(inputElement, suggestionsElement, config, manager) {
        this.input = inputElement;
        this.suggestions = suggestionsElement;
        this.config = config;
        this.manager = manager;
        
        this.isVisible = false;
        this.selectedIndex = -1;
        this.currentSuggestions = [];
        this.searchTimeout = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Input com debounce
        const debouncedSearch = debounce(
            this.handleInput.bind(this), 
            this.config.debounceDelay
        );

        eventManager.on(this.input, 'input', debouncedSearch);

        // Navegação por teclado
        eventManager.on(this.input, 'keydown', this.handleKeydown.bind(this));

        // Blur para ocultar sugestões
        eventManager.on(this.input, 'blur', () => {
            setTimeout(() => {
                if (!this.isSuggestionsFocused()) {
                    this.hideSuggestions();
                }
            }, CONFIG.SUGGESTION_BLUR_DELAY);
        });

        // Focus para mostrar sugestões se houver texto
        eventManager.on(this.input, 'focus', () => {
            if (this.input.value.trim().length >= this.config.minLength) {
                this.handleInput();
            }
        });

        // Clicks nas sugestões
        eventManager.delegate(
            this.suggestions, 
            '.suggestion-item', 
            'click', 
            this.handleSuggestionClick.bind(this)
        );

        // Hover nas sugestões
        eventManager.delegate(
            this.suggestions, 
            '.suggestion-item', 
            'mouseenter', 
            this.handleSuggestionHover.bind(this)
        );
    }

    async handleInput() {
        const query = this.input.value.trim();

        if (query.length < this.config.minLength) {
            this.hideSuggestions();
            if (this.config.clearCallback) {
                this.config.clearCallback();
            }
            return;
        }

        if (!this.config.searchFunction) {
            console.error('[AutocompleteInstance] No search function provided');
            return;
        }

        try {
            this.showLoadingState();
            
            const results = await this.config.searchFunction(query);
            const limitedResults = results.slice(0, this.config.maxSuggestions);
            
            this.displaySuggestions(limitedResults);
            
        } catch (error) {
            console.error('[AutocompleteInstance] Search error:', error);
            this.showErrorState();
        }
    }

    handleKeydown(event) {
        if (!this.isVisible) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                event.preventDefault();
                this.selectCurrentSuggestion();
                break;
            case 'Escape':
                event.preventDefault();
                this.hideSuggestions();
                break;
        }
    }

    handleSuggestionClick(event) {
        const suggestionElement = event.target.closest('.suggestion-item');
        if (!suggestionElement) return;

        const index = Array.from(this.suggestions.children).indexOf(suggestionElement);
        this.selectSuggestion(index);
    }

    handleSuggestionHover(event) {
        const suggestionElement = event.target.closest('.suggestion-item');
        if (!suggestionElement) return;

        const index = Array.from(this.suggestions.children).indexOf(suggestionElement);
        this.updateSelection(index);
    }

    displaySuggestions(suggestions) {
        this.currentSuggestions = suggestions;
        this.selectedIndex = -1;

        if (suggestions.length === 0) {
            this.showNoResultsState();
            return;
        }

        // Limpa sugestões anteriores
        this.suggestions.innerHTML = '';

        // Renderiza sugestões
        suggestions.forEach((suggestion, index) => {
            const html = this.config.displayFunction 
                ? this.config.displayFunction(suggestion)
                : this.defaultDisplayFunction(suggestion);

            const element = createElement('div', { innerHTML: html });
            this.suggestions.appendChild(element.firstElementChild);
        });

        this.showSuggestions();
    }

    defaultDisplayFunction(item) {
        return `
            <div class="suggestion-item" data-id="${item.id || ''}">
                <div class="suggestion-main">
                    <strong>${item.nome || item.name || item.toString()}</strong>
                </div>
            </div>
        `;
    }

    showSuggestions() {
        classUtils.remove(this.suggestions, CSS_CLASSES.HIDDEN);
        classUtils.add(this.suggestions, 'suggestions-visible');
        this.isVisible = true;
    }

    hideSuggestions() {
        classUtils.add(this.suggestions, CSS_CLASSES.HIDDEN);
        classUtils.remove(this.suggestions, 'suggestions-visible');
        this.isVisible = false;
        this.selectedIndex = -1;
        this.updateSelectionVisual();
    }

    showLoadingState() {
        this.suggestions.innerHTML = `
            <div class="suggestion-loading">
                <div class="loading-spinner"></div>
                <span>Buscando...</span>
            </div>
        `;
        this.showSuggestions();
    }

    showErrorState() {
        this.suggestions.innerHTML = `
            <div class="suggestion-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Erro na busca</span>
            </div>
        `;
        this.showSuggestions();
    }

    showNoResultsState() {
        this.suggestions.innerHTML = `
            <div class="suggestion-no-results">
                <i class="fas fa-search"></i>
                <span>Nenhum resultado encontrado</span>
            </div>
        `;
        this.showSuggestions();
    }

    selectNext() {
        if (this.selectedIndex < this.currentSuggestions.length - 1) {
            this.selectedIndex++;
            this.updateSelection(this.selectedIndex);
        }
    }

    selectPrevious() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateSelection(this.selectedIndex);
        } else if (this.selectedIndex === 0) {
            this.selectedIndex = -1;
            this.updateSelection(this.selectedIndex);
        }
    }

    updateSelection(index) {
        this.selectedIndex = index;
        this.updateSelectionVisual();
        
        if (index >= 0) {
            const selectedElement = this.suggestions.children[index];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    updateSelectionVisual() {
        // Remove seleção anterior
        const previousSelected = this.suggestions.querySelector('.suggestion-selected');
        if (previousSelected) {
            classUtils.remove(previousSelected, 'suggestion-selected');
        }

        // Adiciona nova seleção
        if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.children.length) {
            const newSelected = this.suggestions.children[this.selectedIndex];
            classUtils.add(newSelected, 'suggestion-selected');
        }
    }

    selectCurrentSuggestion() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.currentSuggestions.length) {
            this.selectSuggestion(this.selectedIndex);
        }
    }

    selectSuggestion(index) {
        if (index < 0 || index >= this.currentSuggestions.length) return;

        const selectedSuggestion = this.currentSuggestions[index];
        
        // Atualiza input
        this.input.value = selectedSuggestion.nome || selectedSuggestion.name || '';
        
        // Callback de seleção
        if (this.config.selectCallback) {
            this.config.selectCallback(selectedSuggestion);
        }

        // Oculta sugestões
        this.hideSuggestions();
        
        // Retorna foco ao input
        this.input.focus();
    }

    isSuggestionsFocused() {
        return this.suggestions.contains(document.activeElement);
    }

    destroy() {
        eventManager.removeAllFromElement(this.input);
        eventManager.removeAllFromElement(this.suggestions);
        this.hideSuggestions();
    }
}

// Instância global
export const autocompleteManager = new AutocompleteManager();

// Atalhos para configuração rápida
export const setupMoradorAutocomplete = () => autocompleteManager.setupMoradorAutocomplete();
export const setupPorteiroAutocomplete = () => autocompleteManager.setupPorteiroAutocomplete();
export const setupEntregaPorteiroAutocomplete = () => autocompleteManager.setupEntregaPorteiroAutocomplete();
export const getSelectedIds = () => autocompleteManager.getSelectedIds();
export const clearAllStates = () => autocompleteManager.clearAllStates();
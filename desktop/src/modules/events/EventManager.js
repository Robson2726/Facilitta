// --- src/modules/events/EventManager.js ---
// Gerenciador Central de Eventos

class EventManager {
    constructor() {
        this.eventHandlers = new Map();
        this.delegatedEvents = new Map();
        this.globalListeners = new Map();
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('[EventManager] Já foi inicializado');
            return;
        }

        console.log('[EventManager] Inicializando gerenciador de eventos...');
        this.setupGlobalListeners();
        this.initialized = true;
        console.log('[EventManager] Gerenciador de eventos inicializado com sucesso');
    }

    setupGlobalListeners() {
        // Event listeners globais que devem ser configurados uma vez
        this.addGlobalListener('click', this.handleGlobalClick.bind(this));
        this.addGlobalListener('keydown', this.handleGlobalKeydown.bind(this));
        this.addGlobalListener('submit', this.handleGlobalSubmit.bind(this));
    }

    // Registra um handler para um tipo de evento
    registerHandler(eventType, handler, options = {}) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        
        const handlerInfo = {
            handler,
            options,
            id: this.generateHandlerId()
        };
        
        this.eventHandlers.get(eventType).push(handlerInfo);
        console.log(`[EventManager] Handler registrado para ${eventType}:`, handlerInfo.id);
        
        return handlerInfo.id;
    }

    // Remove um handler específico
    removeHandler(eventType, handlerId) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            const index = handlers.findIndex(h => h.id === handlerId);
            if (index !== -1) {
                handlers.splice(index, 1);
                console.log(`[EventManager] Handler removido: ${handlerId}`);
                return true;
            }
        }
        return false;
    }

    // Delegação de eventos para elementos dinâmicos
    delegate(selector, eventType, handler, options = {}) {
        const key = `${selector}:${eventType}`;
        
        if (this.delegatedEvents.has(key)) {
            console.warn(`[EventManager] Evento delegado já existe: ${key}`);
            return;
        }

        this.delegatedEvents.set(key, { handler, options });
        
        document.addEventListener(eventType, (e) => {
            if (e.target.matches(selector)) {
                handler(e);
            }
        }, options);

        console.log(`[EventManager] Evento delegado registrado: ${key}`);
    }

    // Remove evento delegado
    removeDelegated(selector, eventType) {
        const key = `${selector}:${eventType}`;
        return this.delegatedEvents.delete(key);
    }

    // Adiciona listener global
    addGlobalListener(eventType, handler, options = {}) {
        if (this.globalListeners.has(eventType)) {
            console.warn(`[EventManager] Listener global já existe para: ${eventType}`);
            return;
        }

        this.globalListeners.set(eventType, { handler, options });
        document.addEventListener(eventType, handler, options);
        console.log(`[EventManager] Listener global adicionado: ${eventType}`);
    }

    // Remove listener global
    removeGlobalListener(eventType) {
        const listener = this.globalListeners.get(eventType);
        if (listener) {
            document.removeEventListener(eventType, listener.handler, listener.options);
            this.globalListeners.delete(eventType);
            console.log(`[EventManager] Listener global removido: ${eventType}`);
        }
    }

    // Handlers globais
    handleGlobalClick(e) {
        // Fechar dropdowns quando clicar fora
        if (!e.target.closest('.suggestions-dropdown')) {
            const dropdowns = document.querySelectorAll('.suggestions-dropdown.visible');
            dropdowns.forEach(dropdown => dropdown.classList.remove('visible'));
        }

        // Fechar modais quando clicar no overlay
        if (e.target.classList.contains('modal-overlay')) {
            if (window.modalManager) {
                window.modalManager.closeActiveModal();
            }
        }
    }

    handleGlobalKeydown(e) {
        // Fechar modais com ESC
        if (e.key === 'Escape') {
            if (window.modalManager && window.modalManager.activeModal) {
                window.modalManager.closeActiveModal();
            }
        }

        // Fechar dropdowns com ESC
        if (e.key === 'Escape') {
            const dropdowns = document.querySelectorAll('.suggestions-dropdown.visible');
            dropdowns.forEach(dropdown => dropdown.classList.remove('visible'));
        }
    }

    handleGlobalSubmit(e) {
        // Prevenir submit padrão para formulários com data-prevent-default
        if (e.target.hasAttribute('data-prevent-default')) {
            e.preventDefault();
        }
    }

    // Executa todos os handlers registrados para um tipo de evento
    executeHandlers(eventType, event) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            handlers.forEach(({ handler }) => {
                try {
                    handler(event);
                } catch (error) {
                    console.error(`[EventManager] Erro no handler ${eventType}:`, error);
                }
            });
        }
    }

    // Gera ID único para handlers
    generateHandlerId() {
        return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Remove todos os event listeners
    cleanup() {
        console.log('[EventManager] Limpando todos os event listeners...');
        
        // Limpar handlers registrados
        this.eventHandlers.clear();
        
        // Limpar eventos delegados
        this.delegatedEvents.clear();
        
        // Limpar listeners globais
        this.globalListeners.forEach((listener, eventType) => {
            document.removeEventListener(eventType, listener.handler, listener.options);
        });
        this.globalListeners.clear();
        
        this.initialized = false;
        console.log('[EventManager] Limpeza concluída');
    }

    // Debug: lista todos os eventos registrados
    debug() {
        console.log('[EventManager] === DEBUG ===');
        console.log('Handlers registrados:', this.eventHandlers);
        console.log('Eventos delegados:', this.delegatedEvents);
        console.log('Listeners globais:', this.globalListeners);
        console.log('[EventManager] === FIM DEBUG ===');
    }
}

// Exportar para uso global
window.EventManager = EventManager; 
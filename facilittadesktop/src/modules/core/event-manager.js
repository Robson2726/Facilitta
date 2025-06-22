// === GERENCIAMENTO DE EVENTOS OTIMIZADO ===

import { debounce } from './dom-utils.js';

class EventManager {
    constructor() {
        this.listeners = new Map();
        this.delegatedEvents = new Map();
    }

    /**
     * Adiciona event listener com cleanup automático
     */
    on(element, event, handler, options = {}) {
        if (!element || !event || !handler) return null;

        const wrappedHandler = options.debounce 
            ? debounce(handler, options.debounce)
            : handler;

        element.addEventListener(event, wrappedHandler, options);

        // Armazena para cleanup posterior
        const key = `${element}_${event}_${handler.name || 'anonymous'}`;
        this.listeners.set(key, {
            element,
            event,
            handler: wrappedHandler,
            originalHandler: handler
        });

        return key;
    }

    /**
     * Remove event listener específico
     */
    off(key) {
        const listener = this.listeners.get(key);
        if (listener) {
            listener.element.removeEventListener(
                listener.event, 
                listener.handler
            );
            this.listeners.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Event delegation para performance
     */
    delegate(parent, selector, event, handler, options = {}) {
        if (!parent || !selector || !event || !handler) return null;

        const wrappedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, e);
            }
        };

        const debouncedHandler = options.debounce 
            ? debounce(wrappedHandler, options.debounce)
            : wrappedHandler;

        parent.addEventListener(event, debouncedHandler, options);

        const key = `delegate_${parent}_${selector}_${event}`;
        this.delegatedEvents.set(key, {
            parent,
            selector,
            event,
            handler: debouncedHandler,
            originalHandler: handler
        });

        return key;
    }

    /**
     * Remove event delegation
     */
    undelegate(key) {
        const delegated = this.delegatedEvents.get(key);
        if (delegated) {
            delegated.parent.removeEventListener(
                delegated.event,
                delegated.handler
            );
            this.delegatedEvents.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Event listener único (remove após primeira execução)
     */
    once(element, event, handler, options = {}) {
        const onceHandler = (e) => {
            handler(e);
            element.removeEventListener(event, onceHandler);
        };

        return this.on(element, event, onceHandler, options);
    }

    /**
     * Múltiplos eventos no mesmo elemento
     */
    onMultiple(element, events, handler, options = {}) {
        const keys = [];
        events.forEach(event => {
            const key = this.on(element, event, handler, options);
            if (key) keys.push(key);
        });
        return keys;
    }

    /**
     * Remove todos os listeners de um elemento
     */
    removeAllFromElement(element) {
        const keysToRemove = [];
        
        this.listeners.forEach((listener, key) => {
            if (listener.element === element) {
                keysToRemove.push(key);
            }
        });

        keysToRemove.forEach(key => this.off(key));
        
        return keysToRemove.length;
    }

    /**
     * Cleanup completo - remove todos os listeners
     */
    cleanup() {
        // Remove listeners normais
        this.listeners.forEach((listener, key) => {
            listener.element.removeEventListener(
                listener.event,
                listener.handler
            );
        });
        this.listeners.clear();

        // Remove delegated events
        this.delegatedEvents.forEach((delegated, key) => {
            delegated.parent.removeEventListener(
                delegated.event,
                delegated.handler
            );
        });
        this.delegatedEvents.clear();
    }

    /**
     * Estatísticas de listeners ativos
     */
    getStats() {
        return {
            totalListeners: this.listeners.size,
            delegatedEvents: this.delegatedEvents.size,
            total: this.listeners.size + this.delegatedEvents.size
        };
    }

    /**
     * Trigger customizado de eventos
     */
    trigger(element, eventType, detail = {}) {
        if (!element) return false;

        const event = new CustomEvent(eventType, {
            detail,
            bubbles: true,
            cancelable: true
        });

        return element.dispatchEvent(event);
    }
}

// Instância global do gerenciador
export const eventManager = new EventManager();

// Atalhos para uso comum
export const on = (element, event, handler, options) => 
    eventManager.on(element, event, handler, options);

export const off = (key) => eventManager.off(key);

export const delegate = (parent, selector, event, handler, options) => 
    eventManager.delegate(parent, selector, event, handler, options);

export const once = (element, event, handler, options) => 
    eventManager.once(element, event, handler, options);

export const trigger = (element, eventType, detail) => 
    eventManager.trigger(element, eventType, detail);

// Cleanup automático quando a página é descarregada
window.addEventListener('beforeunload', () => {
    eventManager.cleanup();
});

// Utilitários de eventos específicos
export const eventUtils = {
    /**
     * Previne comportamento padrão e propagação
     */
    stop(event) {
        event.preventDefault();
        event.stopPropagation();
    },

    /**
     * Handler seguro que não quebra se o callback falhar
     */
    safe(handler) {
        return (event) => {
            try {
                return handler(event);
            } catch (error) {
                console.error('Event handler error:', error);
                return false;
            }
        };
    },

    /**
     * Detecta se é um click/touch válido
     */
    isValidClick(event) {
        // Ignora clicks do botão direito
        if (event.button && event.button !== 0) return false;
        
        // Ignora se tem modificadores
        if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
            return false;
        }
        
        return true;
    },

    /**
     * Detecta tipo de input (mouse, touch, keyboard)
     */
    getInputType(event) {
        if (event.type.startsWith('touch')) return 'touch';
        if (event.type.startsWith('mouse')) return 'mouse';
        if (event.type.startsWith('key')) return 'keyboard';
        return 'unknown';
    }
};
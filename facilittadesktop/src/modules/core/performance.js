// === UTILITÁRIOS DE PERFORMANCE ===

import { CONFIG } from './constants.js';

/**
 * Monitor de performance
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
    }

    /**
     * Inicia medição de performance
     */
    startMeasure(name) {
        performance.mark(`${name}-start`);
        this.metrics.set(name, { startTime: performance.now() });
    }

    /**
     * Finaliza medição de performance
     */
    endMeasure(name) {
        const startData = this.metrics.get(name);
        if (!startData) {
            console.warn(`Performance measure '${name}' was not started`);
            return null;
        }

        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const endTime = performance.now();
        const duration = endTime - startData.startTime;
        
        const result = {
            name,
            duration,
            startTime: startData.startTime,
            endTime
        };

        this.metrics.set(name, result);
        
        // Log se demorar muito
        if (duration > 100) {
            console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
        }

        return result;
    }

    /**
     * Obtém todas as métricas
     */
    getMetrics() {
        return Array.from(this.metrics.values());
    }

    /**
     * Limpa métricas antigas
     */
    clearMetrics() {
        this.metrics.clear();
        performance.clearMarks();
        performance.clearMeasures();
    }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Decorator para monitorar performance de funções
 */
export function measurePerformance(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
        const measureName = `${target.constructor.name}.${propertyName}`;
        perfMonitor.startMeasure(measureName);
        
        try {
            const result = originalMethod.apply(this, args);
            
            if (result instanceof Promise) {
                return result.finally(() => {
                    perfMonitor.endMeasure(measureName);
                });
            } else {
                perfMonitor.endMeasure(measureName);
                return result;
            }
        } catch (error) {
            perfMonitor.endMeasure(measureName);
            throw error;
        }
    };
    
    return descriptor;
}

/**
 * Virtual Scrolling para listas grandes
 */
export class VirtualScrollManager {
    constructor(container, itemHeight = 50, buffer = CONFIG.VIRTUAL_SCROLL_BUFFER) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.buffer = buffer;
        this.items = [];
        this.visibleItems = new Map();
        this.scrollTop = 0;
        
        this.setupScrolling();
    }

    setupScrolling() {
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.updateVisibleItems();
    }

    setItems(items) {
        this.items = items;
        this.container.style.height = `${items.length * this.itemHeight}px`;
        this.updateVisibleItems();
    }

    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleItems();
    }

    updateVisibleItems() {
        const containerHeight = this.container.clientHeight;
        const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
        const endIndex = Math.min(
            this.items.length - 1,
            Math.ceil((this.scrollTop + containerHeight) / this.itemHeight) + this.buffer
        );

        // Remove itens fora da viewport
        this.visibleItems.forEach((element, index) => {
            if (index < startIndex || index > endIndex) {
                element.remove();
                this.visibleItems.delete(index);
            }
        });

        // Adiciona novos itens visíveis
        for (let i = startIndex; i <= endIndex; i++) {
            if (!this.visibleItems.has(i) && this.items[i]) {
                const element = this.createItemElement(this.items[i], i);
                element.style.position = 'absolute';
                element.style.top = `${i * this.itemHeight}px`;
                element.style.height = `${this.itemHeight}px`;
                
                this.container.appendChild(element);
                this.visibleItems.set(i, element);
            }
        }
    }

    createItemElement(item, index) {
        // Método a ser sobrescrito
        const div = document.createElement('div');
        div.textContent = item.toString();
        div.dataset.index = index;
        return div;
    }

    destroy() {
        this.container.removeEventListener('scroll', this.handleScroll);
        this.visibleItems.clear();
    }
}

/**
 * Lazy Loading Manager
 */
export class LazyLoadManager {
    constructor(options = {}) {
        this.options = {
            threshold: 0.1,
            rootMargin: '50px',
            ...options
        };
        
        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            this.options
        );
        
        this.loadingElements = new Set();
    }

    observe(element, loadCallback) {
        element.loadCallback = loadCallback;
        this.observer.observe(element);
    }

    unobserve(element) {
        this.observer.unobserve(element);
        this.loadingElements.delete(element);
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.loadingElements.has(entry.target)) {
                this.loadingElements.add(entry.target);
                
                if (entry.target.loadCallback) {
                    entry.target.loadCallback(entry.target);
                }
                
                this.observer.unobserve(entry.target);
            }
        });
    }

    destroy() {
        this.observer.disconnect();
        this.loadingElements.clear();
    }
}

/**
 * Batch Processor para operações em lote
 */
export class BatchProcessor {
    constructor(batchSize = 50, delay = 0) {
        this.batchSize = batchSize;
        this.delay = delay;
        this.queue = [];
        this.processing = false;
    }

    add(item) {
        this.queue.push(item);
        
        if (!this.processing) {
            this.process();
        }
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            await this.processBatch(batch);
            
            if (this.delay > 0 && this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }
        }
        
        this.processing = false;
    }

    async processBatch(batch) {
        // Método a ser sobrescrito
        console.log('Processing batch:', batch);
    }
}

/**
 * Cache inteligente com TTL
 */
export class SmartCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutos
        this.cache = new Map();
        this.timers = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    set(key, value, customTTL = null) {
        // Remove item mais antigo se necessário
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.delete(firstKey);
        }

        this.cache.set(key, value);
        
        // Setup timer para expiração
        const ttl = customTTL || this.ttl;
        if (ttl > 0) {
            const timer = setTimeout(() => {
                this.delete(key);
            }, ttl);
            
            this.timers.set(key, timer);
        }
    }

    get(key) {
        return this.cache.get(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        
        return this.cache.delete(key);
    }

    clear() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            activeTimers: this.timers.size
        };
    }
}

// Instâncias globais
export const globalCache = new SmartCache(200, 10 * 60 * 1000); // 10 minutos
export const lazyLoader = new LazyLoadManager();

/**
 * Utilitários de otimização
 */
export const optimizeUtils = {
    /**
     * Executa função quando idle
     */
    whenIdle(callback, timeout = 5000) {
        if (window.requestIdleCallback) {
            window.requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, 0);
        }
    },

    /**
     * Preload de recursos críticos
     */
    preloadResource(url, type = 'script') {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = url;
            link.as = type;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    },

    /**
     * Chunk array para processamento em lotes
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    /**
     * Retry com backoff exponencial
     */
    async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
};
// --- src/config/performance.js ---
// Configurações de Performance e Otimizações

const PerformanceConfig = {
    // Configurações de cache
    cache: {
        // Tempo de cache para dados (em milissegundos)
        moradores: 5 * 60 * 1000, // 5 minutos
        usuarios: 10 * 60 * 1000, // 10 minutos
        encomendas: 2 * 60 * 1000, // 2 minutos
        dashboard: 1 * 60 * 1000, // 1 minuto
    },

    // Configurações de debounce
    debounce: {
        search: 300, // 300ms para busca
        autocomplete: 200, // 200ms para autocomplete
        formValidation: 100, // 100ms para validação de formulário
    },

    // Configurações de lazy loading
    lazyLoading: {
        // Número de itens por página
        itemsPerPage: 50,
        // Delay para carregar mais itens (ms)
        loadMoreDelay: 100,
    },

    // Configurações de otimização de DOM
    dom: {
        // Usar DocumentFragment para inserções em lote
        useDocumentFragment: true,
        // Limitar número de elementos por renderização
        maxElementsPerRender: 100,
        // Usar requestAnimationFrame para animações
        useRequestAnimationFrame: true,
    },

    // Configurações de memória
    memory: {
        // Limpar cache quando memória exceder (MB)
        maxMemoryUsage: 100,
        // Intervalo para verificar uso de memória (ms)
        memoryCheckInterval: 30000,
    },

    // Configurações de rede
    network: {
        // Timeout para requisições (ms)
        requestTimeout: 10000,
        // Número máximo de tentativas
        maxRetries: 3,
        // Delay entre tentativas (ms)
        retryDelay: 1000,
    },

    // Configurações de gráficos
    charts: {
        // Usar WebGL para gráficos grandes
        useWebGL: true,
        // Limitar número de pontos em gráficos
        maxDataPoints: 1000,
        // Animar gráficos
        enableAnimations: true,
    }
};

// Classe para gerenciar performance
class PerformanceManager {
    constructor() {
        this.cache = new Map();
        this.memoryUsage = 0;
        this.init();
    }

    init() {
        this.setupMemoryMonitoring();
        this.setupPerformanceMonitoring();
    }

    setupMemoryMonitoring() {
        if (PerformanceConfig.memory.memoryCheckInterval > 0) {
            setInterval(() => {
                this.checkMemoryUsage();
            }, PerformanceConfig.memory.memoryCheckInterval);
        }
    }

    setupPerformanceMonitoring() {
        // Monitorar performance de carregamento
        window.addEventListener('load', () => {
            this.logPerformanceMetrics();
        });

        // Monitorar mudanças de DOM
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                this.handleDOMMutations(mutations);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    checkMemoryUsage() {
        if (performance.memory) {
            const usedMemory = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            this.memoryUsage = usedMemory;

            if (usedMemory > PerformanceConfig.memory.maxMemoryUsage) {
                console.warn(`[Performance] Uso de memória alto: ${usedMemory.toFixed(2)}MB`);
                this.clearOldCache();
            }
        }
    }

    clearOldCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutos
                this.cache.delete(key);
            }
        }
    }

    logPerformanceMetrics() {
        if (performance.timing) {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;

            console.log(`[Performance] Tempo de carregamento: ${loadTime}ms`);
            console.log(`[Performance] DOM Ready: ${domReadyTime}ms`);
        }
    }

    handleDOMMutations(mutations) {
        let addedNodes = 0;
        let removedNodes = 0;

        mutations.forEach(mutation => {
            addedNodes += mutation.addedNodes.length;
            removedNodes += mutation.removedNodes.length;
        });

        if (addedNodes > PerformanceConfig.dom.maxElementsPerRender) {
            console.warn(`[Performance] Muitos elementos adicionados: ${addedNodes}`);
        }
    }

    // Cache management
    setCache(key, data, ttl = PerformanceConfig.cache.moradores) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    getCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // Debounce utility
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Batch DOM operations
    batchDOMOperations(operations) {
        if (PerformanceConfig.dom.useDocumentFragment) {
            const fragment = document.createDocumentFragment();
            operations.forEach(op => op(fragment));
            document.body.appendChild(fragment);
        } else {
            operations.forEach(op => op());
        }
    }

    // Optimized element creation
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    }

    // Optimized list rendering
    renderList(container, items, renderItem, options = {}) {
        const { useFragment = true, clearFirst = true } = options;

        if (clearFirst) {
            container.innerHTML = '';
        }

        if (useFragment) {
            const fragment = document.createDocumentFragment();
            items.forEach(item => {
                fragment.appendChild(renderItem(item));
            });
            container.appendChild(fragment);
        } else {
            items.forEach(item => {
                container.appendChild(renderItem(item));
            });
        }
    }

    // Performance monitoring
    measureTime(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    async measureTimeAsync(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
}

// Exportar configurações e gerenciador
window.PerformanceConfig = PerformanceConfig;
window.PerformanceManager = PerformanceManager; 
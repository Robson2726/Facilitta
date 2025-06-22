// === UTILITÁRIOS DOM OTIMIZADOS ===

import { CSS_CLASSES, CONFIG } from './constants.js';

// Cache de elementos DOM para evitar re-queries
const elementCache = new Map();

/**
 * Cache otimizado de elementos DOM
 */
export function $(selector, useCache = true) {
    if (useCache && elementCache.has(selector)) {
        return elementCache.get(selector);
    }
    
    const element = document.querySelector(selector);
    if (useCache && element) {
        elementCache.set(selector, element);
    }
    
    return element;
}

/**
 * Query All com cache opcional
 */
export function $$(selector, useCache = false) {
    if (useCache && elementCache.has(selector + '_all')) {
        return elementCache.get(selector + '_all');
    }
    
    const elements = document.querySelectorAll(selector);
    if (useCache) {
        elementCache.set(selector + '_all', elements);
    }
    
    return elements;
}

/**
 * Limpa cache de elementos DOM
 */
export function clearElementCache() {
    elementCache.clear();
}

/**
 * Debounce otimizado para performance
 */
export function debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle para operações frequentes
 */
export function throttle(func, limit = 16) { // ~60fps
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Manipulação de classes otimizada
 */
export const classUtils = {
    add(element, className) {
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    },
    
    remove(element, className) {
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
        }
    },
    
    toggle(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    },
    
    has(element, className) {
        return element ? element.classList.contains(className) : false;
    }
};

/**
 * Criação otimizada de elementos
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
        element.className = options.className;
    }
    
    if (options.id) {
        element.id = options.id;
    }
    
    if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
    }
    
    if (options.textContent) {
        element.textContent = options.textContent;
    }
    
    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }
    
    if (options.styles) {
        Object.assign(element.style, options.styles);
    }
    
    if (options.parent) {
        options.parent.appendChild(element);
    }
    
    return element;
}

/**
 * Limpeza segura de conteúdo
 */
export function clearElement(element) {
    if (element) {
        // Remove event listeners para prevenir memory leaks
        const clonedElement = element.cloneNode(false);
        element.parentNode?.replaceChild(clonedElement, element);
        return clonedElement;
    }
    return null;
}

/**
 * Animação suave com requestAnimationFrame
 */
export function smoothUpdate(callback) {
    return requestAnimationFrame(callback);
}

/**
 * Batch de operações DOM para melhor performance
 */
export function batchDOMUpdates(updates) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            updates.forEach(update => update());
            resolve();
        });
    });
}

/**
 * Observer otimizado para elementos
 */
export function observeElement(element, callback, options = {}) {
    const observer = new IntersectionObserver(callback, {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px'
    });
    
    observer.observe(element);
    return observer;
}

/**
 * Sanitização básica de HTML
 */
export function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Formatação de dados para display
 */
export const formatters = {
    date(date, format = 'DD/MM/YYYY') {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return format
            .replace('DD', day)
            .replace('MM', month)
            .replace('YYYY', year);
    },
    
    time(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },
    
    datetime(date) {
        return `${this.date(date)} ${this.time(date)}`;
    },
    
    truncate(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

/**
 * Utilitários de formulário
 */
export const formUtils = {
    getData(form) {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    },
    
    setData(form, data) {
        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = value || '';
            }
        });
    },
    
    reset(form) {
        form.reset();
        // Remove validation states
        const fields = form.querySelectorAll('.error, .success');
        fields.forEach(field => {
            classUtils.remove(field, 'error');
            classUtils.remove(field, 'success');
        });
    },
    
    validate(form, rules = {}) {
        let isValid = true;
        const errors = {};
        
        Object.entries(rules).forEach(([fieldName, rule]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && rule.required && !field.value.trim()) {
                errors[fieldName] = rule.message || 'Campo obrigatório';
                isValid = false;
            }
        });
        
        return { isValid, errors };
    }
};
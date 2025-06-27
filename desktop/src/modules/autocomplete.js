// --- src/modules/autocomplete.js ---
// Gerenciador de Autocomplete

class AutocompleteManager {
    constructor() {
        this.selectedMoradorId = null;
        this.selectedPorteiroUserId = null;
        this.selectedEntregaPorteiroId = null;
        this.init();
    }

    init() {
        this.setupClearButtons();
    }

    // Criar wrapper para o campo de input com ícone
    createInputWrapper(input, fieldType) {
        if (input.parentElement.classList.contains('autocomplete-wrapper')) {
            return; // Já tem wrapper
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.width = '100%';

        // Mover o input para dentro do wrapper
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        // Criar ícone de seleção
        const selectedIcon = document.createElement('span');
        selectedIcon.className = 'selected-icon';
        selectedIcon.innerHTML = '✓';
        selectedIcon.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #4caf50;
            font-weight: bold;
            font-size: 14px;
            display: none;
            pointer-events: none;
            z-index: 10;
        `;
        wrapper.appendChild(selectedIcon);

        // Criar botão de limpar
        const clearButton = document.createElement('button');
        clearButton.className = 'clear-button';
        clearButton.innerHTML = '×';
        clearButton.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: #f44336;
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 14px;
            cursor: pointer;
            display: none;
            z-index: 10;
        `;
        clearButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearField(fieldType);
        });
        wrapper.appendChild(clearButton);

        // Ajustar padding do input para dar espaço aos ícones
        input.style.paddingRight = '30px';
    }

    // Limpar campo e resetar seleção
    clearField(fieldType) {
        let input, selectedId;
        
        switch (fieldType) {
            case 'morador':
                input = document.getElementById('morador');
                selectedId = this.selectedMoradorId;
                this.selectedMoradorId = null;
                break;
            case 'porteiro':
                input = document.getElementById('porteiro');
                selectedId = this.selectedPorteiroUserId;
                this.selectedPorteiroUserId = null;
                break;
            case 'entrega-porteiro':
                input = document.getElementById('entrega-porteiro');
                selectedId = this.selectedEntregaPorteiroId;
                this.selectedEntregaPorteiroId = null;
                break;
        }

        if (input) {
            input.value = '';
            this.updateFieldVisualState(input, false);
            input.focus();
        }
    }

    // Atualizar estado visual do campo
    updateFieldVisualState(input, isSelected) {
        const wrapper = input.closest('.autocomplete-wrapper');
        if (!wrapper) return;

        const selectedIcon = wrapper.querySelector('.selected-icon');
        const clearButton = wrapper.querySelector('.clear-button');

        if (isSelected) {
            if (selectedIcon) selectedIcon.style.display = 'block';
            if (clearButton) clearButton.style.display = 'block';
            input.style.borderColor = '#4caf50';
            input.style.backgroundColor = '#f8fff8';
        } else {
            if (selectedIcon) selectedIcon.style.display = 'none';
            if (clearButton) clearButton.style.display = 'none';
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        }
    }

    // Configurar botões de limpar
    setupClearButtons() {
        // Os botões são criados dinamicamente quando os campos são configurados
    }

    async handleMoradorInput() {
        const input = document.getElementById('morador');
        if (!input || !window.electronAPI?.searchResidents) return;

        const term = input.value;
        console.log(`[Autocomplete] handleMoradorInput called. Term: "${term}"`);
        
        // Se o campo foi limpo, resetar seleção
        if (!term || term.trim() === '') {
            this.selectedMoradorId = null;
            this.updateFieldVisualState(input, false);
        }
        
        if (term?.length >= 1) {
            try {
                console.log('[Autocomplete] Calling API searchResidents...');
                const res = await window.electronAPI.searchResidents(term);
                console.log('[Autocomplete] API searchResidents response:', res);
                this.displayMoradorSuggestions(res);
            } catch (err) {
                console.error('[Autocomplete] Error calling searchResidents:', err);
                const suggestionsDiv = document.getElementById('morador-suggestions');
                if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
            }
        } else {
            const suggestionsDiv = document.getElementById('morador-suggestions');
            if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
        }
    }

    async handlePorteiroInput() {
        const input = document.getElementById('porteiro');
        if (!input || !window.electronAPI?.searchActivePorters) return;

        const term = input.value;
        console.log(`[Autocomplete] handlePorteiroInput called. Term: "${term}"`);
        
        // Se o campo foi limpo, resetar seleção
        if (!term || term.trim() === '') {
            this.selectedPorteiroUserId = null;
            this.updateFieldVisualState(input, false);
        }
        
        if (term?.length >= 1) {
            try {
                console.log('[Autocomplete] Calling API searchActivePorters...');
                const res = await window.electronAPI.searchActivePorters(term);
                console.log('[Autocomplete] API searchActivePorters response:', res);
                this.displayPorteiroSuggestions(res);
            } catch (err) {
                console.error('[Autocomplete] Error calling searchActivePorters:', err);
                const suggestionsDiv = document.getElementById('porteiro-suggestions');
                if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
            }
        } else {
            const suggestionsDiv = document.getElementById('porteiro-suggestions');
            if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
        }
    }

    async handleEntregaPorteiroInput() {
        const input = document.getElementById('entrega-porteiro');
        if (!input || !window.electronAPI?.searchActivePorters) return;

        const term = input.value;
        console.log(`[Autocomplete] handleEntregaPorteiroInput called. Term: "${term}"`);
        
        // Se o campo foi limpo, resetar seleção
        if (!term || term.trim() === '') {
            this.selectedEntregaPorteiroId = null;
            this.updateFieldVisualState(input, false);
        }
        
        if (term?.length >= 1) {
            try {
                console.log('[Autocomplete] Calling API searchActivePorters...');
                const res = await window.electronAPI.searchActivePorters(term);
                console.log('[Autocomplete] API searchActivePorters response:', res);
                this.displayEntregaPorteiroSuggestions(res);
            } catch (err) {
                console.error('[Autocomplete] Error calling searchActivePorters:', err);
                const suggestionsDiv = document.getElementById('entrega-porteiro-suggestions');
                if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
            }
        } else {
            const suggestionsDiv = document.getElementById('entrega-porteiro-suggestions');
            if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
        }
    }

    handleMoradorKeyboard(e) {
        const suggestions = document.getElementById('morador-suggestions')?.querySelectorAll('.suggestion-item');
        if (!suggestions || suggestions.length === 0) return;
        
        let selectedIndex = -1;
        suggestions.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                selectedIndex = index;
            }
        });
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % suggestions.length;
            this.updateMoradorSuggestionSelection(suggestions, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
            this.updateMoradorSuggestionSelection(suggestions, selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            suggestions[selectedIndex].click();
        } else if (e.key === 'Escape') {
            const suggestionsDiv = document.getElementById('morador-suggestions');
            if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
        }
    }

    handlePorteiroKeyboard(e) {
        const suggestions = document.getElementById('porteiro-suggestions')?.querySelectorAll('.suggestion-item');
        if (!suggestions || suggestions.length === 0) return;
        
        let selectedIndex = -1;
        suggestions.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                selectedIndex = index;
            }
        });
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % suggestions.length;
            this.updatePorteiroSuggestionSelection(suggestions, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
            this.updatePorteiroSuggestionSelection(suggestions, selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            suggestions[selectedIndex].click();
        } else if (e.key === 'Escape') {
            const suggestionsDiv = document.getElementById('porteiro-suggestions');
            if (suggestionsDiv) suggestionsDiv.classList.remove('visible');
        }
    }

    displayMoradorSuggestions(suggestions) {
        const suggestionsDiv = document.getElementById('morador-suggestions');
        if (!suggestionsDiv) {
            console.error("[Autocomplete] Elemento suggestionsMoradorDiv não encontrado!");
            return;
        }

        console.log('[Autocomplete] displayMoradorSuggestions received:', suggestions);
        suggestionsDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach((r, index) => {
                try {
                    if (!r || typeof r.id === 'undefined' || typeof r.nome === 'undefined') {
                        console.warn("[Autocomplete] Item de sugestão inválido recebido (Morador):", r);
                        return;
                    }

                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.dataset.id = r.id;
                    div.dataset.name = r.nome;
                    
                    // Adicionar ícone de morador
                    const icon = document.createElement('span');
                    icon.className = 'resident-icon';
                    icon.textContent = 'M';
                    div.appendChild(icon);
                    
                    // Adicionar nome
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = r.nome;
                    div.appendChild(nameSpan);
                    
                    // Adicionar informações adicionais se disponíveis
                    if (r.apartamento) {
                        const infoSpan = document.createElement('span');
                        infoSpan.textContent = ` (AP ${r.apartamento})`;
                        infoSpan.style.color = '#666';
                        infoSpan.style.fontSize = '12px';
                        div.appendChild(infoSpan);
                    }
                    
                    // Event listeners para mouse
                    div.addEventListener('mouseenter', () => {
                        this.updateMoradorSuggestionSelection(suggestionsDiv.querySelectorAll('.suggestion-item'), index);
                    });
                    
                    div.addEventListener('click', () => {
                        const target = document.getElementById('morador');
                        if (target) target.value = r.nome;
                        this.selectedMoradorId = r.id;
                        console.log(`Morador selecionado: ${r.nome} (ID: ${r.id})`);
                        suggestionsDiv.classList.remove('visible');
                        suggestionsDiv.innerHTML = '';
                        
                        // Atualizar estado visual do campo
                        this.updateFieldVisualState(target, true);
                        
                        // Move foco para próximo campo
                        const nextField = document.getElementById('quantidade');
                        if (nextField) nextField.focus();
                    });

                    suggestionsDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[Autocomplete] Erro dentro do loop displayMoradorSuggestions:", loopError, "Item problemático:", r);
                }
            });

            if (suggestionsDiv.children.length > 0) {
                suggestionsDiv.classList.add('visible');
                console.log('[Autocomplete] Morador suggestions displayed (com itens no DOM).');
            } else {
                suggestionsDiv.classList.remove('visible');
                console.log('[Autocomplete] Nenhum item de sugestão de morador foi adicionado ao DOM.');
            }
        } else {
            suggestionsDiv.classList.remove('visible');
            console.log('[Autocomplete] No morador suggestions to display (array de sugestões vazio).');
        }
    }

    displayPorteiroSuggestions(suggestions) {
        const suggestionsDiv = document.getElementById('porteiro-suggestions');
        if (!suggestionsDiv) {
            console.error("[Autocomplete] Elemento suggestionsPorteiroDiv não encontrado!");
            return;
        }

        console.log('[Autocomplete] displayPorteiroSuggestions received:', suggestions);
        suggestionsDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach((p, index) => {
                try {
                    if (!p || typeof p.id === 'undefined' || typeof p.nome === 'undefined') {
                        console.warn("[Autocomplete] Item de sugestão inválido recebido (Porteiro):", p);
                        return;
                    }

                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.dataset.id = p.id;
                    div.dataset.name = p.nome;
                    
                    // Adicionar ícone de porteiro
                    const icon = document.createElement('span');
                    icon.className = 'porter-icon';
                    icon.textContent = 'P';
                    div.appendChild(icon);
                    
                    // Adicionar nome
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = p.nome;
                    div.appendChild(nameSpan);
                    
                    // Adicionar informações adicionais se disponíveis
                    if (p.apartamento) {
                        const infoSpan = document.createElement('span');
                        infoSpan.textContent = ` (AP ${p.apartamento})`;
                        infoSpan.style.color = '#666';
                        infoSpan.style.fontSize = '12px';
                        div.appendChild(infoSpan);
                    }
                    
                    // Event listeners para mouse
                    div.addEventListener('mouseenter', () => {
                        this.updatePorteiroSuggestionSelection(suggestionsDiv.querySelectorAll('.suggestion-item'), index);
                    });
                    
                    div.addEventListener('click', () => {
                        const target = document.getElementById('porteiro');
                        if (target) target.value = p.nome;
                        this.selectedPorteiroUserId = p.id;
                        console.log(`Porteiro (Usuário) selecionado: ${p.nome} (User ID: ${p.id})`);
                        suggestionsDiv.classList.remove('visible');
                        suggestionsDiv.innerHTML = '';
                        
                        // Atualizar estado visual do campo
                        this.updateFieldVisualState(target, true);
                        
                        // Move foco para próximo campo
                        const nextField = document.getElementById('observacoes');
                        if (nextField) nextField.focus();
                    });

                    suggestionsDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[Autocomplete] Erro dentro do loop displayPorteiroSuggestions:", loopError, "Item problemático:", p);
                }
            });

            if (suggestionsDiv.children.length > 0) {
                suggestionsDiv.classList.add('visible');
                console.log('[Autocomplete] Porter suggestions displayed (com itens no DOM).');
            } else {
                suggestionsDiv.classList.remove('visible');
                console.log('[Autocomplete] Nenhum item de sugestão de porteiro foi adicionado ao DOM.');
            }
        } else {
            suggestionsDiv.classList.remove('visible');
            console.log('[Autocomplete] No porter suggestions to display (array de sugestões vazio).');
        }
    }

    displayEntregaPorteiroSuggestions(suggestions) {
        const suggestionsDiv = document.getElementById('entrega-porteiro-suggestions');
        if (!suggestionsDiv) {
            console.error("[Autocomplete] Elemento suggestionsEntregaPorteiroDiv não encontrado!");
            return;
        }

        console.log('[Autocomplete] displayEntregaPorteiroSuggestions received:', suggestions);
        suggestionsDiv.innerHTML = '';

        if (suggestions?.length > 0) {
            suggestions.forEach(user => {
                try {
                    if (!user || typeof user.id === 'undefined' || typeof user.nome === 'undefined') {
                        console.warn("[Autocomplete] Item de sugestão inválido recebido (Porteiro):", user);
                        return;
                    }

                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.dataset.id = user.id;
                    div.dataset.name = user.nome;
                    
                    // Adicionar ícone de porteiro
                    const icon = document.createElement('span');
                    icon.className = 'porter-icon';
                    icon.textContent = 'P';
                    div.appendChild(icon);
                    
                    // Adicionar nome
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = user.nome;
                    div.appendChild(nameSpan);
                    
                    // Adicionar informações adicionais se disponíveis
                    if (user.apartamento) {
                        const infoSpan = document.createElement('span');
                        infoSpan.textContent = ` (AP ${user.apartamento})`;
                        infoSpan.style.color = '#666';
                        infoSpan.style.fontSize = '12px';
                        div.appendChild(infoSpan);
                    }
                    
                    div.addEventListener('click', () => {
                        const target = document.getElementById('entrega-porteiro');
                        if (target) target.value = user.nome;
                        this.selectedEntregaPorteiroId = user.id;
                        console.log(`Porteiro da Entrega selecionado: ${user.nome} (User ID: ${user.id})`);
                        suggestionsDiv.classList.remove('visible');
                        suggestionsDiv.innerHTML = '';
                        
                        // Atualizar estado visual do campo
                        this.updateFieldVisualState(target, true);
                    });

                    suggestionsDiv.appendChild(div);
                } catch (loopError) {
                    console.error("[Autocomplete] Erro dentro do loop displayEntregaPorteiroSuggestions:", loopError, "Item:", user);
                }
            });

            if (suggestionsDiv.children.length > 0) {
                suggestionsDiv.classList.add('visible');
                console.log('[Autocomplete] Entrega Porter suggestions displayed (com itens no DOM).');
            } else {
                suggestionsDiv.classList.remove('visible');
                console.log('[Autocomplete] Nenhum item de sugestão de porteiro (entrega) foi adicionado ao DOM.');
            }
        } else {
            suggestionsDiv.classList.remove('visible');
            console.log('[Autocomplete] No Entrega Porter suggestions to display.');
        }
    }

    updateMoradorSuggestionSelection(suggestions, selectedIndex) {
        suggestions.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    updatePorteiroSuggestionSelection(suggestions, selectedIndex) {
        suggestions.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // Getters para acessar os IDs selecionados
    getSelectedMoradorId() {
        return this.selectedMoradorId;
    }

    getSelectedPorteiroUserId() {
        return this.selectedPorteiroUserId;
    }

    getSelectedEntregaPorteiroId() {
        return this.selectedEntregaPorteiroId;
    }

    // Setters para definir os IDs selecionados
    setSelectedMoradorId(id) {
        this.selectedMoradorId = id;
    }

    setSelectedPorteiroUserId(id) {
        this.selectedPorteiroUserId = id;
    }

    setSelectedEntregaPorteiroId(id) {
        this.selectedEntregaPorteiroId = id;
    }
}

// Exportar para uso global
window.AutocompleteManager = AutocompleteManager; 
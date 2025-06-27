// Simulação do problema dos gráficos
console.log('🔍 SIMULAÇÃO DO PROBLEMA DOS GRÁFICOS');
console.log('='.repeat(50));

// Simulando dados reais do banco (baseado no que o usuário descreveu)
const encomendasSimuladas = [
    { id: 1, morador_id: 1, quantidade: 3, data_recebimento: '2025-01-06T10:00:00Z', status: 'Recebida na portaria' },
    { id: 2, morador_id: 2, quantidade: 1, data_recebimento: '2025-01-06T11:00:00Z', status: 'Recebida na portaria' },
    { id: 3, morador_id: 1, quantidade: 2, data_recebimento: '2025-01-06T12:00:00Z', status: 'Recebida na portaria' },
    { id: 4, morador_id: 3, quantidade: 1, data_recebimento: '2025-01-05T15:00:00Z', status: 'Recebida na portaria' },
    { id: 5, morador_id: 2, quantidade: 4, data_recebimento: '2025-01-05T16:00:00Z', status: 'Entregue' },
    { id: 6, morador_id: 4, quantidade: 1, data_recebimento: '2025-01-04T09:00:00Z', status: 'Recebida na portaria' }
];

console.log('\n📊 DADOS SIMULADOS:');
console.table(encomendasSimuladas);

// 1. LÓGICA DOS CARDS (CORRETA) - Só encomendas pendentes
console.log('\n✅ LÓGICA DOS CARDS (CORRETA):');
const encomendasPendentes = encomendasSimuladas.filter(e => e.status === 'Recebida na portaria');
const totalCards = encomendasPendentes.reduce((acc, enc) => acc + (parseInt(enc.quantidade, 10) || 1), 0);
console.log('Encomendas pendentes:', encomendasPendentes);
console.log('Total do card:', totalCards);

// 2. LÓGICA ATUAL DOS GRÁFICOS - Deve usar a mesma lógica dos cards
console.log('\n📈 LÓGICA QUE OS GRÁFICOS DEVEM USAR:');

// Aplicar a mesma lógica dos cards aos gráficos
const gruposPorDataCorreto = {};
encomendasSimuladas.forEach(enc => {
    if (enc.status === 'Recebida na portaria') { // Só encomendas pendentes
        const data = enc.data_recebimento.split('T')[0];
        if (!gruposPorDataCorreto[data]) {
            gruposPorDataCorreto[data] = 0;
        }
        gruposPorDataCorreto[data] += parseInt(enc.quantidade, 10);
    }
});

console.log('Grupos por data (lógica dos cards):', gruposPorDataCorreto);

// 3. COMPARAÇÃO
console.log('\n📋 COMPARAÇÃO:');
console.log('Card "Encomendas Pendentes":', totalCards);
console.log('Gráfico usando mesma lógica por 2025-01-06:', gruposPorDataCorreto['2025-01-06']);
console.log('Gráfico usando mesma lógica por 2025-01-05:', gruposPorDataCorreto['2025-01-05']);

console.log('\n🎯 SOLUÇÃO:');
console.log('Os gráficos devem aplicar exatamente a mesma lógica dos cards:');
console.log('1. Filtrar apenas encomendas com status "Recebida na portaria"');
console.log('2. Somar as quantidades por data');
console.log('3. Usar a mesma função JavaScript que os cards usam');

import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

interface Encomenda {
  id: string;
  morador_nome: string;
  apartamento: string;
  bloco: string;
  quantidade: number;
  data_recebimento: string;
  hora_recebimento: string;
  porteiro_nome: string;
  observacoes?: string;
  status: 'pendente' | 'entregue';
  data_entrega?: string;
}

interface Usuario {
  id: string;
  nome_completo: string;
}

export default function PesquisarScreen() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredEncomendas, setFilteredEncomendas] = useState<Encomenda[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'entregue'>('all');
  const [entregaModalVisible, setEntregaModalVisible] = useState(false);
  const [encomendaParaEntregar, setEncomendaParaEntregar] = useState<Encomenda | null>(null);
  const [entregaLoading, setEntregaLoading] = useState(false);
  
  // Estados existentes para modal de entrega
  const [dataEntrega, setDataEntrega] = useState('');
  const [horaEntrega, setHoraEntrega] = useState('');
  const [retiradoPor, setRetiradoPor] = useState('');
  const [observacoesEntrega, setObservacoesEntrega] = useState('');
  const [buscaPorteiro, setBuscaPorteiro] = useState('');
  const [porteiroSelecionado, setPorteiroSelecionado] = useState<Usuario | null>(null);
  const [porteirosEncontrados, setPorteirosEncontrados] = useState<Usuario[]>([]);
  const [buscandoPorteiros, setBuscandoPorteiros] = useState(false);

  // Novos estados para seleção múltipla
  const [modoSelecao, setModoSelecao] = useState(false);
  const [encomendasSelecionadas, setEncomendasSelecionadas] = useState<Set<string>>(new Set());
  const [entregaLoteModalVisible, setEntregaLoteModalVisible] = useState(false);
  const [entregaLoteLoading, setEntregaLoteLoading] = useState(false);

  useEffect(() => {
    buscarEncomendas();
  }, []);

  useEffect(() => {
    filtrarEncomendas();
  }, [searchText, statusFilter, encomendas]);

  const buscarEncomendas = async () => {
    try {
      setLoading(true);
      
      // Buscar configuração da API
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        const apiUrl = await AsyncStorage.getItem('apiUrl');
        const apiPorta = await AsyncStorage.getItem('apiPorta');
        
        if (!apiUrl || !apiPorta) {
          Alert.alert('Erro', 'Configure o IP e porta da API na aba Ajustes.');
          return;
        }
        
        const config = { ip: apiUrl, port: apiPorta };
        await AsyncStorage.setItem('apiConfig', JSON.stringify(config));
      }

      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // CORREÇÃO: Sempre use o array da API para listar e filtrar pendentes
        setEncomendas(result.data || []);
      } else {
        Alert.alert('Erro', result.message || 'Erro ao buscar encomendas');
      }
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor. Verifique a conexão e configurações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtrarEncomendas = () => {
    let filtered = encomendas;

    // Filtrar por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filtrar por texto de busca
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.morador_nome.toLowerCase().includes(searchLower) ||
        (item.observacoes && item.observacoes.toLowerCase().includes(searchLower))
      );
    }

    setFilteredEncomendas(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    buscarEncomendas();
  };

  const marcarComoEntregue = async (encomendaId: string) => {
    try {
      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas/${encomendaId}/entregar`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_entrega: new Date().toISOString().split('T')[0],
          hora_entrega: new Date().toTimeString().split(' ')[0].substring(0, 5),
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Sucesso', 'Encomenda marcada como entregue!');
        buscarEncomendas(); // Recarregar lista
      } else {
        Alert.alert('Erro', result.message || 'Erro ao marcar como entregue');
      }
    } catch (error) {
      console.error('Erro ao marcar como entregue:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor.');
    }
  };

  const abrirModalEntrega = async (encomenda: Encomenda) => {
    setEncomendaParaEntregar(encomenda);
    
    // Auto-preenche com data/hora atual no formato brasileiro
    const agora = new Date();
    const dataAtualBrasileira = agora.toLocaleDateString('pt-BR'); // DD/MM/AAAA
    const horaAtual = agora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    setDataEntrega(dataAtualBrasileira);
    setHoraEntrega(horaAtual);
    setRetiradoPor('');
    setObservacoesEntrega('');
    setBuscaPorteiro('');
    setPorteiroSelecionado(null);
    setPorteirosEncontrados([]);
    setEntregaModalVisible(true);
  };

  const buscarPorteiros = async (termo: string) => {
    if (!termo.trim()) {
      setPorteirosEncontrados([]);
      return;
    }
    
    setBuscandoPorteiros(true);
    
    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        Alert.alert('Erro', 'Configure a API na aba Ajustes.');
        return;
      }
      
      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/usuarios?nivel=porteiro&status=Ativo`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Filtra localmente os porteiros que contêm o termo de busca
        const filtrados = (result.data || []).filter((porteiro: Usuario) =>
          porteiro.nome_completo.toLowerCase().includes(termo.toLowerCase())
        );
        setPorteirosEncontrados(filtrados);
      } else {
        setPorteirosEncontrados([]);
      }
    } catch (error) {
      console.error('Erro ao buscar porteiros:', error);
      setPorteirosEncontrados([]);
    } finally {
      setBuscandoPorteiros(false);
    }
  };

  const selecionarPorteiro = (porteiro: Usuario) => {
    setPorteiroSelecionado(porteiro);
    setBuscaPorteiro(porteiro.nome_completo);
    setPorteirosEncontrados([]);
  };

  const formatarDataParaISO = (dataBrasileira: string) => {
    if (!dataBrasileira) return '';
    
    // Se já está no formato ISO (YYYY-MM-DD), retorna como está
    if (dataBrasileira.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dataBrasileira;
    }
    
    // Se está no formato brasileiro (DD/MM/AAAA), converte para ISO
    if (dataBrasileira.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, ano] = dataBrasileira.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    
    return dataBrasileira;
  };

  const validarDataBrasileira = (data: string) => {
    // Verifica se está no formato DD/MM/AAAA
    if (!data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return false;
    }
    
    const [dia, mes, ano] = data.split('/').map(Number);
    
    // Validações básicas
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;
    if (ano < 1900 || ano > 2100) return false;
    
    // Validação de dias por mês
    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Ano bissexto
    if (mes === 2 && ((ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0)) {
      diasPorMes[1] = 29;
    }
    
    return dia <= diasPorMes[mes - 1];
  };

  const confirmarEntrega = async () => {
    if (!encomendaParaEntregar) {
      Alert.alert('Erro', 'Nenhuma encomenda selecionada');
      return;
    }
    
    // Validações
    if (!dataEntrega.trim()) {
      Alert.alert('Erro', 'Informe a data da entrega');
      return;
    }
    
    if (!validarDataBrasileira(dataEntrega)) {
      Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA (ex: 25/12/2024)');
      return;
    }
    
    if (!horaEntrega.trim()) {
      Alert.alert('Erro', 'Informe a hora da entrega');
      return;
    }
    
    // Validação da hora
    if (!horaEntrega.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Erro', 'Hora inválida. Use o formato HH:MM (ex: 14:30)');
      return;
    }
    
    if (!porteiroSelecionado) {
      Alert.alert('Erro', 'Selecione o porteiro que fez a entrega');
      return;
    }
    
    if (!retiradoPor.trim()) {
      Alert.alert('Erro', 'Informe quem retirou a encomenda');
      return;
    }
    
    setEntregaLoading(true);
    
    try {
      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      const apiUrl = `http://${config.ip}:${config.port}/api/encomendas/${encomendaParaEntregar.id}/entregar`;
      
      // Converte a data brasileira para formato ISO antes de enviar
      const dataISO = formatarDataParaISO(dataEntrega);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_entrega: dataISO, // Envia no formato ISO
          hora_entrega: horaEntrega,
          retirado_por: retiradoPor.trim(),
          observacoes: observacoesEntrega.trim() || null,
          porteiro_entregou_id: porteiroSelecionado.id
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Sucesso', 'Encomenda marcada como entregue!');
        setEntregaModalVisible(false);
        buscarEncomendas(); // Recarregar lista
      } else {
        Alert.alert('Erro', result.message || 'Erro ao marcar como entregue');
      }
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor.');
    } finally {
      setEntregaLoading(false);
    }
  };

  const formatarDataBrasileira = (dataISO: string) => {
    if (!dataISO) return '';
    
    // Se já está no formato brasileiro, retorna como está
    if (dataISO.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dataISO;
    }
    
    // Se está no formato ISO, converte para brasileiro
    if (dataISO.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [ano, mes, dia] = dataISO.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    return dataISO;
  };

  const formatarDataEnquantoDigita = (text: string) => {
    // Remove tudo que não é número
    const apenasNumeros = text.replace(/\D/g, '');
    
    // Aplica formatação DD/MM/AAAA
    let dataFormatada = apenasNumeros;
    
    if (apenasNumeros.length >= 3) {
      dataFormatada = apenasNumeros.slice(0, 2) + '/' + apenasNumeros.slice(2);
    }
    
    if (apenasNumeros.length >= 5) {
      dataFormatada = apenasNumeros.slice(0, 2) + '/' + apenasNumeros.slice(2, 4) + '/' + apenasNumeros.slice(4, 8);
    }
    
    return dataFormatada;
  };

  const formatarHoraEnquantoDigita = (text: string) => {
    // Remove tudo que não é número
    const apenasNumeros = text.replace(/\D/g, '');
    
    // Aplica formatação HH:MM
    let horaFormatada = apenasNumeros;
    
    if (apenasNumeros.length >= 3) {
      horaFormatada = apenasNumeros.slice(0, 2) + ':' + apenasNumeros.slice(2, 4);
    }
    
    return horaFormatada;
  };

  const calcularDiasPendentes = (dataRecebimento: string) => {
    // CORREÇÃO: Criar datas locais sem problemas de timezone
    const hoje = new Date();
    const [ano, mes, dia] = dataRecebimento.split('-').map(Number);
    const dataRecebida = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11 para meses
    
    // Calcular diferença em dias
    const diffTime = hoje.getTime() - dataRecebida.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTempoColor = (dataRecebimento: string) => {
    const dias = calcularDiasPendentes(dataRecebimento);
    if (dias > 15) return { color: '#dc3545' }; // Vermelho para crítico
    if (dias > 7) return { color: '#ffc107' }; // Amarelo para antigo
    return { color: '#28a745' }; // Verde para recente
  };

  const toggleSelecaoEncomenda = (encomendaId: string) => {
    const novasSelecoes = new Set(encomendasSelecionadas);
    if (novasSelecoes.has(encomendaId)) {
      novasSelecoes.delete(encomendaId);
    } else {
      novasSelecoes.add(encomendaId);
    }
    setEncomendasSelecionadas(novasSelecoes);
    
    // Se não há mais seleções, sai do modo seleção
    if (novasSelecoes.size === 0) {
      setModoSelecao(false);
    }
  };

  const ativarModoSelecao = (encomendaId: string) => {
    setModoSelecao(true);
    setEncomendasSelecionadas(new Set([encomendaId]));
  };

  const cancelarModoSelecao = () => {
    setModoSelecao(false);
    setEncomendasSelecionadas(new Set());
  };

  
  

  const abrirModalEntregaLote = () => {
    if (encomendasSelecionadas.size === 0) {
      Alert.alert('Aviso', 'Selecione pelo menos uma encomenda.');
      return;
    }

    // Auto-preenche com data/hora atual no formato brasileiro
    const agora = new Date();
    const dataAtualBrasileira = agora.toLocaleDateString('pt-BR');
    const horaAtual = agora.toTimeString().split(' ')[0].substring(0, 5);
    
    setDataEntrega(dataAtualBrasileira);
    setHoraEntrega(horaAtual);
    setRetiradoPor('');
    setObservacoesEntrega('');
    setBuscaPorteiro('');
    setPorteiroSelecionado(null);
    setPorteirosEncontrados([]);
    setEntregaLoteModalVisible(true);
  };

  const confirmarEntregaLote = async () => {
    if (encomendasSelecionadas.size === 0) {
      Alert.alert('Erro', 'Nenhuma encomenda selecionada');
      return;
    }
    
    // Validações
    if (!dataEntrega.trim()) {
      Alert.alert('Erro', 'Informe a data da entrega');
      return;
    }
    
    if (!validarDataBrasileira(dataEntrega)) {
      Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA (ex: 25/12/2024)');
      return;
    }
    
    if (!horaEntrega.trim()) {
      Alert.alert('Erro', 'Informe a hora da entrega');
      return;
    }
    
    if (!horaEntrega.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Erro', 'Hora inválida. Use o formato HH:MM (ex: 14:30)');
      return;
    }
    
    if (!porteiroSelecionado) {
      Alert.alert('Erro', 'Selecione o porteiro que fez a entrega');
      return;
    }
    
    if (!retiradoPor.trim()) {
      Alert.alert('Erro', 'Informe quem retirou as encomendas');
      return;
    }
    
    setEntregaLoteLoading(true);
    
    try {
      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      const dataISO = formatarDataParaISO(dataEntrega);
      
      let sucessos = 0;
      let erros = 0;
      
      // Processar cada encomenda selecionada
      for (const encomendaId of encomendasSelecionadas) {
        try {
          const apiUrl = `http://${config.ip}:${config.port}/api/encomendas/${encomendaId}/entregar`;
          
          const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data_entrega: dataISO,
              hora_entrega: horaEntrega,
              retirado_por: retiradoPor.trim(),
              observacoes: observacoesEntrega.trim() || null,
              porteiro_entregou_id: porteiroSelecionado.id
            }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            sucessos++;
          } else {
            erros++;
            console.error(`Erro ao entregar encomenda ${encomendaId}:`, result.message);
          }
        } catch (error) {
          erros++;
          console.error(`Erro de conexão para encomenda ${encomendaId}:`, error);
        }
      }
      
      // Resultado final
      if (erros === 0) {
        Alert.alert('Sucesso', `Todas as ${sucessos} encomendas foram marcadas como entregues!`);
      } else if (sucessos > 0) {
        Alert.alert('Parcial', `${sucessos} encomendas entregues com sucesso, ${erros} falharam.`);
      } else {
        Alert.alert('Erro', 'Nenhuma encomenda foi marcada como entregue.');
      }
      
      setEntregaLoteModalVisible(false);
      cancelarModoSelecao();
      buscarEncomendas(); // Recarregar lista
      
    } catch (error) {
      console.error('Erro geral na entrega em lote:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor.');
    } finally {
      setEntregaLoteLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Encomenda }) => {
    const isSelected = encomendasSelecionadas.has(item.id);
    const isPendente = item.status === 'pendente';
    
    return (
      <View style={[
        styles.item,
        isSelected && styles.itemSelected,
        modoSelecao && !isPendente && styles.itemDisabled
      ]}>
        {/* Checkbox para seleção múltipla */}
        {modoSelecao && isPendente && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleSelecaoEncomenda(item.id)}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.itemContent}
          onLongPress={() => isPendente && !modoSelecao && ativarModoSelecao(item.id)}
          onPress={() => modoSelecao && isPendente && toggleSelecaoEncomenda(item.id)}
          disabled={modoSelecao && !isPendente}
        >
          <View style={styles.itemHeader}>
            <Text style={styles.morador}>{item.morador_nome}</Text>
            <View style={[styles.statusBadge, item.status === 'entregue' ? styles.statusEntregue : styles.statusPendente]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="cube" size={14} color="#666" />
              <Text style={styles.detailText}>{item.quantidade}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="timer" size={14} color="#666" />
              <Text style={[styles.detailText, getTempoColor(item.data_recebimento)]}>
                {calcularDiasPendentes(item.data_recebimento)} dias
              </Text>
            </View>
          </View>
          
          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="person" size={14} color="#666" />
              <Text style={styles.detailText}>{item.porteiro_nome}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.detailText}>
                {(() => {
                  const [ano, mes, dia] = item.data_recebimento.split('-');
                  return `${dia}/${mes}/${ano}`;
                })()}
              </Text>
            </View>
          </View>

          {item.observacoes && (
            <Text style={styles.observacoes}>{item.observacoes}</Text>
          )}

          {/* Botão individual só aparece quando não está em modo seleção */}
          {item.status === 'pendente' && !modoSelecao && (
            <TouchableOpacity
              style={styles.entregarButton}
              onPress={() => abrirModalEntrega(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.entregarButtonText}>Marcar como Entregue</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#f8f9fa" translucent={false} />
      
      {/* Header com controles de seleção */}
      <View style={styles.headerContainer}>
        {modoSelecao ? (
          <View style={styles.selectionHeader}>
            <View style={styles.selectionInfo}>
              <TouchableOpacity onPress={cancelarModoSelecao} style={styles.selectionCancelButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.selectionText}>
                {encomendasSelecionadas.size} selecionada{encomendasSelecionadas.size !== 1 ? 's' : ''}
              </Text>
            </View>
            
            <View style={styles.selectionActions}>
              
              
              {encomendasSelecionadas.size > 0 && (
                <TouchableOpacity onPress={abrirModalEntregaLote} style={styles.deliverButton}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.deliverButtonText}>Entregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#4070f4" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por morador..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Lista de encomendas */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4070f4" />
          <Text style={styles.loadingText}>Carregando encomendas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEncomendas}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={filteredEncomendas.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {searchText ? 'Nenhum resultado encontrado' : 'Nenhuma encomenda encontrada'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchText ? 'Tente buscar com outros termos' : 'Puxe para baixo para atualizar'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de Entrega - Atualizado */}
      <Modal visible={entregaModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entrega da Encomenda</Text>
              <TouchableOpacity onPress={() => setEntregaModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.encomendaInfo}>
                Morador: <Text style={styles.encomendaInfoBold}>{encomendaParaEntregar?.morador_nome}</Text>
              </Text>
              
              {/* Data e Hora da Entrega */}
              <View style={styles.rowContainer}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.inputLabel}>
                    Data da Entrega <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    value={dataEntrega}
                    onChangeText={(text) => {
                      const dataFormatada = formatarDataEnquantoDigita(text);
                      setDataEntrega(dataFormatada);
                    }}
                    editable={!entregaLoading}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <Text style={styles.helperText}>
                    Ex: 25/12/2024
                  </Text>
                </View>
                
                <View style={styles.halfInputGroup}>
                  <Text style={styles.inputLabel}>
                    Hora da Entrega <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={horaEntrega}
                    onChangeText={(text) => {
                      const horaFormatada = formatarHoraEnquantoDigita(text);
                      setHoraEntrega(horaFormatada);
                    }}
                    editable={!entregaLoading}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <Text style={styles.helperText}>
                    Ex: 14:30
                  </Text>
                </View>
              </View>
              
              {/* Busca de Porteiro */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Porteiro que entregou <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.searchInputModal}>
                  <Ionicons name="search" size={16} color="#666" />
                  <TextInput
                    style={styles.searchInputModalText}
                    placeholder="Digite o nome do porteiro..."
                    value={buscaPorteiro}
                    onChangeText={(text) => {
                      setBuscaPorteiro(text);
                      buscarPorteiros(text);
                      if (!text) setPorteiroSelecionado(null);
                    }}
                    editable={!entregaLoading}
                  />
                  {buscandoPorteiros && (
                    <ActivityIndicator size="small" color="#4070f4" />
                  )}
                </View>
                
                {/* Lista de porteiros encontrados */}
                {porteirosEncontrados.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {porteirosEncontrados.slice(0, 5).map((porteiro) => (
                      <TouchableOpacity
                        key={porteiro.id}
                        style={styles.suggestionItem}
                        onPress={() => selecionarPorteiro(porteiro)}
                      >
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{porteiro.nome_completo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Porteiro selecionado */}
                {porteiroSelecionado && (
                  <View style={styles.selectedPorteiroContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.selectedPorteiroText}>
                      Selecionado: {porteiroSelecionado.nome_completo}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Quem retirou */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Quem retirou a encomenda? <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome de quem retirou a encomenda"
                  value={retiradoPor}
                  onChangeText={setRetiradoPor}
                  editable={!entregaLoading}
                />
              </View>
              
              {/* Observações da entrega */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Observações da entrega
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observações sobre a entrega (opcional)"
                  value={observacoesEntrega}
                  onChangeText={setObservacoesEntrega}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!entregaLoading}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEntregaModalVisible(false)}
                disabled={entregaLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, entregaLoading && styles.confirmButtonDisabled]}
                onPress={confirmarEntrega}
                disabled={entregaLoading}
              >
                {entregaLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Confirmar Entrega</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Entrega em Lote */}
      <Modal visible={entregaLoteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entrega em Lote</Text>
              <TouchableOpacity onPress={() => setEntregaLoteModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.loteInfo}>
                Marcando {encomendasSelecionadas.size} encomenda{encomendasSelecionadas.size !== 1 ? 's' : ''} como entregue{encomendasSelecionadas.size !== 1 ? 's' : ''}
              </Text>
              
              {/* Campos iguais ao modal individual */}
              <View style={styles.rowContainer}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.inputLabel}>
                    Data da Entrega <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    value={dataEntrega}
                    onChangeText={(text) => {
                      const dataFormatada = formatarDataEnquantoDigita(text);
                      setDataEntrega(dataFormatada);
                    }}
                    editable={!entregaLoteLoading}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <Text style={styles.helperText}>Ex: 25/12/2024</Text>
                </View>
                
                <View style={styles.halfInputGroup}>
                  <Text style={styles.inputLabel}>
                    Hora da Entrega <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={horaEntrega}
                    onChangeText={(text) => {
                      const horaFormatada = formatarHoraEnquantoDigita(text);
                      setHoraEntrega(horaFormatada);
                    }}
                    editable={!entregaLoteLoading}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <Text style={styles.helperText}>Ex: 14:30</Text>
                </View>
              </View>
              
              {/* Busca de Porteiro - igual ao modal individual */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Porteiro que entregou <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.searchInputModal}>
                  <Ionicons name="search" size={16} color="#666" />
                  <TextInput
                    style={styles.searchInputModalText}
                    placeholder="Digite o nome do porteiro..."
                    value={buscaPorteiro}
                    onChangeText={(text) => {
                      setBuscaPorteiro(text);
                      buscarPorteiros(text);
                      if (!text) setPorteiroSelecionado(null);
                    }}
                    editable={!entregaLoteLoading}
                  />
                  {buscandoPorteiros && (
                    <ActivityIndicator size="small" color="#4070f4" />
                  )}
                </View>
                
                {porteirosEncontrados.length > 0 && (
                  <View style={styles.suggestionsList}>
                    {porteirosEncontrados.slice(0, 5).map((porteiro) => (
                      <TouchableOpacity
                        key={porteiro.id}
                        style={styles.suggestionItem}
                        onPress={() => selecionarPorteiro(porteiro)}
                      >
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{porteiro.nome_completo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {porteiroSelecionado && (
                  <View style={styles.selectedPorteiroContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.selectedPorteiroText}>
                      Selecionado: {porteiroSelecionado.nome_completo}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Quem retirou as encomendas? <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome de quem retirou as encomendas"
                  value={retiradoPor}
                  onChangeText={setRetiradoPor}
                  editable={!entregaLoteLoading}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações da entrega</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observações sobre a entrega (opcional)"
                  value={observacoesEntrega}
                  onChangeText={setObservacoesEntrega}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!entregaLoteLoading}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEntregaLoteModalVisible(false)}
                disabled={entregaLoteLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, entregaLoteLoading && styles.confirmButtonDisabled]}
                onPress={confirmarEntregaLote}
                disabled={entregaLoteLoading}
              >
                {entregaLoteLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Confirmar Entrega</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  headerContainer: {
    backgroundColor: 'transparent', // Removido o fundo branco
    paddingTop: 10,
    paddingBottom: 20,
    // Removida a sombra já que não há mais fundo
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 8,
    // elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: 20,
    // marginBottom: 15, // Removido já que não há mais filtros abaixo
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white', // Mantém o fundo branco apenas na barra de busca
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Adiciona uma borda sutil para definir melhor a barra
    shadowColor: '#000', // Adiciona sombra apenas na barra de busca
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  /* Estilos dos filtros - MANTIDOS PARA NÃO QUEBRAR (mas não usados)
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 4,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 20,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  */
  listContent: {
    paddingTop: 10,
    paddingBottom: 100,
  },
  item: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  morador: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusPendente: {
    backgroundColor: '#4070f4',
  },
  statusEntregue: {
    backgroundColor: '#D4EDDA',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white', // Texto branco para contrastar com o fundo azul
    textTransform: 'uppercase',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  observacoes: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4070f4',
  },
  entregarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4070f4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    shadowColor: '#4070f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  entregarButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal de Entrega - Estilos
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  encomendaInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  encomendaInfoBold: {
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loadingContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  loadingTextModal: {
    marginLeft: 10,
    color: '#666',
  },
  emptyContainerModal: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTextModal: {
    color: '#999',
    fontStyle: 'italic',
  },
  porteirosContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  porteirosList: {
    maxHeight: 150,
  },
  porteiroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  porteiroItemSelected: {
    backgroundColor: '#e6f0ff',
  },
  porteiroNome: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  selectedInfo: {
    color: '#007AFF',
    fontSize: 14,
    padding: 10,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4070f4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  halfInputGroup: {
    flex: 0.48,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  autoFillButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  searchInputModal: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  searchInputModalText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  suggestionsList: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  selectedPorteiroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  selectedPorteiroText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
    marginLeft: 5,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // Estilos para seleção múltipla
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCancelButton: {
    padding: 5,
    marginRight: 15,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4070f4',
    marginRight: 10,
  },
  selectAllText: {
    color: '#4070f4',
    fontSize: 14,
    fontWeight: '600',
  },
  deliverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4070f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deliverButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemSelected: {
    backgroundColor: '#f0f4ff',
    borderColor: '#4070f4',
    borderWidth: 2,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4070f4',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4070f4',
  },
  itemContent: {
    flex: 1,
    paddingLeft: 10,
  },
  loteInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4070f4',
    fontWeight: '600',
  },
});

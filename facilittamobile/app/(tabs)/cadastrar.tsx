import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

interface Sugestao {
  nome: string;
  frequency: number;
}

interface Usuario {
  id: string;
  nome_completo: string;
}

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
}

export default function CadastrarScreen() {
  const [morador, setMorador] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [porteiro, setPorteiro] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);

  // Novos estados para busca de porteiros
  const [buscaPorteiro, setBuscaPorteiro] = useState('');
  const [porteiroSelecionado, setPorteiroSelecionado] = useState<Usuario | null>(null);
  const [porteirosEncontrados, setPorteirosEncontrados] = useState<Usuario[]>([]);
  const [buscandoPorteiros, setBuscandoPorteiros] = useState(false);
  const [showSugestoesPorteiros, setShowSugestoesPorteiros] = useState(false);

  // Novos estados para busca de moradores
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [moradoresFiltrados, setMoradoresFiltrados] = useState<Morador[]>([]);
  const [buscandoMoradores, setBuscandoMoradores] = useState(false);
  const [showSugestoesMoradores, setShowSugestoesMoradores] = useState(false);

  useEffect(() => {
    preencherDataHoraAtual();
  }, []);

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

  const preencherDataHoraAtual = () => {
    const agora = new Date();
    // CORREÇÃO: Usar formatação local consistente
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const dataAtualBrasileira = `${dia}/${mes}/${ano}`;
    
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const horaAtual = `${horas}:${minutos}`;
    
    setData(dataAtualBrasileira);
    setHora(horaAtual);
  };

  const buscarPorteiros = async (termo: string) => {
    if (!termo.trim()) {
      setPorteirosEncontrados([]);
      setShowSugestoesPorteiros(false);
      return;
    }
    
    setBuscandoPorteiros(true);
    
    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        const apiUrl = await AsyncStorage.getItem('apiUrl');
        const apiPorta = await AsyncStorage.getItem('apiPorta');
        
        if (!apiUrl || !apiPorta) {
          return;
        }
        
        const config = { ip: apiUrl, port: apiPorta };
        await AsyncStorage.setItem('apiConfig', JSON.stringify(config));
      }
      
      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
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
        setShowSugestoesPorteiros(filtrados.length > 0);
      } else {
        setPorteirosEncontrados([]);
        setShowSugestoesPorteiros(false);
      }
    } catch (error) {
      console.error('Erro ao buscar porteiros:', error);
      setPorteirosEncontrados([]);
      setShowSugestoesPorteiros(false);
    } finally {
      setBuscandoPorteiros(false);
    }
  };

  const selecionarPorteiro = (porteiro: Usuario) => {
    setPorteiroSelecionado(porteiro);
    setBuscaPorteiro(porteiro.nome_completo);
    setPorteiro(porteiro.nome_completo);
    setPorteirosEncontrados([]);
    setShowSugestoesPorteiros(false);
  };

  const buscarMoradores = async (termo: string) => {
    if (!termo.trim() || termo.length < 2) {
      setMoradoresFiltrados([]);
      setShowSugestoesMoradores(false);
      return;
    }

    setBuscandoMoradores(true);
    console.log('[Cadastrar] Buscando moradores para:', termo);

    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) {
        const apiUrl = await AsyncStorage.getItem('apiUrl');
        const apiPorta = await AsyncStorage.getItem('apiPorta');
        
        if (!apiUrl || !apiPorta) {
          setBuscandoMoradores(false);
          return;
        }
        
        const config = { ip: apiUrl, port: apiPorta };
        await AsyncStorage.setItem('apiConfig', JSON.stringify(config));
      }

      const config = JSON.parse(await AsyncStorage.getItem('apiConfig') || '{}');
      
      if (!config.ip || !config.port) {
        console.log('[Cadastrar] Configuração da API incompleta');
        setBuscandoMoradores(false);
        return;
      }

      const apiUrl = `http://${config.ip}:${config.port}/api/moradores`;

      console.log('[Cadastrar] Buscando moradores em:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('[Cadastrar] Resposta da API moradores:', result);

      if (result.success && Array.isArray(result.data)) {
        // Filtrar moradores que contêm o termo de busca
        const filtrados = result.data.filter((morador: Morador) => {
          const nome = morador.nome || '';
          const apartamento = morador.apartamento || '';
          const bloco = morador.bloco || '';
          
          const searchLower = termo.toLowerCase();
          
          return nome.toLowerCase().includes(searchLower) ||
                 apartamento.includes(searchLower) ||
                 bloco.toLowerCase().includes(searchLower);
        });

        console.log('[Cadastrar] Moradores filtrados:', filtrados);
        
        setMoradoresFiltrados(filtrados.slice(0, 5)); // Máximo 5 sugestões
        setShowSugestoesMoradores(filtrados.length > 0);
      } else {
        console.warn('[Cadastrar] Resposta inválida da API de moradores:', result);
        setMoradoresFiltrados([]);
        setShowSugestoesMoradores(false);
      }
    } catch (error) {
      console.error('[Cadastrar] Erro ao buscar moradores:', error);
      setMoradoresFiltrados([]);
      setShowSugestoesMoradores(false);
    } finally {
      setBuscandoMoradores(false);
    }
  };

  const selecionarMorador = (morador: Morador) => {
    console.log('[Cadastrar] Selecionando morador:', morador);
    setMorador(morador.nome);
    setMoradoresFiltrados([]);
    setShowSugestoesMoradores(false);
  };

  const handlePorteiroChange = (texto: string) => {
    setBuscaPorteiro(texto);
    setPorteiro(texto);
    
    if (!texto) {
      setPorteiroSelecionado(null);
    }
    
    buscarPorteiros(texto);
  };

  const handleMoradorChange = (texto: string) => {
    console.log('[Cadastrar] Mudança no campo morador:', texto);
    setMorador(texto);
    
    if (texto.length >= 2) {
      buscarMoradores(texto);
    } else {
      setMoradoresFiltrados([]);
      setShowSugestoesMoradores(false);
    }
  };

  const handleSalvar = async () => {
    if (!morador || !porteiro) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios!');
      return;
    }

    if (!validarDataBrasileira(data)) {
      Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA (ex: 25/12/2024)');
      return;
    }

    if (!hora.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Erro', 'Hora inválida. Use o formato HH:MM (ex: 14:30)');
      return;
    }

    setLoading(true);
    try {
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

      // Enviar data no formato ISO (YYYY-MM-DD) que é compatível
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          morador_nome: morador,
          apartamento: 'N/A', // Valor padrão compatível
          bloco: 'A',         // Valor padrão compatível
          porteiro_nome: porteiro,
          quantidade: Number(quantidade) || 1,
          observacoes,
          data_recebimento: formatarDataParaISO(data), // Formato ISO
          hora_recebimento: hora,
        }),
      });

      const json = await response.json();
      
      if (json.success) {
        Alert.alert('Sucesso', 'Encomenda cadastrada com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
            },
          },
        ]);
      } else {
        Alert.alert('Erro', json.message || 'Erro ao cadastrar encomenda.');
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor. Verifique a conexão e configurações.');
    } finally {
      setLoading(false);
    }
  };

  const buscarSugestoes = async (texto: string) => {
    if (!texto.trim() || texto.length < 2) {
      setSugestoes([]);
      setShowSugestoes(false);
      return;
    }

    setLoadingSugestoes(true);
    try {
      const apiConfig = await AsyncStorage.getItem('apiConfig');
      if (!apiConfig) return;

      const config = JSON.parse(apiConfig);
      const apiUrl = `http://${config.ip}:${config.port}/api/moradores/sugestoes?q=${encodeURIComponent(texto)}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (result.success) {
        setSugestoes(result.data || []);
        setShowSugestoes(result.data && result.data.length > 0);
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    } finally {
      setLoadingSugestoes(false);
    }
  };

  const selecionarSugestao = (nome: string) => {
    setMorador(nome);
    setShowSugestoes(false);
    setSugestoes([]);
  };

  const resetForm = () => {
    setMorador('');
    setQuantidade('1');
    setPorteiro('');
    setBuscaPorteiro('');
    setPorteiroSelecionado(null);
    setObservacoes('');
    setSugestoes([]);
    setShowSugestoes(false);
    setPorteirosEncontrados([]);
    setShowSugestoesPorteiros(false);
    setMoradoresFiltrados([]);
    setShowSugestoesMoradores(false);
    preencherDataHoraAtual();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F8FAFC" translucent={false} />
      <View style={styles.content}>
        <View style={styles.header}>
          
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <View style={styles.form}>
            <View style={[styles.inputGroup, { zIndex: 1000 }]}>
              <Text style={styles.inputLabel}>
                Morador <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.autocompleteContainer}>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="person-outline" size={16} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIconText}
                    placeholder="Digite o nome do morador..."
                    value={morador}
                    onChangeText={handleMoradorChange}
                    editable={!loading}
                  />
                  {buscandoMoradores && (
                    <ActivityIndicator size="small" color="#4070f4" style={styles.inputIcon} />
                  )}
                </View>
                
                {showSugestoesMoradores && moradoresFiltrados.length > 0 && (
                  <View style={styles.sugestoesContainer}>
                    <ScrollView 
                      style={styles.sugestoesScroll}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {moradoresFiltrados.map((morador, index) => (
                        <TouchableOpacity
                          key={`morador-${morador.id}`}
                          style={[
                            styles.sugestaoItem,
                            index === moradoresFiltrados.length - 1 && styles.ultimaSugestao
                          ]}
                          onPress={() => selecionarMorador(morador)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="person-outline" size={16} color="#666" />
                          <View style={styles.sugestaoInfo}>
                            <Text style={styles.sugestaoNome}>{morador.nome}</Text>
                            <Text style={styles.sugestaoApt}>
                              {morador.bloco}{morador.apartamento}
                            </Text>
                          </View>
                          <Ionicons name="add-circle-outline" size={16} color="#4070f4" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10, zIndex: 100 }]}>
                <Text style={styles.inputLabel}>Data</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="calendar-outline" size={16} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIconText}
                    placeholder="dd/mm/aaaa"
                    value={data}
                    onChangeText={(text) => {
                      const dataFormatada = formatarDataEnquantoDigita(text);
                      setData(dataFormatada);
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
                <Text style={styles.helperText}>Ex: 25/12/2024</Text>
              </View>

              <View style={[styles.inputGroup, { flex: 1, zIndex: 100 }]}>
                <Text style={styles.inputLabel}>Hora</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="time-outline" size={16} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIconText}
                    placeholder="HH:MM"
                    value={hora}
                    onChangeText={(text) => {
                      const horaFormatada = formatarHoraEnquantoDigita(text);
                      setHora(horaFormatada);
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                    editable={!loading}
                  />
                </View>
                <Text style={styles.helperText}>Ex: 14:30</Text>
              </View>
            </View>

            <View style={[styles.inputGroup, { zIndex: 100 }]}>
              <Text style={styles.inputLabel}>Quantidade</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="cube-outline" size={16} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIconText}
                  placeholder="Número de volumes"
                  value={quantidade}
                  onChangeText={setQuantidade}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Porteiro com Autocomplete */}
            <View style={[styles.inputGroup, { zIndex: 800 }]}>
              <Text style={styles.inputLabel}>
                Porteiro <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.autocompleteContainer}>
                <View style={styles.inputWithIcon}>
                  <Ionicons name="shield-outline" size={16} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIconText}
                    placeholder="Digite o nome do porteiro..."
                    value={buscaPorteiro}
                    onChangeText={handlePorteiroChange}
                    editable={!loading}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  {buscandoPorteiros && (
                    <ActivityIndicator size="small" color="#4070f4" style={styles.inputIcon} />
                  )}
                </View>
                
                {showSugestoesPorteiros && porteirosEncontrados.length > 0 && (
                  <View style={styles.sugestoesPorteiroContainer}>
                    <ScrollView 
                      style={styles.sugestoesScroll}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="always"
                      bounces={false}
                    >
                      {porteirosEncontrados.slice(0, 5).map((porteiro) => (
                        <TouchableOpacity
                          key={`porteiro-${porteiro.id}`}
                          style={[
                            styles.sugestaoItem,
                            porteirosEncontrados.indexOf(porteiro) === Math.min(4, porteirosEncontrados.length - 1) && styles.ultimaSugestao
                          ]}
                          onPress={() => selecionarPorteiro(porteiro)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="person" size={16} color="#666" />
                          <Text style={styles.sugestaoNome}>{porteiro.nome_completo}</Text>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#28a745" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {/* Porteiro selecionado */}
                {porteiroSelecionado && (
                  <View style={styles.selectedContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.selectedText}>
                      Selecionado: {porteiroSelecionado.nome_completo}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Observações */}
            <View style={[styles.inputGroup, { zIndex: 50 }]}>
              <Text style={styles.inputLabel}>Observações</Text>
              <View style={styles.textAreaContainer}>
                <Ionicons name="document-text-outline" size={16} color="#999" style={styles.textAreaIcon} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Informações adicionais sobre a encomenda..."
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetForm}
                disabled={loading}
              >
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.resetButtonText}>Limpar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSalvar}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Mudado de 'white' para um cinza muito claro
    paddingTop: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20, // Adicionado padding horizontal direto
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16, // Reduzido de 20 para 16
    paddingBottom: 24, // Reduzido de 100 para 24
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 20, // Reduzido de 30 para 20
    paddingLeft: 0, // Removido padding left já que já há no content
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B', // Cor mais suave
    fontWeight: '500', // Adicionado peso
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16, // Aumentado de 10 para 16
    padding: 20,
    shadowColor: '#000', // Adicionada sombra sutil
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  inputGroup: {
    marginBottom: 16, // Reduzido de 15 para 16 (mais consistente)
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151', // Cor mais definida
    marginBottom: 6, // Reduzido de 5 para 6
    letterSpacing: -0.2, // Espaçamento de letra mais elegante
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB', // Cor de borda mais suave
    borderRadius: 10, // Reduzido de 8 para 10
    padding: 14, // Reduzido de 12 para 14
    fontSize: 16,
    backgroundColor: '#FAFBFC', // Fundo levemente diferente
    shadowColor: '#000', // Sombra muito sutil
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 72, // Reduzido de 80 para 72
    textAlignVertical: 'top',
    paddingLeft: 35,
  },
  row: {
    flexDirection: 'row',
    gap: 12, // Reduzido para economizar espaço
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16, // Reduzido de 20 para 16
    gap: 12, // Adicionado gap para consistência
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 14, // Reduzido de 15 para 14
    paddingHorizontal: 18, // Reduzido de 20 para 18
    borderRadius: 10, // Aumentado de 8 para 10
    borderWidth: 1,
    borderColor: '#E5E7EB', // Cor de borda mais suave
    flex: 1,
    shadowColor: '#000', // Sombra sutil
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  resetButtonText: {
    color: '#6B7280', // Cor mais suave
    fontSize: 15, // Reduzido de 16 para 15
    fontWeight: '600',
    marginLeft: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4070f4',
    paddingVertical: 14, // Reduzido de 15 para 14
    paddingHorizontal: 18, // Reduzido de 20 para 18
    borderRadius: 10, // Aumentado de 8 para 10
    flex: 2,
    shadowColor: '#4070f4', // Sombra colorida
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15, // Reduzido de 16 para 15
    fontWeight: '600',
    marginLeft: 5,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10, // Aumentado de 8 para 10
    backgroundColor: '#FAFBFC', // Fundo levemente diferente
    paddingHorizontal: 12,
    shadowColor: '#000', // Sombra muito sutil
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 8,
    color: '#9CA3AF', // Cor mais suave para ícones
  },
  inputWithIconText: {
    flex: 1,
    paddingVertical: 14, // Reduzido de 12 para 14
    fontSize: 16,
    color: '#374151', // Cor mais definida
  },
  autocompleteContainer: {
    position: 'relative',
  },
  sugestoesContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10, // Aumentado de 8 para 10
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 140, // Reduzido de 180 para 140
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, // Reduzido de 0.15 para 0.12
    shadowRadius: 8,
    elevation: 8, // Reduzido de 10 para 8
    zIndex: 1001,
  },
  sugestoesPorteiroContainer: {
    position: 'absolute',
    top: -100, // Reduzido de -120 para -100
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10, // Aumentado de 8 para 10
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: 100, // Reduzido de 120 para 100
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12, // Reduzido de 0.15 para 0.12
    shadowRadius: 8,
    elevation: 12, // Reduzido de 15 para 12
    zIndex: 1002,
  },
  sugestaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, // Reduzido de 15 para 12
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  ultimaSugestao: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 10, // Aumentado de 8 para 10
    borderBottomRightRadius: 10, // Aumentado de 8 para 10
  },
  sugestaoNome: {
    flex: 1,
    fontSize: 15, // Reduzido de 16 para 15
    color: '#374151', // Cor mais definida
    marginLeft: 10,
    fontWeight: '500', // Adicionado peso
  },
  sugestaoFrequency: {
    fontSize: 11, // Reduzido de 12 para 11
    color: '#4070f4',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 6, // Reduzido de 8 para 6
    paddingVertical: 2, // Reduzido de 3 para 2
    borderRadius: 10, // Reduzido de 12 para 10
    fontWeight: '600',
    minWidth: 24, // Reduzido de 30 para 24
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 13, // Reduzido de 14 para 13
    color: '#6B7280', // Cor mais suave
    marginLeft: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16, // Reduzido de 15 para 16
    gap: 12, // Adicionado gap
  },
  halfInputGroup: {
    flex: 0.48,
  },
  helperText: {
    fontSize: 11, // Reduzido de 12 para 11
    color: '#9CA3AF', // Cor mais suave
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '500', // Adicionado peso
  },
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#4070f4',
    borderRadius: 10, // Aumentado de 8 para 10
    paddingVertical: 8, // Reduzido de 10 para 8
    paddingHorizontal: 12, // Reduzido de 15 para 12
    marginBottom: 16, // Reduzido de 20 para 16
  },
  autoFillButtonText: {
    color: '#4070f4',
    fontSize: 13, // Reduzido de 14 para 13
    fontWeight: '600',
    marginLeft: 5,
  },
  required: {
    color: '#EF4444',
    fontWeight: '600',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5', // Cor mais suave
    borderRadius: 10, // Aumentado de 8 para 10
    padding: 8, // Reduzido de 10 para 8
    marginTop: 6, // Reduzido de 8 para 6
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selectedText: {
    fontSize: 13, // Reduzido de 14 para 13
    color: '#065F46', // Cor mais definida
    fontWeight: '600',
    marginLeft: 5,
  },
  textAreaContainer: {
    position: 'relative',
  },
  textAreaIcon: {
    position: 'absolute',
    top: 14, // Ajustado de 12 para 14
    left: 12,
    zIndex: 1,
    color: '#9CA3AF', // Cor mais suave
  },
  sugestaoInfo: {
    flex: 1,
    marginLeft: 10,
  },
  sugestaoApt: {
    fontSize: 11, // Reduzido de 12 para 11
    color: '#9CA3AF', // Cor mais suave
    marginTop: 1, // Reduzido de 2 para 1
    fontWeight: '500', // Adicionado peso
  },
  sugestoesScroll: {
    maxHeight: 120, // Reduzido de 150 para 120
  },
});

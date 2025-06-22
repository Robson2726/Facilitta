import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

interface Sugestao {
  nome: string;
  frequency: number;
}

export default function EscanearScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState({
    destinatario: '',
    apartamento: '',
    bloco: '',
    observacoes: '',
    data: '',
    hora: '',
    quantidade: '1',
    porteiro: '',
  });
  const [showFormModal, setShowFormModal] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState('');
  const [formData, setFormData] = useState({
    morador: '',
    data: '',
    hora: '',
    quantidade: '1',
    porteiro: '',
    observacoes: '',
  });
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    // Preencher data e hora atual quando o componente monta
    preencherDataHoraAtual();
  }, []);

  const preencherDataHoraAtual = () => {
    const now = new Date();
    // CORREÇÃO: Usar formatação local consistente
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;
    
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');
    const horaFormatada = `${horas}:${minutos}`;
    
    setFormData(prev => ({
      ...prev,
      data: dataFormatada,
      hora: horaFormatada,
    }));
    
    setExtractedData(prev => ({
      ...prev,
      data: dataFormatada,
      hora: horaFormatada,
    }));
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#007AFF" />
          <Text style={styles.permissionTitle}>Acesso à Câmera</Text>
          <Text style={styles.permissionText}>
            Precisamos de acesso à câmera para capturar imagens das encomendas.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        if (photo?.uri) {
          setCameraVisible(false);
          setCapturedImageUri(photo.uri);
          await AsyncStorage.setItem('ultimaImagemCapturada', photo.uri);
          
          // Simular OCR - extrair nome
          const nomeExtraido = await simularOCR(photo.uri);
          setFormData({
            ...formData,
            morador: nomeExtraido,
          });
          
          setIsProcessing(false);
          setShowFormModal(true);
        }
      } catch (error) {
        console.error('Erro ao tirar foto:', error);
        Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
        setIsProcessing(false);
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permissão', 'Precisamos de acesso à galeria para selecionar imagens.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImageUri(result.assets[0].uri);
        await AsyncStorage.setItem('ultimaImagemCapturada', result.assets[0].uri);
        
        // Simular OCR
        const nomeExtraido = await simularOCR(result.assets[0].uri);
        setFormData({
          ...formData,
          morador: nomeExtraido,
        });
        
        setShowFormModal(true);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  // Função para simular OCR - substitua por OCR real se necessário
  const simularOCR = async (imageUri: string): Promise<string> => {
    // Aqui você pode integrar um serviço de OCR real
    // Por enquanto, retorna um placeholder
    return 'Nome extraído da imagem';
  };

  const cadastrarEncomenda = async () => {
    if (!formData.morador || !formData.porteiro) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios!');
      return;
    }

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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          morador_nome: formData.morador,
          apartamento: 'N/A',
          bloco: 'A',
          porteiro_nome: formData.porteiro,
          quantidade: Number(formData.quantidade) || 1,
          observacoes: formData.observacoes,
          data_recebimento: formData.data,
          hora_recebimento: formData.hora,
        }),
      });

      const json = await response.json();
      
      if (json.success) {
        setShowFormModal(false);
        Alert.alert('Sucesso', 'Encomenda cadastrada com sucesso!', [
          {
            text: 'OK',
            onPress: () => {
              resetData();
            },
          },
        ]);
      } else {
        Alert.alert('Erro', json.message || 'Erro ao cadastrar encomenda.');
      }
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o servidor. Verifique a conexão e configurações.');
    }
  };

  const resetData = () => {
    preencherDataHoraAtual();
    setExtractedData(prev => ({
      ...prev,
      destinatario: '',
      apartamento: '',
      bloco: '',
      observacoes: '',
      quantidade: '1',
      porteiro: '',
    }));
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
    setFormData({ ...formData, morador: nome });
    setShowSugestoes(false);
    setSugestoes([]);
  };

  const handleMoradorChange = (texto: string) => {
    setFormData({ ...formData, morador: texto });
    buscarSugestoes(texto);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="scan-outline" size={32} color="#4070f4" />
          <Text style={styles.title}>Cadastrar Encomenda</Text>
          <Text style={styles.subtitle}>
            Capture uma imagem da encomenda
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setCameraVisible(true)}
          >
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.scanButtonText}>Capturar com Câmera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickImageFromGallery}
          >
            <Ionicons name="images" size={24} color="#4070f4" />
            <Text style={styles.galleryButtonText}>Selecionar da Galeria</Text>
          </TouchableOpacity>
        </View>

        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#4070f4" />
            <Text style={styles.processingText}>Processando imagem...</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal do formulário de cadastro */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dados da Encomenda</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <Text style={styles.inputLabel}>Destinatário *</Text>
                <View style={styles.autocompleteContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nome completo do morador"
                    value={formData.morador}
                    onChangeText={handleMoradorChange}
                    onFocus={() => {
                      if (formData.morador.length >= 2) {
                        buscarSugestoes(formData.morador);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSugestoes(false), 200);
                    }}
                  />
                  
                  {showSugestoes && sugestoes.length > 0 && (
                    <View style={styles.sugestoesContainer}>
                      {loadingSugestoes ? (
                        <View style={styles.sugestaoItem}>
                          <ActivityIndicator size="small" color="#4070f4" />
                          <Text style={styles.loadingText}>Buscando...</Text>
                        </View>
                      ) : (
                        sugestoes.map((sugestao, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.sugestaoItem,
                              index === sugestoes.length - 1 && styles.ultimaSugestao
                            ]}
                            onPress={() => selecionarSugestao(sugestao.nome)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="person-outline" size={16} color="#666" />
                            <Text style={styles.sugestaoNome}>{sugestao.nome}</Text>
                            {sugestao.frequency > 0 && (
                              <Text style={styles.sugestaoFrequency}>
                                {sugestao.frequency}x
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))
                      )}
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
                      value={formData.data}
                      onChangeText={(text) => setFormData({ ...formData, data: text })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1, zIndex: 100 }]}>
                  <Text style={styles.inputLabel}>Hora</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="time-outline" size={16} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIconText}
                      placeholder="HH:MM"
                      value={formData.hora}
                      onChangeText={(text) => setFormData({ ...formData, hora: text })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantidade</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Número de volumes"
                  value={formData.quantidade}
                  onChangeText={(text) => setFormData({ ...formData, quantidade: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Porteiro *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nome do porteiro que recebeu"
                  value={formData.porteiro}
                  onChangeText={(text) => setFormData({ ...formData, porteiro: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Informações adicionais sobre a encomenda..."
                  value={formData.observacoes}
                  onChangeText={(text) => setFormData({ ...formData, observacoes: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowFormModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={cadastrarEncomenda}
                >
                  <Ionicons name="save" size={20} color="white" />
                  <Text style={styles.modalSaveButtonText}>Cadastrar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal da Câmera */}
      <Modal visible={cameraVisible} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => setCameraVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.scanArea}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanInstruction}>
                  Posicione a encomenda dentro da área destacada
                </Text>
              </View>

              <View style={styles.cameraFooter}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons name="camera" size={32} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonsContainer: {
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#4070f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  galleryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4070f4',
  },
  galleryButtonText: {
    color: '#4070f4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  processingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  extractedDataContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginTop: 20,
  },
  extractedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  extractedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  cameraButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.8,
    height: height * 0.3,
    borderWidth: 2,
    borderColor: '#4070f4',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 10,
  },
  cameraFooter: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    backgroundColor: '#4070f4',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: width - 40,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWithIconText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1001,
  },
  sugestaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  ultimaSugestao: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  sugestaoNome: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  sugestaoFrequency: {
    fontSize: 12,
    color: '#4070f4',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
});

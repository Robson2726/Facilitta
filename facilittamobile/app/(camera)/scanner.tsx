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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface Sugestao {
  nome: string;
  frequency: number;
}

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isProcessing, setIsProcessing] = useState(false);
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
    preencherDataHoraAtual();
    
    // Solicita permissão automaticamente ao abrir
    if (!permission?.granted) {
      requestPermission();
    }
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
  };

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

  const simularOCR = async (imageUri: string): Promise<string> => {
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
            text: 'Nova Captura',
            onPress: () => {
              resetData();
            },
          },
          {
            text: 'Voltar',
            onPress: () => router.back(),
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
    setFormData(prev => ({
      ...prev,
      morador: '',
      quantidade: '1',
      porteiro: '',
      observacoes: '',
    }));
  };

  const buscarSugestoes = async (texto: string) => {
    if (!texto.trim()) {
      setSugestoes([]);
      setShowSugestoes(false);
      return;
    }

    setLoadingSugestoes(true);

    try {
      // Simulação de busca - substituir pela chamada real à API
      const todasSugestoes = [
        { nome: 'João Silva', frequency: 10 },
        { nome: 'Maria Oliveira', frequency: 8 },
        { nome: 'José Santos', frequency: 5 },
      ];
      
      const filtradas = todasSugestoes.filter(sugestao =>
        sugestao.nome.toLowerCase().includes(texto.toLowerCase())
      );

      setSugestoes(filtradas);
      setShowSugestoes(filtradas.length > 0);
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

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        
        <Ionicons name="camera-outline" size={80} color="#4070f4" />
        <Text style={styles.permissionTitle}>Acesso à Câmera</Text>
        <Text style={styles.permissionText}>
          Precisamos de acesso à câmera para capturar imagens das encomendas.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir Acesso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#000" translucent={false} />
      
      {/* Câmera principal */}
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => router.back()}
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

      {/* Modal do formulário */}
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
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Morador</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.morador}
                  onChangeText={handleMoradorChange}
                  placeholder="Nome do morador"
                  placeholderTextColor="#999"
                />

                {showSugestoes && (
                  <View style={styles.sugestoesContainer}>
                    {loadingSugestoes ? (
                      <ActivityIndicator size="small" color="#4070f4" />
                    ) : (
                      sugestoes.map(sugestao => (
                        <TouchableOpacity
                          key={sugestao.nome}
                          style={styles.sugestaoItem}
                          onPress={() => selecionarSugestao(sugestao.nome)}
                        >
                          <Text style={styles.sugestaoText}>{sugestao.nome}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Data</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.data}
                  editable={false}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Hora</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.hora}
                  editable={false}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Quantidade</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.quantidade}
                  onChangeText={texto => setFormData({ ...formData, quantidade: texto })}
                  placeholder="Quantidade"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Porteiro</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.porteiro}
                  onChangeText={texto => setFormData({ ...formData, porteiro: texto })}
                  placeholder="Nome do porteiro"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Observações</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formData.observacoes}
                  onChangeText={texto => setFormData({ ...formData, observacoes: texto })}
                  placeholder="Observações adicionais"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
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
    backgroundColor: '#4070f4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    paddingTop: 60,
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#4070f4',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 10,
  },
  modalContent: {
    padding: 20,
  },
  modalField: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#ccc',
    borderRadius: 5,
    paddingVertical: 15,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#4070f4',
    borderRadius: 5,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  sugestoesContainer: {
    maxHeight: 150,
    backgroundColor: 'white',
    borderRadius: 5,
    marginTop: 5,
    overflow: 'hidden',
    elevation: 2,
  },
  sugestaoItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  sugestaoText: {
    fontSize: 16,
    color: '#333',
  },
});
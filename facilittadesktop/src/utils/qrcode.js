const QRCode = require('qrcode');
const { networkInterfaces } = require('os');

class QRCodeUtils {
  /**
   * Gera QR Code para a API
   */
  static async generateAPIQRCode(port = 3001) {
    try {
      // Obter IP da máquina
      const ip = this.getLocalIP();
      
      // Porta padrão se não especificada
      const apiPort = port || 3001;
      
      // Montar a URL completa da API COM A PORTA
      const url = `http://${ip}:${apiPort}`;
      
      console.log(`[QRCode] Gerando QR Code para: ${url}`);
      
      // Gerar o QR code com configurações otimizadas
      const qrCode = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });
      
      console.log(`[QRCode] QR Code gerado com sucesso para URL: ${url}`);
      
      return {
        success: true,
        qrCode,
        url,
        ip,
        port: apiPort
      };
    } catch (error) {
      console.error('[QRCode] Erro ao gerar QR code:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Obtém o IP local da máquina
   */
  static getLocalIP() {
    const nets = networkInterfaces();
    let ip = 'localhost';
    
    // Encontrar o primeiro IP v4 não-interno
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Pular IPs de loopback e não IPv4
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          break;
        }
      }
      if (ip !== 'localhost') break;
    }
    
    return ip;
  }
  
  /**
   * Gera QR Code genérico para qualquer texto/URL
   */
  static async generateQRCode(text, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      const qrCode = await QRCode.toDataURL(text, finalOptions);
      
      return {
        success: true,
        qrCode,
        text,
        options: finalOptions
      };
    } catch (error) {
      console.error('[QRCode] Erro ao gerar QR code genérico:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = QRCodeUtils;

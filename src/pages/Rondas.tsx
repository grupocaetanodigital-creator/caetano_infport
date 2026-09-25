import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { supabase } from '../services/supabase';
import { 
  ShieldCheck, 
  QrCode, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Camera, 
  Flag,
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  UserCheck,
  History,
  ArrowRightLeft,
  VideoOff,
  Check,
  Trash2,
  Scan,
  Radio,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';

interface RondasProps {
  usuarioLogado?: any;
}

export default function Rondas({ usuarioLogado }: RondasProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const inputFotoRef = useRef<HTMLInputElement | null>(null);
  const inputPlacaFotoRef = useRef<HTMLInputElement | null>(null);

  const nivelNum = Number(usuarioLogado?.nivel ?? usuarioLogado?.nivel_acesso);
  const perfilTexto = String(
    usuarioLogado?.perfil || 
    usuarioLogado?.tipo || 
    usuarioLogado?.role || 
    usuarioLogado?.funcao || 
    usuarioLogado?.login || 
    ''
  ).toLowerCase();

  const isOperadorNivel3 = 
    usuarioLogado?.nivel === 3 || 
    usuarioLogado?.nivel === '3' || 
    usuarioLogado?.nivel_acesso === 3 ||
    nivelNum === 3 ||
    (perfilTexto.includes('operador') && 
     !perfilTexto.includes('admin') && 
     !perfilTexto.includes('master') && 
     !perfilTexto.includes('sindico') && 
     !perfilTexto.includes('dev'));

  const podeGerenciarPontos = !isOperadorNivel3 && (
    usuarioLogado?.nivel === 0 || 
    usuarioLogado?.nivel === 1 || 
    usuarioLogado?.nivel === 2 || 
    usuarioLogado?.nivel_acesso === 0 ||
    usuarioLogado?.nivel_acesso === 1 ||
    usuarioLogado?.nivel_acesso === 2 ||
    (!isNaN(nivelNum) && nivelNum < 3) ||
    perfilTexto.includes('admin') ||
    perfilTexto.includes('adm') ||
    perfilTexto.includes('master') ||
    perfilTexto.includes('dev') ||
    perfilTexto.includes('sindico') ||
    perfilTexto.includes('supervisor')
  );

  const [operadorRondaAtual, setOperadorRondaAtual] = useState(
    usuarioLogado?.nome || usuarioLogado?.login || 'Vigia / Portaria'
  );

  const [listaOperadores, setListaOperadores] = useState<any[]>([]);
  const [pontos, setPontos] = useState<any[]>([]);
  const [rondaAtiva, setRondaAtiva] = useState<any | null>(null);
  const [registrosRonda, setRegistrosRonda] = useState<any[]>([]);
  const [historicoRondas, setHistoricoRondas] = useState<any[]>([]);

  const keyRondaAtiva = usuarioLogado?.condominio_id ? `infport_ronda_ativa_${usuarioLogado.condominio_id}` : 'infport_ronda_ativa';
  const keyUltimaRondaFim = usuarioLogado?.condominio_id ? `infport_ultima_ronda_fim_${usuarioLogado.condominio_id}` : 'infport_ultima_ronda_fim';

  const setoresChecklist = [
    {
      id: 'SETOR_A',
      titulo: 'SETOR A: GUARITA & ENTRADA PRINCIPAL',
      itens: [
        '1º Portões de pedestres e de veículos (funcionamento e fechos)',
        '2º Sistema de CFTV (câmeras e monitoramento)',
        '3º Interfonia da Guarita',
        '4º Salão de Festas ao lado da guarita (iluminação, limpeza, portas e fechos)'
      ]
    },
    {
      id: 'SETOR_B',
      titulo: 'SETOR B: TÉRREO TORRE A (ÁREAS DE LAZER INTERNAS)',
      itens: [
        '5º Salão Gourmet (iluminação, limpeza, organização e conservação)',
        '6º Academia (iluminação, equipamentos, limpeza e organização)',
        '7º Salão de Jogos (mesas, iluminação e conservação)',
        '8º Churrasqueira 1 (pia, grelhas e limpeza geral)'
      ]
    },
    {
      id: 'SETOR_C',
      titulo: 'SETOR C: HALL & ELEVADORES — TORRE A',
      itens: [
        '9º Torre A - Corredor 1-6 (1 Elevador Social + 1 Elevador Serviço)',
        '10º Torre A - Corredor 7-10 (1 Elevador Social + 1 Elevador Serviço)',
        '11º Quadro de Avisos exclusivo da Torre A'
      ]
    },
    {
      id: 'SETOR_D',
      titulo: 'SETOR D: HALL & ELEVADORES — TORRE B',
      itens: [
        '12º Torre B - Corredor 1-6 (1 Elevador Social + 1 Elevador Serviço)',
        '13º Torre B - Corredor 7-10 (1 Elevador Social + 1 Elevador Serviço)',
        '14º Mercadinho da Torre B (acesso, iluminação e limpeza)'
      ]
    },
    {
      id: 'SETOR_E',
      titulo: 'SETOR E: PASSARELA INTER-TORRES & ELEVADOR DA GARAGEM',
      itens: [
        '15º Passarela inter-torres de acesso aos elevadores (-1 ao -3)',
        '16º Elevador Exclusivo do Estacionamento (botoeira, iluminação e portas)',
        '17º Quadro de Avisos no hall do elevador',
        '18º Escadaria 1 da Garagem (Térreo ao -3)'
      ]
    },
    {
      id: 'SETOR_F',
      titulo: 'SETOR F: ESTACIONAMENTOS (-1, -2, -3) & ESCADARIA DE EMERGÊNCIA',
      itens: [
        '19º Estacionamento -1 (iluminação, sinalização, tubulações e extintores)',
        '20º Estacionamento -2 (iluminação, ausência de vazamentos e portas corta-fogo)',
        '21º Estacionamento -3 (poço de esgotamento/bombas, umidade e rotas de fuga)',
        '22º Escadaria 2 da Garagem (-1 ao -3)'
      ]
    },
    {
      id: 'SETOR_G',
      titulo: 'SETOR G: ÁREAS DE LAZER EXTERNAS',
      itens: [
        '23º Playground (conservação dos brinquedos)',
        '24º Piscina (portão de acesso e deck)',
        '25º Quadra Poliesportiva (iluminação, redes e estado geral)',
        '26º Churrasqueira 2 (pia, grelhas e limpeza geral)'
      ]
    },
    {
      id: 'SETOR_H',
      titulo: 'SETOR H: INCÊNDIO & HALLS — TORRE A',
      itens: [
        'Torre A - Corredores e portas divisórias',
        'Torre A - Porta Corta-Fogo e Pressurização',
        'Torre A - Caixa de Hidrante e Mangueira',
        'Torre A - Extintores (pressão e validade)',
        'Torre A - Sensores de fumaça e Iluminação de emergência'
      ]
    },
    {
      id: 'SETOR_I',
      titulo: 'SETOR I: INCÊNDIO & HALLS — TORRE B',
      itens: [
        'Torre B - Corredores e portas divisórias',
        'Torre B - Porta Corta-Fogo e Pressurização',
        'Torre B - Caixa de Hidrante e Mangueira',
        'Torre B - Extintores (pressão e validade)',
        'Torre B - Sensores de fumaça e Iluminação de emergência'
      ]
    }
  ];

  const [respostasChecklist, setRespostasChecklist] = useState<Record<string, string>>({});

  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [modalRegistrarPonto, setModalRegistrarPonto] = useState<any | null>(null);
  const [modalAssumirPosto, setModalAssumirPosto] = useState(false);
  const [whatsAppRelatorio, setWhatsAppRelatorio] = useState<{ texto: string; link: string } | null>(null);

  const [nomePonto, setNomePonto] = useState('');
  const [codigoTag, setCodigoTag] = useState('');
  const [descricaoPonto, setDescricaoPonto] = useState('');
  const [setorPonto, setSetorPonto] = useState('SETOR_A');
  const [coordsNovoPonto, setCoordsNovoPonto] = useState<{ lat: number; lng: number } | null>(null);

  const [codigoLido, setCodigoLido] = useState('');
  const [observacaoPonto, setObservacaoPonto] = useState('');
  const [fotoPontoUrl, setFotoPontoUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [lendoQrCamera, setLendoQrCamera] = useState(false);
  const [pontoValidadoFisico, setPontoValidadoFisico] = useState(false);
  const [nfcDisponivel, setNfcDisponivel] = useState(false);
  const [nfcLendo, setNfcLendo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const ndefReaderRef = useRef<any>(null);

  const [operadorSelecionadoId, setOperadorSelecionadoId] = useState('');
  const [senhaLoginEntrante, setSenhaLoginEntrante] = useState('');
  const [ocorrenciasPlantao, setOcorrenciasPlantao] = useState('');

  useEffect(() => {
    if (!usuarioLogado?.condominio_id) return;

    carregarPontos();
    verificarRondaAtiva();
    carregarHistorico();
    carregarOperadores();

    return () => {
      pararCameraQr();
    };
  }, [usuarioLogado?.condominio_id]);

  const getObjetoSetor = (setorIdOuTitulo: string) => {
    if (!setorIdOuTitulo) return setoresChecklist[0];
    return (
      setoresChecklist.find(
        (item) => item.id === setorIdOuTitulo || item.titulo === setorIdOuTitulo
      ) || setoresChecklist[0]
    );
  };

  const getNomeSetor = (setorIdOuTitulo: string) => {
    const s = getObjetoSetor(setorIdOuTitulo);
    return s ? s.titulo : 'Setor Geral';
  };

  const calcularDistanciaMetros = (lat1: number | null, lon1: number | null, lat2: number | null, lon2: number | null) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371000;
    const rad = (graus: number) => (graus * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const carregarOperadores = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setListaOperadores(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar operadores:', err.message);
    }
  };

  const carregarPontos = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_pontos')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome_ponto');

      if (error) throw error;
      setPontos(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const verificarRondaAtiva = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'Em Andamento')
        .maybeSingle();

      if (error) throw error;
      setRondaAtiva(data);

      if (data) {
        localStorage.setItem(keyRondaAtiva, 'true');
        if (data.operador_nome) setOperadorRondaAtual(data.operador_nome);
        carregarRegistrosRonda(data.id);
      } else {
        localStorage.setItem(keyRondaAtiva, 'false');
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarRegistrosRonda = async (rondaId: string) => {
    try {
      const { data, error } = await supabase
        .from('rondas_registros')
        .select('*, rondas_pontos(*)')
        .eq('ronda_id', rondaId)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;
      setRegistrosRonda(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarHistorico = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .neq('status', 'Em Andamento')
        .order('data_inicio', { ascending: false })
        .limit(15);

      if (error) throw error;
      setHistoricoRondas(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const capturarGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setMensagem({ tipo: 'erro', texto: 'Não foi possível capturar o GPS do aparelho.' }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const capturarGPSNovoPonto = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordsNovoPonto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setMensagem({ tipo: 'sucesso', texto: 'GPS capturado para o novo ponto!' });
        },
        (err) => setMensagem({ tipo: 'erro', texto: 'Erro ao capturar GPS: ' + err.message }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setMensagem({ tipo: 'erro', texto: 'Dispositivo sem suporte para GPS.' });
    }
  };

  const uploadFoto = async (file: File | null) => {
    if (!file) return;
    setUploadingFoto(true);

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `rondas_evidencias/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setFotoPontoUrl(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto capturada e enviada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const processarTagLida = (tagLidaBruta: string, pontoAlvo: any) => {
    if (!pontoAlvo) return;
    const tagLimpa = tagLidaBruta.trim().toUpperCase();
    const tagEsperada = pontoAlvo.codigo_tag?.trim().toUpperCase();

    if (tagLimpa === tagEsperada) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      pararCameraQr();
      pararLeitorNfc();

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {
          // ignore
        }
      }

      setCodigoLido(tagLimpa);
      setPontoValidadoFisico(true);
      capturarGPS();
      setMensagem({ 
        tipo: 'sucesso', 
        texto: `✅ Placa e QR Code do ponto "${pontoAlvo.nome_ponto}" validados com sucesso no local! Checklist desbloqueado.` 
      });
    } else {
      setMensagem({ 
        tipo: 'erro', 
        texto: `🚨 Tag/QR lido (${tagLimpa}) NÃO corresponde a este ponto (${tagEsperada})! Aponte para a placa correta deste ponto.` 
      });
    }
  };

  const iniciarLeitorNfc = async (pontoAlvo: any) => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcDisponivel(true);
      try {
        const ndef = new (window as any).NDEFReader();
        ndefReaderRef.current = ndef;
        await ndef.scan();
        setNfcLendo(true);
        ndef.onreading = (event: any) => {
          let tagLida = event.serialNumber || '';
          if (event.message && event.message.records) {
            for (const record of event.message.records) {
              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                tagLida = textDecoder.decode(record.data);
                break;
              }
            }
          }
          if (tagLida) {
            processarTagLida(tagLida, pontoAlvo);
          }
        };
      } catch (nfcErr) {
        console.log('NFC não disponível ou cancelado:', nfcErr);
        setNfcLendo(false);
      }
    } else {
      setNfcDisponivel(false);
    }
  };

  const pararLeitorNfc = () => {
    setNfcLendo(false);
    ndefReaderRef.current = null;
  };

  const iniciarCameraQr = async (pontoAlvo?: any) => {
    const alvo = pontoAlvo || modalRegistrarPonto;
    setLendoQrCamera(true);

    iniciarLeitorNfc(alvo);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const barcodeDetector = ('BarcodeDetector' in window) 
        ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) 
        : null;

      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        try {
          let detectedCode: string | null = null;

          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch {
              // fallback to jsQR
            }
          }

          if (!detectedCode && ctx) {
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imgData.data, canvas.width, canvas.height);
            if (qrResult && qrResult.data) {
              detectedCode = qrResult.data;
            }
          }

          if (detectedCode) {
            processarTagLida(detectedCode, alvo);
          }
        } catch (err) {
          console.error('Erro na leitura de frame:', err);
        }
      }, 300);

    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível acessar a câmera do dispositivo: ' + err.message });
      setLendoQrCamera(false);
    }
  };

  const pararCameraQr = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLendoQrCamera(false);
  };

  const processarFotoPlacaQr = async (file: File | null) => {
    if (!file || !modalRegistrarPonto) return;
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrResult = jsQR(imgData.data, canvas.width, canvas.height);

      if (qrResult && qrResult.data) {
        processarTagLida(qrResult.data, modalRegistrarPonto);
      } else {
        setMensagem({ tipo: 'erro', texto: 'Nenhum QR Code legível foi encontrado nesta foto. Aponte a câmera com nitidez.' });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao processar imagem: ' + err.message });
    }
  };

  const abrirRegistroPonto = (ponto: any) => {
    setModalRegistrarPonto(ponto);
    setCodigoLido('');
    setPontoValidadoFisico(false);
    setObservacaoPonto('');
    setFotoPontoUrl('');
    capturarGPS();

    // Inicia a câmera e o leitor NFC automaticamente após renderizar o modal
    setTimeout(() => {
      iniciarCameraQr(ponto);
    }, 150);
  };

  const fecharModalRegistroPonto = () => {
    pararCameraQr();
    pararLeitorNfc();
    setModalRegistrarPonto(null);
    setPontoValidadoFisico(false);
  };

  const handleAtualizarChecklist = (itemNome: string, status: string) => {
    setRespostasChecklist(prev => ({
      ...prev,
      [itemNome]: status
    }));
  };

  const cadastrarPonto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!podeGerenciarPontos) {
      setMensagem({ tipo: 'erro', texto: 'Apenas Administrador (ADM), Master ou Supervisor podem cadastrar pontos.' });
      return;
    }

    if (!nomePonto.trim() || !codigoTag.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome do ponto e a Tag/QR Code.' });
      return;
    }

    if (!coordsNovoPonto?.lat || !coordsNovoPonto?.lng) {
      setMensagem({ tipo: 'erro', texto: 'Capture o GPS do ponto no local antes de salvar.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('rondas_pontos')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          nome_ponto: nomePonto.trim(),
          codigo_tag: codigoTag.trim().toUpperCase(),
          localizacao_descricao: descricaoPonto.trim(),
          setor_id: setorPonto,
          latitude: coordsNovoPonto.lat,
          longitude: coordsNovoPonto.lng
        }]);

      if (error) throw error;

      setNomePonto('');
      setCodigoTag('');
      setDescricaoPonto('');
      setSetorPonto('SETOR_A');
      setCoordsNovoPonto(null);
      setModalNovoPonto(false);
      carregarPontos();
      setMensagem({ tipo: 'sucesso', texto: 'Ponto cadastrado e vinculado ao setor com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const excluirPonto = async (pontoId: string) => {
    if (!podeGerenciarPontos) {
      setMensagem({ tipo: 'erro', texto: 'Operadores não têm permissão para excluir pontos de ronda.' });
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este ponto de ronda?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rondas_pontos')
        .delete()
        .eq('id', pontoId)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: 'Ponto removido com sucesso!' });
      carregarPontos();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const iniciarRonda = async () => {
    if (pontos.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Cadastre ao menos um ponto antes de iniciar.' });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_nome: operadorRondaAtual,
          status: 'Em Andamento',
          data_inicio: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setRondaAtiva(data);
      setRegistrosRonda([]);
      setRespostasChecklist({});
      setWhatsAppRelatorio(null);

      localStorage.setItem(keyRondaAtiva, 'true');
      localStorage.removeItem(keyUltimaRondaFim);
      window.dispatchEvent(new CustomEvent('ronda_iniciada', { detail: { condominio_id: usuarioLogado.condominio_id } }));

      setMensagem({ tipo: 'sucesso', texto: 'Ronda iniciada!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarLeituraPonto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pontoValidadoFisico || !codigoLido || !modalRegistrarPonto) {
      setMensagem({ tipo: 'erro', texto: 'A leitura do QR Code ou NFC da placa física no local é obrigatória!' });
      return;
    }

    if (codigoLido.trim().toUpperCase() !== modalRegistrarPonto.codigo_tag.toUpperCase()) {
      setMensagem({ tipo: 'erro', texto: `QR Code lido (${codigoLido}) não corresponde a este ponto (${modalRegistrarPonto.codigo_tag})!` });
      return;
    }

    if (!coords?.lat || !coords?.lng) {
      setMensagem({ tipo: 'erro', texto: 'GPS não identificado. Ative a localização no seu celular.' });
      return;
    }

    let textoAlertaForaArea = '';
    if (modalRegistrarPonto.latitude && modalRegistrarPonto.longitude) {
      const distanciaMetros = calcularDistanciaMetros(
        coords.lat,
        coords.lng,
        modalRegistrarPonto.latitude,
        modalRegistrarPonto.longitude
      );

      const DISTANCIA_MAXIMA = 50;

      if (distanciaMetros !== null && distanciaMetros > DISTANCIA_MAXIMA) {
        textoAlertaForaArea = `🚨 [TENTATIVA FORA DA ÁREA DESIGNADA: ${distanciaMetros}m de distância]`;
      }
    }

    setLoading(true);

    try {
      const observacaoFinal = [
        textoAlertaForaArea,
        observacaoPonto.trim()
      ].filter(Boolean).join(' - ') || 'Ponto verificado e checklist realizado.';

      const { error } = await supabase
        .from('rondas_registros')
        .insert([{
          ronda_id: rondaAtiva.id,
          ponto_id: modalRegistrarPonto.id,
          condominio_id: usuarioLogado.condominio_id,
          data_hora: new Date().toISOString(),
          latitude: coords.lat,
          longitude: coords.lng,
          foto_evidencia_url: fotoPontoUrl.trim() || '',
          observacao: observacaoFinal
        }]);

      if (error) throw error;

      fecharModalRegistroPonto();
      carregarRegistrosRonda(rondaAtiva.id);

      if (textoAlertaForaArea) {
        setMensagem({ tipo: 'erro', texto: `Ponto validado com alerta de localização divergente (${textoAlertaForaArea})!` });
      } else {
        setMensagem({ tipo: 'sucesso', texto: `Ponto "${modalRegistrarPonto.nome_ponto}" validado com sucesso!` });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const finalizarRonda = async () => {
    if (!rondaAtiva) return;
    setLoading(true);

    const dataFim = new Date();
    const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
    const todosLidos = pontos.every(p => pontosLidosIds.includes(p.id));
    const statusFinal = todosLidos ? 'Concluída' : 'Incompleta';

    const lidosNomes = registrosRonda.map(r => {
      const nomePontoStr = r.rondas_pontos?.nome_ponto || 'Ponto';
      const horaStr = new Date(r.data_hora).toLocaleTimeString('pt-BR');
      const obsStr = r.observacao ? `\n    📝 Observação: ${r.observacao}` : '';
      return `• *${nomePontoStr}* (${horaStr})${obsStr}`;
    }).join('\n\n');

    const zeradosNomes = pontos.filter(p => !pontosLidosIds.includes(p.id)).map(p => `• ${p.nome_ponto}`).join('\n');
    const fotosEvidencias = registrosRonda.filter(r => r.foto_evidencia_url).map(r => `📷 *${r.rondas_pontos?.nome_ponto}*:\n${r.foto_evidencia_url}`).join('\n\n');

    const alertasForaArea = registrosRonda
      .filter(r => r.observacao && r.observacao.includes('TENTATIVA FORA DA ÁREA'))
      .map(r => `🚨 *${r.rondas_pontos?.nome_ponto}*: ${r.observacao}`)
      .join('\n');

    const itensComAvaria = Object.entries(respostasChecklist)
      .filter(([_, status]) => status === 'avaria')
      .map(([item]) => `⚠️ ${item}`)
      .join('\n');

    const resumoTexto = `🛡️ *RELATÓRIO PATRIMONIAL DE RONDA*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Ronda/Operador:* ${operadorRondaAtual}\n` +
      `⏱️ *Início:* ${new Date(rondaAtiva.data_inicio).toLocaleString('pt-BR')}\n` +
      `🏁 *Fim:* ${dataFim.toLocaleString('pt-BR')}\n` +
      `📊 *Status:* ${statusFinal.toUpperCase()} (${registrosRonda.length}/${pontos.length})\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ *PONTOS VALIDADOS COM OBSERVAÇÕES:*\n${lidosNomes || 'Nenhum'}\n\n` +
      (alertasForaArea ? `🚨 *ALERTAS DE VALIDAÇÃO FORA DA ÁREA:*\n${alertasForaArea}\n\n` : '') +
      (zeradosNomes ? `⚠️ *PONTOS ZERADOS / NÃO VISITADOS:*\n${zeradosNomes}\n\n` : '') +
      (itensComAvaria ? `🚨 *AVARIAS REGISTRADAS NO CHECKLIST:*\n${itensComAvaria}\n\n` : '') +
      (fotosEvidencias ? `📸 *EVIDÊNCIAS FOTOGRÁFICAS:*\n${fotosEvidencias}\n` : '');

    try {
      const { error } = await supabase
        .from('rondas_execucao')
        .update({
          status: statusFinal,
          data_fim: dataFim.toISOString(),
          pontos_totais: pontos.length,
          pontos_lidos: registrosRonda.length,
          resumo_detalhado: resumoTexto
        })
        .eq('id', rondaAtiva.id)
        .eq('condominio_id', usuarioLogado.condominio_id);

      if (error) throw error;

      localStorage.setItem(keyUltimaRondaFim, dataFim.toISOString());
      localStorage.setItem(keyRondaAtiva, 'false');
      window.dispatchEvent(new CustomEvent('ronda_finalizada', { detail: { condominio_id: usuarioLogado.condominio_id } }));

      setWhatsAppRelatorio({
        texto: resumoTexto,
        link: `https://wa.me/?text=${encodeURIComponent(resumoTexto)}`
      });

      setRondaAtiva(null);
      setRegistrosRonda([]);
      setRespostasChecklist({});
      carregarHistorico();
      setMensagem({
        tipo: 'sucesso',
        texto: 'Ronda finalizada com sucesso!'
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarAssumirPosto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operadorSelecionadoId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o operador.' });
      return;
    }

    if (!senhaLoginEntrante.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite a senha.' });
      return;
    }

    setLoading(true);

    try {
      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('id', operadorSelecionadoId)
        .eq('condominio_id', usuarioLogado.condominio_id)
        .single();

      if (opError || !opData) throw new Error('Operador não encontrado.');
      if (opData.senha !== senhaLoginEntrante.trim()) throw new Error('Senha incorreta!');

      // UNIFICAÇÃO: Grava diretamente na tabela canônica 'passagens_posto'
      const agora = new Date();
      const dia = String(agora.getDate()).padStart(2, '0');
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ano = String(agora.getFullYear()).slice(-2);
      const codigoPas = `PAS:${dia}${mes}${ano}RONDA`;

      const { error: passError } = await supabase
        .from('passagens_posto')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          codigo: codigoPas,
          operador_sainte_nome: operadorRondaAtual,
          operador_entrante_nome: opData.nome,
          observacoes: ocorrenciasPlantao.trim() || 'Troca rápida de ronda/posto realizada.',
          status: 'Concluída'
        }]);

      if (passError) throw passError;

      setOperadorRondaAtual(opData.nome);
      setOperadorSelecionadoId('');
      setSenhaLoginEntrante('');
      setOcorrenciasPlantao('');
      setModalAssumirPosto(false);

      setMensagem({ tipo: 'sucesso', texto: `Posto assumido por ${opData.nome}.` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
  const pontosZerados = pontos.filter(p => !pontosLidosIds.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <UserCheck className="w-3.5 h-3.5" /> Ronda Ativo: {operadorRondaAtual}
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Controle de Rondas Patrimoniais
          </h3>
          <p className="text-xs text-slate-300">
            Validação por QR Code com Checklist do Setor, Foto e GPS.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              carregarOperadores();
              setModalAssumirPosto(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" /> Assumir Posto
          </button>

          {podeGerenciarPontos && (
            <button
              onClick={() => {
                setCoordsNovoPonto(null);
                setModalNovoPonto(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Cadastrar Ponto
            </button>
          )}

          {!rondaAtiva ? (
            <button
              onClick={iniciarRonda}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase"
            >
              <Play className="w-4 h-4" /> Iniciar Ronda
            </button>
          ) : (
            <button
              onClick={finalizarRonda}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition uppercase"
            >
              <Flag className="w-4 h-4" /> Finalizar Ronda
            </button>
          )}
        </div>
      </div>

      {whatsAppRelatorio && (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-bold text-emerald-900 text-sm">Relatório Detalhado Gerado!</strong>
              <p className="text-xs text-emerald-700">Envie o relatório completo com observações e fotos no grupo.</p>
            </div>
          </div>
          <a
            href={whatsAppRelatorio.link}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition uppercase shadow-md"
          >
            <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {rondaAtiva && (
        <div className="bg-slate-950 text-white p-5 rounded-2xl space-y-6 border border-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Ronda Ativa</span>
              <p className="text-xs text-slate-300">
                Início: <strong>{new Date(rondaAtiva.data_inicio).toLocaleTimeString('pt-BR')}</strong> por <strong>{rondaAtiva.operador_nome}</strong>
              </p>
            </div>

            <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-3 py-1 rounded-full border border-slate-700">
              {registrosRonda.length} de {pontos.length} Pontos Validados
            </span>
          </div>

          {pontosZerados.length > 0 && (
            <div className="bg-amber-950/60 border border-amber-800/80 p-3 rounded-xl text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Pontos pendentes para verificação: {pontosZerados.length}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" /> Pontos de Ronda Cadastrados
          </h4>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
            Total: {pontos.length}
          </span>
        </div>

        {pontos.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Nenhum ponto de ronda cadastrado para este condomínio.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pontos.map((ponto) => {
              const lido = pontosLidosIds.includes(ponto.id);
              return (
                <div
                  key={ponto.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                    lido ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {getNomeSetor(ponto.setor_id)}
                      </span>
                      {lido ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Validado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                          Pendente
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm mt-2">{ponto.nome_ponto}</h5>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {ponto.localizacao_descricao || 'Sem descrição adicional.'}
                    </p>
                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-slate-400" /> TAG: <code className="font-mono text-slate-600 font-bold">{ponto.codigo_tag}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    {rondaAtiva && !lido && (
                      <button
                        onClick={() => abrirRegistroPonto(ponto)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Camera className="w-4 h-4" /> Validar Ponto
                      </button>
                    )}

                    {podeGerenciarPontos && (
                      <button
                        onClick={() => excluirPonto(ponto.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Excluir Ponto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-slate-600" /> Histórico de Rondas Recentes
        </h4>

        {historicoRondas.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Nenhuma ronda finalizada no histórico.</p>
        ) : (
          <div className="space-y-3">
            {historicoRondas.map((h) => (
              <div key={h.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      h.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {h.status}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{h.operador_nome}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Início: {new Date(h.data_inicio).toLocaleString('pt-BR')} | Fim: {h.data_fim ? new Date(h.data_fim).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="text-right text-xs font-semibold text-slate-600">
                  {h.pontos_lidos} / {h.pontos_totais} Pontos
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalNovoPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Novo Ponto de Ronda
              </h3>
              <button onClick={() => setModalNovoPonto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarPonto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Setor Pertencente</label>
                <select
                  value={setorPonto}
                  onChange={(e) => setSetorPonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 bg-slate-50"
                >
                  {setoresChecklist.map((s) => (
                    <option key={s.id} value={s.id}>{s.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Ponto</label>
                <input
                  type="text"
                  placeholder="Ex: Hall da Torre A"
                  value={nomePonto}
                  onChange={(e) => setNomePonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código da Tag / QR Code</label>
                <input
                  type="text"
                  placeholder="Ex: TAG-HALL-A1"
                  value={codigoTag}
                  onChange={(e) => setCodigoTag(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Local (Opcional)</label>
                <textarea
                  placeholder="Ex: Próximo à porta do elevador social."
                  value={descricaoPonto}
                  onChange={(e) => setDescricaoPonto(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  rows={2}
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Localização GPS</span>
                  <span className="text-[11px] text-slate-500">
                    {coordsNovoPonto ? `${coordsNovoPonto.lat.toFixed(5)}, ${coordsNovoPonto.lng.toFixed(5)}` : 'Não capturado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={capturarGPSNovoPonto}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  Capturar GPS
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoPonto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
                >
                  {loading ? 'Salvando...' : 'Salvar Ponto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRegistrarPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">
                  {getNomeSetor(modalRegistrarPonto.setor_id)}
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {modalRegistrarPonto.nome_ponto}
                </h3>
              </div>
              <button onClick={fecharModalRegistroPonto} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ESTADO 1: AINDA NÃO ESCANEOU A PLACA FÍSICA NO LOCAL */}
            {!pontoValidadoFisico ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Checklist do Setor Bloqueado
                    </h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                      Para evitar fraudes, o menu de checklist e a validação do ponto <strong>só serão liberados após a leitura da placa física</strong> no local.
                    </p>
                    <p className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded mt-1.5 w-fit">
                      Tag esperada: <strong>{modalRegistrarPonto.codigo_tag}</strong>
                    </p>
                  </div>
                </div>

                {/* Leitor de Câmera Ativo */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Aponte para o QR Code da Placa:
                  </label>

                  {lendoQrCamera ? (
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border-2 border-blue-500 shadow-inner">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      
                      {/* Mira de Leitura */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-xl relative shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                          <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 animate-pulse" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={pararCameraQr}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full transition shadow-md"
                        title="Pausar Câmera"
                      >
                        <VideoOff className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 text-center space-y-3">
                      <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600">Câmera pausada ou não iniciada.</p>
                      <button
                        type="button"
                        onClick={() => iniciarCameraQr(modalRegistrarPonto)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 mx-auto transition"
                      >
                        <Camera className="w-4 h-4" /> Ativar Câmera QR
                      </button>
                    </div>
                  )}

                  {/* Fallback de Foto e NFC */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={inputPlacaFotoRef}
                      onChange={(e) => processarFotoPlacaQr(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => inputPlacaFotoRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                    >
                      <Camera className="w-4 h-4 text-slate-500" /> Tirar Foto da Placa
                    </button>

                    {nfcDisponivel && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        {nfcLendo ? 'NFC Ativo: Aproxime da Placa' : 'NFC Pronto'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={fecharModalRegistroPonto}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ESTADO 2: PLACA VALIDADA FISICAMENTE NO LOCAL -> LIBERA MENU DO SETOR E CHECKLIST */
              <form onSubmit={confirmarLeituraPonto} className="space-y-4">
                {/* Banner de Validação com Sucesso */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Placa Física Validada com Sucesso!
                      </h4>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                        No Local
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      QR Code/NFC <strong>{codigoLido}</strong> conferido. Menu de itens do setor desbloqueado para conferência.
                    </p>
                  </div>
                </div>

                {/* Menu do Setor: Checklist de Itens */}
                <div className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Checklist do Setor: {getNomeSetor(modalRegistrarPonto.setor_id)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {getObjetoSetor(modalRegistrarPonto.setor_id).itens.length} itens
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {getObjetoSetor(modalRegistrarPonto.setor_id).itens.map((item: string, idx: number) => {
                      const statusAtual = respostasChecklist[item] || 'ok';
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-slate-700 font-medium flex-1 pr-2">{item}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleAtualizarChecklist(item, 'ok')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                statusAtual === 'ok' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAtualizarChecklist(item, 'avaria')}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                statusAtual === 'avaria' ? 'bg-red-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Avaria
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Foto de Evidência (Opcional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Foto de Evidência no Local (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={inputFotoRef}
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => inputFotoRef.current?.click()}
                      disabled={uploadingFoto}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition"
                    >
                      <Camera className="w-4 h-4" /> {uploadingFoto ? 'Enviando...' : 'Tirar Foto do Ponto'}
                    </button>
                    {fotoPontoUrl && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <Check className="w-4 h-4" /> Foto Anexada
                      </span>
                    )}
                  </div>
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observação da Inspeção</label>
                  <textarea
                    placeholder="Ex: Tudo em perfeita ordem, luzes acesas, portão trancado."
                    value={observacaoPonto}
                    onChange={(e) => setObservacaoPonto(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={fecharModalRegistroPonto}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {loading ? 'Salvando...' : 'Confirmar e Registrar Ponto'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {modalAssumirPosto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Assumir Posto / Troca de Turno
              </h3>
              <button onClick={() => setModalAssumirPosto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={efetivarAssumirPosto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operador Entrante</label>
                <select
                  value={operadorSelecionadoId}
                  onChange={(e) => setOperadorSelecionadoId(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800 bg-slate-50"
                  required
                >
                  <option value="">Selecione o operador...</option>
                  {listaOperadores.map((op) => (
                    <option key={op.id} value={op.id}>{op.nome} ({op.login})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Senha do Operador Entrante</label>
                <input
                  type="password"
                  placeholder="Digite a senha de confirmação"
                  value={senhaLoginEntrante}
                  onChange={(e) => setSenhaLoginEntrante(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ocorrências / Observações do Plantão</label>
                <textarea
                  placeholder="Ex: Tudo tranquilo durante o plantão."
                  value={ocorrenciasPlantao}
                  onChange={(e) => setOcorrenciasPlantao(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs text-slate-800"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAssumirPosto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                >
                  {loading ? 'Confirmando...' : 'Assumir Posto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Pasta: src/pages/Rondas.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  ShieldCheck, 
  QrCode, 
  MapPin, 
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
  Building2,
  Trash2
} from 'lucide-react';

export default function Rondas({ usuarioLogado }) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const inputFotoRef = useRef(null);

  const nivelNum = Number(usuarioLogado?.nivel);
  const perfilTexto = String(
    usuarioLogado?.perfil || 
    usuarioLogado?.tipo || 
    usuarioLogado?.role || 
    usuarioLogado?.funcao || 
    usuarioLogado?.login || 
    ''
  ).toLowerCase();

  // Identificação do Operador Nível 3 (Portaria / Vigilante)
  const isOperadorNivel3 = 
    usuarioLogado?.nivel === 3 || 
    usuarioLogado?.nivel === '3' || 
    nivelNum === 3 ||
    (perfilTexto.includes('operador') && 
     !perfilTexto.includes('admin') && 
     !perfilTexto.includes('master') && 
     !perfilTexto.includes('sindico') && 
     !perfilTexto.includes('dev'));

  // Apenas Nível 0 (Dev), Nível 1 (Master/Síndico) e Nível 2 (Supervisor) podem cadastrar, editar ou excluir pontos.
  // Usuários Nível 3 (Operador Portaria) NÃO possuem essa permissão.
  const podeGerenciarPontos = !isOperadorNivel3 && (
    usuarioLogado?.nivel === 0 || 
    usuarioLogado?.nivel === 1 || 
    usuarioLogado?.nivel === 2 || 
    usuarioLogado?.nivel === '0' || 
    usuarioLogado?.nivel === '1' || 
    usuarioLogado?.nivel === '2' ||
    (!isNaN(nivelNum) && nivelNum < 3) ||
    perfilTexto.includes('admin') ||
    perfilTexto.includes('adm') ||
    perfilTexto.includes('master') ||
    perfilTexto.includes('dev') ||
    perfilTexto.includes('sindico') ||
    perfilTexto.includes('supervisor')
  );

  const podeCadastrarPonto = podeGerenciarPontos;

  const [operadorRondaAtual, setOperadorRondaAtual] = useState(
    usuarioLogado?.nome || usuarioLogado?.login || 'Vigia / Portaria'
  );

  const [listaOperadores, setListaOperadores] = useState([]);
  const [pontos, setPontos] = useState([]);
  const [rondaAtiva, setRondaAtiva] = useState(null);
  const [registrosRonda, setRegistrosRonda] = useState([]);
  const [historicoRondas, setHistoricoRondas] = useState([]);
  const [historicoPassagens, setHistoricoPassagens] = useState([]);

  // Estrutura do Checklist dos 9 Setores
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

  const [respostasChecklist, setRespostasChecklist] = useState({});

  // Modais
  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [modalRegistrarPonto, setModalRegistrarPonto] = useState(null);
  const [modalAssumirPosto, setModalAssumirPosto] = useState(false);
  const [whatsAppRelatorio, setWhatsAppRelatorio] = useState(null);

  // Form Novo Ponto
  const [nomePonto, setNomePonto] = useState('');
  const [codigoTag, setCodigoTag] = useState('');
  const [descricaoPonto, setDescricaoPonto] = useState('');
  const [setorPonto, setSetorPonto] = useState('SETOR_A');
  const [coordsNovoPonto, setCoordsNovoPonto] = useState(null);

  // Form Leitura de Ponto
  const [codigoLido, setCodigoLido] = useState('');
  const [observacaoPonto, setObservacaoPonto] = useState('');
  const [fotoPontoUrl, setFotoPontoUrl] = useState('');
  const [coords, setCoords] = useState(null);

  // Scanner Câmera
  const [lendoQrCamera, setLendoQrCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Form Assumir Posto
  const [operadorSelecionadoId, setOperadorSelecionadoId] = useState('');
  const [senhaLoginEntrante, setSenhaLoginEntrante] = useState('');
  const [ocorrenciasPlantao, setOcorrenciasPlantao] = useState('');

  useEffect(() => {
    carregarPontos();
    verificarRondaAtiva();
    carregarHistorico();
    carregarPassagensPosto();
    carregarOperadores();

    return () => {
      pararCameraQr();
    };
  }, []);

  const getObjetoSetor = (setorIdOuTitulo) => {
    if (!setorIdOuTitulo) return setoresChecklist[0];
    return (
      setoresChecklist.find(
        (item) => item.id === setorIdOuTitulo || item.titulo === setorIdOuTitulo
      ) || setoresChecklist[0]
    );
  };

  const getNomeSetor = (setorIdOuTitulo) => {
    const s = getObjetoSetor(setorIdOuTitulo);
    return s ? s.titulo : 'Setor Geral';
  };

  const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371000;
    const rad = (graus) => (graus * Math.PI) / 180;
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
    } catch (err) {
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
    } catch (err) {
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
        localStorage.setItem('infport_ronda_ativa', 'true');
        if (data.operador_nome) setOperadorRondaAtual(data.operador_nome);
        carregarRegistrosRonda(data.id);
      } else {
        localStorage.setItem('infport_ronda_ativa', 'false');
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarRegistrosRonda = async (rondaId) => {
    try {
      const { data, error } = await supabase
        .from('rondas_registros')
        .select('*, rondas_pontos(*)')
        .eq('ronda_id', rondaId);

      if (error) throw error;
      setRegistrosRonda(data || []);
    } catch (err) {
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
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const carregarPassagensPosto = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('rondas_passagem_posto')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('data_hora', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistoricoPassagens(data || []);
    } catch (err) {
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

  const uploadFoto = async (file) => {
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
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } fontally {
      setUploadingFoto(false);
    }
  };

  const iniciarCameraQr = async () => {
    setLendoQrCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const scanInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const tagDetectada = barcodes[0].rawValue;
                setCodigoLido(tagDetectada.toUpperCase());
                pararCameraQr();
                clearInterval(scanInterval);
                setMensagem({ tipo: 'sucesso', texto: 'QR Code lido com sucesso!' });
              }
            } catch (err) {
              console.error('Erro na detecção do QR:', err);
            }
          }
        }, 400);
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível acessar a câmera do dispositivo: ' + err.message });
      setLendoQrCamera(false);
    }
  };

  const pararCameraQr = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLendoQrCamera(false);
  };

  const validarSemCameraFallback = () => {
    if (modalRegistrarPonto?.codigo_tag) {
      setCodigoLido(modalRegistrarPonto.codigo_tag.toUpperCase());
      setMensagem({ tipo: 'sucesso', texto: 'Código da Tag confirmado.' });
    }
  };

  const abrirRegistroPonto = (ponto) => {
    setModalRegistrarPonto(ponto);
    setCodigoLido('');
    setObservacaoPonto('');
    setFotoPontoUrl('');
    setLendoQrCamera(false);
    capturarGPS();
  };

  const fecharModalRegistroPonto = () => {
    pararCameraQr();
    setModalRegistrarPonto(null);
  };

  const handleAtualizarChecklist = (itemNome, status) => {
    setRespostasChecklist(prev => ({
      ...prev,
      [itemNome]: status
    }));
  };

  const cadastrarPonto = async (e) => {
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
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const excluirPonto = async (pontoId) => {
    if (!podeGerenciarPontos) {
      setMensagem({ tipo: 'erro', texto: 'Operadores (Nível 3) não têm permissão para excluir pontos de ronda.' });
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
    } catch (err) {
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

      localStorage.setItem('infport_ronda_ativa', 'true');
      localStorage.removeItem('infport_ultima_ronda_fim');
      window.dispatchEvent(new Event('ronda_iniciada'));

      setMensagem({ tipo: 'sucesso', texto: 'Ronda iniciada!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarLeituraPonto = async (e) => {
    e.preventDefault();

    if (!codigoLido) {
      setMensagem({ tipo: 'erro', texto: 'Leia o QR Code do ponto para validar.' });
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
    } catch (err) {
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
        .eq('id', rondaAtiva.id);

      if (error) throw error;

      localStorage.setItem('infport_ultima_ronda_fim', dataFim.toISOString());
      localStorage.setItem('infport_ronda_ativa', 'false');
      window.dispatchEvent(new Event('ronda_finalizada'));

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
        texto: 'Ronda finalizada! Intervalo de 15 minutos iniciado em todo o aplicativo.'
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarAssumirPosto = async (e) => {
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

      const { error: passError } = await supabase
        .from('rondas_passagem_posto')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_sainte: operadorRondaAtual,
          operador_entrante: opData.nome,
          data_hora: new Date().toISOString(),
          ocorrencias_plantao: ocorrenciasPlantao.trim() || 'Sem alterações.'
        }]);

      if (passError) throw passError;

      setOperadorRondaAtual(opData.nome);
      setOperadorSelecionadoId('');
      setSenhaLoginEntrante('');
      setOcorrenciasPlantao('');
      setModalAssumirPosto(false);
      carregarPassagensPosto();

      setMensagem({ tipo: 'sucesso', texto: `Posto assumido por ${opData.nome}.` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
  const pontosZerados = pontos.filter(p => !pontosLidosIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
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

          {/* Botão Cadastrar Ponto visível APENAS para Adm, Master e Supervisor (Bloqueado para Nível 3 - Operador Portaria) */}
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

      {/* RELATÓRIO VIA WHATSAPP */}
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

      {/* Alertas */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* RONDA EM ANDAMENTO */}
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
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Ainda restam <strong>{pontosZerados.length} ponto(s) zerados</strong>. Clique em "Validar Ponto" para realizar o checklist e leitura.</span>
            </div>
          )}

          {/* GRID DE PONTOS DA RONDA */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Pontos Cadastrados no Posto:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pontos.map((ponto) => {
                const lido = pontosLidosIds.includes(ponto.id);
                const reg = registrosRonda.find(r => r.ponto_id === ponto.id);

                return (
                  <div
                    key={ponto.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                      lido ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {getNomeSetor(ponto.setor_id)}
                        </span>
                        {lido ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Validado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-700">
                            Pendente
                          </span>
                        )}
                      </div>

                      <h5 className="font-bold text-sm text-white mb-1">{ponto.nome_ponto}</h5>
                      <p className="text-xs text-slate-400 mb-2 truncate">{ponto.localizacao_descricao || 'Sem descrição.'}</p>
                      <span className="text-[10px] text-slate-500 block font-mono">TAG: {ponto.codigo_tag}</span>

                      {lido && reg && (
                        <div className="mt-3 text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                          <p className="text-emerald-400 font-medium">
                            Validado às {new Date(reg.data_hora).toLocaleTimeString('pt-BR')}
                          </p>
                          {reg.observacao && <p className="text-slate-400 italic text-[10px]">{reg.observacao}</p>}
                        </div>
                      )}
                    </div>

                    {!lido && (
                      <button
                        onClick={() => abrirRegistroPonto(ponto)}
                        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Validar Ponto
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE PONTOS DE RONDA CADASTRADOS NO SISTEMA */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" /> Pontos de Ronda Cadastrados ({pontos.length})
          </h4>
        </div>

        {pontos.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            Nenhum ponto de ronda cadastrado. {podeGerenciarPontos && 'Clique em "Cadastrar Ponto" para adicionar.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pontos.map((ponto) => (
              <div key={ponto.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-slate-300 transition">
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {getNomeSetor(ponto.setor_id)}
                    </span>

                    {/* Botão de Excluir Ponto: VISÍVEL APENAS para Adm, Master e Supervisor (NÃO para Nível 3 Operador) */}
                    {podeGerenciarPontos && (
                      <button
                        onClick={() => excluirPonto(ponto.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                        title="Excluir Ponto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h5 className="font-bold text-sm text-slate-800 mb-1">{ponto.nome_ponto}</h5>
                  <p className="text-xs text-slate-600 mb-2">{ponto.localizacao_descricao || 'Sem descrição cadastrada.'}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">TAG: {ponto.codigo_tag}</span>
                  {ponto.latitude && (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> GPS OK
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HISTÓRICO DE RONDAS E PASSAGENS DE POSTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Histórico Rondas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" /> Histórico de Rondas Anteriores
          </h4>

          {historicoRondas.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum histórico de ronda registrado.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {historicoRondas.map((h) => (
                <div key={h.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
                  <div>
                    <strong className="font-bold text-slate-800 block">{h.operador_nome || 'Operador'}</strong>
                    <span className="text-[11px] text-slate-500">
                      {new Date(h.data_inicio).toLocaleString('pt-BR')} — {h.pontos_lidos || 0}/{h.pontos_totais || 0} Pontos
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                    h.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passagens de Posto Recentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600" /> Passagens de Posto Recentes
          </h4>

          {historicoPassagens.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">Nenhuma troca de posto registrada.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {historicoPassagens.map((pass) => (
                <div key={pass.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold text-slate-800">
                    <span>Sainte: {pass.operador_sainte}</span>
                    <span className="text-blue-600">Entrante: {pass.operador_entrante}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{new Date(pass.data_hora).toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200 mt-1">
                    "{pass.ocorrencias_plantao}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CADASTRAR NOVO PONTO (Permitido Apenas se podeGerenciarPontos) */}
      {modalNovoPonto && podeGerenciarPontos && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Cadastrar Ponto de Ronda
              </h3>
              <button onClick={() => setModalNovoPonto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={cadastrarPonto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Setor do Ponto</label>
                <select
                  value={setorPonto}
                  onChange={(e) => setSetorPonto(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {setoresChecklist.map((setor) => (
                    <option key={setor.id} value={setor.id}>
                      {setor.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Ponto</label>
                <input
                  type="text"
                  placeholder="Ex: Hall do Bloco A, Portão da Garagem"
                  value={nomePonto}
                  onChange={(e) => setNomePonto(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código da Tag / QR Code</label>
                <input
                  type="text"
                  placeholder="Ex: TAG-HALL-A"
                  value={codigoTag}
                  onChange={(e) => setCodigoTag(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição / Instruções do Ponto</label>
                <textarea
                  rows="2"
                  placeholder="Verificar portas, extintores e luzes de emergência..."
                  value={descricaoPonto}
                  onChange={(e) => setDescricaoPonto(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              {/* Botão GPS */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Captura de GPS no Local
                  </span>
                  {coordsNovoPonto && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">GPS Capturado</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Esteja presencialmente no ponto para salvar a localização exata e evitar fraudes.
                </p>
                <button
                  type="button"
                  onClick={capturarGPSNovoPonto}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Capturar Coordenadas GPS
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoPonto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  Salvar Ponto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR / VALIDAR PONTO DA RONDA */}
      {modalRegistrarPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                  {getNomeSetor(modalRegistrarPonto.setor_id)}
                </span>
                <h3 className="font-bold text-slate-800 text-base">{modalRegistrarPonto.nome_ponto}</h3>
              </div>
              <button onClick={fecharModalRegistroPonto} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CHECKLIST DO SETOR */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Checklist Obrigatório do Setor
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {getObjetoSetor(modalRegistrarPonto.setor_id).itens.map((item, idx) => {
                  const statusAtual = respostasChecklist[item] || 'ok';

                  return (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 text-xs">
                      <p className="font-medium text-slate-700">{item}</p>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAtualizarChecklist(item, 'ok')}
                          className={`flex-1 py-1 px-2 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition ${
                            statusAtual === 'ok' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Check className="w-3 h-3" /> OK / Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAtualizarChecklist(item, 'avaria')}
                          className={`flex-1 py-1 px-2 rounded font-bold text-[10px] flex items-center justify-center gap-1 transition ${
                            statusAtual === 'avaria' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" /> Avaria / Irregular
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEITURA DO QR CODE */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Validação por QR Code / Tag
              </label>

              {lendoQrCamera ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border-2 border-emerald-500">
                    <video ref={videoRef} className="w-full h-full object-cover"></video>
                  </div>
                  <button
                    type="button"
                    onClick={pararCameraQr}
                    className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <VideoOff className="w-4 h-4" /> Parar Câmera
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escaneie ou digite a Tag"
                    value={codigoLido}
                    onChange={(e) => setCodigoLido(e.target.value.toUpperCase())}
                    className="flex-1 text-xs p-3 rounded-xl border border-slate-200 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={iniciarCameraQr}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-4 h-4" /> Ler Câmera
                  </button>
                  <button
                    type="button"
                    onClick={validarSemCameraFallback}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition"
                    title="Usar Tag Cadastrada"
                  >
                    Confirmar Tag
                  </button>
                </div>
              )}
            </div>

            {/* FOTO EVIDÊNCIA */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Foto de Evidência (Opcional)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={inputFotoRef}
                onChange={(e) => uploadFoto(e.target.files[0])}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingFoto}
                  onClick={() => inputFotoRef.current?.click()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-300"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  {uploadingFoto ? 'Enviando Foto...' : 'Tirar / Enviar Foto'}
                </button>
                {fotoPontoUrl && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Foto Anexada!
                  </span>
                )}
              </div>
            </div>

            {/* OBSERVAÇÃO */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações do Ponto</label>
              <textarea
                rows="2"
                placeholder="Ex: Lampada queimada no corredor, porta entreaberta..."
                value={observacaoPonto}
                onChange={(e) => setObservacaoPonto(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              ></textarea>
            </div>

            {/* INDICADOR GPS */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Localização GPS:
              </span>
              <strong className={coords ? 'text-emerald-700' : 'text-amber-600'}>
                {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Obtendo GPS...'}
              </strong>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={fecharModalRegistroPonto}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarLeituraPonto}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar e Salvar Validação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSUMIR POSTO */}
      {modalAssumirPosto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Troca de Posto / Assumir Plantão
              </h3>
              <button onClick={() => setModalAssumirPosto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={efetivarAssumirPosto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Operador Entrante</label>
                <select
                  value={operadorSelecionadoId}
                  onChange={(e) => setOperadorSelecionadoId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o operador...</option>
                  {listaOperadores.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.nome} ({op.perfil || 'Operador'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha do Operador Entrante</label>
                <input
                  type="password"
                  placeholder="Digite a senha para confirmar"
                  value={senhaLoginEntrante}
                  onChange={(e) => setSenhaLoginEntrante(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ocorrências / Observações do Turno Sainte</label>
                <textarea
                  rows="3"
                  placeholder="Registre alterações ou pendências do plantão..."
                  value={ocorrenciasPlantao}
                  onChange={(e) => setOcorrenciasPlantao(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAssumirPosto(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                >
                  Confirmar Troca de Posto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

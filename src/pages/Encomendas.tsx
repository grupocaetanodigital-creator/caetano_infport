import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { registrarAtividade } from '../services/auditoriaService';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Plus, 
  UserCheck, 
  MessageCircle, 
  ExternalLink, 
  X, 
  Camera, 
  QrCode, 
  Clock, 
  Building2, 
  CheckSquare, 
  Square,
  User,
  Boxes,
  MapPin,
  Edit3,
  Layers,
  ClipboardCheck,
  Check,
  FileText,
  ShieldCheck,
  Share2,
  Copy,
  Printer,
  Calendar,
  Filter,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';

interface EncomendasProps {
  usuarioLogado?: any;
}

export default function Encomendas({ usuarioLogado }: EncomendasProps) {
  const idCondominioAtivo = usuarioLogado?.condominio_id || '';
  const isGlobal = !idCondominioAtivo || idCondominioAtivo === 'global';
  const listaCondominios = usuarioLogado?.listaCondominios || [];
  const [condominioNovoLoteId, setCondominioNovoLoteId] = useState('');
  const [etapa, setEtapa] = useState<'1' | '2' | '3' | '4'>('1');
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [entregadores, setEntregadores] = useState<any[]>([]);
  const [lotesPendentes, setLotesPendentes] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [todosItensRetidos, setTodosItensRetidos] = useState<any[]>([]);

  // Estados do Módulo Dossiê Auditável de Encomendas
  const [itensDossie, setItensDossie] = useState<any[]>([]);
  const [loadingDossie, setLoadingDossie] = useState(false);
  const [buscaDossie, setBuscaDossie] = useState('');
  const [filtroStatusDossie, setFiltroStatusDossie] = useState<'todos' | 'entregue' | 'retido'>('todos');
  const [filtroPeriodoDossie, setFiltroPeriodoDossie] = useState<'hoje' | '7dias' | '30dias' | 'todos'>('todos');
  const [itemModalDossie, setItemModalDossie] = useState<any | null>(null);
  const [copiadoDossie, setCopiadoDossie] = useState(false);

  const [statsDia, setStatsDia] = useState<{
    lotesHoje: number;
    triadasHoje: number;
    aguardandoTriagem: number;
    retidosPorBloco: Record<string, number>;
  }>({
    lotesHoje: 0,
    triadasHoje: 0,
    aguardandoTriagem: 0,
    retidosPorBloco: {}
  });

  const [buscaEntregador, setBuscaEntregador] = useState('');
  const [entregadorSelecionado, setEntregadorSelecionado] = useState<any | null>(null);
  const [qtdDeclarada, setQtdDeclarada] = useState<number | string>(1);
  const [modalNovoEntregador, setModalNovoEntregador] = useState(false);
  const [novoEntNome, setNovoEntNome] = useState('');
  const [novoEntDoc, setNovoEntDoc] = useState('');
  const [novoEntEmpresa, setNovoEntEmpresa] = useState('');
  const [loteCriadoWhats, setLoteCriadoWhats] = useState<{ codigo: string; link: string } | null>(null);

  const [loteAtivo, setLoteAtivo] = useState<any | null>(null);
  const [unidadeTriagem, setUnidadeTriagem] = useState('');
  const [blocoTriagem, setBlocoTriagem] = useState('');
  const [moradoresDaUnidade, setMoradoresDaUnidade] = useState<any[]>([]);
  const [moradorSelecionado, setMoradorSelecionado] = useState<any | null>(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [locaisArmazenamento, setLocaisArmazenamento] = useState<any[]>([]);
  const [localArmazenamentoTriagem, setLocalArmazenamentoTriagem] = useState('PRAT-A1 - Prateleira A1 - Caixas Pequenas');
  const [alertaAgrupamento, setAlertaAgrupamento] = useState<any | null>(null);
  const [itemTriadoWhats, setItemTriadoWhats] = useState<any | null>(null);

  const [modalLeitor, setModalLeitor] = useState(false);
  const [destinoLeitor, setDestinoLeitor] = useState<'triagem' | 'baixa'>('triagem');
  const [erroCamera, setErroCamera] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [buscaBaixaGeral, setBuscaBaixaGeral] = useState('');
  const [abaBlocoSelecionada, setAbaBlocoSelecionada] = useState('TODOS');
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<string[]>([]);
  const [itensCandidatosEntrega, setItensCandidatosEntrega] = useState<string[]>([]);
  const [modalFotoAmpliada, setModalFotoAmpliada] = useState<string | null>(null);
  const [modalBaixaAberta, setModalBaixaAberta] = useState(false);
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [fotoRetiranteUrl, setFotoRetiranteUrl] = useState('');
  const [baixaConcluidaWhats, setBaixaConcluidaWhats] = useState<any | null>(null);

  // Estados para Edição e Troca Dinâmica de Local Físico
  const [modalMoverLocal, setModalMoverLocal] = useState(false);
  const [itemParaMover, setItemParaMover] = useState<any | null>(null);
  const [novoLocalSelecionado, setNovoLocalSelecionado] = useState('');
  const [moverTodosDaUnidade, setMoverTodosDaUnidade] = useState(true);
  const [moverEmLoteSelecionados, setMoverEmLoteSelecionados] = useState(false);

  const blocosDisponiveis = Array.from(
    new Set(moradores.map(m => m.bloco).filter(Boolean))
  ).sort((a: any, b: any) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  useEffect(() => {
    carregarDadosBase();
  }, [etapa, idCondominioAtivo]);

  useEffect(() => {
    const handleAtualizacaoLocais = (e: any) => {
      if (e.detail?.locais && Array.isArray(e.detail.locais)) {
        setLocaisArmazenamento(e.detail.locais);
        const primeiroAtivo = e.detail.locais.find((l: any) => l.ativo);
        if (primeiroAtivo) setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
      }
    };
    window.addEventListener('locais_armazenamento_atualizados', handleAtualizacaoLocais);
    return () => window.removeEventListener('locais_armazenamento_atualizados', handleAtualizacaoLocais);
  }, []);

  const carregarLocais = async (targetCondoId?: string) => {
    const condoIdFinal = targetCondoId || idCondominioAtivo;
    if (!condoIdFinal) {
      setLocaisArmazenamento([
        { id: '1', codigo: 'B01', nome: 'Bancada Principal', ativo: true },
        { id: '2', codigo: 'C01', nome: 'Chão / Caixas Grandes', ativo: true }
      ]);
      setLocalArmazenamentoTriagem('B01 - Bancada Principal');
      return;
    }
    try {
      const cached = localStorage.getItem(`infport_locais_${condoIdFinal}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocaisArmazenamento(parsed);
            const primeiroAtivo = parsed.find((l: any) => l.ativo);
            if (primeiroAtivo) setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
          }
        } catch {}
      }

      const { data, error } = await supabase
        .from('locais_armazenamento')
        .select('*')
        .eq('condominio_id', condoIdFinal)
        .eq('ativo', true)
        .order('codigo');

      if (!error && data && data.length > 0) {
        setLocaisArmazenamento(data);
        const primeiroAtivo = data[0];
        setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
        return;
      }

      const { data: configData } = await supabase
        .from('configuracoes')
        .select('locais_armazenamento')
        .eq('condominio_id', condoIdFinal)
        .maybeSingle();

      if (configData?.locais_armazenamento && Array.isArray(configData.locais_armazenamento)) {
        setLocaisArmazenamento(configData.locais_armazenamento);
        const primeiroAtivo = configData.locais_armazenamento.find((l: any) => l.ativo);
        if (primeiroAtivo) setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
      }
    } catch (e) {
      console.warn('Erro ao carregar locais:', e);
    }
  };

  const carregarDadosBase = async () => {
    setLoading(true);
    carregarLocais();
    try {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date();
      fimDia.setHours(23, 59, 59, 999);

      // Mapa auxiliar de condomínios para exibição de tags sem joins arriscados
      const mapaCondos = new Map<string, string>();
      try {
        const { data: conds } = await supabase.from('condominios').select('id, nome');
        if (conds) {
          conds.forEach((c: any) => mapaCondos.set(c.id, c.nome));
        }
      } catch (errC) {
        console.warn('Aviso ao carregar condominios:', errC);
      }

      let entQuery = supabase
        .from('entregadores')
        .select('*')
        .order('nome');
      if (!isGlobal) {
        entQuery = entQuery.eq('condominio_id', idCondominioAtivo);
      }
      const { data: entData } = await entQuery;
      setEntregadores(entData || []);

      let lotesQuery = supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa, documento)')
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });
      if (!isGlobal) {
        lotesQuery = lotesQuery.eq('condominio_id', idCondominioAtivo);
      }
      let { data: lotesData, error: lotesErr } = await lotesQuery;
      if (lotesErr || !lotesData) {
        console.warn('Fallback simples para lotes_re:', lotesErr?.message);
        let fbLotesQuery = supabase
          .from('lotes_re')
          .select('*')
          .in('status', ['aguardando_triagem', 'em_triagem'])
          .order('created_at', { ascending: false });
        if (!isGlobal) {
          fbLotesQuery = fbLotesQuery.eq('condominio_id', idCondominioAtivo);
        }
        const { data: fbLData } = await fbLotesQuery;
        lotesData = fbLData || [];
      }

      const lotesFormatados = (lotesData || []).map((l: any) => ({
        ...l,
        condominios: { nome: mapaCondos.get(l.condominio_id) || '' }
      }));
      setLotesPendentes(lotesFormatados);

      let moradQuery = supabase
        .from('moradores')
        .select('*')
        .order('nome');
      if (!isGlobal) {
        moradQuery = moradQuery.eq('condominio_id', idCondominioAtivo);
      }
      const { data: moradData } = await moradQuery;
      setMoradores(moradData || []);

      let retidosQuery = supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone)')
        .eq('status', 'retido')
        .order('created_at', { ascending: false });
      if (!isGlobal) {
        retidosQuery = retidosQuery.eq('condominio_id', idCondominioAtivo);
      }
      let { data: retidosData, error: retidosErr } = await retidosQuery;
      if (retidosErr || !retidosData) {
        console.warn('Fallback simples para encomendas_itens retidos:', retidosErr?.message);
        let fbRetidosQuery = supabase
          .from('encomendas_itens')
          .select('*')
          .eq('status', 'retido')
          .order('created_at', { ascending: false });
        if (!isGlobal) {
          fbRetidosQuery = fbRetidosQuery.eq('condominio_id', idCondominioAtivo);
        }
        const { data: fbRetData } = await fbRetidosQuery;
        retidosData = fbRetData || [];
      }

      const retidosFormatados = (retidosData || []).map((r: any) => ({
        ...r,
        condominios: { nome: mapaCondos.get(r.condominio_id) || '' }
      }));
      setTodosItensRetidos(retidosFormatados);

      let lotesHojeQuery = supabase
        .from('lotes_re')
        .select('id, qtd_declarada, qtd_triada')
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());
      if (!isGlobal) {
        lotesHojeQuery = lotesHojeQuery.eq('condominio_id', idCondominioAtivo);
      }
      const { data: lotesHojeData } = await lotesHojeQuery;

      let triadosHojeQuery = supabase
        .from('encomendas_itens')
        .select('id')
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());
      if (!isGlobal) {
        triadosHojeQuery = triadosHojeQuery.eq('condominio_id', idCondominioAtivo);
      }
      const { data: triadosHojeData } = await triadosHojeQuery;

      const totalLotesHoje = lotesHojeData?.length || 0;
      const totalTriadasHoje = triadosHojeData?.length || 0;
      const totalAguardando = (lotesData || []).reduce((acc: number, l: any) => acc + (l.qtd_declarada - l.qtd_triada), 0);

      const mapaBlocos: Record<string, number> = {};
      (retidosData || []).forEach((item: any) => {
        const blk = item.bloco ? `Bloco ${item.bloco}` : 'Geral / Sem Bloco';
        mapaBlocos[blk] = (mapaBlocos[blk] || 0) + 1;
      });

      setStatsDia({
        lotesHoje: totalLotesHoje,
        triadasHoje: totalTriadasHoje,
        aguardandoTriagem: totalAguardando,
        retidosPorBloco: mapaBlocos
      });

    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const carregarDossie = async () => {
    setLoadingDossie(true);
    const idCondo = isGlobal ? '' : idCondominioAtivo;
    try {
      // 1. Tenta carregar os itens de encomendas com moradores
      let query = supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone, bloco, unidade)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (idCondo) {
        query = query.eq('condominio_id', idCondo);
      }

      let { data: itens, error } = await query;

      // Fallback seguro se o join com moradores falhar por qualquer motivo
      if (error || !itens) {
        console.warn('Fallback simples para encomendas_itens no dossiê:', error?.message);
        let fallbackQuery = supabase
          .from('encomendas_itens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300);
        if (idCondo) fallbackQuery = fallbackQuery.eq('condominio_id', idCondo);
        const fbRes = await fallbackQuery;
        itens = fbRes.data || [];
      }

      if (itens && itens.length > 0) {
        // Enriquecer itens com dados de Lote RE e entregadores de forma segura
        const loteIds = Array.from(new Set(itens.map((it: any) => it.lote_re_id).filter(Boolean)));
        if (loteIds.length > 0) {
          try {
            const { data: lotes } = await supabase
              .from('lotes_re')
              .select('id, codigo_re, created_at, entregador_id')
              .in('id', loteIds);

            if (lotes && lotes.length > 0) {
              const mapaLotes = new Map(lotes.map((l: any) => [l.id, l]));
              itens = itens.map((it: any) => ({
                ...it,
                lotes_re: it.lote_re_id ? mapaLotes.get(it.lote_re_id) : null
              }));
            }
          } catch (errLote) {
            console.warn('Aviso ao consultar lotes_re:', errLote);
          }
        }
        setItensDossie(itens);
      } else {
        setItensDossie([]);
      }
    } catch (e) {
      console.warn('Erro ao carregar dossiê:', e);
      setItensDossie([]);
    } finally {
      setLoadingDossie(false);
    }
  };

  useEffect(() => {
    if (etapa === '4') {
      carregarDossie();
    }
  }, [etapa]);

  const tocarAlertaSonoro = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.log('Audio indisponível', e);
    }
  };

  const tocarBipSucesso = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio indisponível', e);
    }
  };

  const uploadFotoStorage = async (file: File | null, pastaDestino: string, setUrlCallback: (url: string) => void) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${pastaDestino}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setUrlCallback(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto capturada e salva com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const abrirLeitorCamera = async (destino: 'triagem' | 'baixa' = 'triagem') => {
    setDestinoLeitor(destino);
    setModalLeitor(true);
    setErroCamera('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setErroCamera('Não foi possível acessar a câmera: ' + err.message);
    }
  };

  const fecharLeitorCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setModalLeitor(false);
  };

  useEffect(() => {
    let intervalId: any = null;
    if (modalLeitor) {
      intervalId = setInterval(async () => {
        if ('BarcodeDetector' in window && videoRef.current && videoRef.current.readyState === 4) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf']
            });
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const valorLido = barcodes[0].rawValue;
              tocarBipSucesso();
              fecharLeitorCamera();

              if (destinoLeitor === 'triagem') {
                setCodigoBarras(valorLido);
                setMensagem({ tipo: 'sucesso', texto: `Código de rastreio lido: ${valorLido}` });
              } else {
                setBuscaBaixaGeral(valorLido);
                setMensagem({ tipo: 'sucesso', texto: `Código buscado na saída: ${valorLido}` });
              }
            }
          } catch (e) {
            console.error('Erro ao ler código:', e);
          }
        }
      }, 400);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [modalLeitor, destinoLeitor]);

  const entregadoresFiltrados = entregadores.filter(ent => {
    const termo = buscaEntregador.toLowerCase();
    const nome = ent.nome?.toLowerCase() || '';
    const empresa = ent.empresa?.toLowerCase() || '';
    const doc = ent.documento?.toLowerCase() || '';
    return nome.includes(termo) || empresa.includes(termo) || doc.includes(termo);
  });

  const cadastrarEntregadorRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEntNome.trim()) return;
    setLoading(true);
    try {
      const targetCondo = (isGlobal ? condominioNovoLoteId : idCondominioAtivo) || (listaCondominios[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851');
      const { data, error } = await supabase
        .from('entregadores')
        .insert([{
          condominio_id: targetCondo,
          nome: novoEntNome.trim(),
          documento: novoEntDoc.trim(),
          empresa: novoEntEmpresa.trim()
        }])
        .select()
        .single();

      if (error) throw error;
      setEntregadores([...entregadores, data]);
      setEntregadorSelecionado(data);
      setModalNovoEntregador(false);
      setNovoEntNome(''); setNovoEntDoc(''); setNovoEntEmpresa('');
      setMensagem({ tipo: 'sucesso', texto: 'Entregador cadastrado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const criarLoteRE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregadorSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um entregador da lista.' });
      return;
    }
    setLoading(true);

    try {
      const targetCondo = (isGlobal ? condominioNovoLoteId : idCondominioAtivo) || (listaCondominios[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851');

      const hoje = new Date();
      const inicioDia = new Date(hoje);
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date(hoje);
      fimDia.setHours(23, 59, 59, 999);

      const { count, error: countError } = await supabase
        .from('lotes_re')
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', targetCondo)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      if (countError) throw countError;

      const sequenciaHoje = (count || 0) + 1;
      const seqFormatada = String(sequenciaHoje).padStart(3, '0');

      const diaStr = String(hoje.getDate()).padStart(2, '0');
      const mesStr = String(hoje.getMonth() + 1).padStart(2, '0');
      const anoStr = String(hoje.getFullYear()).slice(-2);
      
      const codigoRE = `RE${diaStr}/${mesStr}/${anoStr}N${seqFormatada}`;

      const { data, error } = await supabase
        .from('lotes_re')
        .insert([{
          codigo_re: codigoRE,
          condominio_id: targetCondo,
          entregador_id: entregadorSelecionado.id,
          qtd_declarada: parseInt(String(qtdDeclarada)),
          qtd_triada: 0,
          status: 'aguardando_triagem',
          operador_id: usuarioLogado?.login || usuarioLogado?.id || 'Operador'
        }])
        .select('*, entregadores(nome, empresa, documento)')
        .single();

      if (error) throw error;

      const textoWhats = `📦 *NOVO LOTE DE ENCOMENDAS RECEBIDO (RE)*\nLote: ${data.codigo_re}\nTransportadora: ${data.entregadores?.empresa || 'N/A'}\nEntregador: ${data.entregadores?.nome} (Doc: ${data.entregadores?.documento || 'N/A'})\nTotal de Volumes Declarados: ${data.qtd_declarada} pacotes\nOperador: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setLoteCriadoWhats({ codigo: data.codigo_re, link: `https://wa.me/?text=${encodeURIComponent(textoWhats)}` });
      setEntregadorSelecionado(null);
      setBuscaEntregador('');
      setQtdDeclarada(1);
      setLoteAtivo(data);
      if (data?.condominio_id) {
        carregarLocais(data.condominio_id);
      }
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: `Lote ${codigoRE} gerado com sucesso!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const buscarMoradoresEChecarAgrupamento = async (unid: string, bloc: string) => {
    setUnidadeTriagem(unid);
    setBlocoTriagem(bloc);

    if (!unid.trim()) {
      setMoradoresDaUnidade([]);
      setMoradorSelecionado(null);
      setAlertaAgrupamento(null);
      return;
    }

    const moradoresEncontrados = moradores.filter(m => {
      const uTrim = (m.unidade || '').toString().trim().toLowerCase();
      const inTrim = unid.trim().toLowerCase();
      const uMatch = uTrim === inTrim || (!isNaN(parseInt(uTrim, 10)) && !isNaN(parseInt(inTrim, 10)) && parseInt(uTrim, 10) === parseInt(inTrim, 10));
      const bMatch = bloc.trim() ? m.bloco?.toString().toLowerCase() === bloc.trim().toLowerCase() : true;
      return uMatch && bMatch;
    });
    setMoradoresDaUnidade(moradoresEncontrados);

    if (moradoresEncontrados.length > 0) {
      setMoradorSelecionado(moradoresEncontrados[0]);
    } else {
      setMoradorSelecionado(null);
    }

    const targetCondo = loteAtivo?.condominio_id || idCondominioAtivo;
    let query = supabase
      .from('encomendas_itens')
      .select('*')
      .eq('unidade', unid.trim())
      .eq('status', 'retido');

    if (targetCondo) {
      query = query.eq('condominio_id', targetCondo);
    }

    if (bloc.trim()) {
      query = query.eq('bloco', bloc.trim());
    }

    const { data: itensRetidos } = await query;

    if (itensRetidos && itensRetidos.length > 0) {
      tocarAlertaSonoro();
      // Extrai os locais físicos onde os itens desta unidade já estão guardados
      const locaisExistentes = Array.from(
        new Set(
          itensRetidos
            .map((i: any) => i.local_armazenamento)
            .filter((loc: any) => typeof loc === 'string' && loc.trim().length > 0)
        )
      );

      setAlertaAgrupamento({
        qtd: itensRetidos.length,
        unidade: unid,
        bloco: bloc,
        locais: locaisExistentes.length > 0 ? locaisExistentes : ['Bancada Principal'],
        itens: itensRetidos
      });
    } else {
      setAlertaAgrupamento(null);
    }
  };

  const salvarItemTriagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteAtivo || !unidadeTriagem.trim() || !fotoEtiquetaUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o lote, informe a unidade e tire a foto da etiqueta.' });
      return;
    }
    setLoading(true);

    try {
      const localArmazenar = localArmazenamentoTriagem || 'Bancada Principal';
      const condoAlvo = loteAtivo.condominio_id || idCondominioAtivo || 'aa205bfb-55cc-42fe-ab25-9c16ac943851';

      let payloadItem: any = {
        lote_re_id: loteAtivo.id,
        condominio_id: condoAlvo,
        bloco: blocoTriagem.trim(),
        unidade: unidadeTriagem.trim(),
        morador_id: moradorSelecionado?.id || null,
        codigo_barras: codigoBarras.trim(),
        foto_etiqueta_url: fotoEtiquetaUrl.trim(),
        observacoes: observacoes.trim(),
        local_armazenamento: localArmazenar,
        status: 'retido'
      };

      let { data: itemInserido, error: itemErr } = await supabase
        .from('encomendas_itens')
        .insert([payloadItem])
        .select()
        .maybeSingle();

      // Fallback seguro caso a coluna local_armazenamento ainda não exista no Supabase
      if (itemErr && (itemErr.message?.includes('local_armazenamento') || (itemErr as any).code === '42703' || itemErr.message?.includes('schema cache'))) {
        console.warn('[INFPORT] Coluna local_armazenamento não encontrada no Supabase. Salvando pacote sem a coluna...');
        delete payloadItem.local_armazenamento;
        const retry = await supabase.from('encomendas_itens').insert([payloadItem]).select().maybeSingle();
        itemErr = retry.error;
        itemInserido = retry.data;
        if (itemInserido) {
          localStorage.setItem(`infport_item_local_${itemInserido.id}`, localArmazenar);
        }
      }

      if (itemErr) throw itemErr;

      const novaQtdTriada = (loteAtivo.qtd_triada || 0) + 1;
      const novoStatusLote = novaQtdTriada >= loteAtivo.qtd_declarada ? 'concluido' : 'em_triagem';

      await supabase
        .from('lotes_re')
        .update({ qtd_triada: novaQtdTriada, status: novoStatusLote })
        .eq('id', loteAtivo.id);

      setLoteAtivo((prev: any) => prev ? ({ ...prev, qtd_triada: novaQtdTriada, status: novoStatusLote }) : null);

      const telMorador = moradorSelecionado?.telefone?.replace(/\D/g, '') || '';
      const nomeDestinatario = moradorSelecionado ? moradorSelecionado.nome : 'Morador';

      // Registra evento no Histórico Absoluto
      registrarAtividade({
        modulo: 'Encomendas',
        acao: 'CRIAR',
        descricao: `Recebeu e triou encomenda para ${nomeDestinatario} (Ap. ${unidadeTriagem}${blocoTriagem ? ' Bloco ' + blocoTriagem : ''}) - Lote ${loteAtivo.codigo_re}. Local de guarda: ${localArmazenar}.`,
        detalhes: {
          loteId: loteAtivo.id,
          codigoRe: loteAtivo.codigo_re,
          unidade: unidadeTriagem,
          bloco: blocoTriagem,
          destinatario: nomeDestinatario,
          localGuarda: localArmazenar,
          codigoRastreio: codigoBarras || 'N/A'
        },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_id: usuarioLogado?.id,
        operador_login: usuarioLogado?.login,
        condominio_id: condoAlvo
      });

      const textoWhatsMorador = `Olá, ${nomeDestinatario} (Ap. ${unidadeTriagem}${blocoTriagem ? ' - Bloco ' + blocoTriagem : ''})! 📦\n\nSua encomenda acabou de chegar na Portaria.\n• Destinatário: ${nomeDestinatario}\n• Código/Lote: ${loteAtivo.codigo_re}\n• Cód. Rastreio: ${codigoBarras || 'N/A'}\n• Local Físico de Guarda: ${localArmazenar}\n• Observação: ${observacoes || 'Nenhuma'}\n• Foto do Pacote: ${fotoEtiquetaUrl}\n\nPor favor, retire na portaria informando seu apartamento!`;

      setItemTriadoWhats({
        destinatario: nomeDestinatario,
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoWhatsMorador)}` : `https://wa.me/?text=${encodeURIComponent(textoWhatsMorador)}`
      });

      setUnidadeTriagem(''); setBlocoTriagem(''); setMoradorSelecionado(null); setMoradoresDaUnidade([]);
      setCodigoBarras(''); setFotoEtiquetaUrl(''); setObservacoes('');
      setAlertaAgrupamento(null);
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: `Pacote triado com sucesso e alocado em: ${localArmazenar}!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Permite alterar e mover o local físico de guarda de encomendas a qualquer momento
   * Suporta alteração individual, da unidade inteira ou em lote de itens selecionados.
   */
  const executarMudancaLocal = async () => {
    if (!novoLocalSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o novo local físico de armazenamento.' });
      return;
    }
    setLoading(true);

    try {
      let idsParaAtualizar: string[] = [];

      if (moverEmLoteSelecionados) {
        idsParaAtualizar = [...itensSelecionadosIds];
      } else if (itemParaMover) {
        if (moverTodosDaUnidade) {
          // Pega todos os itens retidos da mesma unidade/bloco para agrupar
          const itensMesmaUnidade = todosItensRetidos.filter(
            i => i.unidade === itemParaMover.unidade && (itemParaMover.bloco ? i.bloco === itemParaMover.bloco : true)
          );
          idsParaAtualizar = itensMesmaUnidade.map(i => i.id);
        } else {
          idsParaAtualizar = [itemParaMover.id];
        }
      }

      if (idsParaAtualizar.length === 0) {
        setMensagem({ tipo: 'erro', texto: 'Nenhum pacote selecionado para mover.' });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('encomendas_itens')
        .update({ local_armazenamento: novoLocalSelecionado })
        .in('id', idsParaAtualizar);

      if (error && (error.message?.includes('local_armazenamento') || (error as any).code === '42703' || error.message?.includes('schema cache'))) {
        console.warn('[INFPORT] Coluna local_armazenamento ausente no Supabase. Atualizando localmente no navegador...');
        idsParaAtualizar.forEach(id => {
          localStorage.setItem(`infport_item_local_${id}`, novoLocalSelecionado);
        });
      } else if (error) {
        throw error;
      }

      // Atualiza o estado da lista em tempo real na tela
      setTodosItensRetidos(prev => prev.map(item => {
        if (idsParaAtualizar.includes(item.id)) {
          return { ...item, local_armazenamento: novoLocalSelecionado };
        }
        return item;
      }));

      tocarBipSucesso();
      setModalMoverLocal(false);
      setItemParaMover(null);
      setMoverEmLoteSelecionados(false);
      setMensagem({
        tipo: 'sucesso',
        texto: `✅ ${idsParaAtualizar.length} encomenda(s) movida(s) para "${novoLocalSelecionado}" com sucesso!`
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao alterar local: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const itensRetidosFiltrados = todosItensRetidos.filter(item => {
    if (abaBlocoSelecionada !== 'TODOS') {
      const blocoItem = item.bloco ? `Bloco ${item.bloco}` : 'Geral / Sem Bloco';
      if (blocoItem !== abaBlocoSelecionada) return false;
    }

    if (!buscaBaixaGeral.trim()) return true;

    const termo = buscaBaixaGeral.toLowerCase().trim();
    const termoSemEspaco = termo.replace(/\s+/g, '');

    const unid = item.unidade?.toString().toLowerCase() || '';
    const bloc = item.bloco?.toString().toLowerCase() || '';
    const cod = item.codigo_barras?.toString().toLowerCase() || '';
    const moradorNome = item.moradores?.nome?.toLowerCase() || '';

    const comboUnidBloco = `${unid}${bloc}`;
    const comboUnidBlocoEspaco = `${unid} ${bloc}`;
    const comboBlocoUnid = `${bloc}${unid}`;

    return (
      unid.includes(termo) ||
      bloc.includes(termo) ||
      cod.includes(termo) ||
      moradorNome.includes(termo) ||
      comboUnidBloco.includes(termoSemEspaco) ||
      comboUnidBlocoEspaco.includes(termo) ||
      comboBlocoUnid.includes(termoSemEspaco)
    );
  });

  // Resumo visual de encomendas pendentes agrupadas por unidade (com badges/contadores)
  const resumoPendenciasPorUnidade = useMemo(() => {
    const mapa: Record<string, {
      chave: string;
      unidade: string;
      bloco: string;
      label: string;
      qtd: number;
      moradoresNomes: string[];
      itensIds: string[];
    }> = {};

    // Considera os itens retidos conforme filtro de bloco ou geral
    const baseItens = todosItensRetidos.filter((item: any) => {
      if (abaBlocoSelecionada !== 'TODOS') {
        const blocoItem = item.bloco ? `Bloco ${item.bloco}` : 'Geral / Sem Bloco';
        if (blocoItem !== abaBlocoSelecionada) return false;
      }
      return true;
    });

    baseItens.forEach((item: any) => {
      const u = String(item.unidade || 'Sem Unidade').trim();
      const b = String(item.bloco || '').trim();
      const chave = `${u}__${b}`;
      const label = `Ap. ${u}${b ? ` - Bloco ${b}` : ''}`;

      if (!mapa[chave]) {
        mapa[chave] = {
          chave,
          unidade: u,
          bloco: b,
          label,
          qtd: 0,
          moradoresNomes: [],
          itensIds: []
        };
      }

      mapa[chave].qtd += 1;
      mapa[chave].itensIds.push(item.id);
      const nomeMorador = item.moradores?.nome;
      if (nomeMorador && !mapa[chave].moradoresNomes.includes(nomeMorador)) {
        mapa[chave].moradoresNomes.push(nomeMorador);
      }
    });

    // Ordena priorizando unidades com maior volume de pacotes retidos
    return Object.values(mapa).sort((a, b) => {
      if (b.qtd !== a.qtd) return b.qtd - a.qtd;
      return a.unidade.localeCompare(b.unidade, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [todosItensRetidos, abaBlocoSelecionada]);

  // Lista de itens candidatos ao checklist (preserva itens mesmo se desmarcados temporariamente no checklist)
  const idsParaChecklist = itensCandidatosEntrega.length > 0 
    ? itensCandidatosEntrega 
    : itensSelecionadosIds;

  const itensCandidatosObjetos = todosItensRetidos.filter(i => idsParaChecklist.includes(i.id));
  const itensSelecionadosObjetos = todosItensRetidos.filter(i => itensSelecionadosIds.includes(i.id));

  const moradoresDasUnidadesBaixa = moradores.filter(m => 
    itensSelecionadosObjetos.some(item => 
      String(item.unidade).toLowerCase() === String(m.unidade).toLowerCase() &&
      (!item.bloco || String(item.bloco).toLowerCase() === String(m.bloco || '').toLowerCase())
    )
  );

  const toggleItemSelecao = (id: string) => {
    if (itensSelecionadosIds.includes(id)) {
      const novos = itensSelecionadosIds.filter(item => item !== id);
      setItensSelecionadosIds(novos);
      setItensCandidatosEntrega(novos);
    } else {
      const novos = [...itensSelecionadosIds, id];
      setItensSelecionadosIds(novos);
      setItensCandidatosEntrega(novos);
    }
  };

  const abrirModalBaixa = () => {
    setItensCandidatosEntrega([...itensSelecionadosIds]);
    setModalBaixaAberta(true);
  };

  const alternarItemChecklist = (id: string) => {
    if (itensSelecionadosIds.includes(id)) {
      setItensSelecionadosIds(prev => prev.filter(item => item !== id));
    } else {
      setItensSelecionadosIds(prev => [...prev, id]);
    }
  };

  const removerItemDoChecklist = (id: string) => {
    setItensCandidatosEntrega(prev => prev.filter(item => item !== id));
    setItensSelecionadosIds(prev => prev.filter(item => item !== id));
  };

  const selecionarTodosChecklist = () => {
    const todosIds = itensCandidatosObjetos.map((i: any) => i.id);
    setItensSelecionadosIds(todosIds);
  };

  const desmarcarTodosChecklist = () => {
    setItensSelecionadosIds([]);
  };

  const renderChecklistConferencia = (isModal: boolean = false) => {
    if (itensCandidatosObjetos.length === 0) return null;

    const totalCandidatos = itensCandidatosObjetos.length;
    const totalConferidos = itensSelecionadosIds.length;
    const todosMarcados = totalConferidos === totalCandidatos && totalCandidatos > 0;

    return (
      <div className="border border-slate-200 rounded-xl bg-slate-50/90 p-2.5 sm:p-3 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h5 className="text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-tight">
                Checklist de Conferência da Entrega
              </h5>
              <p className="text-[10px] text-slate-500">
                Confira os volumes físicos com o morador para evitar erro de baixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={selecionarTodosChecklist}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition cursor-pointer shadow-2xs"
            >
              Marcar Todos
            </button>
            <button
              type="button"
              onClick={desmarcarTodosChecklist}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium transition cursor-pointer shadow-2xs"
            >
              Desmarcar
            </button>
          </div>
        </div>

        {/* Banner de status da conferência */}
        <div className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-between gap-1.5 transition ${
          totalConferidos === 0
            ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
            : todosMarcados
            ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
            : 'bg-blue-100/90 text-blue-900 border border-blue-300'
        }`}>
          <span className="flex items-center gap-1.5">
            {totalConferidos === 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : todosMarcados ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            {totalConferidos === 0 ? (
              'Atenção: Marque ao menos um pacote no checklist para liberar a entrega!'
            ) : todosMarcados ? (
              `Pronto: Todos os ${totalCandidatos} pacote(s) conferidos para baixa!`
            ) : (
              `${totalConferidos} de ${totalCandidatos} pacote(s) marcados (${totalCandidatos - totalConferidos} ficarão retidos na portaria)`
            )}
          </span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-xs text-slate-800 shrink-0">
            {totalConferidos}/{totalCandidatos}
          </span>
        </div>

        {/* Lista de itens do checklist */}
        <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${isModal ? 'max-h-56 sm:max-h-64' : 'max-h-60'}`}>
          {itensCandidatosObjetos.map((item: any, idx: number) => {
            const isConferido = itensSelecionadosIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => alternarItemChecklist(item.id)}
                className={`p-2 rounded-xl border text-left cursor-pointer transition flex items-start gap-2.5 relative ${
                  isConferido
                    ? 'bg-white border-emerald-400 ring-1 ring-emerald-500/25 shadow-xs'
                    : 'bg-slate-100/80 border-dashed border-slate-300 opacity-60 hover:opacity-90'
                }`}
              >
                {/* Checkbox visual interativo */}
                <div className="mt-0.5 shrink-0">
                  {isConferido ? (
                    <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md border-2 border-slate-400 bg-white flex items-center justify-center">
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    </div>
                  )}
                </div>

                {/* Conteúdo completo e legível */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        #{idx + 1} Ap. {item.unidade}{item.bloco ? ` - Bloco ${item.bloco}` : ''}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        isConferido 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}>
                        {isConferido ? '✓ Entregar' : '○ Não Entregar'}
                      </span>
                    </div>

                    <span className="text-[9px] font-mono text-slate-400">
                      Chegada: {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 truncate">
                    {item.moradores?.nome || 'Morador não vinculado'}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    {/* Local Físico Destacado */}
                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Boxes className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{item.local_armazenamento || 'Bancada Principal'}</span>
                    </span>

                    {/* Código de Rastreio */}
                    {item.codigo_barras && (
                      <span className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[140px]" title={item.codigo_barras}>
                        📦 {item.codigo_barras}
                      </span>
                    )}

                    {/* Foto da Etiqueta */}
                    {item.foto_etiqueta_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalFotoAmpliada(item.foto_etiqueta_url);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                      >
                        <Camera className="w-2.5 h-2.5" /> Ver Foto
                      </button>
                    )}
                  </div>

                  {item.observacoes && (
                    <p className="text-[10px] text-slate-600 italic bg-white p-1 rounded border border-slate-100">
                      Obs: {item.observacoes}
                    </p>
                  )}
                </div>

                {/* Botão de excluir este item do checklist */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removerItemDoChecklist(item.id);
                  }}
                  className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition cursor-pointer shrink-0"
                  title="Remover este pacote da entrega atual"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const efetivarBaixaSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Selecione e marque os pacotes no checklist, informe o nome do retirante e tire a foto da entrega.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('encomendas_itens')
        .update({
          status: 'entregue',
          retirado_por: nomeRetirante.trim(),
          foto_retirada_url: fotoRetiranteUrl.trim(),
          data_retirada: new Date().toISOString(),
          operador_baixa_id: usuarioLogado?.login || usuarioLogado?.id || 'Operador'
        })
        .in('id', itensSelecionadosIds);

      if (error) throw error;

      const primeiroItem = todosItensRetidos.find(i => i.id === itensSelecionadosIds[0]);

      // Registra baixa / entrega no Histórico Absoluto
      registrarAtividade({
        modulo: 'Encomendas',
        acao: 'BAIXA',
        descricao: `Entregou ${itensSelecionadosIds.length} encomenda(s) para o retirante: ${nomeRetirante.trim()}.`,
        detalhes: {
          totalItens: itensSelecionadosIds.length,
          itensIds: itensSelecionadosIds,
          retiradoPor: nomeRetirante.trim()
        },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_id: usuarioLogado?.id,
        operador_login: usuarioLogado?.login,
        condominio_id: primeiroItem?.condominio_id || idCondominioAtivo
      });

      const telMorador = primeiroItem?.moradores?.telefone?.replace(/\D/g, '') || '';
      
      const volumesDetalhados = itensSelecionadosObjetos.map((it: any, idx: number) => {
        const cod = it.codigo_barras ? ` (Cód: ${it.codigo_barras})` : '';
        const loc = it.local_armazenamento ? ` [${it.local_armazenamento}]` : '';
        return `  ${idx + 1}. Ap. ${it.unidade}${it.bloco ? ' Bloco ' + it.bloco : ''}${cod}${loc}`;
      }).join('\n');

      const textoCruzado = `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*\nUnidade: Ap. ${primeiroItem?.unidade || ''}${primeiroItem?.bloco ? ' - Bloco ' + primeiroItem.bloco : ''}\n\nInformamos que o(s) seguinte(s) pacote(s) foram RETIRADOS da portaria:\n• Volumes Entregues (${itensSelecionadosIds.length}):\n${volumesDetalhados}\n• Quem Retirou: ${nomeRetirante}\n• Comprovante da Entrega: ${fotoRetiranteUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setBaixaConcluidaWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoCruzado)}` : `https://wa.me/?text=${encodeURIComponent(textoCruzado)}`
      });

      setItensSelecionadosIds([]);
      setItensCandidatosEntrega([]);
      setModalBaixaAberta(false);
      setNomeRetirante(''); setFotoRetiranteUrl('');
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída realizada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* PAINEL DE METRICAS DO DIA (ULTRA-COMPACTO & DIRETO) */}
      <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
        <div className="py-1 px-1.5 rounded-lg bg-blue-50/60 flex items-center justify-center gap-1.5 text-center">
          <Truck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          <div className="leading-tight">
            <span className="text-[9px] font-bold uppercase text-slate-500 block truncate">Lotes RE</span>
            <strong className="text-xs sm:text-sm font-black text-slate-900">{statsDia.lotesHoje}</strong>
          </div>
        </div>

        <div className="py-1 px-1.5 rounded-lg bg-emerald-50/60 flex items-center justify-center gap-1.5 text-center">
          <Package className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <div className="leading-tight">
            <span className="text-[9px] font-bold uppercase text-slate-500 block truncate">Triadas</span>
            <strong className="text-xs sm:text-sm font-black text-emerald-700">{statsDia.triadasHoje}</strong>
          </div>
        </div>

        <div className="py-1 px-1.5 rounded-lg bg-amber-50/60 flex items-center justify-center gap-1.5 text-center">
          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <div className="leading-tight">
            <span className="text-[9px] font-bold uppercase text-slate-500 block truncate">Aguardando</span>
            <strong className="text-xs sm:text-sm font-black text-amber-700">{statsDia.aguardandoTriagem}</strong>
          </div>
        </div>
      </div>

      {/* DISPLAY DE PACOTES RETIDOS POR BLOCO (COMPACTO) */}
      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Pacotes Retidos por Bloco:
          </h4>
          <span className="text-[11px] font-mono font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
            Total: {todosItensRetidos.length} vol.
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {Object.keys(statsDia.retidosPorBloco).length > 0 ? (
            Object.entries(statsDia.retidosPorBloco).map(([blocoNome, qtd]) => (
              <div 
                key={blocoNome} 
                onClick={() => { setEtapa('3'); setAbaBlocoSelecionada(blocoNome); }}
                className="bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700 px-2 py-1 rounded-md flex items-center gap-1.5 text-xs transition"
              >
                <span className="font-bold text-slate-200 text-[11px]">{blocoNome}:</span>
                <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
                  {qtd} {qtd === 1 ? 'pct' : 'pcts'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-400 italic">Nenhuma encomenda retida no momento.</p>
          )}
        </div>
      </div>

      {/* Navegação Sequencial de 4 Etapas & Dossiê */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <button
          onClick={() => setEtapa('1')}
          className={`p-2 sm:p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '1' ? 'border-slate-900 bg-slate-100 font-black' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">1ª Etapa</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-700" /> <span className="hidden sm:inline">Recebimento</span> (RE)</strong>
        </button>

        <button
          onClick={() => setEtapa('2')}
          className={`p-2 sm:p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '2' ? 'border-slate-900 bg-slate-100 font-black' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">2ª Etapa</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5 text-slate-700" /> Triagem</strong>
        </button>

        <button
          onClick={() => setEtapa('3')}
          className={`p-2 sm:p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '3' ? 'border-slate-900 bg-slate-100 font-black' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">3ª Etapa</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-1"><UserCheck className="w-3.5 h-3.5 text-slate-700" /> Saída / Baixa</strong>
        </button>

        <button
          onClick={() => { setEtapa('4'); carregarDossie(); }}
          className={`p-2 sm:p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '4' ? 'border-purple-600 bg-purple-50/70 font-black text-purple-950' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-purple-600 block flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-purple-600" /> Auditoria & Provas
          </span>
          <strong className="text-xs sm:text-sm text-purple-950 flex items-center justify-center gap-1">
            <FileText className="w-3.5 h-3.5 text-purple-700" /> Dossiê Completo
          </strong>
        </button>
      </div>

      {/* Mensagens Globais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* 1ª ETAPA — RECEBIMENTO DO LOTE (RE) */}
      {etapa === '1' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-slate-800" /> Recebimento de Entrega (RE)
            </h3>
            <button
              onClick={() => setModalNovoEntregador(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Entregador
            </button>
          </div>

          <form onSubmit={criarLoteRE} className="space-y-3 max-w-2xl">
            {isGlobal && listaCondominios.length > 0 && (
              <div className="space-y-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                  🏢 Condomínio do Lote (Destino) *
                </label>
                <select
                  value={condominioNovoLoteId || (listaCondominios[0]?.id || '')}
                  onChange={(e) => setCondominioNovoLoteId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {listaCondominios.map((c: any) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Buscar / Selecionar Entregador *</label>
              
              {!entregadorSelecionado ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={buscaEntregador}
                      onChange={(e) => setBuscaEntregador(e.target.value)}
                      placeholder="Digite o nome, empresa ou documento..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-2xs divide-y divide-slate-100">
                    {entregadoresFiltrados.length > 0 ? (
                      entregadoresFiltrados.map((ent) => (
                        <div
                          key={ent.id}
                          onClick={() => {
                            setEntregadorSelecionado(ent);
                            setBuscaEntregador('');
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{ent.nome}</p>
                            <p className="text-[10px] text-slate-500">
                              {ent.empresa ? `Empresa: ${ent.empresa}` : 'Avulso'} | Doc: {ent.documento || 'Sem doc'}
                            </p>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Selecionar
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 italic text-center">
                        Nenhum entregador encontrado com esse termo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-300 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">Entregador Selecionado</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{entregadorSelecionado.nome}</h4>
                    <p className="text-[11px] text-slate-500">
                      Empresa: {entregadorSelecionado.empresa || 'Avulso'} | Doc: {entregadorSelecionado.documento || 'Sem doc'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setEntregadorSelecionado(null)} className="text-red-500 hover:text-red-700 p-1.5 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Quantidade de Volumes (Declarada) *</label>
              <input 
                type="number" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                min="1" 
                value={qtdDeclarada} 
                onChange={(e) => setQtdDeclarada(e.target.value)} 
                required 
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition" 
              />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs disabled:opacity-50 cursor-pointer">
              {loading ? 'Gerando Lote...' : <><CheckCircle2 className="w-4 h-4" /> Gerar Lote de Recebimento</>}
            </button>
          </form>

          {loteCriadoWhats && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-800">Lote {loteCriadoWhats.codigo} criado!</p>
                <p className="text-xs text-emerald-700">Deseja enviar notificação no grupo de entregas?</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <a href={loteCriadoWhats.link} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button onClick={() => setLoteCriadoWhats(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2ª ETAPA — TRIAGEM DE PACOTES */}
      {etapa === '2' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-800" /> Triagem de Pacotes do Lote
            </h3>
            <p className="text-[11px] text-slate-500">Vincule os pacotes recebidos à unidade para notificar o morador.</p>
          </div>

          <div className="space-y-3 max-w-2xl">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">1. Selecione o Lote Pendente *</label>
              <select
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                value={loteAtivo ? loteAtivo.id : ''}
                onChange={(e) => {
                  const loteId = e.target.value;
                  const loteFound = lotesPendentes.find(l => l.id === loteId) || null;
                  setLoteAtivo(loteFound);
                  if (loteFound?.condominio_id) {
                    carregarLocais(loteFound.condominio_id);
                    supabase
                      .from('moradores')
                      .select('*')
                      .eq('condominio_id', loteFound.condominio_id)
                      .order('nome')
                      .then(({ data }) => {
                        if (data && data.length > 0) setMoradores(data);
                      });
                  }
                }}
              >
                <option value="">Selecione um lote aberto...</option>
                {lotesPendentes.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.codigo_re} - {l.entregadores?.nome || 'Entregador'} ({l.qtd_triada}/{l.qtd_declarada} pacotes){l.condominios?.nome ? ` • [${l.condominios.nome}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {loteAtivo && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
                <span>Lote Ativo: <strong className="text-emerald-950 font-extrabold">{loteAtivo.codigo_re}</strong></span>
                <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                  🏢 {loteAtivo.condominios?.nome || 'Condomínio'}
                </span>
              </div>
            )}

            {loteAtivo && (
              <form onSubmit={salvarItemTriagem} className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Bloco</label>
                    <select
                      value={blocoTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    >
                      <option value="">Nenhum/Único</option>
                      {blocosDisponiveis.map((b: any) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Unidade / Ap. *</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={unidadeTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                      placeholder="Ex: 101"
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>
                </div>

                {alertaAgrupamento && (
                  <div className="bg-amber-50 text-amber-950 p-2.5 rounded-xl border border-amber-300 space-y-1.5 shadow-2xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] flex-1">
                        <p className="font-bold text-amber-900">
                          Já existem {alertaAgrupamento.qtd} pacote(s) retido(s) para esta unidade.
                        </p>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-amber-800 font-semibold">Local atual:</span>
                          {alertaAgrupamento.locais && alertaAgrupamento.locais.map((loc: string, idx: number) => (
                            <span key={idx} className="bg-amber-200/80 text-amber-950 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {alertaAgrupamento.locais && alertaAgrupamento.locais.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLocalArmazenamentoTriagem(alertaAgrupamento.locais[0])}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        Agrupar no mesmo local ({alertaAgrupamento.locais[0]})
                      </button>
                    )}
                  </div>
                )}

                {moradoresDaUnidade.length > 0 && (
                  <div className="space-y-1 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                    <label className="block text-[10px] font-bold text-blue-800 uppercase">Destinatário</label>
                    <select
                      className="w-full p-1.5 bg-white border border-blue-200 rounded text-xs font-semibold"
                      onChange={(e) => setMoradorSelecionado(moradoresDaUnidade.find(m => m.id === e.target.value))}
                      value={moradorSelecionado?.id || ''}
                    >
                      {moradoresDaUnidade.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} (Tel: {m.telefone || 'Sem tel'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SELETOR DO LOCAL FÍSICO DE ARMAZENAMENTO (DIRETO E SEM EXCESSO) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                    Local de Armazenamento na Portaria *
                  </label>
                  <select
                    value={localArmazenamentoTriagem}
                    onChange={(e) => setLocalArmazenamentoTriagem(e.target.value)}
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                  >
                    {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                      const valorFormatado = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                      return (
                        <option key={loc.id || loc.codigo || loc} value={valorFormatado}>
                          📦 {valorFormatado}
                        </option>
                      );
                    })}
                    {locaisArmazenamento.length === 0 && (
                      <option value="Bancada Principal">📦 Bancada Principal de Triagem</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Código de Barras / Rastreio</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Escaneie ou digite..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    />
                    <button type="button" onClick={() => abrirLeitorCamera('triagem')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg transition flex items-center gap-1 cursor-pointer">
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Foto do Pacote / Etiqueta *</label>
                  {!fotoEtiquetaUrl ? (
                    <label className="border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer rounded-lg p-2.5 flex items-center justify-center gap-2 transition bg-slate-50">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-700">
                        {uploadingFoto ? 'Enviando foto...' : 'Tirar Foto do Pacote'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'etiquetas', setFotoEtiquetaUrl)} 
                        disabled={uploadingFoto} 
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-1.5 flex justify-center">
                      <img src={fotoEtiquetaUrl} alt="Etiqueta" className="max-h-28 rounded object-cover" />
                      <button type="button" onClick={() => setFotoEtiquetaUrl('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-xs cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Observações (Opcional)</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Caixa amassada, frágil..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs disabled:opacity-50 cursor-pointer mt-1">
                  {loading ? 'Salvando...' : <><CheckCircle2 className="w-4 h-4" /> Salvar Triagem e Reter Pacote</>}
                </button>
              </form>
            )}

            {itemTriadoWhats && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-sm font-bold text-emerald-800">Pacote retido com sucesso!</p>
                  <p className="text-xs text-emerald-700">Notifique o morador {itemTriadoWhats.destinatario}.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <a href={itemTriadoWhats.link} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition">
                    <MessageCircle className="w-4 h-4" /> Avisar Morador
                  </a>
                  <button onClick={() => setItemTriadoWhats(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3ª ETAPA — SAÍDA E BAIXA */}
      {etapa === '3' && (
        <div className="bg-white p-2.5 sm:p-3 rounded-xl shadow-2xs border border-slate-200 space-y-2">
          <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-800" /> Entrega de Pacotes (Saída)
              </h3>
            </div>
            
            <div className="flex gap-1.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={buscaBaixaGeral}
                  onChange={(e) => setBuscaBaixaGeral(e.target.value)}
                  placeholder="Unidade, Bloco ou Código..."
                  className="pl-8 pr-3 py-1.5 w-full bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>
              <button onClick={() => abrirLeitorCamera('baixa')} className="bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded-lg transition shrink-0 cursor-pointer" title="Ler Código de Barras">
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-1 gap-1 snap-x">
            <button
              onClick={() => setAbaBlocoSelecionada('TODOS')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition snap-start cursor-pointer ${abaBlocoSelecionada === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos os Blocos
            </button>
            {Object.keys(statsDia.retidosPorBloco).map(bloco => (
              <button
                key={bloco}
                onClick={() => setAbaBlocoSelecionada(bloco)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition snap-start flex items-center gap-1 cursor-pointer ${abaBlocoSelecionada === bloco ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {bloco} <span className="bg-emerald-500 text-white px-1 py-0.2 rounded text-[10px] font-mono">{statsDia.retidosPorBloco[bloco]}</span>
              </button>
            ))}
          </div>

          {/* RESUMO VISUAL DE ENCOMENDAS PENDENTES POR UNIDADE (BADGES / CONTADORES) */}
          <div className="bg-slate-50/90 p-2 sm:p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                  Resumo de Pendências por Unidade
                </h4>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                  {resumoPendenciasPorUnidade.length} {resumoPendenciasPorUnidade.length === 1 ? 'unidade' : 'unidades'}
                </span>
              </div>

              {buscaBaixaGeral && (
                <button
                  type="button"
                  onClick={() => setBuscaBaixaGeral('')}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpar filtro ({buscaBaixaGeral})
                </button>
              )}
            </div>

            {resumoPendenciasPorUnidade.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin snap-x">
                {resumoPendenciasPorUnidade.map((item) => {
                  const todosSelecionados = item.itensIds.length > 0 && item.itensIds.every(id => itensSelecionadosIds.includes(id));
                  const parcialmenteSelecionados = !todosSelecionados && item.itensIds.some(id => itensSelecionadosIds.includes(id));
                  const isFiltroAtivo = buscaBaixaGeral.trim().toLowerCase() === item.unidade.toLowerCase();

                  return (
                    <button
                      key={item.chave}
                      type="button"
                      onClick={() => {
                        // Se já estiver selecionado e filtrado, desmarca e limpa filtro
                        if (todosSelecionados && isFiltroAtivo) {
                          setBuscaBaixaGeral('');
                          setItensSelecionadosIds(prev => prev.filter(id => !item.itensIds.includes(id)));
                          setItensCandidatosEntrega(prev => prev.filter(id => !item.itensIds.includes(id)));
                        } else {
                          // Filtra e seleciona os pacotes da unidade em 1 clique
                          setBuscaBaixaGeral(item.unidade);
                          const outrosIds = itensSelecionadosIds.filter(id => !item.itensIds.includes(id));
                          const novosIds = [...outrosIds, ...item.itensIds];
                          setItensSelecionadosIds(novosIds);
                          setItensCandidatosEntrega(novosIds);
                        }
                      }}
                      className={`p-2 rounded-xl border transition flex flex-col justify-between text-left shrink-0 min-w-[135px] max-w-[170px] snap-start cursor-pointer ${
                        todosSelecionados
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                          : parcialmenteSelecionados
                          ? 'bg-blue-50/70 border-blue-300'
                          : isFiltroAtivo
                          ? 'bg-slate-100 border-slate-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                      }`}
                      title={`Clique para selecionar os ${item.qtd} pacote(s) do Ap. ${item.unidade}`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full mb-1">
                        <span className="text-[11px] font-black text-slate-900 truncate">
                          Ap. {item.unidade}
                        </span>
                        {/* BADGE / CONTADOR DE ENCOMENDAS PENDENTES */}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono flex items-center gap-0.5 shrink-0 ${
                          item.qtd > 1 
                            ? 'bg-amber-500 text-white shadow-2xs' 
                            : 'bg-emerald-600 text-white'
                        }`}>
                          <Package className="w-2.5 h-2.5" />
                          {item.qtd} {item.qtd === 1 ? 'pct' : 'pcts'}
                        </span>
                      </div>

                      {item.bloco && (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded w-fit mb-0.5">
                          Bloco {item.bloco}
                        </span>
                      )}

                      <p className="text-[10px] text-slate-600 font-medium truncate w-full">
                        {item.moradoresNomes.length > 0 ? item.moradoresNomes.join(', ') : 'Morador não vinculado'}
                      </p>

                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] w-full font-bold">
                        <span className={todosSelecionados ? 'text-emerald-700' : 'text-slate-400'}>
                          {todosSelecionados ? '✓ Selecionado' : 'Clique p/ selecionar'}
                        </span>
                        <span className="font-mono text-slate-400">
                          {todosSelecionados ? `${item.qtd}/${item.qtd}` : `0/${item.qtd}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 text-center text-slate-500 text-xs bg-white rounded-lg border border-dashed border-slate-200">
                Nenhuma encomenda pendente aguardando retirada.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <h4 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Pacotes Retidos ({itensRetidosFiltrados.length})
                </h4>

                {itensSelecionadosIds.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={abrirModalBaixa}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" /> Finalizar ({itensSelecionadosIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoverEmLoteSelecionados(true);
                        setItemParaMover(null);
                        const primeiro = locaisArmazenamento.find(l => l.ativo !== false);
                        setNovoLocalSelecionado(primeiro ? (primeiro.codigo && primeiro.nome ? `${primeiro.codigo} - ${primeiro.nome}` : primeiro.nome || primeiro) : 'Bancada Principal');
                        setModalMoverLocal(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Boxes className="w-3 h-3" /> Mover Sel.
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {itensRetidosFiltrados.length > 0 ? (
                  itensRetidosFiltrados.map((item: any) => {
                    const selecionado = itensSelecionadosIds.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemSelecao(item.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition flex gap-2 items-start ${
                          selecionado ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs ring-1 ring-emerald-500/30' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-slate-400 shrink-0">
                          {selecionado ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                              Ap. {item.unidade}{item.bloco ? ` - Bloco ${item.bloco}` : ''}
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono font-bold">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                            {item.moradores?.nome || 'Morador não vinculado'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span className="truncate max-w-[170px]">
                              {(() => {
                                const cod = item.codigo_barras?.trim();
                                if (!cod) return 'Rastreio: Sem código';
                                if (cod.startsWith('http')) return 'Rastreio: Link/QR';
                                return `Rastreio: ${cod.length > 14 ? cod.substring(0, 12) + '…' : cod}`;
                              })()}
                            </span>
                            {item.foto_etiqueta_url && (
                              <a 
                                href={item.foto_etiqueta_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                onClick={e => e.stopPropagation()} 
                                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold shrink-0"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Foto
                              </a>
                            )}
                          </div>

                          {/* LOCAL FÍSICO COM BOTÃO DE ALTERAR EM 1 CLIQUE (COMPACTO) */}
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 flex-wrap gap-1">
                            <span className="text-[10px] font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Boxes className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[150px]">{item.local_armazenamento || 'Bancada Principal'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemParaMover(item);
                                const localAtual = item.local_armazenamento || (locaisArmazenamento[0] ? `${locaisArmazenamento[0].codigo} - ${locaisArmazenamento[0].nome}` : 'Bancada Principal');
                                setNovoLocalSelecionado(localAtual);
                                setMoverTodosDaUnidade(true);
                                setMoverEmLoteSelecionados(false);
                                setModalMoverLocal(true);
                              }}
                              className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.2 rounded flex items-center gap-0.5 transition cursor-pointer"
                              title="Alterar local físico deste pacote"
                            >
                              <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl">
                    Nenhum pacote encontrado para os filtros atuais.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Finalizar Entrega (Baixa)
                </h4>
                {itensSelecionadosIds.length > 0 && (
                  <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded text-[10px]">
                    {itensSelecionadosIds.length} marcado(s)
                  </span>
                )}
              </div>

              {itensCandidatosObjetos.length > 0 ? (
                <form onSubmit={efetivarBaixaSaida} className="space-y-2.5 pt-1">
                  {/* CHECKLIST DE CONFERÊNCIA DOS PACOTES */}
                  {renderChecklistConferencia(false)}

                  {moradoresDasUnidadesBaixa.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase">Preencher com Morador:</label>
                      <div className="flex flex-wrap gap-1">
                        {moradoresDasUnidadesBaixa.map((m: any) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setNomeRetirante(m.nome)}
                            className="bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 text-[11px] px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <User className="w-3 h-3 text-emerald-600" /> {m.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Quem está retirando? (Nome / RG) *</label>
                    <input
                      type="text"
                      value={nomeRetirante}
                      onChange={(e) => setNomeRetirante(e.target.value)}
                      placeholder="Nome de quem pegou o pacote..."
                      required
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Comprovante de Entrega (Foto) *</label>
                    {!fotoRetiranteUrl ? (
                      <label className="border border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 cursor-pointer rounded-lg p-2.5 flex items-center justify-center gap-2 transition">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700">
                          {uploadingFoto ? 'Enviando...' : 'Foto Assinatura / Retirante'}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'comprovantes_baixa', setFotoRetiranteUrl)} 
                          disabled={uploadingFoto} 
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-1.5 flex justify-center">
                        <img src={fotoRetiranteUrl} alt="Comprovante" className="max-h-24 rounded object-cover" />
                        <button type="button" onClick={() => setFotoRetiranteUrl('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-xs cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || itensSelecionadosIds.length === 0} 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs cursor-pointer shadow-xs"
                  >
                    {loading ? 'Processando...' : (
                      <>
                        <UserCheck className="w-4 h-4" /> 
                        {itensSelecionadosIds.length > 0 
                          ? `Confirmar Entrega (${itensSelecionadosIds.length} ${itensSelecionadosIds.length === 1 ? 'volume' : 'volumes'})`
                          : 'Marque ao menos 1 volume no checklist'}
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs text-center">
                  Selecione ao menos um pacote na lista ao lado para efetuar a entrega.
                </div>
              )}

              {baixaConcluidaWhats && (
                 <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                   <p className="text-sm font-bold text-emerald-800">Baixa registrada com sucesso!</p>
                   <a href={baixaConcluidaWhats.link} target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition w-full">
                     <MessageCircle className="w-4 h-4" /> Enviar Recibo de Entrega
                   </a>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BARRA FLUTUANTE MOBILE (FAB) PARA FINALIZAR ENTREGA (Posicionada acima da barra de navegação inferior) */}
      {etapa === '3' && itensSelecionadosIds.length > 0 && !modalBaixaAberta && (
        <div className="md:hidden fixed bottom-14 left-3 right-3 bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl flex items-center justify-between z-40 border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {itensSelecionadosIds.length}
            </div>
            <div>
              <p className="font-bold text-xs text-white">Pacotes Selecionados</p>
              <p className="text-[10px] text-slate-400">Prontos para conferência</p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirModalBaixa}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
          >
            <UserCheck className="w-3.5 h-3.5" /> Finalizar Entrega
          </button>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET DE BAIXA / FINALIZAÇÃO DE ENTREGA COM CHECKLIST */}
      {modalBaixaAberta && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Finalizar Entrega (Baixa)</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {itensSelecionadosIds.length} de {itensCandidatosObjetos.length} volume(s) conferido(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBaixaAberta(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-2">
              {itensCandidatosObjetos.length > 0 ? (
                <form onSubmit={efetivarBaixaSaida} className="space-y-3">
                  {/* CHECKLIST DE CONFERÊNCIA DOS VOLUMES */}
                  {renderChecklistConferencia(true)}

                  {moradoresDasUnidadesBaixa.length > 0 && (
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase">
                        Preencher com Morador da Unidade:
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {moradoresDasUnidadesBaixa.map((m: any) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setNomeRetirante(m.nome)}
                            className="bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 text-[11px] px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <User className="w-3 h-3 text-emerald-600" /> {m.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">
                      Quem está retirando? (Nome / RG) *
                    </label>
                    <input
                      type="text"
                      value={nomeRetirante}
                      onChange={(e) => setNomeRetirante(e.target.value)}
                      placeholder="Nome de quem pegou o pacote..."
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">
                      Comprovante de Entrega (Foto) *
                    </label>
                    {!fotoRetiranteUrl ? (
                      <label className="border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50 cursor-pointer rounded-lg p-3 flex items-center justify-center gap-2 transition text-xs font-bold text-slate-700">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>{uploadingFoto ? 'Enviando...' : '📷 Foto Assinatura / Retirante'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'comprovantes_baixa', setFotoRetiranteUrl)} 
                          disabled={uploadingFoto} 
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-1.5 flex justify-center">
                        <img src={fotoRetiranteUrl} alt="Comprovante" className="max-h-24 rounded object-cover" />
                        <button type="button" onClick={() => setFotoRetiranteUrl('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-xs cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || itensSelecionadosIds.length === 0} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs cursor-pointer shadow-xs"
                  >
                    {loading ? 'Processando...' : (
                      <>
                        <UserCheck className="w-4 h-4" /> 
                        {itensSelecionadosIds.length > 0 
                          ? `Confirmar Entrega (${itensSelecionadosIds.length} ${itensSelecionadosIds.length === 1 ? 'volume' : 'volumes'})`
                          : 'Selecione ao menos 1 volume no checklist'}
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs text-center space-y-1">
                  <p className="font-bold">Nenhum pacote selecionado</p>
                  <p className="text-[11px] text-amber-700">Selecione ao menos um pacote na lista para efetuar a entrega.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR ENTREGADOR */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Novo Entregador</h3>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={cadastrarEntregadorRapido} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Nome Completo *</label>
                <input type="text" required value={novoEntNome} onChange={e => setNovoEntNome(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Documento (RG/CPF)</label>
                <input type="text" value={novoEntDoc} onChange={e => setNovoEntDoc(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Empresa / Transportadora</label>
                <input type="text" value={novoEntEmpresa} onChange={e => setNovoEntEmpresa(e.target.value)} placeholder="Ex: Correios, Mercado Livre..." className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl mt-2 transition">
                {loading ? 'Salvando...' : 'Salvar Entregador'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEITOR DE CÓDIGO */}
      {modalLeitor && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 w-full z-10">
            <h3 className="font-bold text-white flex items-center gap-2"><QrCode className="w-5 h-5" /> Posicione o código</h3>
            <button onClick={fecharLeitorCamera} className="bg-white/20 text-white p-2 rounded-full hover:bg-white/30"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {erroCamera ? (
              <div className="text-white text-center p-6 bg-red-900/50 rounded-xl m-4 border border-red-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                <p className="text-sm">{erroCamera}</p>
                <p className="text-xs mt-2 text-red-200">Verifique as permissões de câmera do navegador.</p>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-40 border-2 border-emerald-500 bg-transparent rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br"></div>
                    <div className="w-full h-0.5 bg-emerald-500/50 absolute top-1/2 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-6 bg-black text-center text-white text-xs">
            A câmera lerá automaticamente o código de barras ou QR Code do pacote.
          </div>
        </div>
      )}

      {/* MODAL ALTERAR / MOVER LOCAL FÍSICO DE ENCOMENDAS */}
      {modalMoverLocal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Boxes className="w-5 h-5 text-emerald-600" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {moverEmLoteSelecionados ? 'Mover Encomendas Selecionadas' : 'Alterar Local de Armazenamento'}
                  </h3>
                  <p className="text-xs text-slate-500">Reorganização física dos pacotes na portaria</p>
                </div>
              </div>
              <button 
                onClick={() => setModalMoverLocal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do item / lote */}
            {moverEmLoteSelecionados ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs space-y-1 text-emerald-950 font-medium">
                <p className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-700" />
                  {itensSelecionadosIds.length} pacote(s) selecionado(s)
                </p>
                <p className="text-[11px] text-emerald-800">
                  Todos os pacotes selecionados serão movidos em lote para o novo local escolhido abaixo.
                </p>
              </div>
            ) : itemParaMover ? (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-900 text-sm">
                    Ap. {itemParaMover.unidade}{itemParaMover.bloco ? ` - Bloco ${itemParaMover.bloco}` : ''}
                  </strong>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono">
                    {itemParaMover.codigo_barras || 'Sem rastreio'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Destinatário: <strong>{itemParaMover.moradores?.nome || 'Morador'}</strong>
                </p>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  Local Atual: <strong>{itemParaMover.local_armazenamento || 'Bancada Principal'}</strong>
                </p>
              </div>
            ) : null}

            {/* Seleção do Novo Local */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase">
                Selecione o Novo Local Físico de Guarda *
              </label>
              <select
                value={novoLocalSelecionado}
                onChange={(e) => setNovoLocalSelecionado(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              >
                {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                  const valor = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                  return (
                    <option key={loc.id || loc.codigo || loc} value={valor}>
                      📦 {valor} {loc.categoria ? `(${loc.categoria})` : ''}
                    </option>
                  );
                })}
                {locaisArmazenamento.length === 0 && (
                  <>
                    <option value="Bancada Principal">📦 Bancada Principal de Triagem</option>
                    <option value="Chão / Caixas Grandes">📦 Chão / Caixas Grandes</option>
                  </>
                )}
              </select>
            </div>

            {/* Checkbox Agrupar todos da mesma unidade */}
            {!moverEmLoteSelecionados && itemParaMover && (
              <label className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moverTodosDaUnidade}
                  onChange={(e) => setMoverTodosDaUnidade(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="font-bold block">
                    Agrupar todas as encomendas do Ap. {itemParaMover.unidade}{itemParaMover.bloco ? ` - Bloco ${itemParaMover.bloco}` : ''}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Conforme chegam novos pacotes, move todos para ficarem juntos no mesmo local físico.
                  </span>
                </div>
              </label>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMoverLocal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executarMudancaLocal}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl text-xs uppercase shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Confirmar Novo Local'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4ª ETAPA — DOSSIÊ AUDITÁVEL DE ENCOMENDAS (HISTÓRICO COM FOTOS DE RECEBIMENTO E ENTREGA) */}
      {etapa === '4' && (
        <div className="space-y-4">
          {/* Banner do Dossiê */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 p-4 sm:p-5 rounded-2xl text-white border-2 border-purple-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-400/40 inline-flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Auditoria Irrefutável de Encomendas
              </span>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Dossiê Completo de Recebimento & Entrega com Fotos
              </h3>
              <p className="text-xs text-purple-200/80">
                Histórico arquivado com foto da etiqueta de entrada e foto do morador/retirante na saída para resolver reclamações de extravio.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={carregarDossie}
                disabled={loadingDossie}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDossie ? 'animate-spin' : ''}`} />
                Atualizar Dossiê
              </button>
            </div>
          </div>

          {/* Filtros e Busca Rápida */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={buscaDossie}
                onChange={(e) => setBuscaDossie(e.target.value)}
                placeholder="Buscar por unidade, bloco, nome do morador, código de barras/rastreio ou quem retirou..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroStatusDossie('todos')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroStatusDossie === 'todos' ? 'bg-purple-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({itensDossie.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusDossie('entregue')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroStatusDossie === 'entregue' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🟢 Entregues ({itensDossie.filter(i => i.status === 'entregue').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusDossie('retido')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filtroStatusDossie === 'retido' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🟡 Retidos ({itensDossie.filter(i => i.status !== 'entregue').length})
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Período:
                </span>
                {(['todos', 'hoje', '7dias', '30dias'] as const).map((per) => (
                  <button
                    key={per}
                    type="button"
                    onClick={() => setFiltroPeriodoDossie(per)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      filtroPeriodoDossie === per ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {per === 'todos' ? 'Todos' : per === 'hoje' ? 'Hoje' : per === '7dias' ? '7 dias' : '30 dias'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listagem em Cards de Dossiê */}
          {loadingDossie ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> Carregando arquivo de dossiês e fotos...
            </div>
          ) : (
            (() => {
              const agoraTs = Date.now();
              const umDiaMs = 24 * 60 * 60 * 1000;
              const itensFiltrados = itensDossie.filter((item) => {
                // Filtro status
                if (filtroStatusDossie === 'entregue' && item.status !== 'entregue') return false;
                if (filtroStatusDossie === 'retido' && item.status === 'entregue') return false;

                // Filtro período
                const itemDataTs = new Date(item.data_retirada || item.created_at).getTime();
                if (filtroPeriodoDossie === 'hoje') {
                  const hojeStr = new Date().toISOString().slice(0, 10);
                  const dtStr = (item.data_retirada || item.created_at || '').slice(0, 10);
                  if (dtStr !== hojeStr) return false;
                } else if (filtroPeriodoDossie === '7dias') {
                  if (agoraTs - itemDataTs > 7 * umDiaMs) return false;
                } else if (filtroPeriodoDossie === '30dias') {
                  if (agoraTs - itemDataTs > 30 * umDiaMs) return false;
                }

                // Filtro texto
                if (buscaDossie.trim()) {
                  const termo = buscaDossie.toLowerCase();
                  const und = (item.unidade || '').toString().toLowerCase();
                  const blc = (item.bloco || '').toString().toLowerCase();
                  const cod = (item.codigo_barras || item.codigo_rastreio || item.rastreio || '').toLowerCase();
                  const reCod = (item.lotes_re?.codigo_re || '').toLowerCase();
                  const mor = (item.moradores?.nome || '').toLowerCase();
                  const ret = (item.retirado_por || '').toLowerCase();
                  const op = (item.operador_baixa_id || '').toLowerCase();
                  const loc = (item.local_armazenamento || '').toLowerCase();
                  return und.includes(termo) || blc.includes(termo) || cod.includes(termo) || reCod.includes(termo) || mor.includes(termo) || ret.includes(termo) || op.includes(termo) || loc.includes(termo);
                }

                return true;
              });

              if (itensFiltrados.length === 0) {
                return (
                  <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
                    Nenhum pacote encontrado com os filtros selecionados.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {itensFiltrados.map((item) => {
                    const estaEntregue = item.status === 'entregue';
                    const rastreioExibicao = item.codigo_barras || item.codigo_rastreio || item.rastreio || (item.lotes_re?.codigo_re ? `Lote ${item.lotes_re.codigo_re}` : null);

                    return (
                      <div 
                        key={item.id} 
                        className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 transition hover:shadow-md ${
                          estaEntregue ? 'border-emerald-200' : 'border-amber-200'
                        }`}
                      >
                        {/* Cabeçalho do Card */}
                        <div className="flex items-start justify-between gap-2 border-b pb-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-slate-900 text-sm">
                                Ap. {item.unidade} {item.bloco ? `• Bloco ${item.bloco}` : ''}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                ({item.moradores?.nome || 'Morador'})
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                                <QrCode className="w-3.5 h-3.5 text-purple-600" /> Rastreio:
                              </span>
                              {rastreioExibicao ? (
                                <span className="bg-purple-100 text-purple-950 font-mono font-black text-[11px] px-2 py-0.5 rounded border border-purple-200 tracking-wider">
                                  {rastreioExibicao}
                                </span>
                              ) : (
                                <span className="italic text-slate-400 text-[11px]">Sem rastreio digitado</span>
                              )}

                              {item.lotes_re?.codigo_re && (
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                  RE: {item.lotes_re.codigo_re}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            estaEntregue ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {estaEntregue ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            {estaEntregue ? 'Entregue' : 'Retido no Posto'}
                          </span>
                        </div>

                        {/* Comparativo Lado a Lado: Foto 1 Recebimento vs Foto 2 Entrega */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* FOTO 1: RECEBIMENTO */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase text-purple-800 block flex items-center gap-1">
                              <Camera className="w-3 h-3 text-purple-600" /> 1. Recebimento (RE)
                            </span>

                            <div 
                              onClick={() => item.foto_etiqueta_url && setModalFotoAmpliada(item.foto_etiqueta_url)}
                              className="h-28 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border border-slate-300 relative group"
                            >
                              {item.foto_etiqueta_url ? (
                                <>
                                  <img src={item.foto_etiqueta_url} alt="Etiqueta" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                  <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <Eye className="w-2.5 h-2.5" /> Ver Foto
                                  </span>
                                </>
                              ) : (
                                <div className="text-center text-slate-400 text-[10px]">
                                  <Package className="w-6 h-6 mx-auto mb-0.5 opacity-40" />
                                  Sem foto etiqueta
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500 leading-tight">
                              <div>Entrada: <strong>{new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                              <div className="truncate">Local: <strong className="text-slate-800">{item.local_armazenamento || 'Escaninho'}</strong></div>
                            </div>
                          </div>

                          {/* FOTO 2: ENTREGA AO MORADOR */}
                          <div className={`p-2.5 rounded-xl border space-y-1.5 flex flex-col justify-between ${
                            estaEntregue ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-dashed border-slate-300'
                          }`}>
                            <span className="text-[10px] font-black uppercase text-emerald-800 block flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-emerald-600" /> 2. Entrega (Saída)
                            </span>

                            <div 
                              onClick={() => item.foto_retirada_url && setModalFotoAmpliada(item.foto_retirada_url)}
                              className="h-28 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border border-slate-300 relative group"
                            >
                              {item.foto_retirada_url ? (
                                <>
                                  <img src={item.foto_retirada_url} alt="Comprovante Retirada" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                  <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <Eye className="w-2.5 h-2.5" /> Ver Foto
                                  </span>
                                </>
                              ) : (
                                <div className="text-center text-slate-400 text-[10px] p-2">
                                  <Clock className="w-6 h-6 mx-auto mb-0.5 text-amber-500/70" />
                                  Aguardando retirada pelo morador
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-600 leading-tight">
                              {estaEntregue ? (
                                <>
                                  <div className="truncate">Retirante: <strong className="text-emerald-950">{item.retirado_por}</strong></div>
                                  <div>Data: <strong>{new Date(item.data_retirada).toLocaleDateString('pt-BR')} às {new Date(item.data_retirada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                                  <div className="text-[9px] text-slate-400">Op: {item.operador_baixa_id || 'Portaria'}</div>
                                </>
                              ) : (
                                <div className="text-amber-800 font-medium italic">
                                  Pacote retido na portaria.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação do Dossiê */}
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setItemModalDossie(item)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ver Dossiê Completo
                          </button>

                          {estaEntregue && (
                            <button
                              type="button"
                              onClick={() => {
                                const tel = item.moradores?.telefone?.replace(/\D/g, '') || '';
                                const dataStr = new Date(item.data_retirada).toLocaleString('pt-BR');
                                const msg = `📦 *COMPROVANTE DE ENTREGA DE ENCOMENDA - INFPORT*\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `🏢 *Unidade:* Ap. ${item.unidade} ${item.bloco ? 'Bloco ' + item.bloco : ''}\n` +
                                  `👤 *Destinatário Cadastrado:* ${item.moradores?.nome || 'Morador'}\n` +
                                  `🏷️ *Código de Rastreio:* ${item.codigo_barras || 'S/ Código'}\n` +
                                  `✅ *Status:* ENTREGUE COM SUCESSO\n` +
                                  `👤 *Retirado Por:* ${item.retirado_por}\n` +
                                  `📅 *Data e Hora da Baixa:* ${dataStr}\n` +
                                  `🛡️ *Operador Responsável:* ${item.operador_baixa_id || 'Portaria'}\n` +
                                  `📸 *Fotos Arquivadas:* Foto da etiqueta no recebimento e foto do retirante arquivadas no sistema da portaria.\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `_Dossiê arquivado para sua total segurança._`;
                                const link = `https://wa.me/${tel ? (tel.startsWith('55') ? tel : '55' + tel) : ''}?text=${encodeURIComponent(msg)}`;
                                window.open(link, '_blank');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                              title="Enviar comprovação via WhatsApp para o morador"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Morador
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* MODAL DE DOSSIÊ COMPLETO DE AUDITORIA DE ENCOMENDA */}
      {itemModalDossie && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              type="button"
              onClick={() => setItemModalDossie(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Dossiê */}
            <div className="border-b pb-3 pr-8 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Dossiê Oficial de Auditoria & Custódia
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Encomenda Ap. {itemModalDossie.unidade} {itemModalDossie.bloco ? `• Bloco ${itemModalDossie.bloco}` : ''}
              </h3>
              <p className="text-xs text-slate-500">
                Morador: <strong>{itemModalDossie.moradores?.nome || 'Não cadastrado'}</strong> • Telefone: {itemModalDossie.moradores?.telefone || 'S/ Tel'} • Código: <strong>{itemModalDossie.codigo_barras || 'S/ Rastreio'}</strong>
              </p>
            </div>

            {/* Conteúdo do Dossiê */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Linha do Tempo de Custódia */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-700 block">
                  Linha do Tempo da Custódia:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">1. Entrada no Posto</span>
                    <strong className="text-slate-900 text-xs block">{new Date(itemModalDossie.created_at).toLocaleString('pt-BR')}</strong>
                    <span className="text-[10px] text-slate-500">Lote: {itemModalDossie.lotes_re?.codigo || 'RE Portaria'}</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">2. Triagem Física</span>
                    <strong className="text-slate-900 text-xs block">{itemModalDossie.local_armazenamento || 'Escaninho Padrão'}</strong>
                    <span className="text-[10px] text-slate-500">Local de Guarda</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    itemModalDossie.status === 'entregue' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <span className="text-[10px] font-bold uppercase block text-emerald-800">
                      3. Saída / Entrega
                    </span>
                    {itemModalDossie.status === 'entregue' ? (
                      <>
                        <strong className="text-emerald-950 text-xs block">{new Date(itemModalDossie.data_retirada).toLocaleString('pt-BR')}</strong>
                        <span className="text-[10px] text-emerald-700">Para: <strong>{itemModalDossie.retirado_por}</strong></span>
                      </>
                    ) : (
                      <span className="text-amber-800 font-bold">Aguardando Retirada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comparativo de Fotos em Alta Resolução */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Foto 1 */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <strong className="text-xs font-black text-purple-950 uppercase flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" /> Foto 1: Recebimento na Portaria (Etiqueta)
                  </strong>

                  <div className="bg-slate-900 rounded-xl overflow-hidden h-56 flex items-center justify-center border border-slate-300">
                    {itemModalDossie.foto_etiqueta_url ? (
                      <img src={itemModalDossie.foto_etiqueta_url} alt="Etiqueta no Recebimento" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-500 text-center text-xs">
                        <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        Sem foto de etiqueta arquivada
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Foto tirada no momento da entrada da carga pelo operador para conferência da integridade da embalagem.
                  </p>
                </div>

                {/* Foto 2 */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <strong className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> Foto 2: Comprovante de Entrega ao Morador
                  </strong>

                  <div className="bg-slate-900 rounded-xl overflow-hidden h-56 flex items-center justify-center border border-slate-300">
                    {itemModalDossie.foto_retirada_url ? (
                      <img src={itemModalDossie.foto_retirada_url} alt="Comprovante de Saída" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-500 text-center text-xs p-4">
                        <Clock className="w-8 h-8 mx-auto mb-1 text-amber-500 opacity-60" />
                        Ainda não entregue. A foto do comprovante será registrada quando o morador retirar.
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600">
                    {itemModalDossie.status === 'entregue' ? (
                      <>Comprovante registrado pelo operador <strong>{itemModalDossie.operador_baixa_id || 'Portaria'}</strong> no ato da entrega a <strong>{itemModalDossie.retirado_por}</strong>.</>
                    ) : (
                      'Pacote em custódia na portaria aguardando retirada pelo morador.'
                    )}
                  </p>
                </div>
              </div>

              {/* Relatório Texto Formatado */}
              <div className="bg-slate-950 p-3.5 rounded-2xl text-slate-200 font-mono text-[11px] space-y-1 border border-slate-800">
                <div className="text-emerald-400 font-bold">DOSSIÊ INFPORT — REGISTRO DE AUDITORIA DE ENCOMENDA</div>
                <div>ID: {itemModalDossie.id}</div>
                <div>DESTINO: Ap. {itemModalDossie.unidade} {itemModalDossie.bloco ? 'Bloco ' + itemModalDossie.bloco : ''}</div>
                <div>MORADOR TITULAR: {itemModalDossie.moradores?.nome || 'Não informado'} ({itemModalDossie.moradores?.telefone || 'S/ Tel'})</div>
                <div>CÓDIGO DE RASTREIO: {itemModalDossie.codigo_barras || itemModalDossie.codigo_rastreio || itemModalDossie.rastreio || (itemModalDossie.lotes_re?.codigo_re ? `Lote RE ${itemModalDossie.lotes_re.codigo_re}` : 'Sem código')}</div>
                <div>LOCAL DE GUARDA: {itemModalDossie.local_armazenamento || 'Escaninho'}</div>
                <div>ENTRADA NA PORTARIA: {new Date(itemModalDossie.created_at).toLocaleString('pt-BR')}</div>
                <div>STATUS: {itemModalDossie.status?.toUpperCase()}</div>
                {itemModalDossie.status === 'entregue' && (
                  <>
                    <div className="text-emerald-300">ENTREGUE PARA: {itemModalDossie.retirado_por}</div>
                    <div className="text-emerald-300">DATA DA ENTREGA: {new Date(itemModalDossie.data_retirada).toLocaleString('pt-BR')}</div>
                    <div className="text-emerald-300">OPERADOR RESPONSÁVEL: {itemModalDossie.operador_baixa_id || 'Portaria'}</div>
                  </>
                )}
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const codDossie = itemModalDossie.codigo_barras || itemModalDossie.codigo_rastreio || itemModalDossie.rastreio || (itemModalDossie.lotes_re?.codigo_re ? `RE ${itemModalDossie.lotes_re.codigo_re}` : 'S/ Código');
                  const texto = `DOSSIÊ DE ENCOMENDA - INFPORT\n` +
                    `Ap. ${itemModalDossie.unidade} ${itemModalDossie.bloco ? 'Bloco ' + itemModalDossie.bloco : ''} - Morador: ${itemModalDossie.moradores?.nome || 'N/A'}\n` +
                    `Código de Rastreio: ${codDossie}\n` +
                    `Status: ${itemModalDossie.status === 'entregue' ? 'ENTREGUE' : 'RETIDO'}\n` +
                    `Entrada: ${new Date(itemModalDossie.created_at).toLocaleString('pt-BR')}\n` +
                    (itemModalDossie.status === 'entregue' ? `Entregue em: ${new Date(itemModalDossie.data_retirada).toLocaleString('pt-BR')} para ${itemModalDossie.retirado_por} por ${itemModalDossie.operador_baixa_id}\n` : '') +
                    `Fotos arquivadas no sistema da portaria.`;
                  navigator.clipboard.writeText(texto);
                  setCopiadoDossie(true);
                  setTimeout(() => setCopiadoDossie(false), 2000);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiadoDossie ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                {copiadoDossie ? 'Copiado!' : 'Copiar Texto do Dossiê'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
                </button>

                <button
                  type="button"
                  onClick={() => setItemModalDossie(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA VISUALIZAR FOTO DA ETIQUETA / PACOTE EM ALTA RESOLUÇÃO */}
      {modalFotoAmpliada && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-4 cursor-pointer animate-in fade-in duration-150"
          onClick={() => setModalFotoAmpliada(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-3 sm:p-4 space-y-3 shadow-2xl overflow-hidden cursor-default animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Foto da Etiqueta / Pacote
              </h4>
              <button 
                type="button" 
                onClick={() => setModalFotoAmpliada(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center bg-slate-100 rounded-xl overflow-hidden max-h-[70vh] border border-slate-200">
              <img src={modalFotoAmpliada} alt="Etiqueta Ampliada" className="w-full h-auto object-contain max-h-[70vh]" />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalFotoAmpliada(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

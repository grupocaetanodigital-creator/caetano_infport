import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
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
  Layers
} from 'lucide-react';

interface EncomendasProps {
  usuarioLogado?: any;
}

export default function Encomendas({ usuarioLogado }: EncomendasProps) {
  const [etapa, setEtapa] = useState<'1' | '2' | '3'>('1');
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [entregadores, setEntregadores] = useState<any[]>([]);
  const [lotesPendentes, setLotesPendentes] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [todosItensRetidos, setTodosItensRetidos] = useState<any[]>([]);

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
  }, [etapa, usuarioLogado?.condominio_id]);

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

  const carregarLocais = async () => {
    if (!usuarioLogado?.condominio_id) return;
    try {
      const cached = localStorage.getItem(`infport_locais_${usuarioLogado.condominio_id}`);
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
        .eq('condominio_id', usuarioLogado.condominio_id)
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
        .eq('condominio_id', usuarioLogado.condominio_id)
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
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);
    carregarLocais();
    try {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date();
      fimDia.setHours(23, 59, 59, 999);

      const { data: entData } = await supabase
        .from('entregadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setEntregadores(entData || []);

      const { data: lotesData } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa, documento)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });
      setLotesPendentes(lotesData || []);

      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setMoradores(moradData || []);

      const { data: retidosData } = await supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'retido')
        .order('created_at', { ascending: false });
      setTodosItensRetidos(retidosData || []);

      const { data: lotesHojeData } = await supabase
        .from('lotes_re')
        .select('id, qtd_declarada, qtd_triada')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      const { data: triadosHojeData } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

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
      const { data, error } = await supabase
        .from('entregadores')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
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
      const hoje = new Date();
      const inicioDia = new Date(hoje);
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date(hoje);
      fimDia.setHours(23, 59, 59, 999);

      const { count, error: countError } = await supabase
        .from('lotes_re')
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', usuarioLogado.condominio_id)
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
          condominio_id: usuarioLogado.condominio_id,
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
      const uMatch = m.unidade?.toString().toLowerCase() === unid.trim().toLowerCase();
      const bMatch = bloc.trim() ? m.bloco?.toString().toLowerCase() === bloc.trim().toLowerCase() : true;
      return uMatch && bMatch;
    });
    setMoradoresDaUnidade(moradoresEncontrados);

    if (moradoresEncontrados.length > 0) {
      setMoradorSelecionado(moradoresEncontrados[0]);
    } else {
      setMoradorSelecionado(null);
    }

    let query = supabase
      .from('encomendas_itens')
      .select('*')
      .eq('condominio_id', usuarioLogado.condominio_id)
      .eq('unidade', unid.trim())
      .eq('status', 'retido');

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

      let payloadItem: any = {
        lote_re_id: loteAtivo.id,
        condominio_id: usuarioLogado.condominio_id,
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

      const textoWhatsMorador = `Olá, ${nomeDestinatario} (Apt ${unidadeTriagem}${blocoTriagem ? ' - Bloco ' + blocoTriagem : ''})! 📦\n\nSua encomenda acabou de chegar na Portaria.\n• Destinatário: ${nomeDestinatario}\n• Código/Lote: ${loteAtivo.codigo_re}\n• Cód. Rastreio: ${codigoBarras || 'N/A'}\n• Local Físico de Guarda: ${localArmazenar}\n• Observação: ${observacoes || 'Nenhuma'}\n• Foto do Pacote: ${fotoEtiquetaUrl}\n\nPor favor, retire na portaria informando seu apartamento!`;

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

  const itensSelecionadosObjetos = todosItensRetidos.filter(i => itensSelecionadosIds.includes(i.id));
  const moradoresDasUnidadesBaixa = moradores.filter(m => 
    itensSelecionadosObjetos.some(item => 
      String(item.unidade).toLowerCase() === String(m.unidade).toLowerCase() &&
      (!item.bloco || String(item.bloco).toLowerCase() === String(m.bloco || '').toLowerCase())
    )
  );

  const toggleItemSelecao = (id: string) => {
    if (itensSelecionadosIds.includes(id)) {
      setItensSelecionadosIds(itensSelecionadosIds.filter(item => item !== id));
    } else {
      setItensSelecionadosIds([...itensSelecionadosIds, id]);
    }
  };

  const efetivarBaixaSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Selecione os pacotes, informe o nome do retirante e tire a foto da entrega.' });
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
      const telMorador = primeiroItem?.moradores?.telefone?.replace(/\D/g, '') || '';
      const textoCruzado = `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*\nUnidade: Apt ${primeiroItem?.unidade || ''}${primeiroItem?.bloco ? ' - Bloco ' + primeiroItem.bloco : ''}\n\nInformamos que o(s) pacote(s) foram RETIRADOS da portaria:\n• Qtd de Volumes Retirados: ${itensSelecionadosIds.length}\n• Quem Retirou: ${nomeRetirante}\n• Comprovante da Entrega: ${fotoRetiranteUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setBaixaConcluidaWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoCruzado)}` : `https://wa.me/?text=${encodeURIComponent(textoCruzado)}`
      });

      setItensSelecionadosIds([]);
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
    <div className="space-y-6">
      {/* PAINEL DE METRICAS DO DIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Lotes RE Criados Hoje</span>
            <strong className="text-2xl font-black text-slate-900">{statsDia.lotesHoje}</strong>
            <span className="text-[10px] text-slate-500 block">00:00 às 23:59</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Encomendas Triadas Hoje</span>
            <strong className="text-2xl font-black text-emerald-700">{statsDia.triadasHoje}</strong>
            <span className="text-[10px] text-slate-500 block">00:00 às 23:59</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Aguardando Triagem</span>
            <strong className="text-2xl font-black text-amber-700">{statsDia.aguardandoTriagem}</strong>
            <span className="text-[10px] text-slate-500 block">Pacotes em lotes abertos</span>
          </div>
        </div>
      </div>

      {/* DISPLAY DE PACOTES RETIDOS POR BLOCO */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" /> Pacotes Retidos na Portaria por Bloco:
          </h4>
          <span className="text-xs font-mono font-bold bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-md">
            Total Retido: {todosItensRetidos.length} vol.
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {Object.keys(statsDia.retidosPorBloco).length > 0 ? (
            Object.entries(statsDia.retidosPorBloco).map(([blocoNome, qtd]) => (
              <div 
                key={blocoNome} 
                onClick={() => { setEtapa('3'); setAbaBlocoSelecionada(blocoNome); }}
                className="bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs transition"
              >
                <span className="font-bold text-slate-200">{blocoNome}:</span>
                <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-xs">
                  {qtd} {qtd === 1 ? 'pacote' : 'pacotes'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhuma encomenda retida no momento.</p>
          )}
        </div>
      </div>

      {/* Navegação Sequencial de 3 Etapas */}
      <div className="grid grid-cols-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setEtapa('1')}
          className={`p-4 text-left border-b-4 transition ${etapa === '1' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">1ª Etapa</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><Truck className="w-4 h-4" /> Recebimento (RE)</strong>
        </button>

        <button
          onClick={() => setEtapa('2')}
          className={`p-4 text-left border-b-4 transition ${etapa === '2' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">2ª Etapa</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><Package className="w-4 h-4" /> Triagem do Lote</strong>
        </button>

        <button
          onClick={() => setEtapa('3')}
          className={`p-4 text-left border-b-4 transition ${etapa === '3' ? 'border-slate-900 bg-slate-50' : 'border-transparent'}`}
        >
          <span className="text-xs font-bold uppercase text-slate-400 block">3ª Etapa</span>
          <strong className="text-sm text-slate-900 flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> Saída / Baixa</strong>
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Truck className="w-6 h-6 text-slate-800" /> Novo Recebimento de Entrega (RE)
            </h3>
            <button
              onClick={() => setModalNovoEntregador(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" /> + Cadastro Rápido de Entregador
            </button>
          </div>

          <form onSubmit={criarLoteRE} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Buscar / Selecionar Entregador *</label>
              
              {!entregadorSelecionado ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={buscaEntregador}
                      onChange={(e) => setBuscaEntregador(e.target.value)}
                      placeholder="Digite o nome, empresa ou documento do entregador..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-100">
                    {entregadoresFiltrados.length > 0 ? (
                      entregadoresFiltrados.map((ent) => (
                        <div
                          key={ent.id}
                          onClick={() => {
                            setEntregadorSelecionado(ent);
                            setBuscaEntregador('');
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{ent.nome}</p>
                            <p className="text-[11px] text-slate-500">
                              {ent.empresa ? `Empresa: ${ent.empresa}` : 'Avulso'} | Doc: {ent.documento || 'Sem doc'}
                            </p>
                          </div>
                          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                            Selecionar
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs text-slate-500 italic text-center">
                        Nenhum entregador encontrado com esse termo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">Entregador Selecionado</span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">{entregadorSelecionado.nome}</h4>
                    <p className="text-xs text-slate-500">
                      Empresa: {entregadorSelecionado.empresa || 'Avulso'} | Doc: {entregadorSelecionado.documento || 'Sem doc'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setEntregadorSelecionado(null)} className="text-red-500 hover:text-red-700 p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Quantidade de Volumes (Declarada) *</label>
              <input 
                type="number" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                min="1" 
                value={qtdDeclarada} 
                onChange={(e) => setQtdDeclarada(e.target.value)} 
                required 
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition" 
              />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50">
              {loading ? 'Gerando Lote...' : <><CheckCircle2 className="w-5 h-5" /> Gerar Lote de Recebimento</>}
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Package className="w-6 h-6 text-slate-800" /> Triagem de Pacotes
            </h3>
            <p className="text-xs text-slate-500 mt-1">Vincule os pacotes recebidos às unidades e notifique o morador.</p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">1. Selecione o Lote Pendente *</label>
              <select
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                value={loteAtivo ? loteAtivo.id : ''}
                onChange={(e) => {
                  const loteId = e.target.value;
                  setLoteAtivo(lotesPendentes.find(l => l.id === loteId) || null);
                }}
              >
                <option value="">Selecione um lote aberto...</option>
                {lotesPendentes.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.codigo_re} - {l.entregadores?.nome} ({l.qtd_triada}/{l.qtd_declarada} pacotes)
                  </option>
                ))}
              </select>
            </div>

            {loteAtivo && (
              <form onSubmit={salvarItemTriagem} className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Bloco</label>
                    <select
                      value={blocoTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    >
                      <option value="">Nenhum/Único</option>
                      {blocosDisponiveis.map((b: any) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Unidade / Ap *</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={unidadeTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                      placeholder="Ex: 101"
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>
                </div>

                {alertaAgrupamento && (
                  <div className="bg-amber-50 text-amber-950 p-4 rounded-2xl border-2 border-amber-300 space-y-2.5 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-900">
                          ⚠️ Unidade com Encomendas Retidas na Portaria
                        </p>
                        <p className="text-xs text-amber-800">
                          Já existem <strong>{alertaAgrupamento.qtd} pacote(s)</strong> retido(s) aguardando retirada para o Apt {alertaAgrupamento.unidade}{alertaAgrupamento.bloco ? ` - Bloco ${alertaAgrupamento.bloco}` : ''}.
                        </p>
                        <div className="text-xs text-amber-900 font-medium flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[11px] font-bold text-amber-700">Locais atuais de guarda:</span>
                          {alertaAgrupamento.locais && alertaAgrupamento.locais.map((loc: string, idx: number) => (
                            <span key={idx} className="bg-amber-200/80 border border-amber-400/60 text-amber-950 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              📦 {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {alertaAgrupamento.locais && alertaAgrupamento.locais.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLocalArmazenamentoTriagem(alertaAgrupamento.locais[0])}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer uppercase active:scale-[0.99]"
                      >
                        <Boxes className="w-4 h-4" />
                        Agrupar neste mesmo local ({alertaAgrupamento.locais[0]})
                      </button>
                    )}
                  </div>
                )}

                {moradoresDaUnidade.length > 0 && (
                  <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-bold text-blue-800 uppercase">Selecione o Destinatário</label>
                    <select
                      className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm"
                      onChange={(e) => setMoradorSelecionado(moradoresDaUnidade.find(m => m.id === e.target.value))}
                      value={moradorSelecionado?.id || ''}
                    >
                      {moradoresDaUnidade.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} (Tel: {m.telefone || 'Sem telefone'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SELETOR DO LOCAL FÍSICO DE ARMAZENAMENTO */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-emerald-600" />
                      Local Físico de Armazenamento na Portaria *
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Gerenciado em Configurações
                    </span>
                  </label>
                  <select
                    value={localArmazenamentoTriagem}
                    onChange={(e) => setLocalArmazenamentoTriagem(e.target.value)}
                    required
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition shadow-inner"
                  >
                    {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                      const valorFormatado = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                      return (
                        <option key={loc.id || loc.codigo || loc} value={valorFormatado}>
                          📦 {valorFormatado} {loc.categoria ? `(${loc.categoria})` : ''}
                        </option>
                      );
                    })}
                    {locaisArmazenamento.length === 0 && (
                      <option value="Bancada Principal">📦 Bancada Principal de Triagem</option>
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    O morador receberá no WhatsApp exatamente onde retirar a encomenda. O local pode ser alterado a qualquer momento.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Código de Barras / Rastreio</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Escaneie ou digite..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                    <button type="button" onClick={() => abrirLeitorCamera('triagem')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-3 rounded-lg transition flex items-center gap-2">
                      <QrCode className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Pacote / Etiqueta *</label>
                  {!fotoEtiquetaUrl ? (
                    <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition group">
                      <Camera className="w-8 h-8 text-slate-400 group-hover:text-emerald-500" />
                      <span className="text-sm font-medium text-slate-500 group-hover:text-emerald-600">
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
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex justify-center">
                      <img src={fotoEtiquetaUrl} alt="Etiqueta" className="max-h-48 rounded object-cover" />
                      <button type="button" onClick={() => setFotoEtiquetaUrl('')} className="absolute top-4 right-4 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-md">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Observações (Opcional)</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Caixa amassada, perecível..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 mt-4">
                  {loading ? 'Salvando...' : <><CheckCircle2 className="w-5 h-5" /> Salvar Triagem e Reter Pacote</>}
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-slate-800" /> Entrega de Pacotes (Saída)
              </h3>
              <p className="text-xs text-slate-500 mt-1">Busque a unidade ou leia o código de barras para dar baixa.</p>
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={buscaBaixaGeral}
                  onChange={(e) => setBuscaBaixaGeral(e.target.value)}
                  placeholder="Unidade, Bloco ou Código..."
                  className="pl-10 pr-4 py-2 w-64 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button onClick={() => abrirLeitorCamera('baixa')} className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg transition" title="Ler Código de Barras">
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-2 gap-2 snap-x">
            <button
              onClick={() => setAbaBlocoSelecionada('TODOS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition snap-start ${abaBlocoSelecionada === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos os Blocos
            </button>
            {Object.keys(statsDia.retidosPorBloco).map(bloco => (
              <button
                key={bloco}
                onClick={() => setAbaBlocoSelecionada(bloco)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition snap-start flex items-center gap-2 ${abaBlocoSelecionada === bloco ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {bloco} <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[10px]">{statsDia.retidosPorBloco[bloco]}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Pacotes Retidos ({itensRetidosFiltrados.length})
                </h4>

                {itensSelecionadosIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoverEmLoteSelecionados(true);
                      setItemParaMover(null);
                      const primeiro = locaisArmazenamento.find(l => l.ativo !== false);
                      setNovoLocalSelecionado(primeiro ? (primeiro.codigo && primeiro.nome ? `${primeiro.codigo} - ${primeiro.nome}` : primeiro.nome || primeiro) : 'Bancada Principal');
                      setModalMoverLocal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Boxes className="w-3.5 h-3.5" /> Mover {itensSelecionadosIds.length} Selecionados
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {itensRetidosFiltrados.length > 0 ? (
                  itensRetidosFiltrados.map((item: any) => {
                    const selecionado = itensSelecionadosIds.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemSelecao(item.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex gap-3 items-start ${
                          selecionado ? 'border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="mt-1 text-slate-400">
                          {selecionado ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              Apt {item.unidade}{item.bloco ? ` - Bloco ${item.bloco}` : ''}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                            {item.moradores?.nome || 'Morador não vinculado'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            Rastreio: {item.codigo_barras || 'Sem código'}
                          </p>

                          {item.foto_etiqueta_url && (
                            <a 
                              href={item.foto_etiqueta_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={e => e.stopPropagation()} 
                              className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold"
                            >
                              <ExternalLink className="w-3 h-3" /> Ver Foto Etiqueta
                            </a>
                          )}

                          {/* LOCAL FÍSICO COM BOTÃO DE ALTERAR EM 1 CLIQUE */}
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 flex-wrap gap-2">
                            <span className="text-[11px] font-bold text-emerald-950 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                              <Boxes className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="truncate max-w-[180px]">{item.local_armazenamento || 'Bancada Principal'}</span>
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
                              className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer active:scale-95"
                              title="Alterar local físico deste pacote ou agrupar todos desta unidade"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" /> Alterar Local
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                    Nenhum pacote encontrado para os filtros atuais.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Finalizar Entrega (Baixa)</h4>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Pacotes Selecionados:</span>
                <span className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-sm">{itensSelecionadosIds.length}</span>
              </div>

              {itensSelecionadosIds.length > 0 ? (
                <form onSubmit={efetivarBaixaSaida} className="space-y-4 pt-2">
                  
                  {moradoresDasUnidadesBaixa.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Preencher Rapidamente com Morador:</label>
                      <div className="flex flex-wrap gap-2">
                        {moradoresDasUnidadesBaixa.map((m: any) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setNomeRetirante(m.nome)}
                            className="bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 text-xs px-3 py-1.5 rounded-full transition flex items-center gap-1"
                          >
                            <User className="w-3 h-3" /> {m.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Quem está retirando? (Nome / RG) *</label>
                    <input
                      type="text"
                      value={nomeRetirante}
                      onChange={(e) => setNomeRetirante(e.target.value)}
                      placeholder="Nome de quem pegou o pacote..."
                      required
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Comprovante de Entrega (Foto) *</label>
                    {!fotoRetiranteUrl ? (
                      <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 cursor-pointer rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition group">
                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                        <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-600 text-center">
                          {uploadingFoto ? 'Enviando...' : 'Tirar Foto da Assinatura / Retirante'}
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
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex justify-center">
                        <img src={fotoRetiranteUrl} alt="Comprovante" className="max-h-32 rounded object-cover" />
                        <button type="button" onClick={() => setFotoRetiranteUrl('')} className="absolute top-4 right-4 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 mt-4 shadow-md">
                    {loading ? 'Processando...' : <><UserCheck className="w-5 h-5" /> Confirmar Entrega</>}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm text-center">
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
                    Apt {itemParaMover.unidade}{itemParaMover.bloco ? ` - Bloco ${itemParaMover.bloco}` : ''}
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
                    Agrupar todas as encomendas do Apt {itemParaMover.unidade}{itemParaMover.bloco ? ` - Bloco ${itemParaMover.bloco}` : ''}
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
    </div>
  );
}

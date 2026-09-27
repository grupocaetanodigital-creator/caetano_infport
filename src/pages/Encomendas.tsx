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
  Edit3,
  Info
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
  const [suportaLeitorNativo, setSuportaLeitorNativo] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [buscaBaixaGeral, setBuscaBaixaGeral] = useState('');
  const [abaBlocoSelecionada, setAbaBlocoSelecionada] = useState('TODOS');
  
  // ESTADOS DA BAIXA E MENUS FLUTUANTES
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<string[]>([]);
  const [modalBaixaAberta, setModalBaixaAberta] = useState(false);
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [fotoRetiranteUrl, setFotoRetiranteUrl] = useState('');
  const [baixaConcluidaWhats, setBaixaConcluidaWhats] = useState<any | null>(null);

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
    // Verifica suporte ao BarcodeDetector na inicialização
    if (!('BarcodeDetector' in window)) {
      setSuportaLeitorNativo(false);
    }
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
        localStorage.setItem(`infport_locais_${usuarioLogado.condominio_id}`, JSON.stringify(data));
        const primeiroAtivo = data[0];
        setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
        return;
      }

      // Se o banco não tem locais salvos para este condomínio, usa locais padrão para não travar a guarita
      if (!cached || locaisArmazenamento.length === 0) {
        const locaisPadrao = [
          { id: 'padrao_1', codigo: 'PRAT-A1', nome: 'Prateleira A1', ativo: true },
          { id: 'padrao_2', codigo: 'PRAT-A2', nome: 'Prateleira A2', ativo: true },
          { id: 'padrao_3', codigo: 'GAV-01', nome: 'Gaveta 01 (Documentos)', ativo: true },
          { id: 'padrao_4', codigo: 'ARM-01', nome: 'Armário 01 (Valores)', ativo: true },
          { id: 'padrao_5', codigo: 'CHAO-01', nome: 'Chão / Volumosos', ativo: true },
          { id: 'padrao_6', codigo: 'BANCADA', nome: 'Bancada Principal', ativo: true }
        ];
        setLocaisArmazenamento(locaisPadrao);
        setLocalArmazenamentoTriagem('BANCADA - Bancada Principal');
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
    if (modalLeitor && suportaLeitorNativo) {
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
  }, [modalLeitor, destinoLeitor, suportaLeitorNativo]);

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

      if (itemErr && (itemErr.message?.includes('local_armazenamento') || (itemErr as any).code === '42703' || itemErr.message?.includes('schema cache'))) {
        delete payloadItem.local_armazenamento;
        const retry = await supabase.from('encomendas_itens').insert([payloadItem]).select().maybeSingle();
        itemErr = retry.error;
        itemInserido = retry.data;
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
          const itensMesmaUnidade = todosItensRetidos.filter(
            i => i.unidade === itemParaMover.unidade && (itemParaMover.bloco ? i.bloco === itemParaMover.bloco : true)
          );
          idsParaAtualizar = itensMesmaUnidade.map(i => i.id);
        } else {
          idsParaAtualizar = [itemParaMover.id];
        }
      }

      if (idsParaAtualizar.length === 0) return;

      const { error } = await supabase
        .from('encomendas_itens')
        .update({ local_armazenamento: novoLocalSelecionado })
        .in('id', idsParaAtualizar);

      if (error) throw error;

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

  const toggleItemSelecao = (id: string) => {
    if (itensSelecionadosIds.includes(id)) {
      const novos = itensSelecionadosIds.filter(item => item !== id);
      setItensSelecionadosIds(novos);
      // Se não houver mais pacotes selecionados, fechamos o modal flutuante caso esteja aberto
      if (novos.length === 0) setModalBaixaAberta(false);
    } else {
      setItensSelecionadosIds([...itensSelecionadosIds, id]);
    }
  };

  const itensSelecionadosObjetos = todosItensRetidos.filter(i => itensSelecionadosIds.includes(i.id));
  
  const moradoresDasUnidadesBaixa = moradores.filter(m => 
    itensSelecionadosObjetos.some(item => 
      String(item.unidade).toLowerCase() === String(m.unidade).toLowerCase() &&
      (!item.bloco || String(item.bloco).toLowerCase() === String(m.bloco || '').toLowerCase())
    )
  );

  const efetivarBaixaSaida = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    
    if (itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome do retirante e tire a foto.' });
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
    <div className="space-y-2 relative pb-20">
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

      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Pacotes Retidos por Bloco:
          </h4>
          <span className="text-[11px] font-mono font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
            Total: {todosItensRetidos.length} vol.
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-0.5">
          {Object.keys(statsDia.retidosPorBloco).length > 0 ? (
            Object.entries(statsDia.retidosPorBloco).map(([blocoNome, qtd]) => (
              <button 
                key={blocoNome} 
                onClick={() => { setEtapa('3'); setAbaBlocoSelecionada(blocoNome); }}
                className="bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs transition"
              >
                <span className="font-bold text-slate-200 text-[11px]">{blocoNome}:</span>
                <span className="font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px]">
                  {qtd} {qtd === 1 ? 'pct' : 'pcts'}
                </span>
              </button>
            ))
          ) : (
            <p className="text-[11px] text-slate-400 italic">Nenhuma encomenda retida no momento.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <button
          onClick={() => setEtapa('1')}
          className={`p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '1' ? 'border-slate-900 bg-slate-100 font-black' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">1ª Etapa</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-700" /> <span className="hidden sm:inline">Recebimento</span> (RE)</strong>
        </button>

        <button
          onClick={() => setEtapa('2')}
          className={`p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '2' ? 'border-slate-900 bg-slate-100 font-black' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">2ª Etapa</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5 text-slate-700" /> Triagem</strong>
        </button>

        <button
          onClick={() => setEtapa('3')}
          className={`p-2.5 text-center border-b-2 transition cursor-pointer ${etapa === '3' ? 'border-slate-900 bg-slate-100 font-black' : 'border-transparent hover:bg-slate-50'}`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">3ª Etapa</span>
          <strong className="text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-1"><UserCheck className="w-3.5 h-3.5 text-slate-700" /> Saída / Baixa</strong>
        </button>
      </div>

      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* 1ª ETAPA */}
      {etapa === '1' && (
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-slate-800" /> Recebimento de Entrega (RE)
            </h3>
            <button
              onClick={() => setModalNovoEntregador(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Entregador
            </button>
          </div>

          <form onSubmit={criarLoteRE} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Buscar / Selecionar Entregador *</label>
              
              {!entregadorSelecionado ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={buscaEntregador}
                      onChange={(e) => setBuscaEntregador(e.target.value)}
                      placeholder="Digite o nome, empresa ou documento..."
                      className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
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
                          className="p-3 hover:bg-slate-50 cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">{ent.nome}</p>
                            <p className="text-xs text-slate-500">
                              {ent.empresa ? `Empresa: ${ent.empresa}` : 'Avulso'} | Doc: {ent.documento || 'Sem doc'}
                            </p>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                            Selecionar
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500 italic text-center">
                        Nenhum entregador encontrado com esse termo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">Entregador Selecionado</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{entregadorSelecionado.nome}</h4>
                    <p className="text-xs text-slate-500">
                      Empresa: {entregadorSelecionado.empresa || 'Avulso'} | Doc: {entregadorSelecionado.documento || 'Sem doc'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setEntregadorSelecionado(null)} className="text-red-500 hover:text-red-700 p-2 cursor-pointer bg-white rounded-lg border border-slate-200 shadow-sm">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Quantidade de Volumes (Declarada) *</label>
              <input 
                type="number" 
                inputMode="numeric" 
                pattern="[0-9]*" 
                min="1" 
                value={qtdDeclarada} 
                onChange={(e) => setQtdDeclarada(e.target.value)} 
                required 
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition" 
              />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm disabled:opacity-50 cursor-pointer shadow-md">
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
                <a href={loteCriadoWhats.link} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <button onClick={() => setLoteCriadoWhats(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold transition">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2ª ETAPA */}
      {etapa === '2' && (
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Package className="w-5 h-5 text-slate-800" /> Triagem de Pacotes do Lote
            </h3>
            <p className="text-xs text-slate-500">Vincule os pacotes recebidos à unidade para notificar o morador.</p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">1. Selecione o Lote Pendente *</label>
              <select
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
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
              <form onSubmit={salvarItemTriagem} className="space-y-3.5 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Bloco</label>
                    <select
                      value={blocoTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    >
                      <option value="">Nenhum/Único</option>
                      {blocosDisponiveis.map((b: any) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Unidade / AP *</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={unidadeTriagem}
                      onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                      placeholder="Ex: 101"
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>
                </div>

                {alertaAgrupamento && (
                  <div className="bg-amber-50 text-amber-950 p-3 rounded-xl border border-amber-300 space-y-2 shadow-2xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs flex-1">
                        <p className="font-bold text-amber-900">
                          Já existem {alertaAgrupamento.qtd} pacote(s) retido(s) para esta unidade.
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-amber-800 font-semibold">Local atual:</span>
                          {alertaAgrupamento.locais && alertaAgrupamento.locais.map((loc: string, idx: number) => (
                            <span key={idx} className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
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
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        <Boxes className="w-4 h-4" />
                        Agrupar no mesmo local ({alertaAgrupamento.locais[0]})
                      </button>
                    )}
                  </div>
                )}

                {moradoresDaUnidade.length > 0 && (
                  <div className="space-y-1.5 bg-blue-50/80 p-3 rounded-xl border border-blue-200">
                    <label className="block text-xs font-bold text-blue-800 uppercase">Destinatário</label>
                    <select
                      className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setMoradorSelecionado(moradoresDaUnidade.find(m => m.id === e.target.value))}
                      value={moradorSelecionado?.id || ''}
                    >
                      {moradoresDaUnidade.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} (Tel: {m.telefone || 'Sem tel'})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    Local de Armazenamento na Portaria *
                  </label>
                  <select
                    value={localArmazenamentoTriagem}
                    onChange={(e) => setLocalArmazenamentoTriagem(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
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

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Código de Barras / Rastreio</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Escaneie ou digite..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                    />
                    <button type="button" onClick={() => abrirLeitorCamera('triagem')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm">
                      <QrCode className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Foto do Pacote / Etiqueta *</label>
                  {!fotoEtiquetaUrl ? (
                    <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition bg-slate-50">
                      <Camera className="w-6 h-6 text-emerald-600" />
                      <span className="text-sm font-bold text-slate-700">
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
                      <img src={fotoEtiquetaUrl} alt="Etiqueta" className="max-h-40 rounded-lg object-cover" />
                      <button type="button" onClick={() => setFotoEtiquetaUrl('')} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-md cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Observações (Opcional)</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Caixa amassada, frágil..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm disabled:opacity-50 cursor-pointer mt-4 shadow-md">
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
                  <a href={itemTriadoWhats.link} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition">
                    <MessageCircle className="w-4 h-4" /> Avisar Morador
                  </a>
                  <button onClick={() => setItemTriadoWhats(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold transition">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3ª ETAPA */}
      {etapa === '3' && (
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-2xs border border-slate-200 space-y-3">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-slate-800" /> Entrega de Pacotes (Saída)
              </h3>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={buscaBaixaGeral}
                  onChange={(e) => setBuscaBaixaGeral(e.target.value)}
                  placeholder="Unidade, Bloco ou Código..."
                  className="pl-9 pr-3 py-2 w-full bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>
              <button onClick={() => abrirLeitorCamera('baixa')} className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg transition shrink-0 cursor-pointer shadow-sm" title="Ler Código de Barras">
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-2 gap-1.5 snap-x">
            <button
              onClick={() => setAbaBlocoSelecionada('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition snap-start cursor-pointer ${abaBlocoSelecionada === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos os Blocos
            </button>
            {Object.keys(statsDia.retidosPorBloco).map(bloco => (
              <button
                key={bloco}
                onClick={() => setAbaBlocoSelecionada(bloco)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition snap-start flex items-center gap-1.5 cursor-pointer ${abaBlocoSelecionada === bloco ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {bloco} <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[10px] font-mono shadow-inner">{statsDia.retidosPorBloco[bloco]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Pacotes Retidos ({itensRetidosFiltrados.length})
                </h4>

                <div className="flex gap-2">
                  {itensSelecionadosIds.length > 0 && !baixaConcluidaWhats && (
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
                      <Boxes className="w-4 h-4" /> Mover Selecionados
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {itensRetidosFiltrados.length > 0 ? (
                  itensRetidosFiltrados.map((item: any) => {
                    const selecionado = itensSelecionadosIds.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemSelecao(item.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex gap-3 items-start ${
                          selecionado ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/30' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-1 text-slate-400 shrink-0">
                          {selecionado ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              Apt {item.unidade}{item.bloco ? ` - Bloco ${item.bloco}` : ''}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                            {item.moradores?.nome || 'Morador não vinculado'}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-500 font-mono mt-0.5">
                            <span className="truncate max-w-[200px]">
                              {(() => {
                                const cod = item.codigo_barras?.trim();
                                if (!cod) return 'Rastreio: Sem código';
                                if (cod.startsWith('http')) return 'Rastreio: Link/QR';
                                return `Rast: ${cod}`;
                              })()}
                            </span>
                            {item.foto_etiqueta_url && (
                              <a 
                                href={item.foto_etiqueta_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                onClick={e => e.stopPropagation()} 
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold shrink-0 bg-blue-50 px-2 py-0.5 rounded"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver Foto
                              </a>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 flex-wrap gap-2">
                            <span className="text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded flex items-center gap-1.5">
                              <Boxes className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-sm"
                              title="Alterar local físico deste pacote"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Alterar Local
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    Nenhum pacote encontrado para os filtros atuais.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. BARRA DE AÇÃO FLUTUANTE (FAB) PARA INICIAR A BAIXA    */}
      {/* ======================================================== */}
      {etapa === '3' && itensSelecionadosIds.length > 0 && !modalBaixaAberta && !baixaConcluidaWhats && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-slate-900 text-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.24)] p-4 flex justify-between items-center z-30 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-inner">
               {itensSelecionadosIds.length}
             </div>
             <span className="text-sm font-bold leading-tight">
               Pacotes <br/>
               <span className="text-xs text-slate-300 font-normal">Selecionados</span>
             </span>
          </div>
          <button 
            onClick={() => setModalBaixaAberta(true)} 
            className="bg-emerald-500 hover:bg-emerald-600 px-5 py-3 rounded-xl text-sm font-black shadow-lg cursor-pointer flex items-center gap-2 transition"
          >
            Finalizar Entrega <UserCheck className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MENU FLUTUANTE (BOTTOM SHEET MODAL) DE BAIXA/CONFERÊNCIA */}
      {/* ======================================================== */}
      {(modalBaixaAberta || baixaConcluidaWhats) && etapa === '3' && (
        <div className="fixed inset-0 z-40 flex justify-center items-end bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-slate-50 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            {/* CABEÇALHO DO MENU FLUTUANTE */}
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
                  <UserCheck className="w-5 h-5 text-emerald-600" /> 
                  Conferência e Retirada
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Valide os itens e colha a assinatura</p>
              </div>
              {!baixaConcluidaWhats && (
                <button 
                  onClick={() => setModalBaixaAberta(false)} 
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* CONTEÚDO SCROLLÁVEL DO MENU FLUTUANTE */}
            <div className="overflow-y-auto p-4 space-y-4">
              {baixaConcluidaWhats ? (
                 <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 shadow-inner">
                   <div className="flex justify-center">
                     <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                   </div>
                   <p className="text-xl font-black text-emerald-900">Entrega Finalizada!</p>
                   <a 
                     href={baixaConcluidaWhats.link} 
                     target="_blank" 
                     rel="noreferrer" 
                     className="bg-green-500 hover:bg-green-600 text-white px-4 py-3.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition w-full shadow-sm"
                   >
                     <MessageCircle className="w-5 h-5" /> Enviar Recibo no WhatsApp
                   </a>
                   <button 
                     onClick={() => { setBaixaConcluidaWhats(null); setItensSelecionadosIds([]); setModalBaixaAberta(false); }} 
                     className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-3.5 rounded-xl text-sm font-bold transition mt-2 cursor-pointer"
                   >
                     Fechar e Voltar
                   </button>
                 </div>
              ) : (
                 <>
                   {/* ÁREA DE CONFERÊNCIA FÍSICA (LISTA COMPACTA DOS PACOTES) */}
                   <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
                        <span>Pacotes Selecionados para Entrega</span>
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono text-xs">{itensSelecionadosIds.length}</span>
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm max-h-48 overflow-y-auto">
                        {itensSelecionadosObjetos.map(item => (
                          <div key={item.id} className="p-3 flex justify-between items-center gap-3 hover:bg-slate-50 transition">
                             <div className="min-w-0">
                               <div className="flex items-center gap-2">
                                 <span className="text-xs font-black uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                   Apt {item.unidade}{item.bloco ? `-${item.bloco}` : ''}
                                 </span>
                                 <span className="text-xs font-bold text-slate-700 truncate">{item.moradores?.nome || 'Sem morador'}</span>
                               </div>
                               <div className="text-[11px] text-slate-500 font-mono mt-1.5 truncate">
                                 Loc: {item.local_armazenamento || 'Não definido'} | Rast: {item.codigo_barras || 'Sem Cód'}
                               </div>
                             </div>
                             <button 
                               onClick={() => toggleItemSelecao(item.id)} 
                               className="text-red-500 hover:bg-red-50 p-2.5 rounded-lg shrink-0 cursor-pointer transition"
                               title="Remover pacote da entrega"
                             >
                               <X className="w-5 h-5" />
                             </button>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* FORMULÁRIO DE QUEM ESTÁ RETIRANDO */}
                   <form id="form-baixa-flutuante" onSubmit={efetivarBaixaSaida} className="space-y-4 pt-3 border-t border-slate-200">
                     {moradoresDasUnidadesBaixa.length > 0 && (
                       <div className="space-y-2">
                         <label className="block text-[11px] font-bold text-slate-700 uppercase">Preencher rápido com morador vinculado:</label>
                         <div className="flex flex-wrap gap-2">
                           {moradoresDasUnidadesBaixa.map((m: any) => (
                             <button
                               key={m.id}
                               type="button"
                               onClick={() => setNomeRetirante(m.nome)}
                               className="bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                             >
                               <User className="w-4 h-4" /> {m.nome}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}

                     <div className="space-y-1.5">
                       <label className="block text-[11px] font-bold text-slate-700 uppercase">Nome de quem está retirando *</label>
                       <input
                         type="text"
                         value={nomeRetirante}
                         onChange={(e) => setNomeRetirante(e.target.value)}
                         placeholder="Ex: João da Silva (Titular) ou RG..."
                         required
                         className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 transition shadow-sm"
                       />
                     </div>

                     <div className="space-y-1.5 pb-2">
                       <label className="block text-[11px] font-bold text-slate-700 uppercase">Comprovante (Assinatura ou Foto do Rosto) *</label>
                       {!fotoRetiranteUrl ? (
                         <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 cursor-pointer rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition">
                           <Camera className="w-8 h-8 text-emerald-600" />
                           <span className="text-sm font-bold text-slate-700">
                             {uploadingFoto ? 'Enviando...' : 'Capturar Comprovante da Entrega'}
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
                         <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex justify-center shadow-sm">
                           <img src={fotoRetiranteUrl} alt="Comprovante" className="max-h-48 rounded-lg object-cover" />
                           <button 
                             type="button" 
                             onClick={() => setFotoRetiranteUrl('')} 
                             className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg cursor-pointer"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                     </div>
                   </form>
                 </>
              )}
            </div>
            
            {/* RODAPÉ DO MENU FLUTUANTE (Apenas exibido se a baixa não foi concluída) */}
            {!baixaConcluidaWhats && (
              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <button 
                  type="submit" 
                  form="form-baixa-flutuante" 
                  disabled={loading || itensSelecionadosIds.length === 0} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm cursor-pointer shadow-lg"
                >
                  {loading ? 'Processando Baixa...' : <><UserCheck className="w-5 h-5" /> Confirmar Entrega ({itensSelecionadosIds.length})</>}
                </button>
              </div>
            )}

          </div>
        </div>
      )}


      {/* MODAL CADASTRAR ENTREGADOR */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Novo Entregador</h3>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={cadastrarEntregadorRapido} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Nome Completo *</label>
                <input type="text" required value={novoEntNome} onChange={e => setNovoEntNome(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Documento (RG/CPF)</label>
                <input type="text" value={novoEntDoc} onChange={e => setNovoEntDoc(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Empresa / Transportadora</label>
                <input type="text" value={novoEntEmpresa} onChange={e => setNovoEntEmpresa(e.target.value)} placeholder="Ex: Correios, Mercado Livre..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl mt-4 transition shadow-sm">
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
            <button onClick={fecharLeitorCamera} className="bg-white/20 text-white p-2 rounded-full hover:bg-white/30 cursor-pointer"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {erroCamera ? (
              <div className="text-white text-center p-6 bg-red-900/50 rounded-xl m-4 border border-red-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                <p className="text-sm font-bold">{erroCamera}</p>
                <p className="text-xs mt-2 text-red-200">Verifique as permissões de câmera do navegador.</p>
              </div>
            ) : !suportaLeitorNativo ? (
              <div className="text-white text-center p-6 bg-amber-900/50 rounded-xl m-4 border border-amber-500">
                <Info className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                <p className="text-sm font-bold">Leitor Nativo Incompatível</p>
                <p className="text-xs mt-2 text-amber-200">O navegador deste dispositivo não suporta o leitor nativo de códigos de barra (BarcodeDetector). Por favor, digite o código manualmente no campo de texto.</p>
                <button onClick={fecharLeitorCamera} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold">Voltar e Digitar</button>
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
          <div className="p-6 bg-black text-center text-white text-xs opacity-80">
            A câmera lerá automaticamente o código de barras ou QR Code do pacote.
          </div>
        </div>
      )}

      {/* MODAL ALTERAR / MOVER LOCAL FÍSICO DE ENCOMENDAS */}
      {modalMoverLocal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Boxes className="w-6 h-6 text-emerald-600" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {moverEmLoteSelecionados ? 'Mover Encomendas' : 'Alterar Local Físico'}
                  </h3>
                  <p className="text-xs text-slate-500">Reorganização física dos pacotes</p>
                </div>
              </div>
              <button 
                onClick={() => setModalMoverLocal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {moverEmLoteSelecionados ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-sm space-y-1 text-emerald-950 font-medium">
                <p className="font-bold text-base text-emerald-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-700" />
                  {itensSelecionadosIds.length} pacote(s) selecionado(s)
                </p>
                <p className="text-xs text-emerald-800 mt-1">
                  Todos os pacotes selecionados serão movidos em lote para o novo local escolhido abaixo.
                </p>
              </div>
            ) : itemParaMover ? (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm space-y-1.5">
                <p className="font-bold text-base text-slate-900">Apt {itemParaMover.unidade}{itemParaMover.bloco ? ` - Bloco ${itemParaMover.bloco}` : ''}</p>
                <p className="text-slate-600 text-xs">Morador: {itemParaMover.moradores?.nome || 'N/A'}</p>
                <p className="text-slate-600 text-xs">Local Atual: <span className="font-bold text-slate-800">{itemParaMover.local_armazenamento || 'Bancada Principal'}</span></p>
                
                <label className="flex items-center gap-2 mt-4 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition shadow-sm">
                  <input 
                    type="checkbox" 
                    checked={moverTodosDaUnidade} 
                    onChange={(e) => setMoverTodosDaUnidade(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700 text-xs">Mover todos os pacotes desta unidade juntos</span>
                </label>
              </div>
            ) : null}

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Novo Local de Armazenamento *</label>
              <select
                value={novoLocalSelecionado}
                onChange={(e) => setNovoLocalSelecionado(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="">Selecione o novo local...</option>
                {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                  const valorFormatado = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                  return (
                    <option key={loc.id || loc.codigo || loc} value={valorFormatado}>
                      📦 {valorFormatado}
                    </option>
                  );
                })}
                {locaisArmazenamento.length === 0 && (
                  <option value="Bancada Principal">📦 Bancada Principal</option>
                )}
              </select>
            </div>

            <button
              onClick={executarMudancaLocal}
              disabled={loading || !novoLocalSelecionado}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-lg mt-2 text-sm"
            >
              {loading ? 'Movendo...' : <><Boxes className="w-5 h-5" /> Confirmar Mudança</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

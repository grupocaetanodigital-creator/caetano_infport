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
  ShieldAlert, 
  Camera,
  QrCode,
  Scan,
  VideoOff
} from 'lucide-react';

export default function Encomendas({ usuarioLogado }) {
  const [etapa, setEtapa] = useState('1'); // '1' = Recebimento Lote RE, '2' = Triagem, '3' = Baixa/Saída
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Listas do Banco
  const [entregadores, setEntregadores] = useState([]);
  const [lotesPendentes, setLotesPendentes] = useState([]);
  const [moradores, setMoradores] = useState([]);

  // Estados 1ª ETAPA: Recebimento de Lote RE
  const [buscaEntregador, setBuscaEntregador] = useState('');
  const [entregadorSelecionado, setEntregadorSelecionado] = useState(null);
  const [qtdDeclarada, setQtdDeclarada] = useState(1);
  const [modalNovoEntregador, setModalNovoEntregador] = useState(false);
  const [novoEntNome, setNovoEntNome] = useState('');
  const [novoEntDoc, setNovoEntDoc] = useState('');
  const [novoEntEmpresa, setNovoEntEmpresa] = useState('');
  const [loteCriadoWhats, setLoteCriadoWhats] = useState(null);

  // Estados 2ª ETAPA: Triagem Individual
  const [loteAtivo, setLoteAtivo] = useState(null);
  const [unidadeTriagem, setUnidadeTriagem] = useState('');
  const [blocoTriagem, setBlocoTriagem] = useState('');
  const [moradoresDaUnidade, setMoradoresDaUnidade] = useState([]);
  const [moradorSelecionado, setMoradorSelecionado] = useState(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alertaAgrupamento, setAlertaAgrupamento] = useState(null);
  const [itemTriadoWhats, setItemTriadoWhats] = useState(null);

  // Estados do Leitor de Código de Barras / QR Code
  const [modalLeitor, setModalLeitor] = useState(false);
  const [erroCamera, setErroCamera] = useState('');
  const videoRef = useRef(null);

  // Estados 3ª ETAPA: Saída / Baixa
  const [buscaBaixaUnidade, setBuscaBaixaUnidade] = useState('');
  const [buscaBaixaBloco, setBuscaBaixaBloco] = useState('');
  const [itensParaBaixa, setItensParaBaixa] = useState([]);
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState([]);
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [fotoRetiranteUrl, setFotoRetiranteUrl] = useState('');
  const [baixaConcluidaWhats, setBaixaConcluidaWhats] = useState(null);

  useEffect(() => {
    carregarDadosBase();
  }, [etapa]);

  const carregarDadosBase = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);
    try {
      // Carregar Entregadores
      const { data: entData } = await supabase
        .from('entregadores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setEntregadores(entData || []);

      // Carregar Lotes Pendentes
      const { data: lotesData } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });
      setLotesPendentes(lotesData || []);

      // Carregar Todos os Moradores
      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');
      setMoradores(moradData || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Alerta sonoro nativo via Web Audio API
  const tocarAlertaSonoro = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
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
      console.log('Audio API indisponível', e);
    }
  };

  const tocarBipSucesso = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
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
      console.log('Audio API indisponível', e);
    }
  };

  // Upload no Supabase Storage
  const uploadFotoStorage = async (file, pastaDestino, setUrlCallback) => {
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
      setMensagem({ tipo: 'sucesso', texto: 'Foto capturada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  // -------------------------------------------------------------
  // LEITOR DE CÓDIGO DE BARRAS E QR CODE
  // -------------------------------------------------------------
  const abrirLeitorCamera = async () => {
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
    } catch (err) {
      setErroCamera('Não foi possível aceder à câmara: ' + err.message);
    }
  };

  const fecharLeitorCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setModalLeitor(false);
  };

  useEffect(() => {
    let intervalId = null;
    if (modalLeitor) {
      intervalId = setInterval(async () => {
        if ('BarcodeDetector' in window && videoRef.current && videoRef.current.readyState === 4) {
          try {
            const barcodeDetector = new window.BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf']
            });
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const valorLido = barcodes[0].rawValue;
              setCodigoBarras(valorLido);
              tocarBipSucesso();
              fecharLeitorCamera();
              setMensagem({ tipo: 'sucesso', texto: `Código de rastreio extraído: ${valorLido}` });
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
  }, [modalLeitor]);

  const escanearFotoEtiquetaFicheiro = async (file) => {
    if (!file) return;
    if (!('BarcodeDetector' in window)) {
      setMensagem({ tipo: 'erro', texto: 'O seu navegador não suporta a leitura automática de código de barras em imagens.' });
      return;
    }
    try {
      const imageBitmap = await createImageBitmap(file);
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf']
      });
      const barcodes = await barcodeDetector.detect(imageBitmap);
      if (barcodes.length > 0) {
        const codigoLido = barcodes[0].rawValue;
        setCodigoBarras(codigoLido);
        tocarBipSucesso();
        setMensagem({ tipo: 'sucesso', texto: `Código extraído automaticamente da foto: ${codigoLido}` });
      }
    } catch (err) {
      console.log('Leitura de código por imagem falhou:', err);
    }
  };

  // -------------------------------------------------------------
  // 1ª ETAPA: RECEBIMENTO DO LOTE RE
  // -------------------------------------------------------------
  const entregadoresFiltrados = entregadores.filter(ent => {
    const termo = buscaEntregador.toLowerCase();
    const nome = ent.nome?.toLowerCase() || '';
    const empresa = ent.empresa?.toLowerCase() || '';
    const doc = ent.documento?.toLowerCase() || '';
    return nome.includes(termo) || empresa.includes(termo) || doc.includes(termo);
  });

  const cadastrarEntregadorRapido = async (e) => {
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
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const criarLoteRE = async (e) => {
    e.preventDefault();
    if (!entregadorSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um entregador da lista.' });
      return;
    }
    setLoading(true);

    try {
      const hoje = new Date();
      const dataStr = `${String(hoje.getDate()).padStart(2, '0')}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getFullYear()).slice(-2)}`;
      const operSigla = usuarioLogado?.login?.toUpperCase() || 'OPER001';
      const seq = Math.floor(100 + Math.random() * 900);
      const codigoRE = `RE:${dataStr}${operSigla}${seq}`;

      const { data, error } = await supabase
        .from('lotes_re')
        .insert([{
          codigo_re: codigoRE,
          condominio_id: usuarioLogado.condominio_id,
          entregador_id: entregadorSelecionado.id,
          qtd_declarada: parseInt(qtdDeclarada),
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
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2ª ETAPA: TRIAGEM INDIVIDUAL
  // -------------------------------------------------------------
  const buscarMoradoresEChecarAgrupamento = async (unid, bloc) => {
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
      setAlertaAgrupamento({
        qtd: itensRetidos.length,
        unidade: unid,
        bloco: bloc
      });
    } else {
      setAlertaAgrupamento(null);
    }
  };

  const salvarItemTriagem = async (e) => {
    e.preventDefault();
    if (!loteAtivo || !unidadeTriagem.trim() || !fotoEtiquetaUrl.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha a unidade e tire a foto da encomenda.' });
      return;
    }
    setLoading(true);

    try {
      const { error: itemErr } = await supabase
        .from('encomendas_itens')
        .insert([{
          lote_re_id: loteAtivo.id,
          condominio_id: usuarioLogado.condominio_id,
          bloco: blocoTriagem.trim(),
          unidade: unidadeTriagem.trim(),
          morador_id: moradorSelecionado?.id || null,
          codigo_barras: codigoBarras.trim(),
          foto_etiqueta_url: fotoEtiquetaUrl.trim(),
          observacoes: observacoes.trim(),
          status: 'retido'
        }]);

      if (itemErr) throw itemErr;

      const novaQtdTriada = (loteAtivo.qtd_triada || 0) + 1;
      const novoStatusLote = novaQtdTriada >= loteAtivo.qtd_declarada ? 'concluido' : 'em_triagem';

      await supabase
        .from('lotes_re')
        .update({ qtd_triada: novaQtdTriada, status: novoStatusLote })
        .eq('id', loteAtivo.id);

      const telMorador = moradorSelecionado?.telefone?.replace(/\D/g, '') || '';
      const nomeDestinatario = moradorSelecionado ? moradorSelecionado.nome : 'Morador';
      
      const textoWhatsMorador = `Olá, ${nomeDestinatario} (Apt ${unidadeTriagem}${blocoTriagem ? ' - Bloco ' + blocoTriagem : ''})! 📦\n\nSua encomenda acabou de chegar na Portaria.\n• Destinatário: ${nomeDestinatario}\n• Código/Lote: ${loteAtivo.codigo_re}\n• Cód. Rastreio: ${codigoBarras || 'N/A'}\n• Observação: ${observacoes || 'Nenhuma'}\n• Foto do Pacote: ${fotoEtiquetaUrl}\n\nPor favor, retire na portaria assim que possível!`;

      setItemTriadoWhats({
        destinatario: nomeDestinatario,
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoWhatsMorador)}` : `https://wa.me/?text=${encodeURIComponent(textoWhatsMorador)}`
      });

      setUnidadeTriagem(''); setBlocoTriagem(''); setMoradorSelecionado(null); setMoradoresDaUnidade([]);
      setCodigoBarras(''); setFotoEtiquetaUrl(''); setObservacoes('');
      setAlertaAgrupamento(null);
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: 'Pacote triado e registrado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3ª ETAPA: SAÍDA / BAIXA DE ENCOMENDAS
  // -------------------------------------------------------------
  const buscarItensParaBaixa = async (e) => {
    if (e) e.preventDefault();
    if (!buscaBaixaUnidade.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite o número da unidade para buscar.' });
      return;
    }
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });
    setBaixaConcluidaWhats(null);

    try {
      let query = supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('unidade', buscaBaixaUnidade.trim())
        .eq('status', 'retido');

      if (buscaBaixaBloco.trim()) {
        query = query.eq('bloco', buscaBaixaBloco.trim());
      }

      const { data, error } = await query;
      if (error) throw error;

      setItensParaBaixa(data || []);
      setItensSelecionadosIds((data || []).map(i => i.id));

      if (!data || data.length === 0) {
        setMensagem({ tipo: 'erro', texto: 'Nenhuma encomenda pendente encontrada para esta unidade.' });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelecao = (id) => {
    if (itensSelecionadosIds.includes(id)) {
      setItensSelecionadosIds(itensSelecionadosIds.filter(item => item !== id));
    } else {
      setItensSelecionadosIds([...itensSelecionadosIds, id]);
    }
  };

  const efetivarBaixaSaida = async (e) => {
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

      const primeiroItem = itensParaBaixa[0];
      const telMorador = primeiroItem?.moradores?.telefone?.replace(/\D/g, '') || '';
      const textoCruzado = `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*\nUnidade: Apt ${buscaBaixaUnidade}${buscaBaixaBloco ? ' - Bloco ' + buscaBaixaBloco : ''}\n\nInformamos que o(s) pacote(s) foram RETIRADOS da portaria:\n• Qtd de Volumes Retirados: ${itensSelecionadosIds.length}\n• Quem Retirou: ${nomeRetirante}\n• Comprovante da Entrega: ${fotoRetiranteUrl}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setBaixaConcluidaWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoCruzado)}` : `https://wa.me/?text=${encodeURIComponent(textoCruzado)}`
      });

      setItensParaBaixa([]);
      setItensSelecionadosIds([]);
      setNomeRetirante(''); setFotoRetiranteUrl('');
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída realizada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const totalPacotesPendentes = lotesPendentes.reduce((acc, l) => acc + (l.qtd_declarada - l.qtd_triada), 0);

  return (
    <div className="space-y-6">
      {/* Alerta Superior de Status dos Lotes */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Lotes em Triagem Pendentes</h4>
            <p className="text-xs text-amber-700">
              {lotesPendentes.length} lote(s) ativo(s) com um total de <strong>{totalPacotesPendentes} pacote(s) pendente(s)</strong> para individualizar.
            </p>
          </div>
        </div>
        <button
          onClick={() => setEtapa('2')}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex-shrink-0"
        >
          Ir para Triagem
        </button>
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

      {/* ========================================================================= */}
      {/* 1ª ETAPA — RECEBIMENTO DO LOTE (RE) */}
      {/* ========================================================================= */}
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
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                      Entregador Selecionado
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1">{entregadorSelecionado.nome}</p>
                    <p className="text-xs text-slate-600">
                      {entregadorSelecionado.empresa ? `Empresa: ${entregadorSelecionado.empresa}` : 'Avulso'} • Doc: {entregadorSelecionado.documento || 'Sem doc'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEntregadorSelecionado(null)}
                    className="text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Trocar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Quantidade Total de Volumes Declarados *
              </label>
              <input
                type="number"
                min="1"
                required
                value={qtdDeclarada}
                onChange={(e) => setQtdDeclarada(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-lg font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !entregadorSelecionado}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition shadow-md text-base"
            >
              Criar Lote RE e Gerar Código
            </button>
          </form>

          {loteCriadoWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-2xl">
              <p className="text-xs font-bold text-emerald-900">
                Lote {loteCriadoWhats.codigo} gerado! Dispare o aviso para a gestão:
              </p>
              <a
                href={loteCriadoWhats.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Aviso no WhatsApp da Gestão <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2ª ETAPA — TRIAGEM DO LOTE (INDIVIDUALIZAÇÃO) */}
      {/* ========================================================================= */}
      {etapa === '2' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seleção do Lote */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">1. Selecione o Lote em Triagem</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lotesPendentes.map(lote => (
                <div
                  key={lote.id}
                  onClick={() => setLoteAtivo(lote)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    loteAtivo?.id === lote.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                >
                  <strong className="text-xs block font-mono">{lote.codigo_re}</strong>
                  <p className="text-xs opacity-80">{lote.entregadores?.nome} ({lote.entregadores?.empresa})</p>
                  <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded mt-1 inline-block font-bold">
                    Triados: {lote.qtd_triada} / {lote.qtd_declarada}
                  </span>
                </div>
              ))}
              {lotesPendentes.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Nenhum lote pendente de triagem no momento.
                </p>
              )}
            </div>
          </div>

          {/* Formulário de Pacote Individual */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2">
              2. Individualizar Pacote {loteAtivo ? `— Lote ${loteAtivo.codigo_re}` : '(Selecione um lote)'}
            </h3>

            {/* CARD ALERTA DE AGRUPAMENTO */}
            {alertaAgrupamento && (
              <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg animate-pulse space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-6 h-6" /> ⚠️ ATENÇÃO — AGRUPAMENTO DE PACOTES!
                </div>
                <p className="text-xs leading-relaxed">
                  A Unidade <strong>Apt {alertaAgrupamento.unidade} {alertaAgrupamento.bloco ? 'Bloco ' + alertaAgrupamento.bloco : ''}</strong> já possui <strong>{alertaAgrupamento.qtd} pacote(s) retido(s)</strong> na portaria.
                  Por favor, junte este novo pacote aos anteriores no mesmo local físico!
                </p>
              </div>
            )}

            <form onSubmit={salvarItemTriagem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / AP *</label>
                  <input
                    type="text"
                    required
                    value={unidadeTriagem}
                    onChange={(e) => buscarMoradoresEChecarAgrupamento(e.target.value, blocoTriagem)}
                    placeholder="Ex: 24"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco</label>
                  <input
                    type="text"
                    value={blocoTriagem}
                    onChange={(e) => { setBlocoTriagem(e.target.value); buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value); }}
                    placeholder="Ex: A"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* LISTAGEM DE MORADORES */}
              {moradoresDaUnidade.length > 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Selecione o Morador / Destinatário ({moradoresDaUnidade.length} morador(es) na unidade) *
                  </label>
                  <select
                    value={moradorSelecionado?.id || ''}
                    onChange={(e) => {
                      const m = moradoresDaUnidade.find(x => x.id === e.target.value);
                      setMoradorSelecionado(m || null);
                    }}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm"
                  >
                    {moradoresDaUnidade.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} — Tel: {m.telefone || 'Sem telefone'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : unidadeTriagem.trim() !== '' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Nenhum morador cadastrado nesta unidade. O registro será feito genérico.
                </div>
              )}

              {/* CAPTURA DE FOTO */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto da Etiqueta / Pacote *</label>
                <div className="flex gap-2">
                  <label className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-sm">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    <span>{uploadingFoto ? 'A carregar foto...' : fotoEtiquetaUrl ? 'Tirar Outra Foto' : 'Tirar Foto da Encomenda'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          uploadFotoStorage(file, 'etiquetas', setFotoEtiquetaUrl);
                          escanearFotoEtiquetaFicheiro(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {fotoEtiquetaUrl && (
                  <div className="relative w-24 h-24 mt-2 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm">
                    <img src={fotoEtiquetaUrl} alt="Foto da Etiqueta" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* CÓDIGO DE BARRAS / QR CODE / RASTREIO */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Cód. Barras / QR Code / Rastreio (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={abrirLeitorCamera}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <QrCode className="w-4 h-4" /> Ler via Câmara
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="Leitura ou digitação do código..."
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <Scan className="w-5 h-5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Observações / Avarias</label>
                <textarea
                  rows="2"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Caixa levemente amassada"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading || !loteAtivo || !unidadeTriagem || !fotoEtiquetaUrl}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition shadow-md text-base"
              >
                Salvar Pacote na Portaria
              </button>
            </form>

            {itemTriadoWhats && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-emerald-900">
                  Pacote registado! Envie a notificação ao morador ({itemTriadoWhats.destinatario}):
                </p>
                <a
                  href={itemTriadoWhats.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Notificar Morador no WhatsApp <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3ª ETAPA — SAÍDA / BAIXA DE ENCOMENDAS */}
      {/* ========================================================================= */}
      {etapa === '3' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="font-bold text-slate-900 text-lg border-b pb-4 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-slate-800" /> Baixa / Entrega de Encomendas
          </h3>

          <form onSubmit={buscarItensParaBaixa} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / AP *</label>
              <input
                type="text"
                required
                value={buscaBaixaUnidade}
                onChange={(e) => setBuscaBaixaUnidade(e.target.value)}
                placeholder="Ex: 24"
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco (Opcional)</label>
              <input
                type="text"
                value={buscaBaixaBloco}
                onChange={(e) => setBuscaBaixaBloco(e.target.value)}
                placeholder="Ex: A"
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" /> Buscar Encomendas Retidas
              </button>
            </div>
          </form>

          {itensParaBaixa.length > 0 && (
            <form onSubmit={efetivarBaixaSaida} className="space-y-6 border-t pt-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Pacotes Encontrados ({itensParaBaixa.length} volume(s) aguardando retirada)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {itensParaBaixa.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelecao(item.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex gap-3 items-center ${
                        itensSelecionadosIds.includes(item.id) ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={itensSelecionadosIds.includes(item.id)}
                        onChange={() => {}}
                        className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                      />
                      {item.foto_etiqueta_url && (
                        <img src={item.foto_etiqueta_url} alt="Etiqueta" className="w-14 h-14 object-cover rounded-lg border" />
                      )}
                      <div className="text-xs space-y-0.5 flex-1">
                        <p className="font-bold text-slate-900">
                          {item.moradores?.nome ? `Destinatário: ${item.moradores.nome}` : 'Morador Não Especificado'}
                        </p>
                        <p className="text-slate-500 font-mono">Cód: {item.codigo_barras || 'Sem código'}</p>
                        <p className="text-[11px] text-slate-400">Entrada: {new Date(item.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome de Quem Retirou *</label>
                  <input
                    type="text"
                    required
                    value={nomeRetirante}
                    onChange={(e) => setNomeRetirante(e.target.value)}
                    placeholder="Ex: João da Silva (Próprio morador / Filho)"
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Foto de Comprovativo da Entrega *</label>
                  <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition text-xs">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{uploadingFoto ? 'A carregar...' : fotoRetiranteUrl ? 'Foto Tirada (Alterar)' : 'Tirar Foto da Entrega'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) uploadFotoStorage(file, 'retiradas', setFotoRetiranteUrl);
                      }}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || itensSelecionadosIds.length === 0 || !nomeRetirante || !fotoRetiranteUrl}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition shadow-md text-base"
              >
                Efetivar Entrega e Dar Baixa ({itensSelecionadosIds.length} pacote(s))
              </button>
            </form>
          )}

          {baixaConcluidaWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-emerald-900">
                Entrega concluída com sucesso! Envie o comprovativo de saída para o WhatsApp do morador:
              </p>
              <a
                href={baixaConcluidaWhats.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Comprovativo no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LEITOR DE CÓDIGO DE BARRAS / QR CODE VIA CÂMARA */}
      {/* ========================================================================= */}
      {modalLeitor && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" /> Leitor de Código de Barras / QR Code
              </h4>
              <button onClick={fecharLeitorCamera} className="text-slate-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-center">
              {erroCamera ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs space-y-2">
                  <VideoOff className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="font-bold">{erroCamera}</p>
                  <p>Aponte a etiqueta diretamente no campo de foto para extrair o código.</p>
                </div>
              ) : (
                <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden border-2 border-slate-800 flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted></video>
                  <div className="absolute inset-0 border-2 border-emerald-500/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-32 border-2 border-dashed border-emerald-400 animate-pulse rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-emerald-300 font-bold bg-black/60 px-2 py-1 rounded">
                        Posicione o Código Aqui
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Aproxime o Código de Barras ou QR Code da etiqueta na câmara. A leitura é automática.
              </p>

              <button
                onClick={fecharLeitorCamera}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition text-xs"
              >
                Cancelar Leitura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO RÁPIDO DE ENTREGADOR */}
      {/* ========================================================================= */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" /> Cadastro Rápido de Entregador
              </h4>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={cadastrarEntregadorRapido} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={novoEntNome}
                  onChange={(e) => setNovoEntNome(e.target.value)}
                  placeholder="Ex: Carlos Abison"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Empresa / Transportadora</label>
                <input
                  type="text"
                  value={novoEntEmpresa}
                  onChange={(e) => setNovoEntEmpresa(e.target.value)}
                  placeholder="Ex: Mercado Livre, Shopee, Amazon"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Documento (RG / CPF / CNH)</label>
                <input
                  type="text"
                  value={novoEntDoc}
                  onChange={(e) => setNovoEntDoc(e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoEntregador(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !novoEntNome.trim()}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition text-xs shadow-md"
                >
                  Salvar Entregador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

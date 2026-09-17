import React, { useState, useEffect } from 'react';
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
  Camera
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
      
      const textoWhatsMorador = `Olá, ${nomeDestinatario} (Apt ${unidadeTriagem}${blocoTriagem ? ' - Bloco ' + blocoTriagem : ''})! 📦\n\nSua encomenda acabou de chegar na Portaria.\n• Destinatário: ${nomeDestinatario}\n• Código/Lote: ${loteAtivo.codigo_re}\n• Observação: ${observacoes || 'Nenhuma'}\n• Foto do Pacote: ${fotoEtiquetaUrl}\n\nPor favor, retire na portaria assim que possível!`;

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
            {/* SELETOR INTERATIVO / CAMPO DE BUSCA DE ENTREGADOR */}
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
                /* CARD DE ENTREGADOR SELECIONADO */
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

          {/* Botão de WhatsApp do Lote Criado */}
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
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-sm">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  {uploadingFoto ? 'Processando Imagem...' : '📷 Tirar Foto da Encomenda'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFotoStorage(e.target.files[0], 'etiquetas', setFotoEtiquetaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoEtiquetaUrl && (
                  <div className="mt-2 relative w-28 h-28 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm">
                    <img src={fotoEtiquetaUrl} alt="Etiqueta Capturada" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. Barras / NF (Opcional)</label>
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Leitura do código..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações / Avarias</label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Caixa levemente amassada"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !loteAtivo || uploadingFoto}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition shadow-md"
              >
                Salvar Pacote na Portaria
              </button>
            </form>

            {/* Link WhatsApp Morador */}
            {itemTriadoWhats && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-emerald-900">
                  Notificação gerada para <strong>{itemTriadoWhats.destinatario}</strong>:
                </p>
                <a
                  href={itemTriadoWhats.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-4 h-4" /> Notificar Destinatário via WhatsApp <ExternalLink className="w-3 h-3" />
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
          <div className="border-b pb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-slate-800" /> Baixa e Entrega de Encomendas Retidas
            </h3>
            <p className="text-xs text-slate-500">
              Busque a unidade do morador para listar os pacotes pendentes e registrar a entrega com comprovante.
            </p>
          </div>

          {/* Busca por Unidade */}
          <form onSubmit={buscarItensParaBaixa} className="flex flex-col sm:flex-row gap-3 items-end max-w-2xl">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / AP *</label>
              <input
                type="text"
                required
                value={buscaBaixaUnidade}
                onChange={(e) => setBuscaBaixaUnidade(e.target.value)}
                placeholder="Ex: 24"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco</label>
              <input
                type="text"
                value={buscaBaixaBloco}
                onChange={(e) => setBuscaBaixaBloco(e.target.value)}
                placeholder="Ex: A"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-lg transition flex items-center justify-center gap-2 text-xs uppercase shadow-sm"
            >
              <Search className="w-4 h-4" /> Buscar Pacotes
            </button>
          </form>

          {/* Listagem de Pacotes */}
          {itensParaBaixa.length > 0 && (
            <div className="space-y-6 max-w-3xl pt-2">
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-800 text-sm mb-3">
                  Pacotes Encontrados ({itensParaBaixa.length} volume(s) pendente(s)):
                </h4>

                <div className="space-y-3">
                  {itensParaBaixa.map((item) => (
                    <label
                      key={item.id}
                      className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        itensSelecionadosIds.includes(item.id)
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={itensSelecionadosIds.includes(item.id)}
                          onChange={() => toggleItemSelecao(item.id)}
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Destinatário: {item.moradores?.nome || 'Não especificado'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Cód. Barras: {item.codigo_barras || 'Sem código'} | Obs: {item.observacoes || 'Nenhuma'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Recebido em: {new Date(item.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {item.foto_etiqueta_url && (
                        <img
                          src={item.foto_etiqueta_url}
                          alt="Foto do Pacote"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Formulário de Efetivação da Entrega */}
              <form onSubmit={efetivarBaixaSaida} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-900 text-sm border-b pb-2">
                  Dados da Retirada ({itensSelecionadosIds.length} pacote(s) selecionado(s))
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nome Completo do Retirante *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeRetirante}
                    onChange={(e) => setNomeRetirante(e.target.value)}
                    placeholder="Ex: Carlos (Próprio Morador / Filho / Prestador)"
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>

                {/* Captura da Foto do Retirante */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Foto do Retirante com os Pacotes (Comprovante) *
                  </label>
                  <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs shadow-sm">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    {uploadingFoto ? 'Salvando foto...' : '📷 Tirar Foto do Retirante / Entrega'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => uploadFotoStorage(e.target.files[0], 'comprovantes_baixa', setFotoRetiranteUrl)}
                      className="hidden"
                      disabled={uploadingFoto}
                    />
                  </label>

                  {fotoRetiranteUrl && (
                    <div className="mt-2 relative w-28 h-28 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-sm">
                      <img src={fotoRetiranteUrl} alt="Foto Retirante" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || itensSelecionadosIds.length === 0 || uploadingFoto}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition shadow-md text-sm uppercase"
                >
                  Efetivar Baixa de Saída e Registrar
                </button>
              </form>
            </div>
          )}

          {/* Notificação Cruzada de Segurança no WhatsApp */}
          {baixaConcluidaWhats && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 max-w-2xl">
              <p className="text-xs font-bold text-emerald-900">
                Baixa concluída com sucesso! Envie o comprovante de segurança para o morador:
              </p>
              <a
                href={baixaConcluidaWhats.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Comprovante Cruzado no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO RÁPIDO DE ENTREGADOR */}
      {/* ========================================================================= */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setModalNovoEntregador(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b pb-3">
              <Plus className="w-5 h-5 text-emerald-600" /> Cadastrar Entregador Rápido
            </h3>

            <form onSubmit={cadastrarEntregadorRapido} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Entregador *</label>
                <input
                  type="text"
                  required
                  value={novoEntNome}
                  onChange={(e) => setNovoEntNome(e.target.value)}
                  placeholder="Ex: Roberto Silva"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">RG ou CPF</label>
                <input
                  type="text"
                  value={novoEntDoc}
                  onChange={(e) => setNovoEntDoc(e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Empresa / Transportadora</label>
                <input
                  type="text"
                  value={novoEntEmpresa}
                  onChange={(e) => setNovoEntEmpresa(e.target.value)}
                  placeholder="Ex: Mercado Livre, Amazon, Shopee..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoEntregador(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-xs transition"
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

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Wrench, 
  Plus, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search, 
  Clock, 
  Check, 
  FileText, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export default function Manutencao({ usuarioLogado }) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Listagem e Filtros
  const [chamados, setChamados] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [buscaTermo, setBuscaTermo] = useState('');

  // Modais
  const [modalNovo, setModalNovo] = useState(false);
  const [modalConclusao, setModalConclusao] = useState(null);

  // Form Novo Chamado
  const [titulo, setTitulo] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [categoria, setCategoria] = useState('Elétrica');
  const [prioridade, setPrioridade] = useState('Média');
  const [descricao, setDescricao] = useState('');
  const [fotoAntesUrl, setFotoAntesUrl] = useState('');

  // Form Conclusão
  const [observacaoConclusao, setObservacaoConclusao] = useState('');
  const [fotoDepoisUrl, setFotoDepoisUrl] = useState('');

  useEffect(() => {
    carregarChamados();
  }, [filtroStatus]);

  const carregarChamados = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      let query = supabase
        .from('chamados_manutencao')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('created_at', { ascending: false });

      if (filtroStatus !== 'Todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      setChamados(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadFoto = async (file, pasta, setUrlCallback) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setUrlCallback(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto salva com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const limparFormNovo = () => {
    setTitulo('');
    setLocalizacao('');
    setCategoria('Elétrica');
    setPrioridade('Média');
    setDescricao('');
    setFotoAntesUrl('');
    setModalNovo(false);
  };

  const criarChamado = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !localizacao.trim() || !descricao.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha título, localização e descrição.' });
      return;
    }
    setLoading(true);

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        titulo: titulo.trim(),
        localizacao: localizacao.trim(),
        categoria,
        prioridade,
        descricao: descricao.trim(),
        foto_antes_url: fotoAntesUrl.trim() || '',
        status: 'Aberto',
        operador_abertura: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
      };

      const { error } = await supabase
        .from('chamados_manutencao')
        .insert([payload]);

      if (error) throw error;

      limparFormNovo();
      carregarChamados();
      setMensagem({ tipo: 'sucesso', texto: 'Chamado de manutenção aberto com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const concluirChamado = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        status: 'Concluído',
        observacao_conclusao: observacaoConclusao.trim() || 'Serviço finalizado',
        foto_depois_url: fotoDepoisUrl.trim() || '',
        operador_conclusao: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria',
        data_conclusao: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chamados_manutencao')
        .update(payload)
        .eq('id', modalConclusao.id);

      if (error) throw error;

      setModalConclusao(null);
      setObservacaoConclusao('');
      setFotoDepoisUrl('');
      carregarChamados();
      setMensagem({ tipo: 'sucesso', texto: 'Ordem de serviço concluída com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const alterarStatusChamado = async (id, novoStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chamados_manutencao')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      carregarChamados();
      setMensagem({ tipo: 'sucesso', texto: `Status alterado para ${novoStatus}` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const chamadosFiltrados = chamados.filter((item) => {
    const termo = buscaTermo.toLowerCase();
    const t = item.titulo?.toLowerCase() || '';
    const l = item.localizacao?.toLowerCase() || '';
    const c = item.categoria?.toLowerCase() || '';
    return t.includes(termo) || l.includes(termo) || c.includes(termo);
  });

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded">
            Módulo 06 — Manutenção & Chamados
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" /> Ordens de Serviço & Manutenção Predial
          </h3>
          <p className="text-xs text-slate-300">
            Registro de ocorrências de infraestrutura com comparativo de foto Antes/Depois.
          </p>
        </div>

        <button
          onClick={() => { limparFormNovo(); setModalNovo(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm uppercase"
        >
          <Plus className="w-4 h-4" /> Abrir Novo Chamado
        </button>
      </div>

      {/* Alertas Globais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            placeholder="Buscar por título, local ou categoria..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['Todos', 'Aberto', 'Em Andamento', 'Concluído', 'Cancelado'].map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filtroStatus === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Chamados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chamadosFiltrados.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border bg-white shadow-sm space-y-3 relative flex flex-col justify-between ${
              item.status === 'Concluído'
                ? 'border-emerald-200'
                : item.prioridade === 'Urgente' || item.prioridade === 'Alta'
                ? 'border-amber-300 bg-amber-50/20'
                : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {item.categoria}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      item.prioridade === 'Urgente' ? 'bg-red-600 text-white' :
                      item.prioridade === 'Alta' ? 'bg-amber-500 text-white' :
                      item.prioridade === 'Média' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.prioridade}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{item.titulo}</h4>
                  <p className="text-xs text-slate-500 font-medium">📍 {item.localizacao}</p>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  item.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' :
                  item.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                  item.status === 'Cancelado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {item.descricao}
              </p>

              {/* Fotos Comparativas Antes / Depois */}
              {(item.foto_antes_url || item.foto_depois_url) && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {item.foto_antes_url && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase text-red-700 block">📷 Foto Antes:</span>
                      <img src={item.foto_antes_url} alt="Antes" className="w-full h-24 object-cover rounded-lg border border-red-200" />
                    </div>
                  )}
                  {item.foto_depois_url && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase text-emerald-700 block">📷 Foto Depois:</span>
                      <img src={item.foto_depois_url} alt="Depois" className="w-full h-24 object-cover rounded-lg border border-emerald-200" />
                    </div>
                  )}
                </div>
              )}

              {item.observacao_conclusao && (
                <div className="mt-2 text-[11px] bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900">
                  <strong>Resolução:</strong> {item.observacao_conclusao}
                </div>
              )}
            </div>

            {/* Ações de Status */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">
                Aberto por: <strong>{item.operador_abertura}</strong>
              </span>

              <div className="flex gap-1.5">
                {item.status === 'Aberto' && (
                  <button
                    onClick={() => alterarStatusChamado(item.id, 'Em Andamento')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded transition"
                  >
                    Iniciar Atendimento
                  </button>
                )}

                {item.status !== 'Concluído' && item.status !== 'Cancelado' && (
                  <button
                    onClick={() => setModalConclusao(item)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded transition"
                  >
                    Concluir OS
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {chamadosFiltrados.length === 0 && (
          <div className="col-span-full bg-white p-8 rounded-xl border text-center text-xs text-slate-500 italic">
            Nenhum chamado de manutenção registrado.
          </div>
        )}
      </div>

      {/* MODAL NOVO CHAMADO */}
      {modalNovo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={limparFormNovo} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" /> Abrir Chamado de Manutenção
            </h3>

            <form onSubmit={criarChamado} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título do Problema *</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Lâmpada queimada na garagem"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Elétrica">Elétrica</option>
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="Pintura">Pintura</option>
                    <option value="Serralheria">Serralheria</option>
                    <option value="Portões">Portões / Automação</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridade *</label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Localização Exata *</label>
                <input
                  type="text"
                  required
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  placeholder="Ex: Subsolo 1, Próximo vaga 12"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição do Defeito *</label>
                <textarea
                  required
                  rows="2"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhe o que está ocorrendo..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Problema (Antes - Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingFoto ? 'Carregando foto...' : '📷 Tirar Foto (Antes)'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files[0], 'chamados_antes', setFotoAntesUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoAntesUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoAntesUrl} alt="Foto Antes" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Abrir Chamado
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONCLUIR CHAMADO / OS */}
      {modalConclusao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalConclusao(null)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Finalizar Ordem de Serviço
            </h3>

            <p className="text-xs text-slate-600">
              Chamado: <strong>{modalConclusao.titulo}</strong>
            </p>

            <form onSubmit={concluirChamado} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações da Resolução</label>
                <textarea
                  rows="2"
                  value={observacaoConclusao}
                  onChange={(e) => setObservacaoConclusao(e.target.value)}
                  placeholder="Ex: Troca de lâmpada e reator efetuados com sucesso."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs resize-none"
                ></textarea>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Serviço Finalizado (Depois - Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingFoto ? 'Carregando foto...' : '📷 Tirar Foto (Depois)'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files[0], 'chamados_depois', setFotoDepoisUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoDepoisUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoDepoisUrl} alt="Foto Depois" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Concluir e Fechar Chamado
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Radio, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Search, 
  Pencil, 
  X, 
  Wrench
} from 'lucide-react';

interface MateriaisProps {
  usuarioLogado?: any;
}

export default function Materiais({ usuarioLogado }: MateriaisProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [materiais, setMateriais] = useState<any[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [buscaTermo, setBuscaTermo] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [nomeMaterial, setNomeMaterial] = useState('');
  const [categoria, setCategoria] = useState('Rádio HT');
  const [codigoPatrimonio, setCodigoPatrimonio] = useState('');
  const [estado, setEstado] = useState('Perfeito');
  const [observacaoAvaria, setObservacaoAvaria] = useState('');
  const [fotoAvariaUrl, setFotoAvariaUrl] = useState('');

  useEffect(() => {
    carregarMateriais();
  }, [filtroCategoria, usuarioLogado?.condominio_id]);

  const carregarMateriais = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      let query = supabase
        .from('materiais_posto')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('nome');

      if (filtroCategoria !== 'Todos') {
        query = query.eq('categoria', filtroCategoria);
      }

      const { data, error } = await query;
      if (error) throw error;

      setMateriais(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadFotoAvaria = async (file: File | null) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `avarias_materiais/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('encomendas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encomendas')
        .getPublicUrl(fileName);

      setFotoAvariaUrl(urlData.publicUrl);
      setMensagem({ tipo: 'sucesso', texto: 'Foto da avaria registrada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao enviar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const limparFormulario = () => {
    setIdEdicao(null);
    setNomeMaterial('');
    setCategoria('Rádio HT');
    setCodigoPatrimonio('');
    setEstado('Perfeito');
    setObservacaoAvaria('');
    setFotoAvariaUrl('');
    setModalAberto(false);
  };

  const salvarMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeMaterial.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do equipamento.' });
      return;
    }
    setLoading(true);

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        nome: nomeMaterial.trim(),
        categoria,
        codigo_patrimonio: codigoPatrimonio.trim(),
        estado,
        observacao_avaria: estado !== 'Perfeito' ? observacaoAvaria.trim() : '',
        foto_avaria_url: estado !== 'Perfeito' ? fotoAvariaUrl.trim() : '',
        operador_atualizacao: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria',
        updated_at: new Date().toISOString()
      };

      if (idEdicao) {
        const { error } = await supabase
          .from('materiais_posto')
          .update(payload)
          .eq('id', idEdicao);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Equipamento atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('materiais_posto')
          .insert([payload]);
        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Equipamento cadastrado com sucesso!' });
      }

      limparFormulario();
      carregarMateriais();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (m: any) => {
    setIdEdicao(m.id);
    setNomeMaterial(m.nome);
    setCategoria(m.categoria);
    setCodigoPatrimonio(m.codigo_patrimonio || '');
    setEstado(m.estado);
    setObservacaoAvaria(m.observacao_avaria || '');
    setFotoAvariaUrl(m.foto_avaria_url || '');
    setModalAberto(true);
  };

  const materiaisFiltrados = materiais.filter((item: any) => {
    const termo = buscaTermo.toLowerCase();
    const nome = item.nome?.toLowerCase() || '';
    const cod = item.codigo_patrimonio?.toLowerCase() || '';
    return nome.includes(termo) || cod.includes(termo);
  });

  const totalAvariados = materiais.filter((m: any) => m.estado !== 'Perfeito').length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded">
            Módulo 04 — Inventário do Posto
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" /> Gestão de Equipamentos e Avarias
          </h3>
          <p className="text-xs text-slate-300">
            Controle de HTs, lanternas e itens sob responsabilidade da guarita.
          </p>
        </div>

        <button
          onClick={() => { limparFormulario(); setModalAberto(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm uppercase"
        >
          <Plus className="w-4 h-4" /> Cadastrar Equipamento
        </button>
      </div>

      {totalAvariados > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="text-xs text-amber-900">
            <strong className="block font-bold">Atenção na Passagem de Turno!</strong>
            Existem <strong>{totalAvariados} equipamento(s) com avaria ou em manutenção</strong> no posto.
          </div>
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

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            placeholder="Buscar por nome ou patrimônio..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['Todos', 'Rádio HT', 'Lanterna', 'Celular', 'Chave Mestra', 'Outros'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filtroCategoria === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {materiaisFiltrados.map((m: any) => (
          <div
            key={m.id}
            className={`p-4 rounded-xl border bg-white shadow-sm space-y-3 relative flex flex-col justify-between ${
              m.estado === 'Avariado' 
                ? 'border-red-300 bg-red-50/30' 
                : m.estado === 'Em Manutenção' 
                ? 'border-amber-300 bg-amber-50/30' 
                : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">{m.categoria}</span>
                  <h4 className="font-bold text-slate-900 text-sm">{m.nome}</h4>
                  {m.codigo_patrimonio && (
                    <p className="text-[11px] text-slate-500 font-mono">Patrimônio: {m.codigo_patrimonio}</p>
                  )}
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  m.estado === 'Perfeito' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : m.estado === 'Avariado' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {m.estado}
                </span>
              </div>

              {m.estado !== 'Perfeito' && (
                <div className="mt-3 p-2.5 bg-white border border-red-200 rounded-lg text-xs space-y-1">
                  <p className="font-bold text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Avaria Registrada:
                  </p>
                  <p className="text-slate-600 text-[11px]">{m.observacao_avaria || 'Sem detalhes informados'}</p>
                  
                  {m.foto_avaria_url && (
                    <img
                      src={m.foto_avaria_url}
                      alt="Foto da Avaria"
                      className="w-full h-24 object-cover rounded-md mt-2 border"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">
                Última checagem por: <strong>{m.operador_atualizacao || 'Portaria'}</strong>
              </span>

              <button
                onClick={() => prepararEdicao(m)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Editar Status / Informar Avaria"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {materiaisFiltrados.length === 0 && (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
            Nenhum equipamento cadastrado nesta categoria.
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={limparFormulario}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              {idEdicao ? 'Editar Status de Equipamento' : 'Cadastrar Equipamento no Posto'}
            </h3>

            <form onSubmit={salvarMaterial} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome / Identificador *</label>
                <input
                  type="text"
                  required
                  value={nomeMaterial}
                  onChange={(e) => setNomeMaterial(e.target.value)}
                  placeholder="Ex: Rádio HT 01 (Canal 02)"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                  >
                    <option value="Rádio HT">Rádio HT</option>
                    <option value="Lanterna">Lanterna</option>
                    <option value="Celular">Celular Guarita</option>
                    <option value="Chave Mestra">Chave Mestra</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. Patrimônio</label>
                  <input
                    type="text"
                    value={codigoPatrimonio}
                    onChange={(e) => setCodigoPatrimonio(e.target.value)}
                    placeholder="Ex: HT-001"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado de Conservação *</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs font-bold"
                >
                  <option value="Perfeito">Perfeito / 100% Operacional</option>
                  <option value="Avariado">Com Avaria / Defeituoso</option>
                  <option value="Em Manutenção">Em Manutenção / Assistência</option>
                </select>
              </div>

              {estado !== 'Perfeito' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase mb-1">Descrição do Defeito / Avaria *</label>
                    <input
                      type="text"
                      required
                      value={observacaoAvaria}
                      onChange={(e) => setObservacaoAvaria(e.target.value)}
                      placeholder="Ex: Antena quebrada, botão PTT trincado..."
                      className="w-full p-2.5 bg-white border border-red-300 rounded-lg text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase mb-1">Foto Comprobatória da Avaria</label>
                    <label className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-xs transition">
                      <Camera className="w-4 h-4" />
                      {uploadingFoto ? 'Carregando foto...' : '📷 Tirar Foto do Defeito'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => uploadFotoAvaria(e.target.files ? e.target.files[0] : null)}
                        className="hidden"
                        disabled={uploadingFoto}
                      />
                    </label>

                    {fotoAvariaUrl && (
                      <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-red-400">
                        <img src={fotoAvariaUrl} alt="Foto Defeito" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingFoto}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-xs transition"
                >
                  Salvar Estado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

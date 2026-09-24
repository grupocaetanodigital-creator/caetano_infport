import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Search, 
  Plus, 
  X, 
  MessageCircle, 
  ExternalLink, 
  Check,
  Pencil
} from 'lucide-react';

interface ChavesProps {
  usuarioLogado?: any;
}

export default function Chaves({ usuarioLogado }: ChavesProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [chaves, setChaves] = useState<any[]>([]);
  const [movimentacoesAtivas, setMovimentacoesAtivas] = useState<any[]>([]);
  const [buscaTermo, setBuscaTermo] = useState('');

  const [modalNovaChave, setModalNovaChave] = useState(false);
  const [modalRetirada, setModalRetirada] = useState<any | null>(null);
  const [modalDevolucao, setModalDevolucao] = useState<any | null>(null);

  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [codigoChave, setCodigoChave] = useState('');
  const [nomeChave, setNomeChave] = useState('');
  const [bloco, setBloco] = useState('');
  const [unidade, setUnidade] = useState('');
  const [tempoLimiteHoras, setTempoLimiteHoras] = useState<number | string>(2);

  const [tipoRetirante, setTipoRetirante] = useState('Morador');
  const [retiranteNome, setRetiranteNome] = useState('');
  const [retiranteDoc, setRetiranteDoc] = useState('');
  const [retiranteTel, setRetiranteTel] = useState('');
  const [fotoRetiradaUrl, setFotoRetiradaUrl] = useState('');
  const [whatsEmprestimo, setWhatsEmprestimo] = useState<any | null>(null);

  const [fotoDevolucaoUrl, setFotoDevolucaoUrl] = useState('');

  useEffect(() => {
    carregarQuadroChaves();
  }, [usuarioLogado?.condominio_id]);

  const carregarQuadroChaves = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data: chavesData, error: errChaves } = await supabase
        .from('chaves')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('codigo_chave');

      if (errChaves) throw errChaves;

      const { data: movData, error: errMov } = await supabase
        .from('movimentacao_chaves')
        .select('*, chaves(*)')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .eq('status', 'Em Andamento')
        .order('data_hora_retirada', { ascending: false });

      if (errMov) throw errMov;

      const agora = new Date();
      
      const movsComStatus = (movData || []).map((mov: any) => {
        const previsao = new Date(mov.previsao_devolucao);
        const atrasado = agora > previsao;
        return {
          ...mov,
          atrasado
        };
      });

      setChaves(chavesData || []);
      setMovimentacoesAtivas(movsComStatus);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadFoto = async (file: File | null, pasta: string, setUrlCallback: (url: string) => void) => {
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
      setMensagem({ tipo: 'sucesso', texto: 'Foto capturada com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const limparFormularioChave = () => {
    setIdEdicao(null);
    setCodigoChave('');
    setNomeChave('');
    setBloco('');
    setUnidade('');
    setTempoLimiteHoras(2);
    setModalNovaChave(false);
  };

  const prepararEdicao = (chave: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdEdicao(chave.id);
    setCodigoChave(chave.codigo_chave || '');
    setNomeChave(chave.nome_chave || '');
    setBloco(chave.bloco || '');
    setUnidade(chave.unidade || '');
    setTempoLimiteHoras(chave.tempo_limite_horas || 2);
    setModalNovaChave(true);
  };

  const salvarChave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoChave.trim() || !nomeChave.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Código e nome da chave são obrigatórios.' });
      return;
    }
    setLoading(true);

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        codigo_chave: codigoChave.trim().toUpperCase(),
        nome_chave: nomeChave.trim(),
        bloco: bloco.trim().toUpperCase(),
        unidade: unidade.trim(),
        tempo_limite_horas: parseInt(String(tempoLimiteHoras)) || 2
      };

      if (idEdicao) {
        const { error } = await supabase
          .from('chaves')
          .update(payload)
          .eq('id', idEdicao);

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Chave atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('chaves')
          .insert([{ ...payload, status: 'Disponível' }]);

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Chave cadastrada no quadro!' });
      }

      limparFormularioChave();
      carregarQuadroChaves();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarRetirada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retiranteNome.trim() || !modalRetirada) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do retirante.' });
      return;
    }
    setLoading(true);

    try {
      const agora = new Date();
      const previsao = new Date(agora.getTime() + (modalRetirada.tempo_limite_horas || 2) * 60 * 60 * 1000);
      const nomeCompletoComTipo = `${retiranteNome.trim()} (${tipoRetirante})`;

      const { error: errMov } = await supabase
        .from('movimentacao_chaves')
        .insert([{
          chave_id: modalRetirada.id,
          condominio_id: usuarioLogado.condominio_id,
          retirante_nome: nomeCompletoComTipo,
          retirante_doc: retiranteDoc.trim() || 'Não informado',
          retirante_telefone: retiranteTel.trim() || '',
          foto_retirada_url: fotoRetiradaUrl.trim() || '',
          data_hora_retirada: agora.toISOString(),
          previsao_devolucao: previsao.toISOString(),
          status: 'Em Andamento',
          operador_retirada: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        }]);

      if (errMov) throw errMov;

      await supabase
        .from('chaves')
        .update({ status: 'Emprestada' })
        .eq('id', modalRetirada.id);

      const tel = retiranteTel.replace(/\D/g, '');
      const textoWhats = `🔑 *COMPROVANTE DE RETIRADA DE CHAVE*\nChave: ${modalRetirada.codigo_chave} - ${modalRetirada.nome_chave}\nRetirado por: ${nomeCompletoComTipo}\nData/Hora: ${agora.toLocaleString('pt-BR')}\nPrazo de Devolução: ${previsao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${modalRetirada.tempo_limite_horas}h limite)\n\nPor favor, devolva a chave no prazo acordado!`;

      setWhatsEmprestimo({
        link: tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(textoWhats)}` : `https://wa.me/?text=${encodeURIComponent(textoWhats)}`
      });

      setModalRetirada(null);
      setRetiranteNome(''); setRetiranteDoc(''); setRetiranteTel(''); setFotoRetiradaUrl(''); setTipoRetirante('Morador');
      carregarQuadroChaves();
      setMensagem({ tipo: 'sucesso', texto: 'Empréstimo registrado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const efetivarDevolucao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDevolucao) return;
    setLoading(true);

    try {
      const agora = new Date().toISOString();

      const { error: errMov } = await supabase
        .from('movimentacao_chaves')
        .update({
          status: 'Devolvida',
          data_hora_devolucao: agora,
          foto_devolucao_url: fotoDevolucaoUrl.trim() || '',
          operador_devolucao: usuarioLogado?.login || usuarioLogado?.nome || 'Portaria'
        })
        .eq('id', modalDevolucao.id);

      if (errMov) throw errMov;

      await supabase
        .from('chaves')
        .update({ status: 'Disponível' })
        .eq('id', modalDevolucao.chave_id);

      setModalDevolucao(null);
      setFotoDevolucaoUrl('');
      carregarQuadroChaves();
      setMensagem({ tipo: 'sucesso', texto: 'Chave devolvida ao quadro com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const chavesFiltradas = chaves.filter((c: any) => {
    const termo = buscaTermo.toLowerCase();
    const cod = c.codigo_chave?.toLowerCase() || '';
    const nome = c.nome_chave?.toLowerCase() || '';
    const unid = c.unidade?.toLowerCase() || '';
    return cod.includes(termo) || nome.includes(termo) || unid.includes(termo);
  });

  const totalAtrasadas = movimentacoesAtivas.filter((m: any) => m.atrasado).length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded">
            Módulo 05 — Quadro Digital de Chaves
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" /> Controle de Prazos e Empréstimos
          </h3>
          <p className="text-xs text-slate-300">
            Monitoramento de chaves disponíveis, retiradas e alertas visuais de atraso.
          </p>
        </div>

        <button
          onClick={() => { limparFormularioChave(); setModalNovaChave(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm uppercase"
        >
          <Plus className="w-4 h-4" /> Cadastrar Chave
        </button>
      </div>

      {totalAtrasadas > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-xl flex items-center gap-3 animate-pulse shadow-lg">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div className="text-xs">
            <strong className="block font-bold text-sm">⚠️ ATENÇÃO — CHAVE(S) EM ATRASO!</strong>
            Existem <strong>{totalAtrasadas} chave(s)</strong> que ultrapassaram o tempo limite de devolução.
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

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={buscaTermo}
            onChange={(e) => setBuscaTermo(e.target.value)}
            placeholder="Buscar por código, nome ou unidade..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {chavesFiltradas.map((chave: any) => {
          const movAtiva = movimentacoesAtivas.find((m: any) => m.chave_id === chave.id);
          const estaAtrasada = movAtiva?.atrasado;

          return (
            <div
              key={chave.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition shadow-sm relative ${
                chave.status === 'Disponível'
                  ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500'
                  : estaAtrasada
                  ? 'bg-red-50 border-red-500 ring-2 ring-red-500 animate-pulse'
                  : 'bg-amber-50/50 border-amber-300'
              }`}
            >
              <div>
                <div className="flex justify-between items-center gap-1">
                  <span className="text-[11px] font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded">
                    {chave.codigo_chave}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => prepararEdicao(chave, e)}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded transition"
                      title="Editar Chave"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <Key className={`w-4 h-4 ${
                      chave.status === 'Disponível' ? 'text-emerald-600' : estaAtrasada ? 'text-red-600' : 'text-amber-600'
                    }`} />
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-xs mt-2 line-clamp-2">{chave.nome_chave}</h4>
                {chave.unidade && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Apt {chave.unidade} {chave.bloco ? `- Bloco ${chave.bloco}` : ''}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60">
                {chave.status === 'Disponível' ? (
                  <button
                    onClick={() => setModalRetirada(chave)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 rounded-lg transition"
                  >
                    Emprestar
                  </button>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-800 line-clamp-1">
                      {movAtiva?.retirante_nome}
                    </p>
                    <p className={`text-[9px] font-bold ${estaAtrasada ? 'text-red-700' : 'text-amber-700'}`}>
                      {estaAtrasada ? '⚠️ ATRASADO' : `Devolver até: ${new Date(movAtiva?.previsao_devolucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    <button
                      onClick={() => setModalDevolucao(movAtiva)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1.5 rounded-lg transition"
                    >
                      Devolver
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {chavesFiltradas.length === 0 && (
          <div className="col-span-full bg-white p-8 rounded-xl border text-center text-xs text-slate-500 italic">
            Nenhuma chave encontrada no quadro.
          </div>
        )}
      </div>

      {modalNovaChave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={limparFormularioChave} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              {idEdicao ? 'Editar Dados da Chave' : 'Nova Chave no Quadro'}
            </h3>

            <form onSubmit={salvarChave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cód. Chave *</label>
                  <input
                    type="text"
                    required
                    value={codigoChave}
                    onChange={(e) => setCodigoChave(e.target.value)}
                    placeholder="Ex: CH-01"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tempo Limite (Horas)</label>
                  <input
                    type="number"
                    min="1"
                    value={tempoLimiteHoras}
                    onChange={(e) => setTempoLimiteHoras(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Identificador / Local *</label>
                <input
                  type="text"
                  required
                  value={nomeChave}
                  onChange={(e) => setNomeChave(e.target.value)}
                  placeholder="Ex: Salão de Festas, Casa de Máquinas..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidade / AP</label>
                  <input
                    type="text"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    placeholder="Ex: 101"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bloco</label>
                  <input
                    type="text"
                    value={bloco}
                    onChange={(e) => setBloco(e.target.value)}
                    placeholder="Ex: A"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={limparFormularioChave}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
                >
                  {idEdicao ? 'Salvar Alterações' : 'Cadastrar Chave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRetirada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalRetirada(null)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" /> Retirada da Chave {modalRetirada.codigo_chave}
            </h3>

            <form onSubmit={efetivarRetirada} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Tipo de Retirante *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Morador', 'Colaborador', 'Terceiros'].map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoRetirante(tipo)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                        tipoRetirante === tipo
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Retirante *</label>
                <input
                  type="text"
                  required
                  value={retiranteNome}
                  onChange={(e) => setRetiranteNome(e.target.value)}
                  placeholder="Ex: Carlos Santos"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">RG / CPF (Opcional)</label>
                  <input
                    type="text"
                    value={retiranteDoc}
                    onChange={(e) => setRetiranteDoc(e.target.value)}
                    placeholder="Ex: 12.345.678-9"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    value={retiranteTel}
                    onChange={(e) => setRetiranteTel(e.target.value)}
                    placeholder="Ex: 11940609960"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto da Entrega (Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingFoto ? 'Processando foto...' : '📷 Tirar Foto (Opcional)'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'chaves_retirada', setFotoRetiradaUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoRetiradaUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoRetiradaUrl} alt="Foto Retirada" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Efetivar Empréstimo
              </button>
            </form>

            {whatsEmprestimo && (
              <a
                href={whatsEmprestimo.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition w-full justify-center"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Comprovante no WhatsApp <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {modalDevolucao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalDevolucao(null)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" /> Devolver Chave {modalDevolucao.chaves?.codigo_chave}
            </h3>

            <p className="text-xs text-slate-600">
              Retirada por: <strong>{modalDevolucao.retirante_nome}</strong>
            </p>

            <form onSubmit={efetivarDevolucao} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto da Chave no Quadro (Opcional)</label>
                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition text-xs">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingFoto ? 'Processando foto...' : '📷 Tirar Foto da Devolução (Opcional)'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files ? e.target.files[0] : null, 'chaves_devolucao', setFotoDevolucaoUrl)}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoDevolucaoUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoDevolucaoUrl} alt="Foto Devolução" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Efetivar Devolução e Liberar Chave
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

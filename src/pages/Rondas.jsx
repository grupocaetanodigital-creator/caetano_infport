import React, { useState, useEffect } from 'react';
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
  Navigation, 
  Clock, 
  Flag,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function Rondas({ usuarioLogado }) {
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Listagens de Pontos e Rondas
  const [pontos, setPontos] = useState([]);
  const [rondaAtiva, setRondaAtiva] = useState(null);
  const [registrosRonda, setRegistrosRonda] = useState([]);
  const [historicoRondas, setHistoricoRondas] = useState([]);

  // Modais
  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [modalRegistrarPonto, setModalRegistrarPonto] = useState(null);

  // Form Novo Ponto
  const [nomePonto, setNomePonto] = useState('');
  const [codigoTag, setCodigoTag] = useState('');
  const [descricaoPonto, setDescricaoPonto] = useState('');

  // Form Leitura de Ponto
  const [codigoLido, setCodigoLido] = useState('');
  const [observacaoPonto, setObservacaoPonto] = useState('');
  const [fotoPontoUrl, setFotoPontoUrl] = useState('');
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    carregarPontos();
    verificarRondaAtiva();
    carregarHistorico();
  }, []);

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
        carregarRegistrosRonda(data.id);
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
        .limit(10);

      if (error) throw error;
      setHistoricoRondas(data || []);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    }
  };

  const capturarGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setMensagem({ tipo: 'erro', texto: 'Não foi possível obter a geolocalização GPS.' })
      );
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
      setMensagem({ tipo: 'sucesso', texto: 'Foto do ponto anexada com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  const cadastrarPonto = async (e) => {
    e.preventDefault();
    if (!nomePonto.trim() || !codigoTag.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome do ponto e o código do QR Code / NFC.' });
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
          localizacao_descricao: descricaoPonto.trim()
        }]);

      if (error) throw error;

      setNomePonto(''); setCodigoTag(''); setDescricaoPonto(''); setModalNovoPonto(false);
      carregarPontos();
      setMensagem({ tipo: 'sucesso', texto: 'Ponto de ronda cadastrado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const iniciarRonda = async () => {
    if (pontos.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Cadastre ao menos um ponto antes de iniciar a ronda.' });
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rondas_execucao')
        .insert([{
          condominio_id: usuarioLogado.condominio_id,
          operador_nome: usuarioLogado?.login || usuarioLogado?.nome || 'Vigia / Portaria',
          status: 'Em Andamento',
          data_inicio: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setRondaAtiva(data);
      setRegistrosRonda([]);
      setMensagem({ tipo: 'sucesso', texto: 'Ronda patrimonial iniciada! Percorra os pontos cadastrados.' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirRegistroPonto = (ponto) => {
    setModalRegistrarPonto(ponto);
    setCodigoLido('');
    setObservacaoPonto('');
    setFotoPontoUrl('');
    capturarGPS();
  };

  const confirmarLeituraPonto = async (e) => {
    e.preventDefault();
    if (codigoLido.trim().toUpperCase() !== modalRegistrarPonto.codigo_tag.toUpperCase()) {
      setMensagem({ tipo: 'erro', texto: 'Código lido incorreto! O código não corresponde a este ponto.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('rondas_registros')
        .insert([{
          ronda_id: rondaAtiva.id,
          ponto_id: modalRegistrarPonto.id,
          condominio_id: usuarioLogado.condominio_id,
          data_hora: new Date().toISOString(),
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          foto_evidencia_url: fotoPontoUrl.trim() || '',
          observacao: observacaoPonto.trim() || ''
        }]);

      if (error) throw error;

      setModalRegistrarPonto(null);
      carregarRegistrosRonda(rondaAtiva.id);
      setMensagem({ tipo: 'sucesso', texto: `Ponto "${modalRegistrarPonto.nome_ponto}" registrado com sucesso!` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const finalizarRonda = async () => {
    if (!rondaAtiva) return;
    setLoading(true);

    const pontosLidosIds = registrosRonda.map(r => r.ponto_id);
    const todosLidos = pontos.every(p => pontosLidosIds.includes(p.id));
    const statusFinal = todosLidos ? 'Concluída' : 'Incompleta';

    try {
      const { error } = await supabase
        .from('rondas_execucao')
        .update({
          status: statusFinal,
          data_fim: new Date().toISOString()
        })
        .eq('id', rondaAtiva.id);

      if (error) throw error;

      setRondaAtiva(null);
      setRegistrosRonda([]);
      carregarHistorico();
      setMensagem({
        tipo: 'sucesso',
        texto: todosLidos ? 'Ronda 100% concluída com sucesso!' : 'Ronda finalizada com pontos pendentes.'
      });
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
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2.5 py-1 rounded">
            Módulo 07 — Rondas Patrimoniais
          </span>
          <h3 className="font-bold text-lg mt-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Controle de Rondas & QR Code / NFC
          </h3>
          <p className="text-xs text-slate-300">
            Validação de presença via geolocalização e fotos com relatório de pontos zerados.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModalNovoPonto(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700"
          >
            <Plus className="w-4 h-4" /> Cadastrar Ponto
          </button>

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

      {/* Alertas Globais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* STATUS DA RONDA ATIVA */}
      {rondaAtiva && (
        <div className="bg-slate-950 text-white p-5 rounded-2xl space-y-4 border border-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Ronda em Andamento</span>
              <p className="text-xs text-slate-300">
                Iniciada às: <strong>{new Date(rondaAtiva.data_inicio).toLocaleTimeString('pt-BR')}</strong> por <strong>{rondaAtiva.operador_nome}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-3 py-1 rounded-full border border-slate-700">
                Progresso: {registrosRonda.length} / {pontos.length} Pontos
              </span>
            </div>
          </div>

          {/* Alert de Pontos Pendentes */}
          {pontosZerados.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Ainda restam <strong>{pontosZerados.length} ponto(s) zerados</strong> para concluir a ronda.</span>
            </div>
          )}

          {/* Cards dos Pontos para Leitura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pontos.map((ponto) => {
              const lido = pontosLidosIds.includes(ponto.id);
              const reg = registrosRonda.find(r => r.ponto_id === ponto.id);

              return (
                <div
                  key={ponto.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                    lido ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {ponto.codigo_tag}
                      </span>
                      {lido ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <QrCode className="w-5 h-5 text-slate-500" />
                      )}
                    </div>

                    <h4 className="font-bold text-white text-xs mt-2">{ponto.nome_ponto}</h4>
                    {ponto.localizacao_descricao && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{ponto.localizacao_descricao}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800">
                    {lido ? (
                      <span className="text-[10px] text-emerald-400 font-bold block">
                        ✓ Lido às {new Date(reg?.data_hora).toLocaleTimeString('pt-BR')}
                      </span>
                    ) : (
                      <button
                        onClick={() => abrirRegistroPonto(ponto)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg transition uppercase"
                      >
                        Validar Ponto
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RELATÓRIO DE PONTOS CADASTRADOS & HISTÓRICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Cadastrados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <MapPin className="w-4 h-4 text-emerald-600" /> Pontos de Checagem Cadastrados ({pontos.length})
          </h4>

          <div className="space-y-2">
            {pontos.map((p) => (
              <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <div>
                  <strong className="font-bold text-xs text-slate-900 block">{p.nome_ponto}</strong>
                  <span className="text-[11px] text-slate-500 font-mono">Código Tag: {p.codigo_tag}</span>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded">
                  {p.localizacao_descricao || 'Sem detalhes'}
                </span>
              </div>
            ))}

            {pontos.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">Nenhum ponto de ronda cadastrado.</p>
            )}
          </div>
        </div>

        {/* Coluna 2: Histórico */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Clock className="w-4 h-4 text-emerald-600" /> Histórico de Rondas Recentes
          </h4>

          <div className="space-y-2">
            {historicoRondas.map((r) => (
              <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <strong className="text-slate-900 block font-bold">{r.operador_nome}</strong>
                  <span className="text-[10px] text-slate-500">
                    Data: {new Date(r.data_inicio).toLocaleString('pt-BR')}
                  </span>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  r.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}

            {historicoRondas.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma ronda encerrada no histórico.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL CADASTRAR PONTO DE RONDA */}
      {modalNovoPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalNovoPonto(false)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Cadastrar Ponto de Ronda
            </h3>

            <form onSubmit={cadastrarPonto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Local *</label>
                <input
                  type="text"
                  required
                  value={nomePonto}
                  onChange={(e) => setNomePonto(e.target.value)}
                  placeholder="Ex: Bloco A - Caixa D'água"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código QR Code / Tag NFC *</label>
                <input
                  type="text"
                  required
                  value={codigoTag}
                  onChange={(e) => setCodigoTag(e.target.value)}
                  placeholder="Ex: TAG-BLA-01"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição / Instruções</label>
                <input
                  type="text"
                  value={descricaoPonto}
                  onChange={(e) => setDescricaoPonto(e.target.value)}
                  placeholder="Ex: Checar tranca e luz externa"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Cadastrar Ponto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR LEITURA DE PONTO */}
      {modalRegistrarPonto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setModalRegistrarPonto(null)} className="absolute top-4 right-4 text-slate-400 p-1">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base border-b pb-3 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Validar: {modalRegistrarPonto.nome_ponto}
            </h3>

            <form onSubmit={confirmarLeituraPonto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Digite ou Escaneie o Código do Ponto *</label>
                <input
                  type="text"
                  required
                  value={codigoLido}
                  onChange={(e) => setCodigoLido(e.target.value)}
                  placeholder={`Digite: ${modalRegistrarPonto.codigo_tag}`}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações de Ocorrência (Opcional)</label>
                <input
                  type="text"
                  value={observacaoPonto}
                  onChange={(e) => setObservacaoPonto(e.target.value)}
                  placeholder="Ex: Portão trancado sem anomalias"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Foto do Local / Evidência (Opcional)</label>
                <label className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs transition">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  {uploadingFoto ? 'Processando foto...' : '📷 Anexar Foto do Ponto'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadFoto(e.target.files[0])}
                    className="hidden"
                    disabled={uploadingFoto}
                  />
                </label>

                {fotoPontoUrl && (
                  <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-500">
                    <img src={fotoPontoUrl} alt="Foto Ponto" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {coords && (
                <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> GPS Capturado: Lat {coords.lat.toFixed(4)}, Lng {coords.lng.toFixed(4)}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || uploadingFoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl uppercase text-xs transition"
              >
                Confirmar Leitura do Ponto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

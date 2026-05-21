document.addEventListener('DOMContentLoaded', async function () {

    // ── Verificar acesso admin ───────────────────────────────────────────────
    const me = await CondConnect.getMe();
    if (!me || me.papel !== 'admin') {
        window.location.href = '/Templates/dashboard.html';
        return;
    }
    document.querySelectorAll('.user-name').forEach(el => el.textContent = me.nome);

    // ── Estado global ────────────────────────────────────────────────────────
    let condoSelecionado = '';
    let modalAcaoFn = null;

    const globalCondo = document.getElementById('global-condo');
    globalCondo.addEventListener('change', () => {
        condoSelecionado = globalCondo.value;
        recarregarAbaAtiva();
    });

    // ── Abas ─────────────────────────────────────────────────────────────────
    const tabs   = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.tab-panel');
    let abaAtiva = 'dashboard';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            abaAtiva = tab.dataset.tab;
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            panels.forEach(p => p.classList.toggle('active', p.id === `tab-${abaAtiva}`));
            recarregarAbaAtiva();
        });
    });

    function recarregarAbaAtiva() {
        if (abaAtiva === 'dashboard') carregarStats();
        else if (abaAtiva === 'denuncias') carregarDenuncias();
        else if (abaAtiva === 'usuarios') carregarUsuarios();
        else if (abaAtiva === 'produtos') carregarProdutos();
    }

    // ── Filtros secundários ───────────────────────────────────────────────────
    document.getElementById('den-status-filter')?.addEventListener('change', carregarDenuncias);
    document.getElementById('prod-status-filter')?.addEventListener('change', carregarProdutos);
    document.getElementById('usr-busca')?.addEventListener('keydown', e => { if (e.key === 'Enter') carregarUsuarios(); });

    // ── Modal ─────────────────────────────────────────────────────────────────
    function abrirModal({ titulo, desc, mostarDuracao = true, corBotao = '#dc2626', labelBotao = 'Confirmar', onConfirm }) {
        document.getElementById('modal-titulo').textContent = titulo;
        document.getElementById('modal-desc').textContent = desc;
        document.getElementById('modal-duracao-wrap').style.display = mostarDuracao ? 'block' : 'none';
        const btnConf = document.getElementById('modal-confirmar');
        btnConf.style.background = corBotao;
        btnConf.textContent = labelBotao;
        modalAcaoFn = onConfirm;
        document.getElementById('modal-acao').classList.add('open');
    }

    window.fecharModal = () => {
        document.getElementById('modal-acao').classList.remove('open');
        modalAcaoFn = null;
    };

    document.getElementById('modal-acao').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-acao')) fecharModal();
    });

    document.getElementById('modal-confirmar').addEventListener('click', async () => {
        if (modalAcaoFn) {
            document.getElementById('modal-confirmar').disabled = true;
            await modalAcaoFn();
            document.getElementById('modal-confirmar').disabled = false;
        }
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function fmt(n) { return Number(n).toLocaleString('pt-BR'); }
    function fmtBRL(n) { return `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

    async function chamarAdmin(url, body) {
        try {
            const r = await CondConnect.api(url, { method: 'PUT', body });
            await CondConnect.showAlert(r.message || 'Ação realizada', 'success');
            fecharModal();
            recarregarAbaAtiva();
        } catch (err) {
            await CondConnect.showAlert(err.message || 'Erro ao executar ação', 'error');
        }
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────────
    async function carregarStats() {
        try {
            const params = condoSelecionado ? `?condominio=${encodeURIComponent(condoSelecionado)}` : '';
            const s = await CondConnect.api(`/admin/stats${params}`);
            document.getElementById('s-usuarios').textContent = fmt(s.total_usuarios);
            document.getElementById('s-produtos').textContent  = fmt(s.total_produtos);
            document.getElementById('s-pedidos').textContent   = fmt(s.total_pedidos);
            document.getElementById('s-fat').textContent       = fmtBRL(s.faturamento);
            document.getElementById('s-susp').textContent      = fmt(s.usuarios_suspensos);
            document.getElementById('s-banidos').textContent   = fmt(s.usuarios_banidos);
            document.getElementById('s-den').textContent       = fmt(s.denuncias_pendentes);

            // Badge na aba
            const badge = document.getElementById('badge-denuncias');
            if (s.denuncias_pendentes > 0) {
                badge.textContent = s.denuncias_pendentes;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }

            // Por condomínio
            const el = document.getElementById('condo-breakdown');
            if (s.por_condominio?.length) {
                el.innerHTML = s.por_condominio.map(c => `
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:13px;color:#1e293b;min-width:220px;">${c.condominio || 'Sem condomínio'}</span>
                        <div style="flex:1;background:#f1f5f9;border-radius:99px;height:10px;overflow:hidden;">
                            <div style="height:100%;background:#00a6a6;border-radius:99px;width:${Math.min(100, (c.n / s.total_usuarios) * 100)}%;"></div>
                        </div>
                        <span style="font-size:13px;font-weight:700;color:#1e293b;min-width:30px;text-align:right;">${c.n}</span>
                    </div>
                `).join('');
            } else {
                el.innerHTML = '<p style="color:#94a3b8;font-size:14px;">Sem dados</p>';
            }
        } catch (e) {
            console.error('[admin/stats]', e);
            const errMsg = e?.message || 'Erro ao carregar dados';
            document.getElementById('condo-breakdown').innerHTML =
                `<p style="color:#dc2626;font-size:13px;">Erro: ${errMsg}</p>`;
        }
    }

    // ── DENÚNCIAS ─────────────────────────────────────────────────────────────
    window.carregarDenuncias = async function () {
        const status = document.getElementById('den-status-filter').value;
        const params = new URLSearchParams({ status });
        if (condoSelecionado) params.set('condominio', condoSelecionado);
        const el = document.getElementById('den-list');
        el.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Carregando...</p>';
        try {
            const { denuncias } = await CondConnect.api(`/admin/denuncias?${params}`);
            if (!denuncias.length) {
                el.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Nenhuma denúncia neste filtro.</p>';
                return;
            }
            el.innerHTML = denuncias.map(d => {
                const susp = d.total_suspensoes || 0;
                const alertaSusp = susp >= 2 ? `<span style="color:#dc2626;font-weight:700;font-size:12px;">⚠️ ${susp} suspensão(ões)</span>` : '';
                const acoes = d.status === 'pendente' ? `
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
                        <button class="action-btn neutral" onclick="denIgnorar(${d.id})">Ignorar</button>
                        <button class="action-btn warn"    onclick="denRemover(${d.id})">Remover comentário</button>
                        <button class="action-btn danger"  onclick="denSuspender(${d.id}, '${(d.autor_nome||'').replace(/'/g,"\\'")}')">Suspender autor</button>
                        ${susp >= 2 ? `<button class="action-btn danger" style="background:#7f1d1d;color:white;" onclick="denBanir(${d.id}, '${(d.autor_nome||'').replace(/'/g,"\\'")}')">Banir permanentemente</button>` : ''}
                    </div>` : '';
                return `
                <div class="den-card ${d.status}">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                        <div>
                            <span class="den-badge ${d.status}">${{pendente:'Em avaliação',ignorada:'Ignorada',removida:'Removida',suspendeu:'Suspendeu'}[d.status]||d.status}</span>
                            <span style="font-size:12px;color:#94a3b8;margin-left:8px;">${new Date(d.criado_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:12px;color:#64748b;">Motivo: <strong>${d.motivo}</strong></span>
                            ${d.total_denuncias_avaliacao > 1 ? `<br><span style="font-size:11px;color:#dc2626;">${d.total_denuncias_avaliacao} denúncias neste comentário</span>` : ''}
                        </div>
                    </div>
                    <div style="margin-top:10px;background:#f8fafc;border-radius:8px;padding:12px;">
                        <p style="margin:0;font-size:13px;font-style:italic;color:#475569;">"${d.comentario || '(sem comentário)'}"</p>
                    </div>
                    <div style="margin-top:8px;display:flex;gap:16px;flex-wrap:wrap;">
                        <span style="font-size:12px;color:#64748b;">Autor: <strong>${d.autor_nome}</strong> ${alertaSusp}</span>
                        <span style="font-size:12px;color:#64748b;">Condo: <strong>${d.autor_condo||'–'}</strong></span>
                        <span style="font-size:12px;color:#64748b;">Avaliado: <strong>${d.denunciado_nome}</strong></span>
                    </div>
                    ${acoes}
                </div>`;
            }).join('');
        } catch (e) {
            el.innerHTML = `<p style="color:#dc2626;text-align:center;padding:40px;">${e.message}</p>`;
        }
    };

    window.denIgnorar = (id) => chamarAdmin('/admin/denuncias', { denuncia_id: id, acao: 'ignorar' });
    window.denRemover = (id) => {
        abrirModal({
            titulo: 'Remover comentário',
            desc: 'O comentário será apagado e o autor receberá uma notificação. Deseja continuar?',
            mostarDuracao: false,
            corBotao: '#d97706',
            labelBotao: 'Remover comentário',
            onConfirm: () => chamarAdmin('/admin/denuncias', { denuncia_id: id, acao: 'remover_comentario' }),
        });
    };
    window.denSuspender = (id, nome) => {
        abrirModal({
            titulo: `Suspender ${nome}`,
            desc: 'O usuário será suspenso e receberá um e-mail com a duração e aviso sobre possível banimento.',
            mostarDuracao: true,
            corBotao: '#dc2626',
            labelBotao: 'Suspender',
            onConfirm: () => {
                const dias = parseInt(document.getElementById('modal-duracao').value);
                return chamarAdmin('/admin/denuncias', { denuncia_id: id, acao: 'suspender', duracao_dias: dias });
            },
        });
    };
    window.denBanir = (id, nome) => {
        abrirModal({
            titulo: `Banir permanentemente ${nome}`,
            desc: 'O usuário será banido definitivamente. O CPF ficará bloqueado impedindo novo cadastro. Esta ação é irreversível.',
            mostarDuracao: false,
            corBotao: '#7f1d1d',
            labelBotao: 'Banir permanentemente',
            onConfirm: () => chamarAdmin('/admin/denuncias', { denuncia_id: id, acao: 'banir' }),
        });
    };

    // ── USUÁRIOS ──────────────────────────────────────────────────────────────
    window.carregarUsuarios = async function () {
        const busca  = document.getElementById('usr-busca').value.trim();
        const params = new URLSearchParams();
        if (busca)            params.set('busca', busca);
        if (condoSelecionado) params.set('condominio', condoSelecionado);
        const el = document.getElementById('usr-list');
        el.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Carregando...</p>';
        try {
            const { usuarios } = await CondConnect.api(`/admin/usuarios?${params}`);
            if (!usuarios.length) { el.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Nenhum usuário encontrado.</p>'; return; }
            el.innerHTML = usuarios.map(u => {
                const suspensoAtivo = u.suspenso_ate && new Date(u.suspenso_ate) > new Date();
                const badges = [
                    u.papel === 'admin' ? '<span class="badge admin">Admin</span>' : '',
                    suspensoAtivo ? `<span class="badge suspenso">Suspenso até ${new Date(u.suspenso_ate).toLocaleDateString('pt-BR')}</span>` : '',
                    !u.ativo ? '<span class="badge banido">Banido</span>' : '',
                    u.condominio ? `<span class="badge condo">${u.condominio}</span>` : '',
                ].filter(Boolean).join('');
                const acoes = `
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        ${u.ativo && !suspensoAtivo ? `<button class="action-btn warn" onclick="usrSuspender(${u.id},'${(u.nome||'').replace(/'/g,"\\'")}')">Suspender</button>` : ''}
                        ${suspensoAtivo ? `<button class="action-btn ok" onclick="usrAcao(${u.id},'remover_suspensao','Remover suspensão de ${u.nome}?')">Remover suspensão</button>` : ''}
                        ${u.ativo ? `<button class="action-btn danger" onclick="usrAcao(${u.id},'banir','Banir permanentemente ${u.nome}? O CPF ficará bloqueado.')">Banir</button>` : `<button class="action-btn ok" onclick="usrAcao(${u.id},'desbanir','Reativar conta de ${u.nome}?')">Reativar</button>`}
                        ${u.papel !== 'admin' ? `<button class="action-btn neutral" onclick="usrAcao(${u.id},'tornar_admin','Dar permissão admin para ${u.nome}?')">Tornar admin</button>` : `<button class="action-btn neutral" onclick="usrAcao(${u.id},'tornar_usuario','Remover admin de ${u.nome}?')">Remover admin</button>`}
                    </div>`;
                return `
                <div class="usr-row">
                    <div class="usr-avatar">${(u.nome||'U').charAt(0).toUpperCase()}</div>
                    <div class="usr-info">
                        <strong>${u.nome}</strong>
                        <span>${u.email}</span>
                        <div class="usr-badges">${badges}${u.total_suspensoes ? `<span class="badge" style="background:#fce7f3;color:#be185d;">${u.total_suspensoes} suspensão(ões)</span>` : ''}</div>
                    </div>
                    ${acoes}
                </div>`;
            }).join('');
        } catch (e) {
            el.innerHTML = `<p style="color:#dc2626;text-align:center;padding:40px;">${e.message}</p>`;
        }
    };

    window.usrSuspender = (id, nome) => {
        abrirModal({
            titulo: `Suspender ${nome}`,
            desc: 'O usuário receberá um e-mail informando a suspensão, a duração e aviso sobre possível banimento.',
            mostarDuracao: true,
            corBotao: '#d97706',
            labelBotao: 'Suspender',
            onConfirm: () => {
                const dias = parseInt(document.getElementById('modal-duracao').value);
                return chamarAdmin('/admin/usuarios', { usuario_id: id, acao: 'suspender', duracao_dias: dias });
            },
        });
    };
    window.usrAcao = (id, acao, desc) => {
        abrirModal({
            titulo: desc,
            desc: '',
            mostarDuracao: false,
            corBotao: acao === 'banir' ? '#7f1d1d' : acao === 'desbanir' || acao === 'remover_suspensao' ? '#16a34a' : '#00a6a6',
            labelBotao: 'Confirmar',
            onConfirm: () => chamarAdmin('/admin/usuarios', { usuario_id: id, acao }),
        });
    };

    // ── PRODUTOS ──────────────────────────────────────────────────────────────
    async function carregarProdutos() {
        const status = document.getElementById('prod-status-filter').value;
        const el = document.getElementById('prod-list');
        el.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Carregando...</p>';
        try {
            const { produtos } = await CondConnect.api(`/admin/produtos?status=${status}`);
            if (!produtos.length) { el.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Nenhum produto.</p>'; return; }
            el.innerHTML = '<div id="prod-list-inner"></div>';
            document.getElementById('prod-list-inner').innerHTML = produtos.map(p => `
                <div class="prod-row">
                    <img src="${p.foto_principal || '/static/assets/images/produto-placeholder.jpg'}" alt="">
                    <div style="flex:1;min-width:0;">
                        <strong style="font-size:14px;color:#1e293b;">${p.titulo}</strong>
                        <span style="display:block;font-size:12px;color:#64748b;">R$ ${parseFloat(p.preco).toLocaleString('pt-BR',{minimumFractionDigits:2})} • ${p.vendedor_nome} • <span style="text-transform:capitalize;">${p.status}</span></span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        ${p.status === 'pendente' ? `
                            <button class="action-btn ok"     onclick="prodAcao(${p.id},'aprovar')">Aprovar</button>
                            <button class="action-btn danger" onclick="prodAcao(${p.id},'rejeitar')">Rejeitar</button>` : ''}
                        ${p.status === 'disponivel' ? `<button class="action-btn danger" onclick="prodAcao(${p.id},'remover')">Remover</button>` : ''}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            el.innerHTML = `<p style="color:#dc2626;text-align:center;padding:40px;">${e.message}</p>`;
        }
    }

    window.prodAcao = async (id, acao) => {
        await chamarAdmin('/admin/produtos', { produto_id: id, acao });
        carregarProdutos();
    };

    // ── Iniciar ───────────────────────────────────────────────────────────────
    carregarStats();
});

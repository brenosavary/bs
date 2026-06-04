function renderLayout() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <header class="page-header">
            <div class="page-header-left">
                <span class="eyebrow">Relatório de Diário de Obra</span>
                <h1 id="obra-nome">Carregando relatório...</h1>
                <p id="report-subtitle">Aguarde enquanto carregamos os dados.</p>
            </div>
            <div class="page-header-right">
                <div class="date-navigator">
                    <button id="btn-prev" class="nav-btn">&lt;</button>
                    <input type="date" id="current-date" value="2026-05-20">
                    <button id="btn-next" class="nav-btn">&gt;</button>
                </div>
            </div>
        </header>

        <main class="page-main">
            <div class="top-cards" style="display:flex; gap:1rem; flex-wrap:wrap;">
                <section class="card report-summary" style="flex:1 1 320px; min-width:280px;">
                    <div class="summary-top">
                        <div>
                            <span class="summary-label">Relatório</span>
                            <h2 id="report-number"># -</h2>
                            <p id="report-date">-</p>
                        </div>
                        <div class="status-badge status-default" id="meta-status">Carregando</div>
                    </div>
                    <div class="summary-meta">
                        <p id="report-work"><strong>Obra:</strong> -</p>
                        <p id="report-client"><strong>Cliente:</strong> -</p>
                        <p id="report-created"><strong>Criado por:</strong> -</p>
                        <p id="report-approved"><strong>Aprovação:</strong> -</p>
                    </div>
                </section>

                <section class="card period-card" style="flex:1 1 240px; min-width:240px;">
                    <div class="period-line">
                        <p><strong>Início:</strong> <span id="report-start">-</span></p>
                        <p><strong>Término:</strong> <span id="report-end">-</span></p>
                    </div>
                    <div class="deadline-line">
                        <strong>Prazo:</strong> <span id="report-deadline">-</span>
                    </div>
                    <div class="progress-bar">
                        <div id="progress-fill" class="progress-fill"></div>
                    </div>
                    <p class="progress-label" id="report-progress">-</p>
                </section>
            </div>

            <section class="card crew-summary">
                <div class="section-header">
                    <h2>Mão de obra</h2>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Função</th>
                                <th>Quantidade</th>
                                <th>Contratação / Empresa</th>
                            </tr>
                        </thead>
                        <tbody id="crew-table-body"></tbody>
                    </table>
                </div>
            </section>

            <section class="card equipment-summary">
                <div class="section-header">
                    <h2>Equipamentos</h2>
                </div>
                <div id="equipment-list" class="list-stack"></div>
            </section>

            <section class="card activities-summary">
                <div class="section-header">
                    <h2>Atividades</h2>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Serviço</th>
                                <th>Local</th>
                                <th>Progresso</th>
                                <th>Avanço</th>
                            </tr>
                        </thead>
                        <tbody id="activities-table-body"></tbody>
                    </table>
                </div>
            </section>

            <section class="card incident-summary">
                <div class="section-header">
                    <h2>Ocorrências</h2>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Descrição</th>
                                <th>Ação tomada</th>
                                <th>Impacto</th>
                            </tr>
                        </thead>
                        <tbody id="incident-table-body"></tbody>
                    </table>
                </div>
            </section>

            <section class="card comments-summary">
                <div class="section-header">
                    <h2>Comentários</h2>
                </div>
                <div id="txt-observacoes" class="text-block">Nenhuma observação informada.</div>
            </section>

            <section class="card photo-summary">
                <div class="section-header">
                    <h2>Fotos</h2>
                </div>
                <div id="gallery-fotos" class="gallery"></div>
            </section>
        </main>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    renderLayout();

    const inputDate = document.getElementById("current-date");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");

    inputDate.addEventListener("change", () => fetchDiario(inputDate.value));
    btnPrev.addEventListener("click", () => alterarDia(-1));
    btnNext.addEventListener("click", () => alterarDia(1));

    fetchDiario(inputDate.value);

    function alterarDia(dias) {
        const dataAtual = new Date(inputDate.value + "T00:00:00");
        dataAtual.setDate(dataAtual.getDate() + dias);
        const novaDataStr = dataAtual.toISOString().split('T')[0];
        inputDate.value = novaDataStr;
        fetchDiario(novaDataStr);
    }

    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name) || '';
    }

    function fetchDiario(data) {
        const baseUrl = 'https://odin.reviverepossivel.com/ODIN5/MAN_DO_dados.rule';
        const obraId = getQueryParam('id_obra');
        const requestUrl = `${baseUrl}?sys=WWW&data=${encodeURIComponent(data)}&id_obra=${encodeURIComponent(obraId)}`;

        fetch(requestUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Relatório não encontrado para esta data.");
                }
                return response.json();
            })
            .then(dados => {
                try {
                    renderizarDiario(dados);
                } catch (erro) {
                    tratarErro(erro.message);
                }
            })
            .catch(erro => tratarErro(erro.message));
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (!element) return;
        element.innerText = value;
    }

    function setHTML(id, value) {
        const element = document.getElementById(id);
        if (!element) return;
        element.innerHTML = value;
    }

    function formatDateLabel(data) {
        if (!data) return "-";
        const dt = new Date(data + "T00:00:00");
        return dt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            weekday: 'long'
        });
    }

    function mapStatusClass(status) {
        if (!status) return 'status-default';
        const normalized = status.toString().toLowerCase();
        if (normalized.includes('aprov')) return 'status-aprovado';
        if (normalized.includes('andamento') || normalized.includes('emit')) return 'status-em-andamento';
        if (normalized.includes('paralis') || normalized.includes('parado')) return 'status-paralisado';
        if (normalized.includes('inexist')) return 'status-inexistente';
        return 'status-default';
    }

    function renderizarDiario(dados) {
        setText("obra-nome", dados.OBRA_NOME || "Relatório de Obra");
        setText("report-subtitle", dados.OBRA_NOME ? `Data do diário: ${formatDateLabel(dados.DATA_DIARIO)}` : "Aguarde enquanto carregamos os dados.");

        const reportNumber = dados.NUMERO_RELATORIO || dados.RELATORIO_NUMERO || dados.RELATORIO || dados.ID || '-';
        setText("report-number", reportNumber);
        setText("report-date", formatDateLabel(dados.DATA_DIARIO));
        setHTML("report-work", `<strong>Obra:</strong> ${dados.OBRA_NOME || '-'}`);
        setHTML("report-client", `<strong>Cliente:</strong> ${dados.CLIENTE || '-'}`);
        setHTML("report-created", `<strong>Criado por:</strong> ${dados.CRIADO_POR || dados.RESPONSAVEL || '-'}`);
        setHTML("report-approved", `<strong>Aprovação:</strong> ${dados.APROVACAO || '-'}`);

        const statusLabel = dados.STATUS || 'PENDENTE';
        setText("meta-status", statusLabel);
        const badge = document.getElementById("meta-status");
        if (badge) badge.className = `status-badge ${mapStatusClass(statusLabel)}`;

        setText("meta-responsavel", dados.RESPONSAVEL || '-');
        setText("meta-status-small", statusLabel);

        setText("report-start", `Início: ${dados.INICIO || '-'}`);
        setText("report-end", `Término: ${dados.TERMINO || '-'}`);

        const prazoDias = Number(dados.PRAZO);
        const diasDecorridos = Number(dados.DIAS_DECORRIDOS);
        const totalPeriodo = !isNaN(prazoDias) && !isNaN(diasDecorridos) ? prazoDias + diasDecorridos : null;
        const progressoPercentual = totalPeriodo ? Math.min(100, Math.max(0, Math.round((diasDecorridos / totalPeriodo) * 100))) : 0;

        setText("report-deadline", !isNaN(prazoDias) ? `${prazoDias} dias restantes` : 'Dados de prazo não informados');
        setText("report-progress", !isNaN(diasDecorridos) ? `${diasDecorridos} dias decorridos` : 'Progresso não informado');

        const progressFill = document.getElementById("progress-fill");
        if (progressFill) {
            progressFill.style.width = `${progressoPercentual}%`;
            progressFill.setAttribute('aria-valuenow', `${progressoPercentual}`);
            progressFill.style.backgroundColor = progressoPercentual >= 100 ? 'var(--success-color)' : 'var(--primary-color)';
        }

        setText("morning-status", dados.TEMPO_MANHA || 'Praticável');
        setText("afternoon-status", dados.TEMPO_TARDE || 'Praticável');
        setText("night-status", dados.TEMPO_NOITE || '-');

        const crewBody = document.getElementById("crew-table-body");
        if (crewBody) {
            const rows = (dados.MAO_DE_OBRA || []).map(mo => `
                <tr>
                    <td>${mo.FUNCOES || '-'}</td>
                    <td>${mo.QUANTIDADE || '-'}</td>
                    <td>${mo.CONTRATACAO || '-'}${mo.EMPRESA ? ` • ${mo.EMPRESA}` : ''}</td>
                </tr>
            `).join('');
            crewBody.innerHTML = rows || '<tr class="empty-row"><td colspan="3">Sem registro de mão de obra.</td></tr>';
        }

        const equipmentList = document.getElementById("equipment-list");
        if (equipmentList) {
            equipmentList.innerHTML = (dados.EQUIPAMENTOS || []).map(eq => `
                <div class="equipment-item">
                    <strong>${eq.QUANTIDADE || '-'}x ${eq.NOME || '-'}</strong>
                    <p>Status: ${eq.STATUS || '-'}</p>
                    <p>Alocação: ${eq.ALOCACAO || '-'}</p>
                </div>
            `).join('') || '<div class="equipment-item"><p>Sem equipamentos registrados.</p></div>';
        }

        const activitiesBody = document.getElementById("activities-table-body");
        if (activitiesBody) {
            const rows = (dados.ATIVIDADES || []).map(at => `
                <tr>
                    <td>${at.SERVICO || '-'}</td>
                    <td>${at.LOCAL || '-'}</td>
                    <td>${at.PROGRESSO || '-'}</td>
                    <td>${at.AVANCO != null ? `${at.AVANCO}%` : '-'}</td>
                </tr>
            `).join('');
            activitiesBody.innerHTML = rows || '<tr class="empty-row"><td colspan="4">Sem atividades registradas.</td></tr>';
        }

        const incidentBody = document.getElementById("incident-table-body");
        if (incidentBody) {
            const rows = (dados.OCORRENCIAS || []).map(oc => `
                <tr>
                    <td>${oc.TIPO || '-'}</td>
                    <td>${oc.DESCRICAO || '-'}</td>
                    <td>${oc.ACAO || '-'}</td>
                    <td>${oc.IMPACTO ? 'Sim' : 'Não'}</td>
                </tr>
            `).join('');
            incidentBody.innerHTML = rows || '<tr class="empty-row"><td colspan="4">Sem ocorrências registradas no dia.</td></tr>';
        }

        setText("txt-observacoes", dados.OBSERVACOES || 'Nenhuma observação registrada.');

        const galeria = document.getElementById("gallery-fotos");
        const fotos = dados.FOTOS || dados.FOTO || [];
        if (galeria) {
            if (fotos.length > 0) {
                galeria.innerHTML = fotos.map(ft => `
                    <div class="photo-card">
                        <img src="${ft.URL || '#'}" alt="Foto do diário">
                        <p>${ft.LEGENDA || 'Sem legenda'}</p>
                    </div>
                `).join('');
            } else {
                galeria.innerHTML = '<div class="photo-card"><p style="padding: 18px;">Nenhuma foto anexada a este diário.</p></div>';
            }
        }
    }

    function tratarErro(mensagem) {
        setText("obra-nome", "Diário Não Encontrado");
        setText("report-subtitle", "Não há relatório para esta data.");
        setText("report-number", '-');
        setText("report-date", '-');
        setHTML("report-work", '<strong>Obra:</strong> -');
        setHTML("report-client", '<strong>Cliente:</strong> -');
        setHTML("report-created", '<strong>Criado por:</strong> -');
        setHTML("report-approved", '<strong>Aprovação:</strong> -');
        setText("meta-responsavel", '-');
        setText("meta-status", 'INEXISTENTE');
        const metaStatus = document.getElementById("meta-status");
        if (metaStatus) metaStatus.className = 'status-badge status-inexistente';
        setText("meta-status-small", 'INEXISTENTE');
        setText("report-start", 'Início: -');
        setText("report-end", 'Término: -');
        setText("report-deadline", 'Dados de prazo não informados');
        setText("report-progress", 'Progresso não informado');
        const progressFill = document.getElementById("progress-fill");
        if (progressFill) {
            progressFill.style.width = '0%';
            progressFill.setAttribute('aria-valuenow', '0');
            progressFill.style.backgroundColor = 'var(--primary-color)';
        }
        setText("morning-status", 'Praticável');
        setText("afternoon-status", 'Praticável');
        setText("night-status", '-');

        setHTML("crew-table-body", '<tr class="empty-row"><td colspan="3">Sem registro de mão de obra.</td></tr>');
        setHTML("equipment-list", '<div class="equipment-item"><p>Sem equipamentos registrados.</p></div>');
        setHTML("activities-table-body", '<tr class="empty-row"><td colspan="4">Sem atividades registradas.</td></tr>');
        setHTML("incident-table-body", '<tr class="empty-row"><td colspan="4">Sem ocorrências registradas no dia.</td></tr>');
        setText("txt-observacoes", 'Nenhum dado inserido.');
        setHTML("gallery-fotos", '<div class="photo-card"><p style="padding: 18px;">Sem fotos.</p></div>');
        console.warn(mensagem);
    }
});
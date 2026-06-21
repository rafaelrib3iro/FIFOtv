// ─── CHECKLIST DEV TOOL ──────────────────────────────────
// painel de testes interativo para validação de sessões
// aberto pelo botão flutuante (FAB) no canto inferior direito

const CHECKLIST_DATA = {
    title: "Sessão 4 — Migração WebContentsView",
    subtitle: "1 janela + views empilhadas (sem flash X11)",
    sections: [
        {
            title: "Inicialização",
            items: [
                { id: "s4i-1", label: "App abre fullscreen sem flash branco" },
                { id: "s4i-2", label: "Home aparece com streamings normalmente" },
                { id: "s4i-3", label: "Navegação funciona com D-pad no grid" },
            ]
        },
        {
            title: "Transição Home → Streaming",
            items: [
                { id: "s4t-1", label: "Enter no card → tela loading aparece (ícone + nome + spinner)" },
                { id: "s4t-2", label: "Loading fica visível por ~5s enquanto streaming carrega" },
                { id: "s4t-3", label: "Sem flash branco durante toda a transição" },
                { id: "s4t-4", label: "Streaming aparece e overlay fica acessível" },
            ]
        },
        {
            title: "Menu de Contexto (no streaming)",
            items: [
                { id: "s4m-1", label: "ContextMenu abre/fecha toggle" },
                { id: "s4m-2", label: "D-pad cima/baixo navega itens do menu" },
                { id: "s4m-3", label: "Enter no item executa a ação" },
                { id: "s4m-4", label: "Escape fecha o menu" },
                { id: "s4m-5", label: "BrowserBack (click) fecha menu SEM voltar pra home" },
                { id: "s4m-6", label: "BrowserBack com menu fechado volta pra homepage" },
            ]
        },
        {
            title: "Volume no Menu",
            items: [
                { id: "s4v-1", label: "Volume up/down NÃO fecha o menu" },
                { id: "s4v-2", label: "D-pad esquerda na barra de volume diminui" },
                { id: "s4v-3", label: "D-pad direita na barra de volume aumenta" },
                { id: "s4v-4", label: "Barra de volume reflete o valor visualmente" },
            ]
        },
        {
            title: "Zoom no Menu",
            items: [
                { id: "s4z-1", label: "Zoom in/out NÃO fecha o menu" },
                { id: "s4z-2", label: "D-pad esquerda na barra de zoom diminui" },
                { id: "s4z-3", label: "D-pad direita na barra de zoom aumenta" },
                { id: "s4z-4", label: "Toast de zoom NÃO aparece (barra é suficiente)" },
            ]
        },
        {
            title: "Volume Toast (remote)",
            items: [
                { id: "s4r-1", label: "Vol+ do remote → toast aparece com nome FIFOtv" },
                { id: "s4r-2", label: "Vol- do remote → toast aparece com nome FIFOtv" },
                { id: "s4r-3", label: "Toast desaparece após ~2s" },
            ]
        },
        {
            title: "Ações do Menu",
            items: [
                { id: "s4a-1", label: "'Voltar ao início' volta pra homepage direto (sem tela loading)" },
                { id: "s4a-2", label: "'Recarregar página' recarrega streaming" },
                { id: "s4a-3", label: "'Desligar' funciona" },
            ]
        },
        {
            title: "Multi-view Integrity",
            items: [
                { id: "s4w-1", label: "Streamings diferentes funcionam em sequência (entrar → voltar → entrar)" },
                { id: "s4w-2", label: "RAM liberada ao voltar (streaming destruído)" },
                { id: "s4w-3", label: "Home não pisca ao re-adicionar view" },
                { id: "s4w-4", label: "Resize da janela atualiza views corretamente" },
            ]
        },
    ],
    notes: "Testar 2+ streamings em sequência. Foco: zero flash, single window."
};

// ─── STORAGE ──────────────────────────────────────────────
const CL_STORAGE_KEY = 'fifotv-checklist';

function clLoadState() {
    try { return JSON.parse(localStorage.getItem(CL_STORAGE_KEY)) || {}; } catch { return {}; }
}
function clSaveState(state) {
    localStorage.setItem(CL_STORAGE_KEY, JSON.stringify(state));
}

// ─── RENDER ───────────────────────────────────────────────
function clRender() {
    const state = clLoadState();
    const container = document.getElementById('cl-items');
    if (!container) return;

    let total = 0, checked = 0;
    let html = '';

    for (const section of CHECKLIST_DATA.sections) {
        html += `<div class="cl-section"><div class="cl-section-title">${section.title}</div>`;
        for (const item of section.items) {
            total++;
            const s = state[item.id] || {};
            const isChecked = s.checked || false;
            if (isChecked) checked++;
            html += `
                <div class="cl-row${isChecked ? ' cl-checked' : ''}">
                    <label class="cl-cb-wrap">
                        <input type="checkbox" class="cl-cb" ${isChecked ? 'checked' : ''} data-id="${item.id}">
                        <span class="cl-cb-visual"></span>
                    </label>
                    <div class="cl-content">
                        <span class="cl-label">${item.label}</span>
                        ${item.note ? `<span class="cl-note">${item.note}</span>` : ''}
                        <input type="text" class="cl-comment" placeholder="comentário..."
                            data-id="${item.id}" value="${(s.comment || '').replace(/"/g, '&quot;')}">
                    </div>
                </div>`;
        }
        html += '</div>';
    }
    container.innerHTML = html;

    // progress
    const pct = total ? Math.round(checked / total * 100) : 0;
    const fill = document.getElementById('cl-progress-fill');
    const text = document.getElementById('cl-progress-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${checked}/${total} (${pct}%)`;

    // badge no FAB
    const badge = document.getElementById('cl-badge');
    if (badge) {
        badge.textContent = `${checked}/${total}`;
        badge.style.display = checked > 0 ? '' : 'none';
    }

    // bind events
    container.querySelectorAll('.cl-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            const st = clLoadState();
            if (!st[cb.dataset.id]) st[cb.dataset.id] = {};
            st[cb.dataset.id].checked = cb.checked;
            clSaveState(st);
            clRender();
        });
    });
    container.querySelectorAll('.cl-comment').forEach(inp => {
        inp.addEventListener('input', () => {
            const st = clLoadState();
            if (!st[inp.dataset.id]) st[inp.dataset.id] = {};
            st[inp.dataset.id].comment = inp.value;
            clSaveState(st);
        });
    });
}

// ─── TOGGLE PANEL ─────────────────────────────────────────
function clToggle() {
    const panel = document.getElementById('cl-panel');
    const fab = document.getElementById('cl-fab');
    if (!panel) return;
    const isOpen = panel.classList.contains('cl-open');
    if (isOpen) {
        panel.classList.remove('cl-open');
        fab.classList.remove('cl-fab-open');
    } else {
        clRender();
        panel.classList.add('cl-open');
        fab.classList.add('cl-fab-open');
    }
}

function clReset() {
    if (confirm('Limpar todo o progresso?')) {
        localStorage.removeItem(CL_STORAGE_KEY);
        clRender();
    }
}

// ─── EXPORT RESULTS ─────────────────────────────────────
function clExportResults() {
    const state = clLoadState();
    const lines = [`# ${CHECKLIST_DATA.title} — Resultados\n`];
    let total = 0, passed = 0, failed = 0, notes = [];

    for (const section of CHECKLIST_DATA.sections) {
        lines.push(`## ${section.title}`);
        for (const item of section.items) {
            total++;
            const s = state[item.id] || {};
            const status = s.checked ? 'PASS' : 'FAIL';
            if (s.checked) passed++; else failed++;
            const comment = s.comment ? ` — ${s.comment}` : '';
            lines.push(`- [${status}] ${item.label}${comment}`);
            if (s.comment) notes.push(`${item.label}: ${s.comment}`);
        }
        lines.push('');
    }

    lines.push(`## Resumo: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    lines.push(`- PASS: ${passed}`);
    lines.push(`- FAIL: ${failed}`);
    if (notes.length) {
        lines.push(`\n## Notas`);
        notes.forEach(n => lines.push(`- ${n}`));
    }

    const text = lines.join('\n');
    console.log(text);

    // Copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Resultados copiados pro clipboard');
        });
    }
    return text;
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('cl-fab');
    if (fab) fab.addEventListener('click', clToggle);

    const closeBtn = document.getElementById('cl-close');
    if (closeBtn) closeBtn.addEventListener('click', clToggle);

    const resetBtn = document.getElementById('cl-reset');
    if (resetBtn) resetBtn.addEventListener('click', clReset);

    const exportBtn = document.getElementById('cl-export');
    if (exportBtn) exportBtn.addEventListener('click', clExportResults);

    const titleEl = document.getElementById('cl-title');
    const subEl = document.getElementById('cl-subtitle');
    const notesEl = document.getElementById('cl-notes');
    if (titleEl) titleEl.textContent = CHECKLIST_DATA.title || 'Checklist';
    if (subEl) subEl.textContent = CHECKLIST_DATA.subtitle || '';
    if (notesEl && CHECKLIST_DATA.notes) notesEl.textContent = CHECKLIST_DATA.notes;

    clRender();
});

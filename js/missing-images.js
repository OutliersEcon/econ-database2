// missing-images.js
// Admin panel + helpers: questions that likely still need 原題／答案 originals
// and/or 內嵌圖 (inlineDiagrams). Heuristics documented in README.
//
// Visibility: accessRights.admin (same gate as 管理員模式 edit tools).
// Deep-link: open edit form when possible; else filter by 題目 ID.

(function () {
    'use strict';

    var overlay = null;
    var filterState = {
        missingInline: true,
        missingOriginalQ: true,
        missingOriginalA: false
    };

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function hasAdminAccess() {
        var rights = (typeof currentAccessRights === 'function')
            ? currentAccessRights()
            : (window.accessRights || null);
        return !!(rights && rights.admin === true);
    }

    function isPathPresent(value) {
        var text = String(value == null ? '' : value).trim();
        return !!(text && text !== '-');
    }

    function hasInlineDiagrams(question) {
        return isPathPresent(question && question.inlineDiagrams);
    }

    function hasOriginalQuestion(question) {
        return isPathPresent(question && question.originalQuestionImage)
            || isPathPresent(question && question.originalQuestionImageEng);
    }

    function hasOriginalAnswer(question) {
        return isPathPresent(question && question.originalAnswerImage)
            || isPathPresent(question && question.originalAnswerImageEng);
    }

    // graphType suggests a figure exists, but inlineDiagrams is empty.
    function missingInlineDiagram(question) {
        if (typeof questionNeedsInlineDiagram === 'function') {
            return questionNeedsInlineDiagram(question);
        }
        var gt = String((question && question.graphType) || '').trim();
        if (!gt || gt === '-' || gt === '沒有圖') return false;
        return !hasInlineDiagrams(question);
    }

    function missingOriginalQuestionImage(question) {
        if (typeof questionMissingOriginalQuestion === 'function') {
            return questionMissingOriginalQuestion(question);
        }
        return !hasOriginalQuestion(question);
    }

    function missingOriginalAnswerImage(question) {
        if (typeof questionMissingOriginalAnswer === 'function') {
            return questionMissingOriginalAnswer(question);
        }
        return !hasOriginalAnswer(question);
    }

    function missingReasons(question) {
        var reasons = [];
        if (filterState.missingInline && missingInlineDiagram(question)) {
            reasons.push({ key: 'inline', label: '缺內嵌圖' });
        }
        if (filterState.missingOriginalQ && missingOriginalQuestionImage(question)) {
            reasons.push({ key: 'origQ', label: '缺原題' });
        }
        if (filterState.missingOriginalA && missingOriginalAnswerImage(question)) {
            reasons.push({ key: 'origA', label: '缺答案原圖' });
        }
        return reasons;
    }

    function collectHits(questions) {
        var list = Array.isArray(questions) ? questions : [];
        var hits = [];
        for (var i = 0; i < list.length; i++) {
            var q = list[i];
            if (!q || !q.id) continue;
            var reasons = missingReasons(q);
            if (!reasons.length) continue;
            hits.push({
                id: String(q.id),
                graphType: String(q.graphType || '').trim(),
                reasons: reasons,
                question: q
            });
        }
        hits.sort(function (a, b) {
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });
        return hits;
    }

    function ensureButton() {
        var host = document.querySelector('header div[style*="flex-wrap"]') ||
            document.querySelector('header');
        if (!host) return null;
        var button = document.getElementById('missing-images-btn');
        if (button) return button;
        button = document.createElement('button');
        button.type = 'button';
        button.id = 'missing-images-btn';
        button.className = 'btn btn-outline-primary header-toolbar-btn';
        button.hidden = true;
        button.textContent = '缺圖提醒';
        button.setAttribute('aria-label', '缺圖提醒');
        button.addEventListener('click', function () {
            openMissingImagesPanel();
        });
        var after = document.getElementById('data-checks-btn') ||
            document.getElementById('admin-mode-btn');
        if (after && after.parentNode === host) {
            host.insertBefore(button, after.nextSibling);
        } else {
            host.appendChild(button);
        }
        return button;
    }

    function refreshMissingImagesVisibility() {
        var button = ensureButton();
        if (!button) return;
        var allowed = hasAdminAccess();
        button.hidden = !allowed;
        if (!allowed) closeMissingImagesPanel();
    }

    function closeMissingImagesPanel() {
        if (overlay) overlay.hidden = true;
        document.body.classList.remove('missing-images-open');
    }

    function ensureOverlay() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'missing-images-overlay';
        overlay.className = 'missing-images-overlay';
        overlay.hidden = true;
        overlay.innerHTML = ''
            + '<div class="missing-images-dialog" role="dialog" aria-modal="true" aria-labelledby="missing-images-title">'
            + '  <header class="missing-images-header">'
            + '    <div>'
            + '      <h2 id="missing-images-title">缺圖提醒</h2>'
            + '      <p class="missing-images-subtitle">列出仍可能需要補上<strong>內嵌圖</strong>或<strong>原題／答案原圖</strong>的題目。啟發式：圖表類型不是「沒有圖」但未填內嵌圖路徑；原題／答案路徑空白。點題號可開啟編輯（管理員）或篩選該題。</p>'
            + '    </div>'
            + '    <button type="button" class="missing-images-close" aria-label="關閉">×</button>'
            + '  </header>'
            + '  <div class="missing-images-toolbar" role="group" aria-label="缺圖類型">'
            + '    <label class="missing-images-check"><input type="checkbox" data-mi-filter="missingInline" checked> 缺內嵌圖</label>'
            + '    <label class="missing-images-check"><input type="checkbox" data-mi-filter="missingOriginalQ" checked> 缺原題</label>'
            + '    <label class="missing-images-check"><input type="checkbox" data-mi-filter="missingOriginalA"> 缺答案原圖</label>'
            + '    <button type="button" class="btn btn-outline-primary btn-sm" id="missing-images-refresh">重新整理</button>'
            + '  </div>'
            + '  <div class="missing-images-body" id="missing-images-body"></div>'
            + '  <footer class="missing-images-footer">'
            + '    <p class="missing-images-footer-note" id="missing-images-footer-note"></p>'
            + '    <button type="button" class="btn btn-secondary" id="missing-images-done">完成</button>'
            + '  </footer>'
            + '</div>';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay && shouldCloseOnBackdropClick()) closeMissingImagesPanel();
        });
        overlay.querySelector('.missing-images-close').addEventListener('click', closeMissingImagesPanel);
        overlay.querySelector('#missing-images-done').addEventListener('click', closeMissingImagesPanel);
        overlay.querySelector('#missing-images-refresh').addEventListener('click', function () {
            renderBody();
        });
        overlay.querySelectorAll('[data-mi-filter]').forEach(function (input) {
            input.addEventListener('change', function () {
                var key = input.getAttribute('data-mi-filter');
                if (!key || !Object.prototype.hasOwnProperty.call(filterState, key)) return;
                filterState[key] = !!input.checked;
                renderBody();
            });
        });
        return overlay;
    }

    function openEditOrFilter(questionId) {
        closeMissingImagesPanel();
        if (typeof switchTab === 'function') {
            try { switchTab('questions'); } catch (ignore) {}
        }
        if (hasAdminAccess() && typeof editQuestion === 'function') {
            editQuestion(questionId);
            return;
        }
        if (typeof window.__dataChecksShowQuestionById__ === 'function') {
            window.__dataChecksShowQuestionById__(questionId);
            return;
        }
        try {
            var search = document.getElementById('search-input');
            var scope = document.getElementById('search-scope');
            if (scope) scope.value = 'id';
            if (search) {
                search.value = questionId;
                search.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (typeof filterQuestions === 'function') filterQuestions();
        } catch (err) {
            console.warn('missing-images deep-link failed', err);
        }
    }

    async function loadQuestions() {
        if (!window.storage) return [];
        if (typeof window.storage.getAllQuestions === 'function') {
            return await window.storage.getAllQuestions();
        }
        return await window.storage.getQuestions();
    }

    async function renderBody() {
        var body = document.getElementById('missing-images-body');
        var note = document.getElementById('missing-images-footer-note');
        if (!body) return;
        body.innerHTML = '<p class="missing-images-loading">載入中…</p>';
        if (note) note.textContent = '';
        var questions;
        try {
            questions = await loadQuestions();
        } catch (err) {
            body.innerHTML = '<p class="missing-images-error">無法載入題庫。</p>';
            return;
        }
        var hits = collectHits(questions);
        if (note) {
            note.textContent = '共 ' + hits.length + ' 題符合目前勾選條件（題庫 ' + (questions || []).length + ' 題）。';
        }
        if (!hits.length) {
            body.innerHTML = '<p class="missing-images-empty">目前沒有符合條件的缺圖題目。</p>';
            return;
        }
        var html = '<ul class="missing-images-list">';
        var cap = 500;
        var shown = hits.slice(0, cap);
        shown.forEach(function (hit) {
            var badges = hit.reasons.map(function (r) {
                return '<span class="missing-images-badge missing-images-badge-' + escapeHtml(r.key) + '">'
                    + escapeHtml(r.label) + '</span>';
            }).join(' ');
            var graph = hit.graphType && hit.graphType !== '沒有圖'
                ? '<span class="missing-images-graph">' + escapeHtml(hit.graphType) + '</span>'
                : '';
            html += '<li class="missing-images-row">'
                + '<button type="button" class="missing-images-id" data-mi-id="' + escapeHtml(hit.id) + '">'
                + escapeHtml(hit.id) + '</button>'
                + '<span class="missing-images-meta">' + badges + ' ' + graph + '</span>'
                + '</li>';
        });
        html += '</ul>';
        if (hits.length > cap) {
            html += '<p class="missing-images-truncated">只顯示前 ' + cap + ' 題（其餘 ' + (hits.length - cap) + ' 題請收窄勾選）。</p>';
        }
        body.innerHTML = html;
        body.querySelectorAll('[data-mi-id]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openEditOrFilter(btn.getAttribute('data-mi-id'));
            });
        });
    }

    async function openMissingImagesPanel() {
        if (!hasAdminAccess()) return;
        ensureOverlay();
        overlay.hidden = false;
        document.body.classList.add('missing-images-open');
        await renderBody();
    }

    function injectStyles() {
        if (document.getElementById('missing-images-style')) return;
        var style = document.createElement('style');
        style.id = 'missing-images-style';
        style.textContent = ''
            + '.missing-images-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:12000;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto;}'
            + '.missing-images-overlay[hidden]{display:none!important;}'
            + '.missing-images-dialog{background:var(--light-bg,#fff);color:var(--text-color,#222);width:min(760px,100%);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;max-height:calc(100vh - 48px);}'
            + '.missing-images-header{display:flex;justify-content:space-between;gap:12px;padding:16px 18px 8px;border-bottom:1px solid var(--border-light,#e0e0e0);}'
            + '.missing-images-header h2{margin:0 0 6px;font-size:1.25rem;}'
            + '.missing-images-subtitle{margin:0;font-size:13px;line-height:1.45;color:var(--text-light,#666);}'
            + '.missing-images-close{border:none;background:transparent;font-size:28px;line-height:1;cursor:pointer;color:inherit;}'
            + '.missing-images-toolbar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border-light,#e0e0e0);}'
            + '.missing-images-check{display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;}'
            + '.missing-images-body{padding:12px 18px;overflow:auto;flex:1;}'
            + '.missing-images-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}'
            + '.missing-images-row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:8px 10px;border:1px solid var(--border-light,#e8e8e8);border-radius:8px;}'
            + '.missing-images-id{border:none;background:#e3f2fd;color:#1565c0;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:13px;}'
            + '.missing-images-id:hover{background:#bbdefb;}'
            + '.missing-images-meta{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;}'
            + '.missing-images-badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#fff3e0;color:#e65100;font-weight:600;}'
            + '.missing-images-badge-origQ{background:#fce4ec;color:#c2185b;}'
            + '.missing-images-badge-origA{background:#f3e5f5;color:#7b1fa2;}'
            + '.missing-images-graph{color:var(--text-light,#666);}'
            + '.missing-images-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 18px 14px;border-top:1px solid var(--border-light,#e0e0e0);}'
            + '.missing-images-footer-note{margin:0;font-size:12px;color:var(--text-light,#666);}'
            + '.missing-images-empty,.missing-images-loading,.missing-images-error,.missing-images-truncated{font-size:13px;color:var(--text-light,#666);}';
        document.head.appendChild(style);
    }

    function hookAccessRights() {
        if (typeof window.applyAccessRights !== 'function') return;
        if (window.applyAccessRights.__missingImagesWrapped) return;
        var previous = window.applyAccessRights;
        function wrapped(rights) {
            var result = previous(rights);
            refreshMissingImagesVisibility();
            return result;
        }
        wrapped.__missingImagesWrapped = true;
        // Preserve other wrappers' flags if present.
        if (previous.__dataChecksWrapped) wrapped.__dataChecksWrapped = true;
        window.applyAccessRights = wrapped;
    }

    function initMissingImagesFeature() {
        injectStyles();
        hookAccessRights();
        ensureButton();
        refreshMissingImagesVisibility();
    }

    window.MissingImages = {
        open: openMissingImagesPanel,
        close: closeMissingImagesPanel,
        refresh: refreshMissingImagesVisibility,
        collectHits: collectHits,
        missingInlineDiagram: missingInlineDiagram,
        missingOriginalQuestionImage: missingOriginalQuestionImage,
        missingOriginalAnswerImage: missingOriginalAnswerImage
    };
    window.openMissingImagesPanel = openMissingImagesPanel;
    window.closeMissingImagesPanel = closeMissingImagesPanel;
    window.refreshMissingImagesVisibility = refreshMissingImagesVisibility;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMissingImagesFeature);
    } else {
        initMissingImagesFeature();
    }
})();

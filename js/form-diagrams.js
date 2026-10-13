// form-diagrams.js
// Edit-form UX for inlineDiagrams: preview, upload to shared/diagrams/,
// AI describe → confirm before inserting into 備註.
// Depends: shared-assets (hydrateSharedImages), github-sync / PoeGenerate proxy,
// accessRights (githubSync for upload, ai for describe).

(function () {
    'use strict';

    var UPLOAD_MAX_BYTES = 750000;
    var DESCRIBE_MAX_BYTES = 850000;

    function rights() {
        return (typeof currentAccessRights === 'function')
            ? currentAccessRights()
            : (window.accessRights || {});
    }

    function canUpload() {
        return !!(rights().githubSync === true);
    }

    function canDescribe() {
        return !!(rights().ai === true);
    }

    function username() {
        return (typeof gitUsername === 'function') ? gitUsername() : '';
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseDiagramPaths(raw) {
        return String(raw == null ? '' : raw)
            .split(',')
            .map(function (s) { return s.trim(); })
            .filter(function (s) {
                return s && s !== '-' && s.indexOf('..') === -1 && !/^[a-z]+:/i.test(s);
            });
    }

    function joinDiagramPaths(list) {
        return (list || []).map(function (s) { return String(s).trim(); }).filter(Boolean).join(', ');
    }

    function getInlineInput() {
        return document.getElementById('inline-diagrams');
    }

    function setInlinePaths(paths) {
        var input = getInlineInput();
        if (!input) return;
        input.value = joinDiagramPaths(paths);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        renderDiagramPreview();
    }

    function readFileAsBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var result = String(reader.result || '');
                var comma = result.indexOf(',');
                resolve({
                    dataUrl: result,
                    base64: comma >= 0 ? result.slice(comma + 1) : result,
                    mime: file.type || 'application/octet-stream'
                });
            };
            reader.onerror = function () { reject(reader.error || new Error('read_failed')); };
            reader.readAsDataURL(file);
        });
    }

    function proxyRequest(body, timeoutMs) {
        if (window.PoeGenerate && typeof PoeGenerate.proxyRequest === 'function') {
            return PoeGenerate.proxyRequest(body, timeoutMs || 90000, null, { retries: 1 });
        }
        if (typeof gitProxyRequest === 'function') {
            return gitProxyRequest(body, timeoutMs || 90000);
        }
        return Promise.reject(new Error('no_proxy'));
    }

    function withAiKeys(payload) {
        if (window.PoeGenerate && typeof PoeGenerate.withProviderAndApiKey === 'function') {
            return PoeGenerate.withProviderAndApiKey(payload);
        }
        return payload;
    }

    function ensureApiKeyReady() {
        if (window.PoeGenerate && typeof PoeGenerate.ensureApiKeyReady === 'function') {
            return PoeGenerate.ensureApiKeyReady();
        }
        return true;
    }

    function sanitizeUploadName(name, mime) {
        var file = String(name || 'diagram').replace(/\\/g, '/').split('/').pop() || 'diagram';
        file = file.replace(/[^\w.\-() ]+/g, '_').replace(/\s+/g, '-');
        if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(file)) {
            var ext = 'jpg';
            if (/png/i.test(mime)) ext = 'png';
            else if (/gif/i.test(mime)) ext = 'gif';
            else if (/webp/i.test(mime)) ext = 'webp';
            else if (/svg/i.test(mime)) ext = 'svg';
            file += '.' + ext;
        }
        if (file.length > 100) {
            var dot = file.lastIndexOf('.');
            var e = dot > 0 ? file.slice(dot) : '';
            file = file.slice(0, Math.max(1, 100 - e.length)) + e;
        }
        return file;
    }

    function suggestDiagramPath(questionId, fileName) {
        var base = sanitizeUploadName(fileName, '');
        var idPart = String(questionId || '').trim().replace(/[^\w.\-]+/g, '_');
        if (idPart && base.indexOf(idPart) !== 0) {
            base = idPart + '-' + base;
        }
        return 'diagrams/' + base;
    }

    function statusEl() {
        return document.getElementById('inline-diagrams-status');
    }

    function setStatus(text, isError) {
        var el = statusEl();
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('is-error', !!isError);
    }

    function renderDiagramPreview() {
        var host = document.getElementById('inline-diagrams-preview');
        var input = getInlineInput();
        if (!host || !input) return;
        var paths = parseDiagramPaths(input.value);
        if (!paths.length) {
            host.innerHTML = '<p class="inline-diagrams-empty">尚未加入內嵌圖。可上載檔案，或手動填路徑（diagrams/…）。</p>';
            return;
        }
        var html = '<ul class="inline-diagrams-list">';
        paths.forEach(function (path, index) {
            html += '<li class="inline-diagrams-item" data-path="' + escapeHtml(path) + '">'
                + '<div class="inline-diagrams-thumb-wrap">'
                + '<img class="inline-diagrams-thumb" src="' + (typeof SHARED_IMG_PLACEHOLDER !== 'undefined' ? SHARED_IMG_PLACEHOLDER : '') + '" data-shared-src="' + escapeHtml(path) + '" alt="內嵌圖預覽">'
                + '</div>'
                + '<div class="inline-diagrams-item-meta">'
                + '<code class="inline-diagrams-path">' + escapeHtml(path) + '</code>'
                + '<div class="inline-diagrams-item-actions">'
                + '<button type="button" class="btn btn-outline-primary btn-sm" data-di-describe="' + index + '"'
                + (canDescribe() ? '' : ' hidden') + '>AI 描述</button>'
                + '<button type="button" class="btn btn-outline-danger btn-sm" data-di-remove="' + index + '">移除</button>'
                + '</div></div></li>';
        });
        html += '</ul>';
        host.innerHTML = html;
        if (typeof hydrateSharedImages === 'function') {
            hydrateSharedImages(host);
        }
        host.querySelectorAll('[data-di-remove]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.getAttribute('data-di-remove'), 10);
                var next = parseDiagramPaths(input.value);
                if (idx >= 0 && idx < next.length) next.splice(idx, 1);
                setInlinePaths(next);
            });
        });
        host.querySelectorAll('[data-di-describe]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.getAttribute('data-di-describe'), 10);
                describePathAt(idx);
            });
        });
    }

    async function uploadSelectedFile() {
        var fileInput = document.getElementById('inline-diagrams-file');
        var input = getInlineInput();
        if (!fileInput || !input) return;
        if (!canUpload()) {
            setStatus('需要 GitHub 同步權限才能上載內嵌圖。', true);
            return;
        }
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
            setStatus('請先選擇圖片檔。', true);
            return;
        }
        if (file.size > UPLOAD_MAX_BYTES) {
            setStatus('檔案太大（上限約 750KB）。請壓縮後再試。', true);
            return;
        }
        var user = username();
        if (!user) {
            setStatus('請先登入。', true);
            return;
        }
        setStatus('上載中…');
        try {
            var read = await readFileAsBase64(file);
            var qid = (document.getElementById('question-id') || {}).value || '';
            var relPath = suggestDiagramPath(qid, file.name);
            var data = await proxyRequest({
                action: 'uploadSharedAsset',
                username: user,
                path: relPath,
                fileName: file.name,
                folder: 'diagrams',
                contentBase64: read.base64,
                mediaType: read.mime || file.type,
                message: 'Upload inline diagram ' + relPath
            }, 120000);
            if (!data || data.ok !== true) {
                var err = (data && data.error) || 'github_error';
                setStatus('上載失敗：' + err, true);
                return;
            }
            var savedPath = String(data.path || relPath).trim();
            var paths = parseDiagramPaths(input.value);
            if (paths.indexOf(savedPath) === -1) paths.push(savedPath);
            setInlinePaths(paths);
            fileInput.value = '';
            setStatus('已上載並加入：' + savedPath);
            // Drop cached blob so new path can load.
            if (typeof sharedBlobCache !== 'undefined' && sharedBlobCache && sharedBlobCache.delete) {
                try { sharedBlobCache.delete(savedPath); } catch (ignore) {}
            }
        } catch (err) {
            console.warn('inline diagram upload failed', err);
            setStatus('上載失敗：' + ((err && err.code) || (err && err.message) || 'network'), true);
        }
    }

    async function fetchSharedAsDataUrl(path) {
        if (typeof sharedAssetObjectUrl !== 'function') {
            throw new Error('shared_fetch_unavailable');
        }
        var objectUrl = await sharedAssetObjectUrl(path);
        var resp = await fetch(objectUrl);
        if (!resp.ok) throw new Error('shared_fetch_failed');
        var blob = await resp.blob();
        return await new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(String(reader.result || '')); };
            reader.onerror = function () { reject(reader.error || new Error('read_failed')); };
            reader.readAsDataURL(blob);
        });
    }

    function appendRemarksConfirmed(description) {
        var remarks = document.getElementById('remarks');
        if (!remarks) return false;
        var text = String(description || '').trim();
        if (!text) return false;
        var prefix = '【圖描述】';
        var block = prefix + text;
        var msg = '將以下描述加入「備註」？（不會改寫題幹）\n\n' + text;
        if (!window.confirm(msg)) return false;
        var current = String(remarks.value || '').trim();
        remarks.value = current ? (current + '\n' + block) : block;
        remarks.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }

    async function describePathAt(index) {
        if (!canDescribe()) {
            setStatus('需要 AI 權限才能產生圖描述。', true);
            return;
        }
        if (!ensureApiKeyReady()) return;
        var input = getInlineInput();
        var paths = parseDiagramPaths(input && input.value);
        var path = paths[index];
        if (!path) return;
        var user = username();
        if (!user) {
            setStatus('請先登入。', true);
            return;
        }
        setStatus('AI 讀圖中…');
        try {
            var dataUrl = await fetchSharedAsDataUrl(path);
            var comma = dataUrl.indexOf(',');
            var header = comma >= 0 ? dataUrl.slice(0, comma) : '';
            var base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
            var mimeMatch = /data:([^;]+);base64/i.exec(header);
            var mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            // Approx decoded size
            var approx = Math.floor(base64.replace(/=+$/, '').length * 0.75);
            if (approx > DESCRIBE_MAX_BYTES) {
                setStatus('圖片太大，無法送交 AI 描述。', true);
                return;
            }
            var payload = withAiKeys({
                action: 'describeImage',
                username: user,
                imageBase64: base64,
                mimeType: mime,
                fileName: path.split('/').pop(),
                path: path,
                hint: '此圖為題目內嵌圖路徑 ' + path
            });
            var data = await proxyRequest(payload, 120000);
            if (!data || data.ok !== true) {
                setStatus('AI 描述失敗：' + ((data && data.error) || 'upstream_error'), true);
                return;
            }
            setStatus('AI 描述完成，請確認是否寫入備註。');
            if (appendRemarksConfirmed(data.description)) {
                setStatus('已將描述加入備註。');
            } else {
                setStatus('已取消寫入備註。描述仍可再按一次產生。');
            }
        } catch (err) {
            console.warn('describe image failed', err);
            setStatus('AI 描述失敗：' + ((err && err.code) || (err && err.message) || 'network'), true);
        }
    }

    async function describeLocalFile() {
        if (!canDescribe()) {
            setStatus('需要 AI 權限才能產生圖描述。', true);
            return;
        }
        if (!ensureApiKeyReady()) return;
        var fileInput = document.getElementById('inline-diagrams-file');
        var file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) {
            setStatus('請先選擇本機圖片，或對已加入的預覽按「AI 描述」。', true);
            return;
        }
        if (file.size > DESCRIBE_MAX_BYTES) {
            setStatus('圖片太大，無法送交 AI 描述。', true);
            return;
        }
        var user = username();
        if (!user) {
            setStatus('請先登入。', true);
            return;
        }
        setStatus('AI 讀圖中…');
        try {
            var read = await readFileAsBase64(file);
            var payload = withAiKeys({
                action: 'describeImage',
                username: user,
                imageBase64: read.base64,
                mimeType: read.mime || file.type || 'image/jpeg',
                fileName: file.name,
                hint: '本機選擇的候選內嵌圖（尚未上載）'
            });
            var data = await proxyRequest(payload, 120000);
            if (!data || data.ok !== true) {
                setStatus('AI 描述失敗：' + ((data && data.error) || 'upstream_error'), true);
                return;
            }
            if (appendRemarksConfirmed(data.description)) {
                setStatus('已將描述加入備註。');
            } else {
                setStatus('已取消寫入備註。');
            }
        } catch (err) {
            console.warn('describe local failed', err);
            setStatus('AI 描述失敗：' + ((err && err.message) || 'network'), true);
        }
    }

    function syncCapabilityUi() {
        var uploadBtn = document.getElementById('inline-diagrams-upload');
        var describeLocalBtn = document.getElementById('inline-diagrams-describe-local');
        var hint = document.getElementById('inline-diagrams-rights-hint');
        if (uploadBtn) uploadBtn.hidden = !canUpload();
        if (describeLocalBtn) describeLocalBtn.hidden = !canDescribe();
        if (hint) {
            var parts = [];
            if (!canUpload()) parts.push('上載需 githubSync');
            if (!canDescribe()) parts.push('AI 描述需 ai');
            hint.textContent = parts.length ? ('（' + parts.join('；') + '）') : '';
        }
        renderDiagramPreview();
    }

    function bindFormDiagramControls() {
        var input = getInlineInput();
        if (!input || input.__diagramsBound) return;
        input.__diagramsBound = true;
        input.addEventListener('change', renderDiagramPreview);
        input.addEventListener('input', function () {
            // Debounce-ish: refresh preview when user edits paths.
            if (input.__previewTimer) clearTimeout(input.__previewTimer);
            input.__previewTimer = setTimeout(renderDiagramPreview, 200);
        });
        var uploadBtn = document.getElementById('inline-diagrams-upload');
        if (uploadBtn) uploadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            uploadSelectedFile();
        });
        var describeLocalBtn = document.getElementById('inline-diagrams-describe-local');
        if (describeLocalBtn) describeLocalBtn.addEventListener('click', function (e) {
            e.preventDefault();
            describeLocalFile();
        });
        syncCapabilityUi();
    }

    function populateInlineDiagrams(question) {
        var input = getInlineInput();
        if (!input) return;
        input.value = question && question.inlineDiagrams ? String(question.inlineDiagrams) : '';
        bindFormDiagramControls();
        syncCapabilityUi();
        renderDiagramPreview();
    }

    function clearInlineDiagrams() {
        var input = getInlineInput();
        if (input) input.value = '';
        var file = document.getElementById('inline-diagrams-file');
        if (file) file.value = '';
        setStatus('');
        renderDiagramPreview();
    }

    function readInlineDiagramsField() {
        var input = getInlineInput();
        return joinDiagramPaths(parseDiagramPaths(input && input.value));
    }

    function hookAccessRights() {
        if (typeof window.applyAccessRights !== 'function') return;
        if (window.applyAccessRights.__formDiagramsWrapped) return;
        var previous = window.applyAccessRights;
        function wrapped(rights) {
            var result = previous(rights);
            syncCapabilityUi();
            return result;
        }
        wrapped.__formDiagramsWrapped = true;
        if (previous.__dataChecksWrapped) wrapped.__dataChecksWrapped = true;
        if (previous.__missingImagesWrapped) wrapped.__missingImagesWrapped = true;
        window.applyAccessRights = wrapped;
    }

    function initFormDiagrams() {
        hookAccessRights();
        bindFormDiagramControls();
    }

    window.FormDiagrams = {
        populate: populateInlineDiagrams,
        clear: clearInlineDiagrams,
        read: readInlineDiagramsField,
        render: renderDiagramPreview,
        sync: syncCapabilityUi,
        parse: parseDiagramPaths
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFormDiagrams);
    } else {
        initFormDiagrams();
    }
})();

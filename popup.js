// Popup script for Discord Auto Stamp
document.addEventListener('DOMContentLoaded', function() {
    const autoStampCheckbox = document.getElementById('autoStamp');
    const stampEmojiSelect = document.getElementById('stampEmoji');
    const delayInput = document.getElementById('delay');
    const keywordsInput = document.getElementById('keywords');
    const saveButton = document.getElementById('saveSettings');
    const statusDiv = document.getElementById('status');
    
    // 設定を読み込み
    function loadSettings() {
        chrome.storage.sync.get(['autoStamp', 'stampEmoji', 'delay', 'targetKeywords'], function(result) {
            autoStampCheckbox.checked = result.autoStamp !== false; // デフォルトtrue
            stampEmojiSelect.value = result.stampEmoji || '👍';
            delayInput.value = result.delay || 1000;
            keywordsInput.value = (result.targetKeywords || []).join(', ');
        });
    }
    
    // 設定を保存
    function saveSettings() {
        const config = {
            autoStamp: autoStampCheckbox.checked,
            stampEmoji: stampEmojiSelect.value,
            delay: parseInt(delayInput.value),
            targetKeywords: keywordsInput.value.split(',').map(k => k.trim()).filter(k => k)
        };
        
        // Chrome storage に保存
        chrome.storage.sync.set(config, function() {
            if (chrome.runtime.lastError) {
                showStatus('設定の保存に失敗しました: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            // アクティブタブのcontent scriptに設定を送信
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'updateConfig', config: config}, function(response) {
                        if (chrome.runtime.lastError) {
                            showStatus('設定が保存されました（ページを再読み込みして適用してください）', 'success');
                        } else {
                            showStatus('設定が保存されました！', 'success');
                        }
                    });
                } else {
                    showStatus('設定が保存されました！', 'success');
                }
            });
        });
    }
    
    // ステータスメッセージを表示
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
    
    // イベントリスナー
    saveButton.addEventListener('click', saveSettings);
    
    // 初期設定を読み込み
    loadSettings();
});
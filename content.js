// Discord Auto Stamp Content Script
(function() {
    'use strict';
    
    console.log('Discord Auto Stamp loaded');
    
    // 設定
    const CONFIG = {
        autoStamp: true,
        stampEmoji: '👍', // デフォルトのスタンプ
        targetKeywords: [], // 特定のキーワードを含むメッセージにのみ反応
        delay: 1000 // メッセージ検出後の遅延（ミリ秒）
    };
    
    // メッセージを監視するオブザーバー
    let messageObserver = null;
    
    // 既に処理したメッセージのIDを記録
    const processedMessages = new Set();
    
    // Discordのメッセージ要素を検出
    function findMessageElements() {
        return document.querySelectorAll('[id^="message-"]');
    }
    
    // リアクションボタンを見つける
    function findReactionButton(messageElement) {
        // Discordのリアクションボタンのセレクタ（Discord UIの変更に応じて調整が必要）
        const reactionSelectors = [
            '[aria-label="Add Reaction"]',
            '[aria-label="リアクションを追加"]',
            'button[aria-label*="reaction"]',
            '.reaction'
        ];
        
        for (const selector of reactionSelectors) {
            const button = messageElement.querySelector(selector);
            if (button) return button;
        }
        
        return null;
    }
    
    // スタンプを追加する
    function addStamp(messageElement) {
        const messageId = messageElement.id;
        
        // 既に処理済みの場合はスキップ
        if (processedMessages.has(messageId)) {
            return;
        }
        
        // メッセージにマウスホバーしてリアクションボタンを表示
        messageElement.dispatchEvent(new MouseEvent('mouseenter', {
            bubbles: true,
            cancelable: true
        }));
        
        setTimeout(() => {
            const reactionButton = findReactionButton(messageElement);
            if (reactionButton) {
                reactionButton.click();
                
                // エモジピッカーが開くのを待ってから特定のエモジをクリック
                setTimeout(() => {
                    // エモジピッカー内でデフォルトのエモジを探してクリック
                    const emojiPicker = document.querySelector('[data-list-id="emoji-picker-grid"]');
                    if (emojiPicker) {
                        const thumbsUpEmoji = emojiPicker.querySelector('[data-name="👍"]') || 
                                            emojiPicker.querySelector('button[aria-label*="👍"]') ||
                                            emojiPicker.querySelector('button:first-child');
                        if (thumbsUpEmoji) {
                            thumbsUpEmoji.click();
                        }
                    }
                }, 500);
                
                processedMessages.add(messageId);
                console.log('Auto stamp added to message:', messageId);
            }
        }, CONFIG.delay);
    }
    
    // 新しいメッセージを処理
    function processNewMessages() {
        if (!CONFIG.autoStamp) return;
        
        const messages = findMessageElements();
        messages.forEach(message => {
            if (!processedMessages.has(message.id)) {
                // キーワードフィルタリング（設定されている場合）
                if (CONFIG.targetKeywords.length > 0) {
                    const messageText = message.textContent.toLowerCase();
                    const hasKeyword = CONFIG.targetKeywords.some(keyword => 
                        messageText.includes(keyword.toLowerCase())
                    );
                    if (!hasKeyword) return;
                }
                
                addStamp(message);
            }
        });
    }
    
    // メッセージリストの変更を監視
    function startObserving() {
        const messagesContainer = document.querySelector('[data-list-id="chat-messages"]') || 
                                 document.querySelector('[class*="messagesWrapper"]') ||
                                 document.querySelector('[class*="scroller"]');
        
        if (messagesContainer && !messageObserver) {
            messageObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE && 
                                node.id && node.id.startsWith('message-')) {
                                setTimeout(() => processNewMessages(), 100);
                            }
                        });
                    }
                });
            });
            
            messageObserver.observe(messagesContainer, {
                childList: true,
                subtree: true
            });
            
            console.log('Message observer started');
        }
    }
    
    // 設定を読み込み
    function loadConfig() {
        chrome.storage.sync.get(['autoStamp', 'stampEmoji', 'delay', 'targetKeywords'], function(result) {
            CONFIG.autoStamp = result.autoStamp !== false; // デフォルトtrue
            CONFIG.stampEmoji = result.stampEmoji || '👍';
            CONFIG.delay = result.delay || 1000;
            CONFIG.targetKeywords = result.targetKeywords || [];
            console.log('Config loaded:', CONFIG);
        });
    }
    
    // 初期化
    function init() {
        // 設定を最初に読み込み
        loadConfig();
        
        // ページが完全に読み込まれるまで待機
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Discordが完全に読み込まれるまで待機
        const checkDiscordLoaded = setInterval(() => {
            if (document.querySelector('[data-list-id="chat-messages"]') || 
                document.querySelector('[class*="messagesWrapper"]')) {
                clearInterval(checkDiscordLoaded);
                startObserving();
                processNewMessages(); // 既存のメッセージも処理
            }
        }, 1000);
        
        // 10秒後にタイムアウト
        setTimeout(() => {
            clearInterval(checkDiscordLoaded);
        }, 10000);
    }
    
    // Chrome拡張からのメッセージを受信
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateConfig') {
            Object.assign(CONFIG, request.config);
            console.log('Config updated via message:', CONFIG);
            sendResponse({success: true});
        } else if (request.action === 'getConfig') {
            sendResponse(CONFIG);
        }
        return true; // 非同期レスポンスを許可
    });
    
    // ストレージの変更を監視
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            console.log('Storage changed:', changes);
            loadConfig(); // 設定を再読み込み
        }
    });
    
    // 初期化実行
    init();
    
})();
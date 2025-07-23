// Discord Auto Stamp Content Script
(function() {
    'use strict';
    
    console.log('Discord Auto Stamp loaded');
    
    // エラーハンドリングを追加
    window.addEventListener('error', function(e) {
        console.error('Discord Auto Stamp Error:', e.error);
    });
    
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
        // メッセージのコンテンツ部分を取得（これが実際のメッセージ）
        const messageContents = document.querySelectorAll('[id^="message-content-"]');
        
        console.log(`Found ${messageContents.length} message content elements`);
        return messageContents;
    }
    
    // リアクションボタンを見つける
    function findReactionButton(messageElement) {
        console.log('Searching for reaction button in:', messageElement.id);
        
        // message-content-要素の場合は、親のメッセージ全体を対象にする
        let searchRoot = messageElement;
        if (messageElement.id.startsWith('message-content-')) {
            // 数レベル上の親要素を探す
            searchRoot = messageElement.closest('[id^="message-"]') || messageElement.parentElement.parentElement;
            console.log('Searching in parent element instead:', searchRoot);
        }
        
        // Discordのリアクションボタンのセレクタ
        const reactionSelectors = [
            '[aria-label="Add Reaction"]',
            '[aria-label="リアクションを追加"]',
            'button[aria-label*="reaction"]',
            'button[aria-label*="Reaction"]',
            '[class*="reaction"]',
            '[class*="button"][aria-label*="Add"]',
            '[class*="reactionButton"]',
            '[data-type="reaction"]'
        ];
        
        for (const selector of reactionSelectors) {
            const button = searchRoot.querySelector(selector);
            console.log(`Selector "${selector}":`, !!button);
            if (button) {
                console.log('Found reaction button:', button);
                return button;
            }
        }
        
        // より広範囲で探す
        const allButtons = searchRoot.querySelectorAll('button');
        console.log(`Found ${allButtons.length} buttons in search area`);
        
        for (const button of allButtons) {
            const ariaLabel = button.getAttribute('aria-label') || '';
            const className = button.className || '';
            console.log('Button:', { ariaLabel, className });
            
            if (ariaLabel.toLowerCase().includes('add') || 
                ariaLabel.toLowerCase().includes('reaction') ||
                ariaLabel.toLowerCase().includes('リアクション')) {
                console.log('Found reaction button by content:', button);
                return button;
            }
        }
        
        return null;
    }
    
    // スタンプを追加する
    function addStamp(messageElement) {
        const messageId = messageElement.id;
        
        // 既に処理済みの場合はスキップ
        if (processedMessages.has(messageId)) {
            console.log('Message already processed:', messageId);
            return;
        }
        
        console.log('Attempting to add stamp to:', messageId);
        
        // メッセージにマウスホバーしてリアクションボタンを表示
        messageElement.dispatchEvent(new MouseEvent('mouseenter', {
            bubbles: true,
            cancelable: true
        }));
        
        setTimeout(() => {
            const reactionButton = findReactionButton(messageElement);
            console.log('Reaction button found:', !!reactionButton);
            
            if (reactionButton) {
                console.log('Clicking reaction button');
                reactionButton.click();
                
                // エモジピッカーが開くのを待ってから特定のエモジをクリック
                setTimeout(() => {
                    // エモジピッカー内でデフォルトのエモジを探してクリック
                    const emojiPicker = document.querySelector('[data-list-id="emoji-picker-grid"]');
                    console.log('Emoji picker found:', !!emojiPicker);
                    
                    if (emojiPicker) {
                        const thumbsUpEmoji = emojiPicker.querySelector('[data-name="👍"]') || 
                                            emojiPicker.querySelector('button[aria-label*="👍"]') ||
                                            emojiPicker.querySelector('button:first-child');
                        console.log('Thumbs up emoji found:', !!thumbsUpEmoji);
                        
                        if (thumbsUpEmoji) {
                            thumbsUpEmoji.click();
                            console.log('Emoji clicked');
                        }
                    }
                }, 500);
                
                processedMessages.add(messageId);
                console.log('Auto stamp added to message:', messageId);
            } else {
                console.log('No reaction button found for message:', messageId);
            }
        }, CONFIG.delay);
    }
    
    // 新しいメッセージを処理
    function processNewMessages() {
        if (!CONFIG.autoStamp) {
            console.log('Auto stamp is disabled');
            return;
        }
        
        const messages = findMessageElements();
        console.log(`Found ${messages.length} message elements`);
        
        messages.forEach(message => {
            if (!processedMessages.has(message.id)) {
                console.log('Processing new message:', message.id);
                
                // キーワードフィルタリング（設定されている場合）
                if (CONFIG.targetKeywords.length > 0) {
                    const messageText = message.textContent.toLowerCase();
                    const hasKeyword = CONFIG.targetKeywords.some(keyword => 
                        messageText.includes(keyword.toLowerCase())
                    );
                    if (!hasKeyword) {
                        console.log('Message filtered out by keywords:', CONFIG.targetKeywords);
                        return;
                    }
                } else {
                    console.log('No keyword filter set, processing all messages');
                }
                
                addStamp(message);
            }
        });
    }
    
    // メッセージリストの変更を監視
    function startObserving() {
        const messagesContainer = document.querySelector('[data-list-id="chat-messages"]');
        
        console.log('Messages container found:', !!messagesContainer);
        
        if (messagesContainer && !messageObserver) {
            messageObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE && 
                                node.id && node.id.startsWith('message-content-')) {
                                console.log('New message content detected:', node.id);
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
            
            console.log('Message observer started on:', messagesContainer);
        } else if (!messagesContainer) {
            console.log('Messages container not found');
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
        try {
            console.log('Discord Auto Stamp init called, readyState:', document.readyState);
            
            // 設定を最初に読み込み
            loadConfig();
            
            // 即座に試行
            tryInitialize();
            
            // ページが完全に読み込まれた後も試行
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', tryInitialize);
            }
            
            // windowが読み込まれた後も試行
            window.addEventListener('load', tryInitialize);
            
            // 一定間隔で試行
            setTimeout(tryInitialize, 2000);
            setTimeout(tryInitialize, 5000);
            setTimeout(tryInitialize, 10000);
            
            console.log('Init completed successfully');
        } catch (error) {
            console.error('Error in init:', error);
        }
    }
    
    let initialized = false;
    function tryInitialize() {
        if (initialized) return;
        
        console.log('Trying to initialize Discord Auto Stamp...');
        const messagesContainer = document.querySelector('[data-list-id="chat-messages"]');
        console.log('Messages container found:', !!messagesContainer);
        
        if (messagesContainer) {
            console.log('Discord container found, starting observer');
            initialized = true;
            startObserving();
            processNewMessages();
        }
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
    
    // デバッグ用にグローバルスコープに関数を公開
    try {
        window.discordAutoStamp = {
            findMessageElements,
            processNewMessages,
            tryInitialize,
            addStamp,
            CONFIG
        };
        console.log('Global functions exposed successfully');
    } catch (error) {
        console.error('Error exposing global functions:', error);
    }
    
    // 初期化実行
    try {
        console.log('Starting init...');
        init();
        console.log('Init call completed');
    } catch (error) {
        console.error('Error calling init:', error);
    }
    
})();
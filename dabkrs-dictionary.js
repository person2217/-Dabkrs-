/* global api */
class rucn_Dabkrs {
    constructor(options) {
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        let locale = await api.locale();
        if (locale.indexOf('CN') != -1) return 'Dabkrs俄汉词典';
        if (locale.indexOf('TW') != -1) return 'Dabkrs俄汉词典';
        return 'Dabkrs RU->CN Dictionary';
    }

    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async findTerm(word) {
        this.word = word;
        return await this.findDabkrs(word);
    }

    async findDabkrs(word) {
        let notes = [];
        if (!word) return notes; // 如果没有词，返回空数组

        function T(node) {
            if (!node)
                return '';
            else
                return node.innerText.trim();
        }

        // 构建查询URL
        let base = 'https://dabkrs.com/slovo.php?ch=';
        let url = base + encodeURIComponent(word);
        let doc = '';
        try {
            let data = await api.fetch(url);
            let parser = new DOMParser();
            doc = parser.parseFromString(data, 'text/html');
        } catch (err) {
            return [];
        }

        // 解析主要内容
        let mainContent = doc.querySelector('.maincontentText');
        if (!mainContent) return notes;

        // 获取表达式（查询的词）
        let expression = word;

        // 提取音频链接（如果有）
        let audios = [];
        let audioLinks = doc.querySelectorAll('a[href*="audio"]');
        if (audioLinks && audioLinks.length > 0) {
            for (let i = 0; i < Math.min(audioLinks.length, 1); i++) {
                let audioUrl = audioLinks[i].href;
                if (audioUrl) {
                    audios.push('https://dabkrs.com/' + audioUrl.replace(/^(?:\/\/|[^/]+)*\//, ''));
                }
            }
        }

        // 解析定义内容
        let definition = '';
        
        // 获取词性和基本解释
        let mainEntries = mainContent.querySelectorAll('p');
        if (mainEntries && mainEntries.length > 0) {
            definition = '<ul class="exp">';
            
            for (const entry of mainEntries) {
                let entryText = entry.innerHTML;
                if (entryText && !entryText.includes('reachGoal')) {
                    // 尝试分离词性和解释
                    let posMatch = entryText.match(/<b>(.*?)<\/b>/);
                    let pos = posMatch ? posMatch[1] : '';
                    let meaning = entryText.replace(/<b>(.*?)<\/b>/, '').trim();
                    
                    if (pos) {
                        definition += `<li class="exp"><span class="pos">${pos}</span><span class="tran"><span class="chn_tran">${meaning}</span></span></li>`;
                    } else {
                        definition += `<li class="exp"><span class="tran"><span class="chn_tran">${entryText}</span></span></li>`;
                    }
                }
            }
            
            definition += '</ul>';
        }

        // 获取例句
        let examples = mainContent.querySelectorAll('table tr');
        if (examples && examples.length > 0 && this.maxexample > 0) {
            definition += '<ul class="sents">';
            let exampleCount = 0;
            
            for (const example of examples) {
                if (exampleCount >= this.maxexample) break;
                
                let cells = example.querySelectorAll('td');
                if (cells && cells.length >= 2) {
                    let ruExample = T(cells[0]);
                    let cnExample = T(cells[1]);
                    
                    if (ruExample && cnExample) {
                        // 高亮查询词
                        ruExample = ruExample.replace(new RegExp('(\\b' + word + '\\b)', 'gi'), '<b>$1</b>');
                        definition += `<li class="sent"><span class="eng_sent">${ruExample}</span><span class="chn_sent">${cnExample}</span></li>`;
                        exampleCount++;
                    }
                }
            }
            
            definition += '</ul>';
        }

        // 添加CSS样式
        let css = this.renderCSS();
        notes.push({
            css,
            expression,
            definitions: [definition],
            audios
        });

        return notes;
    }

    renderCSS() {
        let css = `
            <style>
                ul.exp, li.exp {list-style: square inside; margin:0; margin-left: 2px; padding:0;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                span.chn_tran {color:#0d47a1;}
                ul.sents {font-size:0.9em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.eng_sent {margin-right:5px;}
                span.chn_sent {color:#0d47a1;}
            </style>`;
        return css;
    }
}
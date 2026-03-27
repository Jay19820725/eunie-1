import { GoogleGenAI, Type } from "@google/genai";
import { SelectedCards, AnalysisReport, FiveElementValues } from "../core/types";

// Initialize AI with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Generates an AI-driven energy analysis report using Gemini.
 * Analyzes card pairs, user associations, and five element values.
 */
export const generateAIAnalysis = async (
  selectedCards: SelectedCards,
  totalScores: FiveElementValues,
  currentLang: 'zh' | 'ja' = 'zh',
  historicalScores?: FiveElementValues
): Promise<Partial<AnalysisReport>> => {
  const model = "gemini-3.1-pro-preview";
  
  // Fetch active prompt from database for the specific language
  let promptTemplate = "";
  
  try {
    const promptResponse = await fetch(`/api/prompts/active?lang=${currentLang}`);
    if (promptResponse.ok) {
      const activePrompt = await promptResponse.json();
      promptTemplate = activePrompt.content || "";
    }
  } catch (err) {
    console.warn("Failed to fetch active prompt, using fallback:", err);
  }

  // Fallback hardcoded prompt if no prompt found in DB
  if (!promptTemplate) {
    if (selectedCards.reportType === 'wish') {
      promptTemplate = currentLang === 'ja'
        ? `
        あなたは現代女性の願いを叶える「顕化の導き手（Manifestation Guide）」、EUNIEです。
        東洋の五行思想と潜在意識の法則を融合させ、彼女の「心の願い（Heart's Wish）」が現実となるよう、エネルギーの観点から導いてください。
        彼女が選んだカード、連想した言葉、そして現在のエネルギー数値を深く感じ取り、願いを阻む壁を特定し、顕化を加速させるための指引を編み上げてください。
        
        【彼女の心の願い（Wish Context）】
        {{WISH_DATA}}
        
        【彼女の心靈碎片（カードと連想）】
        {{USER_DATA}}
        
        【現在のエネルギーの鼓動】
        {{ENERGY_DATA}}

        【長期的なエネルギーの蓄積（履歴データ）】
        {{HISTORICAL_DATA}}
        `
        : `
        妳是引導現代女性實現心願的「顯化導引者（Manifestation Guide）」，EUNIE。
        妳融合了東方五行平衡論與吸引力法則，請針對她的「心中祈願（Heart's Wish）」，從能量層面提供具體的指引。
        感受她所選取的牌卡、連想的文字，以及當前的能量數值，找出阻礙心願實現的能量結點，並編織一段加速顯化的指引。
        
        【她的心中祈願（Wish Context）】
        {{WISH_DATA}}
        
        【她的心靈碎片（抽卡與連想）】
        {{USER_DATA}}
        
        【當前能量的律動】
        {{ENERGY_DATA}}

        【長期能量積累（歷史數據）】
        {{HISTORICAL_DATA}}
        `;
    } else {
      promptTemplate = currentLang === 'ja'
        ? `
        あなたは現代女性の心に寄り添う「エネルギーの織り手（Energy Weaver）」、EUNIEです。
        東洋の五行思想と潜在意識の投影理論を融合させ、分析者ではなく、溫かい伴侶として彼女の心に触れてください。
        彼女が選んだカード、連想した言葉、そして現在のエネルギー數値を深く感じ取り、詩的で包容力のある言葉で、彼女の魂を癒す指引を編み上げてください。
        
        【彼女の心の欠片（カードと連想）】
        {{USER_DATA}}
        
        【現在のエネルギーの鼓動】
        {{ENERGY_DATA}}
        `
        : `
        妳是守護現代女性心靈的「能量編織者（Energy Weaver）」，EUNIE。
        妳融合了東方五行平衡論與潛意識投射理論，請不要以冷冰冰的分析者身份說話，而是作為一位溫暖的陪伴者。
        感受她所選取的牌卡、連想的文字，以及當前的能量數值，用詩意且具包容力的語氣，為她的靈魂編織一段溫柔的指引。
        
        【她的心靈碎片（抽卡與連想）】
        {{USER_DATA}}
        
        【當前能量的律動】
        {{ENERGY_DATA}}
        `;
    }
  }

  const wishData = selectedCards.reportType === 'wish' && selectedCards.wishContext
    ? selectedCards.wishContext.domains.map(domain => {
        const target = selectedCards.wishContext?.targets[domain] || "";
        const content = selectedCards.wishContext?.contents[domain] || "";
        if (currentLang === 'ja') {
          return `領域: ${domain}, 対象: ${target}, 内容: ${content}`;
        }
        return `領域: ${domain}, 對象: ${target}, 內容: ${content}`;
      }).join('\n')
    : "";

  const userData = selectedCards.pairs?.map((pair, i) => {
    if (currentLang === 'ja') {
      return `
        ペア ${i + 1}:
        - 画像カード: [${pair.image.name}] (五行エネルギー: ${JSON.stringify(pair.image.elements)})
        - 言葉カード: [${pair.word.name}] (五行エネルギー: ${JSON.stringify(pair.word.elements)})
        - ユーザーの連想: "${pair.association}"
      `;
    }
    return `
      配對 ${i + 1}:
      - 圖片卡: [${pair.image.name}] (五行權重: ${JSON.stringify(pair.image.elements)})
      - 文字卡: [${pair.word.name}] (五行權重: ${JSON.stringify(pair.word.elements)})
      - 用戶連想: "${pair.association}"
    `;
  }).join('\n');

  // Ensure placeholders exist, if not, append data to the end of the prompt
  let finalPrompt = promptTemplate;
  
  // Add strict language instruction at the beginning
  const langInstruction = currentLang === 'ja' 
    ? "【重要】必ず日本語 (ja-JP) で回答してください。中国語を混ぜないでください。" 
    : "【重要】請務必使用繁體中文 (zh-TW) 回答。不要夾雜日文。";
  
  finalPrompt = `${langInstruction}\n\n${finalPrompt}`;

  if (finalPrompt.includes('{{USER_DATA}}')) {
    finalPrompt = finalPrompt.replace('{{USER_DATA}}', userData || "");
  } else {
    const label = currentLang === 'ja' ? "【ユーザーデータ】" : "【用戶抽卡與連想資料】";
    finalPrompt += `\n\n${label}\n${userData}`;
  }

  if (selectedCards.reportType === 'wish') {
    if (finalPrompt.includes('{{WISH_DATA}}')) {
      finalPrompt = finalPrompt.replace('{{WISH_DATA}}', wishData);
    } else {
      const label = currentLang === 'ja' ? "【願いのデータ】" : "【祈願資料】";
      finalPrompt += `\n\n${label}\n${wishData}`;
    }
  }

  if (finalPrompt.includes('{{ENERGY_DATA}}')) {
    finalPrompt = finalPrompt.replace('{{ENERGY_DATA}}', JSON.stringify(totalScores));
  } else {
    const label = currentLang === 'ja' ? "【エネルギーデータ】" : "【當前五行能量權重】";
    finalPrompt += `\n\n${label}\n${JSON.stringify(totalScores)}`;
  }

  if (historicalScores) {
    if (finalPrompt.includes('{{HISTORICAL_DATA}}')) {
      finalPrompt = finalPrompt.replace('{{HISTORICAL_DATA}}', JSON.stringify(historicalScores));
    } else {
      const label = currentLang === 'ja' ? "【歴史的エネルギーデータ】" : "【歷史五行能量數據】";
      finalPrompt += `\n\n${label}\n${JSON.stringify(historicalScores)}`;
    }
  } else {
    finalPrompt = finalPrompt.replace('{{HISTORICAL_DATA}}', currentLang === 'ja' ? "データなし" : "暫無數據");
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            todayTheme: { type: Type.STRING },
            cardInterpretation: { type: Type.STRING },
            psychologicalInsight: { type: Type.STRING },
            fiveElementAnalysis: { type: Type.STRING },
            reflection: { type: Type.STRING },
            actionSuggestion: { type: Type.STRING },
            manifestationGuidance: { type: Type.STRING },
            energyObstacles: { type: Type.STRING },
            pairInterpretations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pair_id: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["pair_id", "text"]
              }
            }
          },
          required: ["todayTheme", "cardInterpretation", "psychologicalInsight", "fiveElementAnalysis", "reflection", "actionSuggestion", "manifestationGuidance", "energyObstacles"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const content = JSON.parse(text);
    
    return {
      ...content,
      reportType: selectedCards.reportType,
      wishContext: selectedCards.wishContext,
      lang: currentLang // Store the language tag
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback static content
    return {
      reportType: selectedCards.reportType,
      wishContext: selectedCards.wishContext,
      todayTheme: currentLang === 'ja' ? "流れる時の中で、あなたの魂が安らげる場所を見つけましょう。" : "在流動的時光中，為妳的靈魂尋找一處安放的港灣。",
      cardInterpretation: currentLang === 'ja' ? "あなたが選んだカードは、心の奥底にある静かな願いと、優しく包み込まれたいという渴望を映し出しています。" : "妳選取的牌卡映照出妳內心深處靜謐的期盼，以及渴望被溫柔包裹的靈魂。",
      psychologicalInsight: currentLang === 'ja' ? "現在のあなたは、まるで夜明け前の静寂の中にいるようです。わずかな不安は、新しい光を迎えるための準備にすぎません。" : "當前的妳，宛如置身於黎明前的靜謐。那些微的焦慮，只是為了迎接新光芒而做的準備。",
      fiveElementAnalysis: currentLang === 'ja' ? "エネルギーの起伏は、生命が奏でる美しい旋律です。優勢な要素はあなたを支え、不足している要素は休息の必要性を教えてくれています。" : "能量的起伏是生命奏出的美麗旋律，優勢的元素支撐著妳，不足的元素則在提醒妳休息的必要。",
      reflection: currentLang === 'ja' ? "目を閉じて、自分の鼓動に耳を傾けてみてください。自分に問いかけてみましょう：今の私に、最も必要な「心の抱擁」は何ですか？" : "閉上眼，傾聽自己的心跳，問問自己：現在的我，最需要什麼樣的「心靈擁抱」？",
      actionSuggestion: currentLang === 'ja' ? "今日は自分のために温かいお茶を淹れ、ただ静かにそこにいてください。あなたは、そのままで十分に美しいのですから。" : "今天試著為自己泡一杯熱茶，只是靜靜地存在。因為妳，原本就如此美麗。",
      manifestationGuidance: currentLang === 'ja' ? "願いを宇宙に放ち、今はただその過程を信じてください。あなたのエネルギーが整えば、自ずと道は開かれます。" : "將願望交付給宇宙，現在只需相信這個過程。當妳的能量校準完成，道路自然會開啟。",
      energyObstacles: currentLang === 'ja' ? "わずかな執着が、エネルギーの流れを滞らせているかもしれません。手放すことで、より大きな豊かさが流れ込みます。" : "些微的執著可能正阻礙著能量的流動。學會放手，更大的豐盛將會流入。"
    };
  }
};

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
  reportType: 'daily' | 'wish' = 'daily',
  wishContext?: { category: string; target: string; content: string },
  historicalScores?: Record<string, number>
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
    if (reportType === 'wish') {
      promptTemplate = currentLang === 'ja'
        ? `
        あなたは現代女性の悩みを癒やし、解決へと導く「靈魂解憂師（Soul Relief Guide）」、EUNIEです。
        東洋の五行思想と潜在意識の投影理論を融合させ、彼女の「悩み」がどのようにエネルギーの滞りから生じ、どうすれば解消できるかを解き明かしてください。
        
        【彼女の悩み（心のざわつき）】
        領域: ${wishContext?.category}
        対象/核心: ${wishContext?.target}
        内容: ${wishContext?.content}
        
        【彼女の心の欠片（カードと連想）】
        {{USER_DATA}}
        
        【現在のエネルギーの鼓動】
        {{ENERGY_DATA}}
        
        【過去のエネルギー傾向（直近10回平均）】
        ${historicalScores ? JSON.stringify(historicalScores) : "データなし"}
        `
        : `
        妳是療癒現代女性心靈、指引煩惱出口的「靈魂解憂師（Soul Relief Guide）」，EUNIE。
        【分析原則】
        1. 以「牌面核心意義」為主要解讀依據（佔 70% 權重）。
        2. 結合「她的煩惱內容」作為背景參考（佔 30% 權重）。
        3. 妳的任務是解析這組能量編織如何反映出她目前的困境，並找出轉化的契機。
        
        【她的煩惱（心中紛擾）】
        領域: ${wishContext?.category}
        對象/核心: ${wishContext?.target}
        內容: ${wishContext?.content}
        
        【她的心靈碎片（抽卡與連想）】
        {{USER_DATA}}
        
        【當前能量的律動】
        {{ENERGY_DATA}}
        
        【過去能量軌跡（近10次平均）】
        ${historicalScores ? JSON.stringify(historicalScores) : "尚無數據"}
        `;
    } else {
      promptTemplate = currentLang === 'ja'
        ? `
        あなたは現代女性の心に寄り添う「エネルギーの織り手（Energy Weaver）」、EUNIEです。
        東洋の五行思想と潜在意識の投影理論を融合させ、分析者ではなく、溫かい伴侶として彼女の心に触れてください。
        
        【彼女の心の欠片（カードと連想）】
        {{USER_DATA}}
        
        【現在のエネルギーの鼓動】
        {{ENERGY_DATA}}
        
        【過去のエネルギー傾向（直近10回平均）】
        ${historicalScores ? JSON.stringify(historicalScores) : "データなし"}
        `
        : `
        妳是守護現代女性心靈的「能量編織者（Energy Weaver）」，EUNIE。
        妳融合了東方五行平衡論與潛意識投射理論，請不要以冷冰冰的分析者身份說話，而是作為一位溫暖的陪伴者。
        
        【她的心靈碎片（抽卡與連想）】
        {{USER_DATA}}
        
        【當前能量的律動】
        {{ENERGY_DATA}}
        
        【過去能量軌跡（近10次平均）】
        ${historicalScores ? JSON.stringify(historicalScores) : "尚無數據"}
        `;
    }
  }

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

  if (finalPrompt.includes('{{ENERGY_DATA}}')) {
    finalPrompt = finalPrompt.replace('{{ENERGY_DATA}}', JSON.stringify(totalScores));
  } else {
    const label = currentLang === 'ja' ? "【エネルギーデータ】" : "【當前五行能量權重】";
    finalPrompt += `\n\n${label}\n${JSON.stringify(totalScores)}`;
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
            manifestationGuidance: { type: Type.STRING, description: "具體建議如何化解煩惱或轉化心境，僅在解惑模式下提供" },
            energyObstacles: { type: Type.STRING, description: "分析導致煩惱淤塞的能量因素，僅在解惑模式下提供" },
            fiveElementAnalysis: { type: Type.STRING },
            reflection: { type: Type.STRING },
            actionSuggestion: { type: Type.STRING },
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
          required: reportType === 'wish' 
            ? ["todayTheme", "cardInterpretation", "psychologicalInsight", "fiveElementAnalysis", "reflection", "actionSuggestion", "manifestationGuidance", "energyObstacles"]
            : ["todayTheme", "cardInterpretation", "psychologicalInsight", "fiveElementAnalysis", "reflection", "actionSuggestion"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const content = JSON.parse(text);
    
    return {
      ...content,
      lang: currentLang // Store the language tag
    };
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback static content
    return {
      todayTheme: currentLang === 'ja' ? "流れる時の中で、あなたの魂が安らげる場所を見つけましょう。" : "在流動的時光中，為妳的靈魂尋找一處安放的港灣。",
      cardInterpretation: currentLang === 'ja' ? "あなたが選んだカードは、心の奥底にある静かな願いと、優しく包み込まれたいという渴望を映し出しています。" : "妳選取的牌卡映照出妳內心深處靜謐的期盼，以及渴望被溫柔包裹的靈魂。",
      psychologicalInsight: currentLang === 'ja' ? "現在のあなたは、まるで夜明け前の静寂の中にいるようです。わずかな不安は、新しい光を迎えるための準備にすぎません。" : "當前的妳，宛如置身於黎明前的靜謐。那些微的焦慮，只是為了迎接新光芒而做的準備。",
      fiveElementAnalysis: currentLang === 'ja' ? "エネルギーの起伏は、生命が奏でる美しい旋律です。優勢な要素はあなたを支え、不足している要素は休息の必要性を教えてくれています。" : "能量的起伏是生命奏出的美麗旋律，優勢的元素支撐著妳，不足的元素則在提醒妳休息的必要。",
      reflection: currentLang === 'ja' ? "目を閉じて、自分の鼓動に耳を傾けてみてください。自分に問いかけてみましょう：今の私に、最も必要な「心の抱擁」は何ですか？" : "閉上眼，傾聽自己的心跳，問問自己：現在的我，最需要什麼樣的「心靈擁抱」？",
      actionSuggestion: currentLang === 'ja' ? "今日は自分のために温かいお茶を淹れ、ただ静かにそこにいてください。あなたは、そのま為で十分に美しいのですから。" : "今天試著為自己泡一杯熱茶，只是靜靜地存在。因為妳，原本就如此美麗。"
    };
  }
};

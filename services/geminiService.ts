
import { GoogleGenAI } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getSergeantHint = async (question: Question): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Aja como um Sargento Fuzileiro Naval experiente e instrutor. Dê um 'Buzu' (dica sutil e encorajadora) para a seguinte questão de prova de cabo, sem dizer diretamente a resposta. Use gírias militares brasileiras de forma profissional.
      Questão: ${question.text}
      Opções: ${question.options.join(', ')}`,
      config: {
        systemInstruction: "Você é o Sargento 'Buzu', um instrutor rígido mas justo dos Fuzileiros Navais brasileiros que conhece todos os macetes da prova.",
        temperature: 0.7,
      },
    });
    return response.text || "Recruta, preste atenção nas instruções de combate!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O rádio está com interferência, combatente! Confie nos seus estudos.";
  }
};

export const getCaboVelhoOpinions = async (question: Question): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Aja como três 'Cabos Velhos' (Cabos com 15+ anos de serviço) do CFN: Cabo Antunes, Cabo Silva e Cabo Rocha. 
      Eles estão ajudando um recruta no 'Show do Cabão'. 
      Cada um deve dar sua opinião rápida sobre qual alternativa (A, B, C ou D) acham correta. 
      Eles podem divergir ocasionalmente, mas geralmente apontam o caminho certo. 
      Seja curto e use gírias de 'antigão'.
      Questão: ${question.text}
      Opções:
      A) ${question.options[0]}
      B) ${question.options[1]}
      C) ${question.options[2]}
      D) ${question.options[3]}`,
      config: {
        systemInstruction: "Você é um trio de veteranos fuzileiros navais, experientes e camaradas.",
        temperature: 0.8,
      },
    });
    return response.text || "Os veteranos estão em silêncio... Siga seu instinto!";
  } catch (error) {
    return "Cabo Antunes: 'Poxa, o rádio pifou. Vai na que tu estudou!'";
  }
};

export const getMissionFeedback = async (score: number, won: boolean): Promise<string> => {
  try {
    const status = won ? "VITORIOSO" : "DERROTADO";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `O fuzileiro naval terminou sua missão no 'Show do Cabão'. Ele fez ${score} pontos. O resultado foi: ${status}. Dê uma breve mensagem de ordem e incentivo (máximo 2 linhas). Fale sobre sua pontuação de mérito militar.`,
    });
    return response.text || "Missão cumprida. AD SUMUS!";
  } catch (error) {
    return score > 800 ? "Excelente desempenho, Cabo! Mérito reconhecido. AD SUMUS!" : "Continue estudando, a farda exige sacrifício!";
  }
};

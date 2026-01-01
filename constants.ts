
import { Question, Difficulty } from './types';

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: '1',
    text: 'Qual é o aniversário do Corpo de Fuzileiros Navais?',
    options: ['7 de Março', '19 de Novembro', '13 de Dezembro', '11 de Junho'],
    correctAnswer: 0,
    difficulty: Difficulty.RECRUTA,
    category: 'História'
  },
  {
    id: '2',
    text: 'Qual o fuzil padrão utilizado pelo CFN atualmente?',
    options: ['FAL 7.62', 'M16A2', 'IA2 5.56', 'G36'],
    correctAnswer: 2,
    difficulty: Difficulty.RECRUTA,
    category: 'Armamento'
  },
  {
    id: '3',
    text: 'Quem é o Patrono do Corpo de Fuzileiros Navais?',
    options: ['Almirante Tamandaré', 'Almirante Barroso', 'Almirante Gastão Motta', 'Almirante Joaquim Marques Lisboa'],
    correctAnswer: 2,
    difficulty: Difficulty.COMBATENTE,
    category: 'História'
  },
  {
    id: '4',
    text: 'Qual é a principal missão do CFN?',
    options: ['Garantir a lei e a ordem', 'Projeção de poder de terra para o mar', 'Projeção de poder sobre terra, a partir do mar', 'Defesa das fronteiras terrestres'],
    correctAnswer: 2,
    difficulty: Difficulty.ESPECIALISTA,
    category: 'Doutrina'
  }
];

export const PRIZE_LEVELS = [
  100, 200, 300, 400, 500, 
  600, 700, 800, 900, 1000, 
  1100, 1200, 1300, 1400, 1500, 
  1600
];

export const RANKS = [
  'Ferro',
  'Bronze',
  'Prata',
  'Ouro',
  'Platina',
  'Esmeralda',
  'Diamante',
  'Mestre',
  'Grão-Mestre'
];

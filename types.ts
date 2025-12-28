export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export interface Settings {
  language: string;
  autoPlay: boolean;
}

export interface PaymentOption {
  price: number;
  label: string;
  credits: number;
}
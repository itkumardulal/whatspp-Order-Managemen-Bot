
export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
  ADMIN = 'admin'
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 'PENDING' | 'AWAITING_PAYMENT' | 'PAID' | 'CONFIRMED' | 'IN_KITCHEN' | 'CANCELLED';

// Add the missing BotSettings interface used in constants.ts and SettingsPage.tsx
export interface BotSettings {
  detectionKeywords: string[];
  confirmationKeywords: string[];
  paymentReceiverName: string;
  groupName: string;
  welcomeMessage: string;
  confirmationPrompt: string;
  paymentRequestMessage: string;
  paymentConfirmedMessage: string;
  finalConfirmationMessage: string;
  adminOverride: boolean;
}

export interface VerificationResult {
  status: 'VERIFIED' | 'MISMATCH' | 'UNREADABLE' | 'CANCELLED';
  extractedAmount: string;
  extractedDate: string;
  recipientName: string;
  aiNotes: string;
  vendorSlip: string;
  approval?: ApprovalStatus;
}

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  imageUrl?: string;
  isOrderSummary?: boolean;
  isVendorInstruction?: boolean;
  verification?: VerificationResult;
  isQR?: boolean;
}

export interface OrderDetails {
  product: string;
  quantity: string;
  price: string;
  name: string;
  phone: string;
  address?: string;
  itemsList?: string[];
}

export interface ChatSession {
  id: string;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  lastTimestamp: Date;
  messages: Message[];
  order: OrderDetails | null;
  botState: BotState;
  orderStatus: OrderStatus;
  lastAdminInteraction?: Date;
  unread?: boolean;
}

export type BotState = 'IDLE' | 'AWAITING_CONFIRMATION' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'MODIFICATION_MODE';

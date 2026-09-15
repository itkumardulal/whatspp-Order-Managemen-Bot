
import { BotSettings } from './types';

export const DEFAULT_SETTINGS: BotSettings = {
  detectionKeywords: ["Order", "Product", "Quantity", "Price"],
  confirmationKeywords: ["yes", "confirm", "ok", "correct", "ho"],
  paymentReceiverName: "Kumar Dulal / Nepal Leadership Technology",
  groupName: "SindhuliBazar Orders",
  welcomeMessage: "Hello, we received your order from SindhuliBazar. Please confirm if the order details are correct.",
  confirmationPrompt: "Please confirm if the above order details are correct.",
  paymentRequestMessage: "Please send a screenshot of your payment to continue.",
  paymentConfirmedMessage: "Payment screenshot received. Paid to {receiver}. Thank you.",
  finalConfirmationMessage: "Your order has been confirmed and forwarded for processing.",
  adminOverride: false,
};

export const STORAGE_KEY_SETTINGS = 'sb_bot_settings';
